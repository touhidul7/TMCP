import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
const { encryptText } = require("@/lib/crypto/encrypt");

const AddAccountSchema = z.object({
  toolId: z.string().uuid(),
  label: z.string().min(1, "Account label is required"),
  accountEmail: z.string().optional(),
  credentials: z.object({
    apiKey: z.string().optional(),
    accessToken: z.string().optional(),
    refreshToken: z.string().optional(),
    clientSecret: z.string().optional(),
    email: z.string().optional()
  })
});

export async function POST(request) {
  try {
    const userContext = await requireUser(request);
    await requirePermission(userContext, "tools.connect_account");

    const body = await request.json();
    const parsed = AddAccountSchema.parse(body);

    // Get tool to determine auth type
    const { data: tool, error: toolError } = await supabaseAdmin
      .from("tools")
      .select("tool_type, slug")
      .eq("id", parsed.toolId)
      .single();

    if (toolError || !tool) {
      throw new Error("Associated tool not found");
    }

    const authType = parsed.credentials.apiKey ? "api_key" : "oauth";

    // Insert into tool_accounts
    const { data: account, error: accError } = await supabaseAdmin
      .from("tool_accounts")
      .insert({
        workspace_id: userContext.workspace_id,
        user_id: userContext.id,
        tool_id: parsed.toolId,
        label: parsed.label,
        account_email: parsed.accountEmail || parsed.credentials.email || "api-connected@gateway.local",
        status: "connected",
        auth_type: authType
      })
      .select()
      .single();

    if (accError) throw accError;

    // Encrypt credentials
    const encryptedApiKey = parsed.credentials.apiKey ? encryptText(parsed.credentials.apiKey) : null;
    const encryptedAccessToken = parsed.credentials.accessToken ? encryptText(parsed.credentials.accessToken) : null;
    const encryptedRefreshToken = parsed.credentials.refreshToken ? encryptText(parsed.credentials.refreshToken) : null;
    const encryptedClientSecret = parsed.credentials.clientSecret ? encryptText(parsed.credentials.clientSecret) : null;

    // Insert into tool_account_credentials
    const { error: credsError } = await supabaseAdmin
      .from("tool_account_credentials")
      .insert({
        workspace_id: userContext.workspace_id,
        user_id: userContext.id,
        tool_account_id: account.id,
        encrypted_api_key: encryptedApiKey,
        encrypted_access_token: encryptedAccessToken,
        encrypted_refresh_token: encryptedRefreshToken,
        encrypted_client_secret: encryptedClientSecret
      });

    if (credsError) throw credsError;

    // Generate permission records for all active agents in this workspace
    const { data: agents } = await supabaseAdmin
      .from("agents")
      .select("id")
      .eq("workspace_id", userContext.workspace_id)
      .eq("status", "active");

    const { data: features } = await supabaseAdmin
      .from("tool_features")
      .select("feature_key, is_dangerous")
      .eq("tool_id", parsed.toolId);

    if (agents && features && agents.length > 0 && features.length > 0) {
      const permsToInsert = [];
      agents.forEach((agent) => {
        features.forEach((feat) => {
          permsToInsert.push({
            workspace_id: userContext.workspace_id,
            user_id: userContext.id,
            agent_id: agent.id,
            tool_id: parsed.toolId,
            tool_account_id: account.id,
            feature_key: feat.feature_key,
            allowed: feat.is_dangerous ? false : true, // disable dangerous by default
            daily_limit: feat.is_dangerous ? 5 : 100,
            require_approval: feat.is_dangerous ? true : false
          });
        });
      });

      if (permsToInsert.length > 0) {
        await supabaseAdmin.from("agent_tool_permissions").insert(permsToInsert);
      }
    }

    return NextResponse.json({ success: true, account });

  } catch (err) {
    console.error("Error adding tool account:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to add tool account" },
      { status: err.message?.includes("Unauthorized") ? 401 : err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
