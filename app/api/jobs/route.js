import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const DeliverySchema = z.object({
  type: z.enum(["none", "webhook", "email"]).default("none"),
  target: z.string().optional()
}).refine((d) => d.type === "none" || (d.target && d.target.length > 3), {
  message: "delivery.target is required for webhook/email delivery"
});

const CreateJobSchema = z.object({
  name: z.string().min(1).max(120),
  agent_id: z.string().uuid(),
  api_key_id: z.string().uuid(),
  tool_account_id: z.string().uuid(),
  feature_key: z.string().min(1).max(200),
  input: z.record(z.string(), z.any()).default({}),
  interval_minutes: z.number().int().min(5).max(60 * 24 * 30),
  delivery: DeliverySchema.default({ type: "none" })
});

function errStatus(message) {
  if (message?.includes("Unauthorized")) return 401;
  if (message?.includes("Forbidden")) return 403;
  return 400;
}

export async function GET(request) {
  try {
    const user = await requireUser(request);
    const { data, error } = await supabaseAdmin
      .from("scheduled_jobs")
      .select("id, name, agent_id, api_key_id, tool_account_id, feature_key, input, interval_minutes, delivery, is_enabled, next_run_at, last_run_at, last_status, last_error, created_at")
      .eq("workspace_id", user.workspace_id)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ success: true, jobs: data || [] });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message || "Failed to list jobs" }, { status: errStatus(err.message) });
  }
}

export async function POST(request) {
  try {
    const user = await requireUser(request);
    await requirePermission(user, "agents.edit");

    const parsed = CreateJobSchema.parse(await request.json());

    // The agent, API key, and account must all live in the caller's workspace, and the key must
    // belong to the chosen agent — the job runs with exactly that identity.
    const [agentRes, keyRes, accountRes] = await Promise.all([
      supabaseAdmin.from("agents").select("id").eq("id", parsed.agent_id).eq("workspace_id", user.workspace_id).maybeSingle(),
      supabaseAdmin.from("api_keys").select("id, agent_id, status").eq("id", parsed.api_key_id).eq("workspace_id", user.workspace_id).maybeSingle(),
      supabaseAdmin.from("tool_accounts").select("id").eq("id", parsed.tool_account_id).eq("workspace_id", user.workspace_id).maybeSingle()
    ]);

    if (!agentRes.data) throw new Error("Agent not found in this workspace");
    if (!keyRes.data || keyRes.data.agent_id !== parsed.agent_id) throw new Error("API key not found or does not belong to the selected agent");
    if (keyRes.data.status !== "active") throw new Error("The selected API key is not active");
    if (!accountRes.data) throw new Error("Tool account not found in this workspace");

    const { data: job, error } = await supabaseAdmin
      .from("scheduled_jobs")
      .insert({
        workspace_id: user.workspace_id,
        created_by: user.id,
        agent_id: parsed.agent_id,
        api_key_id: parsed.api_key_id,
        tool_account_id: parsed.tool_account_id,
        name: parsed.name,
        feature_key: parsed.feature_key,
        input: parsed.input,
        interval_minutes: parsed.interval_minutes,
        delivery: parsed.delivery,
        is_enabled: true,
        next_run_at: new Date().toISOString()
      })
      .select()
      .single();
    if (error) throw error;

    return NextResponse.json({ success: true, job });
  } catch (err) {
    console.error("Error creating scheduled job:", err);
    return NextResponse.json({ success: false, error: err.message || "Failed to create job" }, { status: errStatus(err.message) });
  }
}
