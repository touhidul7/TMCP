import { supabaseAdmin } from "../supabase/admin";

const DANGEROUS_FEATURES = [
  "gmail.send", "gmail.create_draft", "drive.upload", "drive.delete", "drive.share_public",
  "calendar.create_event", "calendar.delete_event", "custom_rest.write", "custom_mcp.write"
];

export async function checkAgentToolPermission({ agentId, toolAccountId, featureKey }) {
  // Query permission matrix entry
  const { data: perm, error } = await supabaseAdmin
    .from("agent_tool_permissions")
    .select("allowed, daily_limit, require_approval")
    .eq("agent_id", agentId)
    .eq("tool_account_id", toolAccountId)
    .eq("feature_key", featureKey)
    .maybeSingle();

  const isDangerous = DANGEROUS_FEATURES.includes(featureKey);

  // If there is no specific entry:
  if (error || !perm) {
    // Dangerous features are blocked by default. Non-dangerous are allowed.
    if (isDangerous) {
      return {
        allowed: false,
        reason: "Access denied: Dangerous tool actions require explicit authorization.",
        requiresApproval: true
      };
    }
    return {
      allowed: true,
      dailyLimit: 100,
      requiresApproval: false
    };
  }

  if (!perm.allowed) {
    return {
      allowed: false,
      reason: `Access denied: Feature ${featureKey} is explicitly disabled for this agent.`,
      requiresApproval: perm.require_approval
    };
  }

  return {
    allowed: true,
    dailyLimit: perm.daily_limit || 100,
    requiresApproval: perm.require_approval
  };
}

export async function checkRateLimit({ agentId, apiKeyId, featureKey, dailyLimit }) {
  const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  // Query logs count in the last 24h
  const { count, error } = await supabaseAdmin
    .from("tool_call_logs")
    .select("id", { count: "exact", head: true })
    .eq("agent_id", agentId)
    .eq("api_key_id", apiKeyId)
    .eq("feature_key", featureKey)
    .eq("status", "SUCCESS")
    .gt("created_at", past24Hours);

  if (error) {
    console.error("Error checking rate limit logs count:", error);
    return true; // fail-safe (allow request)
  }

  return (count || 0) < dailyLimit;
}
export { DANGEROUS_FEATURES };
