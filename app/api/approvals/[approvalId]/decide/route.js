import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { executeApprovedCall } from "@/lib/approvals/execute-approval";

// Decide a pending approval. Approving executes the queued call immediately and stores the
// outcome on the approval row, so the requesting agent can pick the result up from
// GET /api/gateway/approvals/{id}. Rejecting just records the rejection.
export async function POST(request, { params }) {
  try {
    const user = await requireUser(request);
    const { approvalId } = await params;

    let body = {};
    try {
      body = await request.json();
    } catch {}
    const decision = body.decision;
    if (decision !== "approve" && decision !== "reject") {
      return NextResponse.json(
        { success: false, error: "decision must be 'approve' or 'reject'" },
        { status: 400 }
      );
    }

    await requirePermission(user, decision === "approve" ? "approvals.approve" : "approvals.reject");

    // Claim the row atomically (status filter) so two admins deciding at once can't both win,
    // and an approve can never execute twice.
    const nowIso = new Date().toISOString();
    const claimUpdate = decision === "approve"
      ? { status: "approved", approved_by: user.id, approved_at: nowIso }
      : { status: "rejected", approved_by: user.id, rejected_at: nowIso };

    const { data: approval, error: claimError } = await supabaseAdmin
      .from("tool_approvals")
      .update(claimUpdate)
      .eq("id", approvalId)
      .eq("workspace_id", user.workspace_id)
      .eq("status", "pending")
      .select("*")
      .maybeSingle();

    if (claimError) throw claimError;
    if (!approval) {
      return NextResponse.json(
        { success: false, error: "Approval not found, not in this workspace, or already decided" },
        { status: 409 }
      );
    }

    if (decision === "reject") {
      return NextResponse.json({ success: true, status: "rejected", approval_id: approval.id });
    }

    // Execute the approved call and persist the outcome for the agent to retrieve.
    const outcome = await executeApprovedCall(approval, user.id);
    await supabaseAdmin
      .from("tool_approvals")
      .update({
        result: outcome.success ? outcome.data : null,
        error: outcome.success ? null : outcome.error,
        executed_at: new Date().toISOString()
      })
      .eq("id", approval.id);

    return NextResponse.json({
      success: true,
      status: "approved",
      approval_id: approval.id,
      executed: outcome.success,
      ...(outcome.success ? { result: outcome.data } : { execution_error: outcome.error })
    });
  } catch (err) {
    console.error("Error deciding approval:", err);
    const status = err.message?.includes("Unauthorized") ? 401
      : err.message?.includes("Forbidden") ? 403
      : 500;
    return NextResponse.json(
      { success: false, error: err.message || "Failed to decide approval" },
      { status }
    );
  }
}
