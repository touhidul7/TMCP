import { NextResponse } from "next/server";
import { validateAgentApiKey } from "@/lib/auth/api-key-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Agent-facing approval status. The agent that queued an approval-gated call polls this with the
// same API key to learn the decision and, once approved and executed, retrieve the result.
export async function GET(request, { params }) {
  let agentContext;
  try {
    agentContext = await validateAgentApiKey(request);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Unauthorized" },
      { status: 401 }
    );
  }

  const { approvalId } = await params;
  const { workspaceId, agentId } = agentContext;

  const { data: approval, error } = await supabaseAdmin
    .from("tool_approvals")
    .select("id, status, feature_key, created_at, approved_at, rejected_at, executed_at, result, error")
    .eq("id", approvalId)
    .eq("workspace_id", workspaceId)
    .eq("agent_id", agentId)
    .maybeSingle();

  if (error && error.code !== "22P02") {
    return NextResponse.json(
      { success: false, error: error.message || "Failed to load approval" },
      { status: 500 }
    );
  }
  if (!approval) {
    return NextResponse.json(
      { success: false, error: "Approval not found for this agent" },
      { status: 404 }
    );
  }

  const base = {
    success: true,
    approval_id: approval.id,
    status: approval.status,
    feature_key: approval.feature_key,
    created_at: approval.created_at
  };

  if (approval.status === "pending") {
    return NextResponse.json({ ...base, message: "Awaiting administrator decision. Poll again later." });
  }
  if (approval.status === "rejected") {
    return NextResponse.json({ ...base, rejected_at: approval.rejected_at });
  }

  // Approved: include the execution outcome once the call has run.
  return NextResponse.json({
    ...base,
    approved_at: approval.approved_at,
    executed: Boolean(approval.executed_at),
    ...(approval.executed_at
      ? (approval.error ? { execution_error: approval.error } : { result: approval.result })
      : { message: "Approved; execution in progress. Poll again shortly." })
  });
}
