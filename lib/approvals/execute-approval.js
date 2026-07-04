import { supabaseAdmin } from "../supabase/admin";
import { logToolCall } from "../logs/log-tool-call";
const { runTool } = require("../tools/router");

// Run an approved tool call with the exact input the agent originally submitted, and persist the
// outcome on the approval row so the agent can retrieve it via GET /api/gateway/approvals/{id}.
// Permission and rate-limit checks are intentionally NOT repeated: the administrator's approval
// is the authorization for this specific, already-recorded call.
export async function executeApprovedCall(approval, approvedByUserId) {
  const startTime = performance.now();

  const { data: account, error: accError } = await supabaseAdmin
    .from("tool_accounts")
    .select(`
      id,
      label,
      connection_metadata,
      tools (
        id, name, tool_type, is_enabled, mcp_server_url, rest_base_url, mcp_config, rest_config
      )
    `)
    .eq("id", approval.tool_account_id)
    .eq("workspace_id", approval.workspace_id)
    .maybeSingle();

  if (accError || !account?.tools) {
    return { success: false, error: "Tool account no longer exists or is inaccessible" };
  }
  if (!account.tools.is_enabled) {
    return { success: false, error: "Associated tool is disabled" };
  }

  const { data: creds, error: credsError } = await supabaseAdmin
    .from("tool_account_credentials")
    .select(
      "encrypted_access_token, encrypted_refresh_token, encrypted_api_key, encrypted_client_secret," +
      "encrypted_private_key, encrypted_private_key_passphrase, encrypted_password, encrypted_sudo_password"
    )
    .eq("tool_account_id", account.id)
    .maybeSingle();
  if (credsError) {
    return { success: false, error: credsError.message || "Failed to load credentials" };
  }

  const toolRecord = account.tools;
  toolRecord._connectionMetadata = account.connection_metadata || {};

  const logBase = {
    workspaceId: approval.workspace_id,
    userId: approvedByUserId,
    agentId: approval.agent_id,
    apiKeyId: approval.api_key_id,
    toolId: toolRecord.id,
    toolAccountId: account.id,
    toolName: toolRecord.name,
    featureKey: approval.feature_key,
    input: approval.input || {}
  };

  try {
    const data = await runTool({
      tool: toolRecord,
      featureKey: approval.feature_key,
      input: approval.input || {},
      credentialRecord: creds
    });
    logToolCall({
      ...logBase,
      output: data,
      status: "SUCCESS",
      latencyMs: Math.round(performance.now() - startTime)
    });
    return { success: true, data };
  } catch (err) {
    logToolCall({
      ...logBase,
      status: "FAILED",
      error: err.message || "Execution Failed",
      latencyMs: Math.round(performance.now() - startTime)
    });
    return { success: false, error: err.message || "Failed to execute tool" };
  }
}
