import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";

function errStatus(message) {
  if (message?.includes("Unauthorized")) return 401;
  if (message?.includes("Forbidden")) return 403;
  return 400;
}

// Update a job: enable/disable, change interval/input/delivery/name, or `run_now` to pull the
// next run forward to the next scheduler tick.
export async function PATCH(request, { params }) {
  try {
    const user = await requireUser(request);
    await requirePermission(user, "agents.edit");
    const { jobId } = await params;
    const body = await request.json();

    const updates = { updated_at: new Date().toISOString() };
    if (typeof body.is_enabled === "boolean") updates.is_enabled = body.is_enabled;
    if (typeof body.name === "string" && body.name.trim()) updates.name = body.name.trim().slice(0, 120);
    if (Number.isInteger(body.interval_minutes) && body.interval_minutes >= 5) updates.interval_minutes = body.interval_minutes;
    if (body.input && typeof body.input === "object") updates.input = body.input;
    if (body.delivery && typeof body.delivery === "object") updates.delivery = body.delivery;
    if (body.run_now === true) updates.next_run_at = new Date().toISOString();

    const { data: job, error } = await supabaseAdmin
      .from("scheduled_jobs")
      .update(updates)
      .eq("id", jobId)
      .eq("workspace_id", user.workspace_id)
      .select()
      .maybeSingle();
    if (error) throw error;
    if (!job) return NextResponse.json({ success: false, error: "Job not found" }, { status: 404 });

    return NextResponse.json({ success: true, job });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message || "Failed to update job" }, { status: errStatus(err.message) });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireUser(request);
    await requirePermission(user, "agents.edit");
    const { jobId } = await params;

    const { error } = await supabaseAdmin
      .from("scheduled_jobs")
      .delete()
      .eq("id", jobId)
      .eq("workspace_id", user.workspace_id);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false, error: err.message || "Failed to delete job" }, { status: errStatus(err.message) });
  }
}
