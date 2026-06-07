import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(request, { params }) {
  try {
    const user = await requireUser(request);
    // Only the owner of the tool account may delete it
    await requirePermission(user, "tools.disconnect_account");

    const { toolAccountId } = params;

    // Verify the account exists and belongs to the user
    const { data: account, error: accErr } = await supabaseAdmin
      .from("tool_accounts")
      .select("id, user_id, workspace_id")
      .eq("id", toolAccountId)
      .single();

    if (accErr || !account) {
      throw new Error("Tool account not found");
    }
    if (account.user_id !== user.id) {
      throw new Error("You can only delete your own tool accounts");
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
      .eq("id", toolAccountId);

    if (delErr) throw delErr;

    return NextResponse.json({
      success: true,
      message: "Tool account permanently deleted",
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err.message },
      { status: err.message?.includes("You can only") ? 403 : 400 }
    );
  }
}
