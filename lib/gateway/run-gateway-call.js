import { supabaseAdmin } from "../supabase/admin";
import { checkAgentToolPermission, countDailyUsage } from "../permissions/check-agent-tool-permission";
import { logToolCall } from "../logs/log-tool-call";
import { deferAfterResponse } from "../async/defer";
import { notifyApprovalRequested } from "../approvals/notify-approval";
const { runTool } = require("../tools/router");

// Shared gateway execution pipeline used by every agent-facing entry point (the MCP server's
// tools/call, the legacy action format, and approval re-execution). Validates account ownership,
// runs the permission / rate-limit / credentials pre-flight in parallel, queues approvals for
// gated features, executes the tool, and writes the audit log. Transport-agnostic: it returns a
// discriminated result ({ kind, ... }) and never touches the HTTP response.
export async function runGatewayCall({
  workspaceId,
  agentId,
  apiKeyId,
  toolAccountId,
  featureKey,
  input = {},
  startTime = performance.now()
}) {
  const latency = () => Math.round(performance.now() - startTime);

  // Validate tool account ownership & load tool details.
  const { data: account, error: accError } = await supabaseAdmin
    .from("tool_accounts")
    .select(`
      id,
      label,
      tool_id,
      workspace_id,
      connection_metadata,
      tools (
        id,
        name,
        tool_type,
        is_enabled,
        mcp_server_url,
        rest_base_url,
        mcp_config,
        rest_config
      )
    `)
    .eq("id", toolAccountId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (accError && accError.code !== "22P02") {
    return { kind: "error", error: accError.message || "Failed to load tool account" };
  }
  if (!account) {
    return { kind: "not_found", error: "Tool account not found or access denied" };
  }

  const toolRecord = account.tools;
  if (!toolRecord || !toolRecord.is_enabled) {
    return { kind: "disabled", error: "Associated tool is disabled" };
  }

  const logBase = {
    workspaceId,
    agentId,
    apiKeyId,
    toolId: toolRecord.id,
    toolAccountId: account.id,
    toolName: toolRecord.name,
    featureKey,
    input
  };

  // Permission check, rate-limit count, and credentials load are independent — one parallel
  // round trip instead of three sequential ones.
  const [permCheck, dailyUsed, credsResult] = await Promise.all([
    checkAgentToolPermission({ agentId, toolAccountId: account.id, featureKey }),
    countDailyUsage({ agentId, apiKeyId, featureKey }),
    supabaseAdmin
      .from("tool_account_credentials")
      .select(
        "encrypted_access_token, encrypted_refresh_token, encrypted_api_key, encrypted_client_secret," +
        "encrypted_private_key, encrypted_private_key_passphrase, encrypted_password, encrypted_sudo_password"
      )
      .eq("tool_account_id", account.id)
      .maybeSingle()
  ]);

  if (!permCheck.allowed) {
    const reason = permCheck.reason || "Permission Denied";
    logToolCall({ ...logBase, status: "DENIED", error: reason, latencyMs: latency() });
    return { kind: "denied", error: reason };
  }

  // Daily rate limit (null count = counting failed; fail safe and allow).
  if (dailyUsed !== null && dailyUsed >= permCheck.dailyLimit) {
    const limitErr = `Rate limit exceeded: Daily cap of ${permCheck.dailyLimit} reached.`;
    logToolCall({ ...logBase, status: "DENIED", error: limitErr, latencyMs: latency() });
    return { kind: "rate_limited", error: limitErr, dailyLimit: permCheck.dailyLimit };
  }

  // Manual approval gate: queue the call instead of running it.
  if (permCheck.requiresApproval) {
    const { data: approval, error: apprError } = await supabaseAdmin
      .from("tool_approvals")
      .insert({
        workspace_id: workspaceId,
        agent_id: agentId,
        api_key_id: apiKeyId,
        tool_id: toolRecord.id,
        tool_account_id: account.id,
        feature_key: featureKey,
        input,
        status: "pending"
      })
      .select("id")
      .single();

    if (apprError) {
      return { kind: "error", error: apprError.message || "Failed to queue approval" };
    }

    logToolCall({
      ...logBase,
      status: "PENDING_APPROVAL",
      error: "Action queued. Awaiting administrator approval.",
      latencyMs: latency()
    });

    // Tell the workspace owner there is something to review (after the response is sent).
    deferAfterResponse(() =>
      notifyApprovalRequested({
        workspaceId,
        agentId,
        approvalId: approval.id,
        featureKey,
        toolName: toolRecord.name
      })
    );

    return {
      kind: "pending",
      approvalId: approval.id,
      toolRecord,
      account
    };
  }

  if (credsResult.error) {
    return { kind: "error", error: credsResult.error.message || "Failed to load credentials" };
  }

  // Attach non-sensitive connection metadata so tool handlers can read host/port/username etc.
  toolRecord._connectionMetadata = account.connection_metadata || {};

  try {
    const data = await runTool({
      tool: toolRecord,
      featureKey,
      input,
      credentialRecord: credsResult.data
    });

    const latencyMs = latency();
    logToolCall({ ...logBase, output: data, status: "SUCCESS", latencyMs });
    return { kind: "success", data, latencyMs, toolRecord, account };
  } catch (err) {
    logToolCall({
      ...logBase,
      status: "FAILED",
      error: err.message || "Execution Failed",
      latencyMs: latency()
    });
    return { kind: "error", error: err.message || "Failed to execute tool" };
  }
}
