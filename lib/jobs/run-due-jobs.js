import { supabaseAdmin } from "../supabase/admin";
import { runGatewayCall } from "../gateway/run-gateway-call";
import { getEmailSender } from "../email/resend";

// Execute due scheduled jobs. Each job runs one gateway call attributed to its agent + API key —
// straight through the normal pipeline (scopes, permission matrix, rate limits, audit logging) —
// then delivers the outcome via webhook or email and reschedules itself.
//
// Concurrency-safe: a job is "claimed" by advancing next_run_at with a compare-and-set on its
// previous value, so overlapping cron invocations can never run the same job twice.

async function deliverOutcome(job, payload) {
  const delivery = job.delivery || {};
  try {
    if (delivery.type === "webhook" && delivery.target) {
      await fetch(delivery.target, {
        method: "POST",
        headers: { "Content-Type": "application/json", "User-Agent": "TMCP-Scheduler" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
    } else if (delivery.type === "email" && delivery.target) {
      const sender = getEmailSender();
      if (!sender) return;
      await sender.resend.emails.send({
        from: sender.from,
        to: delivery.target,
        subject: `[TMCP] ${job.name}: ${payload.status}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2>Scheduled job: ${job.name}</h2>
            <p>Feature <code>${job.feature_key}</code> finished with status <strong>${payload.status}</strong>.</p>
            <pre style="background:#f4f4f4;padding:12px;border-radius:6px;font-size:12px;overflow:auto;">${
              JSON.stringify(payload.status === "success" ? payload.result : payload.error, null, 2)?.slice(0, 4000) || ""
            }</pre>
          </div>
        `
      });
    }
  } catch (err) {
    console.error(`Job ${job.id} delivery failed:`, err.message);
  }
}

export async function runDueJobs({ limit = 20 } = {}) {
  const nowIso = new Date().toISOString();

  const { data: dueJobs, error } = await supabaseAdmin
    .from("scheduled_jobs")
    .select("*")
    .eq("is_enabled", true)
    .lte("next_run_at", nowIso)
    .order("next_run_at", { ascending: true })
    .limit(limit);
  if (error) throw error;

  let processed = 0;
  const results = [];

  for (const job of dueJobs || []) {
    // Claim via compare-and-set on next_run_at.
    const { data: claimed } = await supabaseAdmin
      .from("scheduled_jobs")
      .update({
        next_run_at: new Date(Date.now() + job.interval_minutes * 60 * 1000).toISOString(),
        last_run_at: nowIso,
        updated_at: nowIso
      })
      .eq("id", job.id)
      .eq("next_run_at", job.next_run_at)
      .select("id")
      .maybeSingle();
    if (!claimed) continue;

    // The job's key must still be usable; its scopes apply to the run.
    const { data: keyRow } = await supabaseAdmin
      .from("api_keys")
      .select("status, scopes, expires_at")
      .eq("id", job.api_key_id)
      .maybeSingle();

    let outcome;
    if (!keyRow || keyRow.status !== "active"
      || (keyRow.expires_at && new Date(keyRow.expires_at) < new Date())) {
      outcome = { kind: "error", error: "Job API key is revoked, expired, or missing" };
    } else {
      outcome = await runGatewayCall({
        workspaceId: job.workspace_id,
        agentId: job.agent_id,
        apiKeyId: job.api_key_id,
        toolAccountId: job.tool_account_id,
        featureKey: job.feature_key,
        input: job.input || {},
        scopes: keyRow.scopes ?? null
      });
    }

    const ok = outcome.kind === "success";
    const status = ok ? "success" : outcome.kind;
    const resultJson = ok
      ? (outcome.data !== null && typeof outcome.data === "object" ? outcome.data : { value: outcome.data })
      : null;

    await supabaseAdmin
      .from("scheduled_jobs")
      .update({
        last_status: status,
        last_result: resultJson,
        last_error: ok ? null : (outcome.error || outcome.kind),
        updated_at: new Date().toISOString()
      })
      .eq("id", job.id);

    await deliverOutcome(job, {
      job_id: job.id,
      name: job.name,
      feature_key: job.feature_key,
      status,
      ...(ok ? { result: outcome.data } : { error: outcome.error || outcome.kind }),
      ran_at: nowIso
    });

    processed++;
    results.push({ job_id: job.id, status });
  }

  return { due: (dueJobs || []).length, processed, results };
}
