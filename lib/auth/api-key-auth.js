import { supabaseAdmin } from "../supabase/admin";
import { deferAfterResponse } from "../async/defer";
const { hashApiKey } = require("../crypto/hash-api-key");

// last_used_at is informational ("when was this key last active"), so refreshing it on every
// request just doubles the write load. Only write when the stored value is older than this.
const LAST_USED_REFRESH_MS = 5 * 60 * 1000;

function touchLastUsed(keyRecord) {
  const last = keyRecord.last_used_at ? new Date(keyRecord.last_used_at).getTime() : 0;
  if (Date.now() - last < LAST_USED_REFRESH_MS) return;
  deferAfterResponse(async () => {
    await supabaseAdmin
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", keyRecord.id);
  });
}

export async function validateAgentApiKey(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Missing or invalid Authorization header");
  }

  return validateAgentApiKeyValue(authHeader.substring(7).trim());
}

// Validate a raw TMCP agent API key value (no request object). Used directly by gateways such as
// the Scrape.do/Apify/Serper rotators where the key arrives as a query parameter or custom header.
export async function validateAgentApiKeyValue(apiKey) {
  if (!apiKey || !apiKey.startsWith("mcp_live_")) {
    throw new Error("Unauthorized: Invalid API key format");
  }

  const hashedKey = hashApiKey(apiKey);

  // Query database for the key using Admin client (since external agents don't have user session context)
  const { data: keyRecord, error: keyError } = await supabaseAdmin
    .from("api_keys")
    .select(`
      id,
      workspace_id,
      agent_id,
      user_id,
      status,
      expires_at,
      last_used_at,
      scopes,
      agents (
        name,
        status
      )
    `)
    .eq("key_hash", hashedKey)
    .single();

  if (keyError || !keyRecord) {
    throw new Error("Unauthorized: Invalid API key");
  }

  if (keyRecord.status !== "active") {
    throw new Error("Unauthorized: API key has been revoked or deactivated");
  }

  if (keyRecord.expires_at && new Date(keyRecord.expires_at) < new Date()) {
    throw new Error("Unauthorized: API key has expired");
  }

  const agent = keyRecord.agents;
  if (!agent || agent.status !== "active") {
    throw new Error("Unauthorized: Associated agent is inactive or disabled");
  }

  touchLastUsed(keyRecord);

  return {
    apiKeyId: keyRecord.id,
    workspaceId: keyRecord.workspace_id,
    agentId: keyRecord.agent_id,
    agentName: agent.name,
    keyUserId: keyRecord.user_id,
    // null = unscoped (full agent access); an array narrows the key to matching feature keys.
    scopes: keyRecord.scopes ?? null
  };
}
