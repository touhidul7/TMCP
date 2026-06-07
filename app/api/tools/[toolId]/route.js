import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function DELETE(request, { params }) {
  try {
    const user = await requireUser(request);
    await requirePermission(user, "tools.add");

    const { toolId } = await params;

    // Verify the tool exists and belongs to the user
    const { data: tool, error: fetchErr } = await supabaseAdmin
      .from("tools")
      .select("id, owner_user_id, tool_type, workspace_id")
      .eq("id", toolId)
      .single();

    if (fetchErr || !tool) {
      return NextResponse.json(
        { success: false, error: "Tool not found" },
        { status: 404 }
      );
    }

    if (tool.tool_type === "built_in") {
      return NextResponse.json(
        { success: false, error: "Built-in tools cannot be deleted" },
        { status: 403 }
      );
    }

    if (tool.owner_user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: "You can only delete your own custom tools" },
        { status: 403 }
      );
    }

    // Perform the deletion. ON DELETE CASCADE will handle child records.
    const { error: delErr } = await supabaseAdmin
      .from("tools")
      .delete()
      .eq("id", toolId);

    if (delErr) throw delErr;

    return NextResponse.json({
      success: true,
      message: "Tool permanently deleted",
    });
  } catch (err) {
    console.error("Error deleting tool:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to delete tool" },
      { status: err.message?.includes("Unauthorized") ? 401 : err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
