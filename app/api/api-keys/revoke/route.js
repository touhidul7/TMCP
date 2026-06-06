import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const RevokeKeySchema = z.object({
  keyId: z.string().uuid()
});

export async function POST(request) {
  try {
    const userContext = await requireUser(request);
    await requirePermission(userContext, "api_keys.revoke");

    const body = await request.json();
    const parsed = RevokeKeySchema.parse(body);

    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .update({ status: "revoked" })
      .eq("id", parsed.keyId)
      .eq("workspace_id", userContext.workspace_id)
      .select("id, status")
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, key: data });

  } catch (err) {
    console.error("Error revoking API key:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to revoke API key" },
      { status: err.message?.includes("Unauthorized") ? 401 : err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
