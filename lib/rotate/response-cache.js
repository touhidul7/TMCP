import { createHash } from "crypto";
import { supabaseAdmin } from "../supabase/admin";
import { deferAfterResponse } from "../async/defer";

// Short-TTL response cache for rotate proxies (rotate_cache table, migration 011). Identical
// requests within the TTL are served from the cache instead of consuming pool quota. Only
// deterministic-enough calls should be cached (search queries, embeddings) — never chat
// completions. Bodies above the size cap are passed through uncached.

export const MAX_CACHEABLE_BYTES = 256 * 1024;

export function cacheKeyFor({ accountId, method, path, query = "", body = null }) {
  const h = createHash("sha256");
  h.update(accountId);
  h.update("\0");
  h.update(method);
  h.update("\0");
  h.update(path);
  h.update("\0");
  h.update(query);
  h.update("\0");
  if (body) h.update(body);
  return h.digest("hex");
}

export async function getCachedResponse(cacheKey) {
  const { data, error } = await supabaseAdmin
    .from("rotate_cache")
    .select("status, content_type, body_base64, expires_at")
    .eq("cache_key", cacheKey)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error || !data) return null;
  return {
    status: data.status,
    contentType: data.content_type,
    body: Buffer.from(data.body_base64, "base64")
  };
}

// Store a successful response after it has been sent (never blocks the caller). Oversized
// bodies are skipped, and ~1% of writes sweep expired rows so the table stays small.
export function putCachedResponse({ cacheKey, workspaceId, status, contentType, body, ttlSeconds }) {
  if (!ttlSeconds || ttlSeconds <= 0) return;
  if (!body || body.length === 0 || body.length > MAX_CACHEABLE_BYTES) return;
  if (status < 200 || status >= 300) return;

  deferAfterResponse(async () => {
    const { error } = await supabaseAdmin
      .from("rotate_cache")
      .upsert({
        cache_key: cacheKey,
        workspace_id: workspaceId,
        status,
        content_type: contentType || null,
        body_base64: Buffer.from(body).toString("base64"),
        expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString()
      });
    if (error) console.error("rotate_cache write error:", error);

    if (Math.random() < 0.01) {
      const { error: sweepErr } = await supabaseAdmin
        .from("rotate_cache")
        .delete()
        .lt("expires_at", new Date().toISOString());
      if (sweepErr) console.error("rotate_cache sweep error:", sweepErr);
    }
  });
}
