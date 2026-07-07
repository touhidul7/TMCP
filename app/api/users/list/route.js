import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";

// Workspace members with their real identities. Emails/names live in auth.users, which the
// browser client cannot join against — so the dashboard fetches members here, where the admin
// client can resolve each user id.
export async function GET(request) {
  try {
    const user = await requireUser(request);
    await requirePermission(user, "users.view");

    const { data: members, error } = await supabaseAdmin
      .from("workspace_members")
      .select("user_id, role, status, created_at")
      .eq("workspace_id", user.workspace_id);
    if (error) throw error;

    const resolved = await Promise.all(
      (members || []).map(async (m) => {
        let email = null;
        let name = null;
        try {
          const { data } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
          email = data?.user?.email || null;
          name = data?.user?.user_metadata?.full_name
            || data?.user?.user_metadata?.name
            || (email ? email.split("@")[0] : null);
        } catch {
          // auth lookup failures degrade to id-only rows rather than failing the list
        }
        return {
          id: m.user_id,
          name: name || "Unknown member",
          email: email || "unknown",
          role: m.role,
          status: m.status,
          joined_at: m.created_at
        };
      })
    );

    return NextResponse.json({ success: true, members: resolved });
  } catch (err) {
    console.error("Error listing workspace members:", err);
    const status = err.message?.includes("Unauthorized") ? 401
      : err.message?.includes("Forbidden") ? 403
      : 500;
    return NextResponse.json({ success: false, error: err.message || "Failed to list members" }, { status });
  }
}
