import { supabaseAdmin } from "../supabase/admin";
import { getExampleInput } from "../docs/gateway-docs";

// Model Context Protocol server core for TMCP. The pure protocol logic (version negotiation,
// naming, result shaping) lives in protocol-core.js so it can be unit tested without a DB;
// this module adds the database-backed tool listing and re-exports the core.
const core = require("./protocol-core");

export const {
  LATEST_PROTOCOL_VERSION,
  SERVER_INFO,
  SERVER_CAPABILITIES,
  SERVER_INSTRUCTIONS,
  mcpToolName,
  rpcResult,
  rpcError,
  RPC_ERRORS,
  handleInitialize,
  toolCallResultFromOutcome
} = core;

function schemaForFeature(feature, featureKey) {
  if (feature?.input_schema && typeof feature.input_schema === "object") {
    return feature.input_schema;
  }
  const example = getExampleInput(featureKey);
  return {
    type: "object",
    additionalProperties: true,
    description: `Input for ${featureKey}. Example: ${JSON.stringify(example)}`
  };
}

// Everything the calling agent may invoke, with MCP names attached. Three batched queries total
// (accounts, features, permissions) regardless of workspace size. Used by both tools/list and
// tools/call — call resolution matches against the same generated names, so no name parsing is
// ever needed.
export async function listAgentMcpTools({ workspaceId, agentId }) {
  const { data: accounts, error: accError } = await supabaseAdmin
    .from("tool_accounts")
    .select("id, label, tool_id, tools ( id, name, is_enabled )")
    .eq("workspace_id", workspaceId)
    .eq("status", "connected");
  if (accError) throw accError;

  const enabledAccounts = (accounts || []).filter((a) => a.tools?.is_enabled);
  if (enabledAccounts.length === 0) return [];

  const toolIds = [...new Set(enabledAccounts.map((a) => a.tool_id))];
  const accountIds = enabledAccounts.map((a) => a.id);

  const [featuresRes, permsRes] = await Promise.all([
    supabaseAdmin
      .from("tool_features")
      .select("tool_id, feature_key, name, description, input_schema")
      .in("tool_id", toolIds)
      .eq("is_enabled", true),
    supabaseAdmin
      .from("agent_tool_permissions")
      .select("tool_account_id, feature_key")
      .eq("agent_id", agentId)
      .in("tool_account_id", accountIds)
      .eq("allowed", true)
  ]);
  if (featuresRes.error) throw featuresRes.error;
  if (permsRes.error) throw permsRes.error;

  const featureByToolAndKey = new Map();
  for (const feat of featuresRes.data || []) {
    featureByToolAndKey.set(`${feat.tool_id}:${feat.feature_key}`, feat);
  }

  // Count how many accounts each allowed feature key spans to know when names need suffixes.
  const accountById = new Map(enabledAccounts.map((a) => [a.id, a]));
  const grants = (permsRes.data || []).filter((p) => accountById.has(p.tool_account_id));
  const featureKeyCounts = new Map();
  for (const grant of grants) {
    featureKeyCounts.set(grant.feature_key, (featureKeyCounts.get(grant.feature_key) || 0) + 1);
  }

  const entries = [];
  for (const grant of grants) {
    const account = accountById.get(grant.tool_account_id);
    const feature = featureByToolAndKey.get(`${account.tool_id}:${grant.feature_key}`);
    if (!feature) continue; // permission exists but the feature is disabled or removed

    const ambiguous = featureKeyCounts.get(grant.feature_key) > 1;
    entries.push({
      name: core.mcpToolName(grant.feature_key, account.id, ambiguous),
      description: [
        feature.description || feature.name || grant.feature_key,
        `Runs through the '${account.label}' ${account.tools.name} account on TMCP.`
      ].join(" "),
      inputSchema: schemaForFeature(feature, grant.feature_key),
      featureKey: grant.feature_key,
      toolAccountId: account.id,
      toolName: account.tools.name,
      accountLabel: account.label
    });
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  return entries;
}
