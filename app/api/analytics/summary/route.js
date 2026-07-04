import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { supabaseAdmin } from "@/lib/supabase/admin";

const WINDOW_DAYS = 30;
const MAX_LOG_ROWS = 20000;

// Workspace analytics for the dashboard: daily call volume, per-tool/per-agent usage, LLM token
// totals, rotation savings, and key-pool health, aggregated over the last 30 days. Aggregation
// happens here (one pass over selected columns — never the full input/output payloads) so the
// client receives a compact, chart-ready summary.
export async function GET(request) {
  try {
    const user = await requireUser(request);
    const workspaceId = user.workspace_id;
    const since = new Date(Date.now() - WINDOW_DAYS * 24 * 60 * 60 * 1000);
    const sinceIso = since.toISOString();

    const [logsRes, agentsRes, poolRes] = await Promise.all([
      supabaseAdmin
        .from("tool_call_logs")
        .select("created_at, status, tool_name, agent_id, latency_ms, usage:output->usage, attempts:input->attempts, model:output->model")
        .eq("workspace_id", workspaceId)
        .gt("created_at", sinceIso)
        .order("created_at", { ascending: false })
        .limit(MAX_LOG_ROWS),
      supabaseAdmin
        .from("agents")
        .select("id, name")
        .eq("workspace_id", workspaceId),
      supabaseAdmin
        .from("provider_key_pool")
        .select("tool_account_id, status, cooldown_until, success_count, failure_count, last_success_at, key_hint, label")
        .eq("workspace_id", workspaceId)
    ]);

    if (logsRes.error) throw logsRes.error;
    if (agentsRes.error) throw agentsRes.error;
    if (poolRes.error) throw poolRes.error;

    const logs = logsRes.data || [];
    const agentNames = new Map((agentsRes.data || []).map((a) => [a.id, a.name]));

    // Daily buckets (UTC) covering the full window, oldest first.
    const days = [];
    const dayIndex = new Map();
    for (let i = WINDOW_DAYS - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const key = d.toISOString().slice(0, 10);
      dayIndex.set(key, days.length);
      days.push({ date: key, success: 0, error: 0 });
    }

    const byTool = new Map();
    const byAgent = new Map();
    const tokensByModel = new Map();
    let totalCalls = 0;
    let successCalls = 0;
    let latencySum = 0;
    let latencyCount = 0;
    let totalTokens = 0;
    let rescuedCalls = 0; // succeeded only because rotation failed over past a dead/limited key

    for (const log of logs) {
      totalCalls++;
      const ok = log.status === "SUCCESS";
      if (ok) successCalls++;

      const dayKey = String(log.created_at).slice(0, 10);
      const idx = dayIndex.get(dayKey);
      if (idx !== undefined) {
        if (ok) days[idx].success++;
        else days[idx].error++;
      }

      if (log.tool_name) {
        const t = byTool.get(log.tool_name) || { calls: 0, errors: 0 };
        t.calls++;
        if (!ok) t.errors++;
        byTool.set(log.tool_name, t);
      }

      const agentName = agentNames.get(log.agent_id) || "Unknown agent";
      const a = byAgent.get(agentName) || { calls: 0, errors: 0 };
      a.calls++;
      if (!ok) a.errors++;
      byAgent.set(agentName, a);

      if (typeof log.latency_ms === "number") {
        latencySum += log.latency_ms;
        latencyCount++;
      }

      const usage = log.usage;
      if (usage && typeof usage === "object") {
        const tokens = Number(usage.total_tokens)
          || (Number(usage.prompt_tokens) || 0) + (Number(usage.completion_tokens) || 0);
        if (tokens > 0) {
          totalTokens += tokens;
          const model = typeof log.model === "string" && log.model ? log.model : "unknown";
          tokensByModel.set(model, (tokensByModel.get(model) || 0) + tokens);
        }
      }

      if (ok && Number(log.attempts) > 1) rescuedCalls++;
    }

    const topN = (map, n) =>
      [...map.entries()]
        .map(([name, v]) => ({ name, ...(typeof v === "object" ? v : { value: v }) }))
        .sort((a, b) => (b.calls ?? b.value) - (a.calls ?? a.value))
        .slice(0, n);

    // Key-pool health per pool key; "cooling" with an elapsed cooldown is effectively active.
    const now = Date.now();
    const pools = (poolRes.data || []).map((k) => ({
      label: k.label || `Key ${k.key_hint || ""}`.trim(),
      key_hint: k.key_hint,
      status: k.status === "cooling" && k.cooldown_until && new Date(k.cooldown_until).getTime() <= now
        ? "active"
        : k.status,
      success_count: k.success_count || 0,
      failure_count: k.failure_count || 0,
      last_success_at: k.last_success_at
    }));

    return NextResponse.json({
      success: true,
      window_days: WINDOW_DAYS,
      truncated: logs.length >= MAX_LOG_ROWS,
      totals: {
        calls: totalCalls,
        success_rate: totalCalls ? successCalls / totalCalls : null,
        avg_latency_ms: latencyCount ? Math.round(latencySum / latencyCount) : null,
        llm_tokens: totalTokens,
        rescued_calls: rescuedCalls
      },
      daily: days,
      by_tool: topN(byTool, 8),
      by_agent: topN(byAgent, 8),
      tokens_by_model: [...tokensByModel.entries()]
        .map(([name, tokens]) => ({ name, tokens }))
        .sort((a, b) => b.tokens - a.tokens)
        .slice(0, 8),
      key_pool: pools
    });
  } catch (err) {
    console.error("Error building analytics summary:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to build analytics summary" },
      { status: err.message?.includes("Unauthorized") ? 401 : 500 }
    );
  }
}
