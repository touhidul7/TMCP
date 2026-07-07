import { supabaseAdmin } from "../supabase/admin";

const DANGEROUS_FEATURES = [
  "gmail.send", "gmail.create_draft", "drive.upload", "drive.delete", "drive.share_public",
  "calendar.create_event", "calendar.delete_event", "custom_rest.write", "custom_mcp.write"
];

export async function checkAgentToolPermission({ agentId, toolAccountId, featureKey }) {
  // Query permission matrix entry
  const { data: perm, error } = await supabaseAdmin
    .from("agent_tool_permissions")
    .select("allowed, daily_limit, per_minute_limit, require_approval")
    .eq("agent_id", agentId)
    .eq("tool_account_id", toolAccountId)
    .eq("feature_key", featureKey)
    .maybeSingle();

  const isDangerous = DANGEROUS_FEATURES.includes(featureKey);

  // If there is no specific entry: deny by default (explicit grant required)
  if (error || !perm) {
    return {
      allowed: false,
      reason: `Access denied: No permission record found for feature '${featureKey}'. Explicit authorization is required.`,
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
    perMinuteLimit: perm.per_minute_limit || null,
    requiresApproval: perm.require_approval
  };
}

// Per-minute burst limiting via an atomic increment-and-read (bump_minute_usage RPC from
// migration 011). Rejected attempts still count toward the cap. Fail-open: if the counter is
// unreachable (or the migration hasn't been applied yet), the request is allowed.
export async function checkMinuteRateLimit({ agentId, apiKeyId, featureKey, perMinuteLimit }) {
  if (!perMinuteLimit || perMinuteLimit <= 0) return { allowed: true };

  const { data: count, error } = await supabaseAdmin.rpc("bump_minute_usage", {
    p_agent_id: agentId,
    p_api_key_id: apiKeyId,
    p_feature_key: featureKey
  });

  if (error || typeof count !== "number") {
    if (error) console.error("Minute rate-limit counter error:", error);
    return { allowed: true };
  }

  // Opportunistic cleanup: old minute buckets are useless after an hour.
  if (Math.random() < 0.01) {
    supabaseAdmin
      .from("usage_counters")
      .delete()
      .lt("bucket_start", new Date(Date.now() - 60 * 60 * 1000).toISOString())
      .then(({ error: cleanErr }) => {
        if (cleanErr) console.error("usage_counters cleanup error:", cleanErr);
      });
  }

  return { allowed: count <= perMinuteLimit, count };
}

// Successful calls in the last 24h for this agent/key/feature. Returns null on error so callers
// can fail safe (allow the request). Split out from checkRateLimit so routes can run the count
// in parallel with the permission lookup and compare against the daily limit afterwards.
export async function countDailyUsage({ agentId, apiKeyId, featureKey }) {
  const past24Hours = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

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
    return null;
  }

  return count || 0;
}

export async function checkRateLimit({ agentId, apiKeyId, featureKey, dailyLimit }) {
  const used = await countDailyUsage({ agentId, apiKeyId, featureKey });
  if (used === null) return true; // fail-safe (allow request)
  return used < dailyLimit;
}
export { DANGEROUS_FEATURES };
