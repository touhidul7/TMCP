import { supabaseAdmin } from "../supabase/admin";

function redactSensitiveData(data) {
  if (!data) return data;
  if (typeof data !== "object") return data;

  const redacted = Array.isArray(data) ? [...data] : { ...data };
  const keysToRedact = [
    "api_key", "apikey", "secret", "password", "token", "access_token",
    "refresh_token", "client_secret", "key", "auth", "credentials"
  ];

  for (const k in redacted) {
    if (typeof redacted[k] === "object") {
      redacted[k] = redactSensitiveData(redacted[k]);
    } else if (keysToRedact.includes(k.toLowerCase())) {
      redacted[k] = "[REDACTED]";
    }
  }

  return redacted;
}

export async function logToolCall({
  workspaceId,
  userId = null,
  agentId = null,
  apiKeyId = null,
  toolId,
  toolAccountId = null,
  toolName,
  featureKey,
  input,
  output = null,
  status,
  error = null,
  latencyMs
}) {
  try {
    const redactedInput = redactSensitiveData(input);
    const redactedOutput = redactSensitiveData(output);

    const logEntry = {
      workspace_id: workspaceId,
      user_id: userId,
      agent_id: agentId,
      api_key_id: apiKeyId,
      tool_id: toolId,
      tool_account_id: toolAccountId,
      tool_name: toolName,
      feature_key: featureKey,
      input: redactedInput,
      output: redactedOutput,
      status,
      error: error ? (error.message || String(error)) : null,
      latency_ms: latencyMs,
      created_at: new Date().toISOString()
    };

    const { error: dbError } = await supabaseAdmin
      .from("tool_call_logs")
      .insert(logEntry);

    if (dbError) {
      console.error("Failed to write to tool_call_logs:", dbError);
    }
  } catch (e) {
    console.error("Error logging tool call:", e);
  }
}
