import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(request, { params }) {
  try {
    const user = await requireUser(request);
    // Disconnecting is a workspace-level action: anyone with the permission may
    // remove any connected account within their own workspace (connections are
    // shared resources, not owned per-user).
    await requirePermission(user, "tools.disconnect_account");

    const { toolAccountId } = await params;

    // Verify the account exists and belongs to the caller's workspace
    const { data: account, error: accErr } = await supabaseAdmin
      .from("tool_accounts")
      .select("id, workspace_id")
      .eq("id", toolAccountId)
      .maybeSingle();

    if (accErr || !account) {
      throw new Error("NotFound: Tool account not found");
    }
    if (account.workspace_id !== user.workspace_id) {
      throw new Error("Forbidden: This tool account belongs to a different workspace");
    }

    // Cascade delete: credentials → agent permissions → account
    await supabaseAdmin
      .from("tool_account_credentials")
      .delete()
      .eq("tool_account_id", toolAccountId);

    await supabaseAdmin
      .from("agent_tool_permissions")
      .delete()
      .eq("tool_account_id", toolAccountId);

    const { error: delErr } = await supabaseAdmin
      .from("tool_accounts")
      .delete()
      .eq("id", toolAccountId)
      .eq("workspace_id", user.workspace_id);

    if (delErr) throw delErr;

    return NextResponse.json({
      success: true,
      message: "Tool account permanently deleted",
    });
  } catch (err) {
    const message = err.message || "Failed to delete tool account";
    const status = message.includes("Unauthorized") ? 401
      : message.includes("Forbidden") ? 403
      : message.includes("NotFound") ? 404
      : 400;
    return NextResponse.json(
      { success: false, error: message.replace(/^(NotFound|Forbidden|Unauthorized):\s*/, "") },
      { status }
    );
  }
}
