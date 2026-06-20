import { supabaseAdmin } from "../supabase/admin";
const { encryptText } = require("../crypto/encrypt");

// Map a rotate tool slug to its provider identifier.
export const ROTATE_SLUG_TO_PROVIDER = {
  "gemini-rotate": "gemini",
  "openrouter-rotate": "openrouter"
};

function keyHint(rawKey) {
  const tail = String(rawKey).slice(-4);
  return `…${tail}`;
}

// Display rows for the management UI — never includes the encrypted/raw key.
export async function listPoolKeys(toolAccountId) {
  const { data, error } = await supabaseAdmin
    .from("provider_key_pool")
    .select("id, label, key_hint, status, cooldown_until, last_used_at, last_success_at, success_count, failure_count, created_at")
    .eq("tool_account_id", toolAccountId)
    .order("created_at", { ascending: true });
  if (error) throw error;

  const now = Date.now();
  return (data || []).map((k) => ({
    ...k,
    // A 'cooling' key whose cooldown has passed is effectively active again.
    status: k.status === "cooling" && k.cooldown_until && new Date(k.cooldown_until).getTime() <= now ? "active" : k.status
  }));
}

export async function addPoolKey({ workspaceId, toolAccountId, provider, label, rawKey }) {
  const row = {
    workspace_id: workspaceId,
    tool_account_id: toolAccountId,
    provider,
    label: label || null,
    encrypted_key: encryptText(rawKey.trim()),
    key_hint: keyHint(rawKey.trim()),
    status: "active"
  };
  const { data, error } = await supabaseAdmin
    .from("provider_key_pool")
    .insert(row)
    .select("id, label, key_hint, status, created_at")
    .single();
  if (error) throw error;
  return data;
}

export async function deletePoolKey({ toolAccountId, keyId }) {
  const { error } = await supabaseAdmin
    .from("provider_key_pool")
    .delete()
    .eq("id", keyId)
    .eq("tool_account_id", toolAccountId);
  if (error) throw error;
}

// Active keys whose cooldown has expired, ordered round-robin (least-recently-used first).
export async function getRotationCandidates(toolAccountId) {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("provider_key_pool")
    .select("id, encrypted_key")
    .eq("tool_account_id", toolAccountId)
    .neq("status", "disabled")
    .or(`cooldown_until.is.null,cooldown_until.lte.${nowIso}`)
    .order("last_used_at", { ascending: true, nullsFirst: true });
  if (error) throw error;
  return data || [];
}

export async function markCooldown(keyId, cooldownSeconds) {
  const { data } = await supabaseAdmin
    .from("provider_key_pool")
    .select("failure_count")
    .eq("id", keyId)
    .maybeSingle();
  const until = new Date(Date.now() + (cooldownSeconds || 60) * 1000).toISOString();
  await supabaseAdmin
    .from("provider_key_pool")
    .update({
      status: "cooling",
      cooldown_until: until,
      last_used_at: new Date().toISOString(),
      failure_count: (data?.failure_count || 0) + 1
    })
    .eq("id", keyId);
}

export async function markResult(keyId, success) {
  const { data } = await supabaseAdmin
    .from("provider_key_pool")
    .select("success_count, failure_count")
    .eq("id", keyId)
    .maybeSingle();
  const nowIso = new Date().toISOString();
  await supabaseAdmin
    .from("provider_key_pool")
    .update({
      status: "active",
      cooldown_until: null,
      last_used_at: nowIso,
      ...(success
        ? { last_success_at: nowIso, success_count: (data?.success_count || 0) + 1 }
        : { failure_count: (data?.failure_count || 0) + 1 })
    })
    .eq("id", keyId);
}
