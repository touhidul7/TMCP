import { supabaseAdmin } from "../supabase/admin";
const { hashApiKey } = require("../crypto/hash-api-key");

export async function validateAgentApiKey(request) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Unauthorized: Missing or invalid Authorization header");
  }

  const apiKey = authHeader.substring(7).trim();
  if (!apiKey.startsWith("mcp_live_")) {
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
      status,
      expires_at,
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

  // Update last_used_at asynchronously
  supabaseAdmin
    .from("api_keys")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", keyRecord.id)
    .then();

  return {
    apiKeyId: keyRecord.id,
    workspaceId: keyRecord.workspace_id,
    agentId: keyRecord.agent_id,
    agentName: agent.name
  };
}
