import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const UpdatePermissionSchema = z.object({
  agentId: z.string().uuid(),
  accountId: z.string().uuid(),
  featureKey: z.string().min(1),
  field: z.enum(["allowed", "daily_limit", "per_minute_limit", "require_approval"]),
  value: z.any()
});

export async function POST(request) {
  try {
    const userContext = await requireUser(request);
    await requirePermission(userContext, "agents.edit");

    const body = await request.json();
    const parsed = UpdatePermissionSchema.parse(body);

    // Get tool_id from the account to populate field
    const { data: account, error: accError } = await supabaseAdmin
      .from("tool_accounts")
      .select("tool_id")
      .eq("id", parsed.accountId)
      .single();

    if (accError || !account) {
      throw new Error("Associated tool account not found");
    }

    // Prepare row for upsert
    // per_minute_limit accepts null/0 to mean "no per-minute cap".
    const dbValue = parsed.field === "daily_limit" ? parseInt(parsed.value) || 0
      : parsed.field === "per_minute_limit" ? (parseInt(parsed.value) || null)
      : parsed.value;

    const record = {
      workspace_id: userContext.workspace_id,
      user_id: userContext.id,
      agent_id: parsed.agentId,
      tool_id: account.tool_id,
      tool_account_id: parsed.accountId,
      feature_key: parsed.featureKey,
      [parsed.field === "require_approval" ? "require_approval" : parsed.field]: dbValue
    };

    // Upsert matches on the unique index unique(agent_id, tool_account_id, feature_key)
    const { data, error } = await supabaseAdmin
      .from("agent_tool_permissions")
      .upsert(record, {
        onConflict: "agent_id,tool_account_id,feature_key",
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ success: true, permission: data });

  } catch (err) {
    console.error("Error updating agent tool permission:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update permission" },
      { status: err.message?.includes("Unauthorized") ? 401 : err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
