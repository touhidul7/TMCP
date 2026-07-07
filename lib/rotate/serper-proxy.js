import { NextResponse } from "next/server";
import { validateAgentApiKeyValue } from "../auth/api-key-auth";
import { checkAgentToolPermission, checkMinuteRateLimit } from "../permissions/check-agent-tool-permission";
const { scopeAllows } = require("../auth/key-scopes");
import { logToolCall } from "../logs/log-tool-call";
import { deferAfterResponse } from "../async/defer";
import { getRotationCandidates, resolveRotateAccount, applyRotationOutcome } from "./key-pool-db";
import { cacheKeyFor, getCachedResponse, putCachedResponse, MAX_CACHEABLE_BYTES } from "./response-cache";
const { decryptText } = require("../crypto/decrypt");
const { runRotation } = require("./rotate-core");

// Serper has two products that share the same account key but live on different hosts:
//   • Search API  — https://google.serper.dev  (/search, /images, /news, /places, /scholar, …)
//   • Scrape API  — https://scrape.serper.dev  (POST a { url } body)
// This gateway is a transparent, path-agnostic proxy for both. The caller swaps the base URL and
// the key (real Serper key -> TMCP agent key, still in X-API-KEY); everything else — method, path,
// query, body, response — is passed through unchanged. The single rotating key pool serves both
// products. Requests under /api/serper/scrape route to the Scrape host; everything else routes to
// the Search host. TMCP fails over to the next key on auth/quota/rate-limit errors, and successful
// responses are streamed straight through (no buffering).
const SERPER_SEARCH_BASE = "https://google.serper.dev";
const SERPER_SCRAPE_BASE = "https://scrape.serper.dev";
const PROXY_PREFIX = "/api/serper";
const SCRAPE_PREFIX = "/scrape";
const SLUG = "serper-rotate";
const FEATURE_KEY = "serper_rotate.proxy";

// Identical Search API requests within this window are served from the response cache instead of
// spending pool quota. 0 disables. (Scrape API responses are streamed/large and never cached.)
const SEARCH_CACHE_TTL_SECONDS = Number(process.env.TMCP_SERPER_CACHE_TTL ?? 600);

// Serper signals "this key can't serve the request" with these statuses — rotate to the next key.
const ROTATE_STATUSES = new Set([401, 402, 403, 429]);

// Request headers we must not forward verbatim (set/replaced by us, or they would break proxying).
const STRIP_REQUEST_HEADERS = new Set([
  "host", "x-api-key", "authorization", "content-length", "connection", "accept-encoding", "transfer-encoding"
]);
// Response headers that no longer apply once fetch has buffered/decoded the body.
const STRIP_RESPONSE_HEADERS = new Set([
  "content-encoding", "content-length", "transfer-encoding", "connection"
]);

function serperError(status, message) {
  return NextResponse.json({ error: { message, type: "tmcp_serper_rotate_error" } }, { status });
}

// The TMCP key arrives in X-API-KEY (drop-in for Serper's own auth). For flexibility we also accept
// an Authorization: Bearer header or a `token` query parameter.
function extractTmcpKey(request, url) {
  const apiKeyHeader = request.headers.get("X-API-KEY");
  if (apiKeyHeader && apiKeyHeader.trim()) return apiKeyHeader.trim();
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.substring(7).trim();
  const tokenParam = url.searchParams.get("token");
  if (tokenParam && tokenParam.trim()) return tokenParam.trim();
  return null;
}

export async function handleSerperRotate(request, { method = "POST" } = {}) {
  const startTime = Date.now();
  const incomingUrl = new URL(request.url);

  const tmcpKey = extractTmcpKey(request, incomingUrl);
  if (!tmcpKey) {
    return serperError(401, "Missing TMCP API key. Pass it in the 'X-API-KEY' header (or an 'Authorization: Bearer' header / 'token' query parameter).");
  }

  let ctx;
  try {
    ctx = await validateAgentApiKeyValue(tmcpKey);
  } catch (err) {
    return serperError(401, err.message || "Unauthorized");
  }
  const { workspaceId, agentId, apiKeyId, scopes } = ctx;

  // Resolve the connected serper-rotate account for this workspace.
  let account;
  try {
    account = await resolveRotateAccount({ workspaceId, slug: SLUG });
  } catch (accErr) {
    return serperError(500, accErr.message || "Failed to resolve rotate account");
  }
  if (!account) {
    return serperError(400, `No connected '${SLUG}' account is configured in this workspace.`);
  }

  // Honour the key scope and the agent permission matrix (single gate covers the whole proxy).
  if (!scopeAllows(scopes, FEATURE_KEY)) {
    return serperError(403, `This API key is scoped and does not permit '${FEATURE_KEY}'.`);
  }
  const perm = await checkAgentToolPermission({ agentId, toolAccountId: account.id, featureKey: FEATURE_KEY });
  if (!perm.allowed) {
    return serperError(403, perm.reason || "Permission denied");
  }
  const minuteCheck = await checkMinuteRateLimit({ agentId, apiKeyId, featureKey: FEATURE_KEY, perMinuteLimit: perm.perMinuteLimit });
  if (!minuteCheck.allowed) {
    return serperError(429, `Rate limit exceeded: per-minute cap of ${perm.perMinuteLimit} reached. Retry shortly.`);
  }

  let keys;
  try {
    keys = await getRotationCandidates(account.id);
  } catch (err) {
    return serperError(500, err.message || "Failed to read key pool");
  }
  if (!keys.length) {
    return serperError(400, "No API keys are available in the rotation pool. Add keys in the tool settings.");
  }

  // Rebuild the target URL from the raw path (preserving exact encoding) after the proxy prefix,
  // forwarding all query params except the optional TMCP `token`.
  const prefixIndex = incomingUrl.pathname.indexOf(PROXY_PREFIX);
  const subPath = prefixIndex >= 0 ? incomingUrl.pathname.slice(prefixIndex + PROXY_PREFIX.length) : "";

  // /api/serper/scrape[...] -> Scrape host (https://scrape.serper.dev); everything else -> Search
  // host (https://google.serper.dev). Both authenticate with the same rotating X-API-KEY pool.
  const isScrape = subPath === SCRAPE_PREFIX || subPath.startsWith(`${SCRAPE_PREFIX}/`);
  const upstreamBase = isScrape ? SERPER_SCRAPE_BASE : SERPER_SEARCH_BASE;
  const forwardPath = isScrape ? subPath.slice(SCRAPE_PREFIX.length) : subPath;

  const forwardParams = new URLSearchParams(incomingUrl.searchParams);
  forwardParams.delete("token");
  const queryString = forwardParams.toString();
  const targetUrl = `${upstreamBase}${forwardPath}${queryString ? `?${queryString}` : ""}`;

  // Forward the request body unchanged for methods that carry one.
  const hasBody = !["GET", "HEAD"].includes(method);
  const rawBody = hasBody ? Buffer.from(await request.arrayBuffer()) : null;

  // Response cache (Search API only): identical query+body within the TTL costs no pool quota.
  const cacheable = !isScrape && SEARCH_CACHE_TTL_SECONDS > 0 && method !== "HEAD";
  const cacheKey = cacheable
    ? cacheKeyFor({ accountId: account.id, method, path: forwardPath, query: queryString, body: rawBody })
    : null;
  if (cacheable) {
    const hit = await getCachedResponse(cacheKey);
    if (hit) {
      logToolCall({
        workspaceId, agentId, apiKeyId,
        toolId: account.tools.id, toolAccountId: account.id, toolName: account.tools.name,
        featureKey: FEATURE_KEY,
        input: { method, api: "search", path: subPath || "/", cached: true, attempts: 0 },
        status: "SUCCESS",
        latencyMs: Date.now() - startTime
      });
      return new Response(hit.body, {
        status: hit.status,
        headers: { "content-type": hit.contentType || "application/json", "x-tmcp-cache": "hit" }
      });
    }
  }

  // Forward client headers transparently, minus the ones we replace or that break proxying.
  const forwardHeaders = {};
  request.headers.forEach((value, key) => {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) forwardHeaders[key] = value;
  });

  const send = async (poolKey) => {
    const serperKey = decryptText(poolKey.encrypted_key);
    const headers = { ...forwardHeaders, "X-API-KEY": serperKey };
    const resp = await fetch(targetUrl, {
      method,
      headers,
      ...(hasBody && rawBody && rawBody.length ? { body: rawBody } : {})
    });

    // Failover statuses carry small error payloads — buffer them so the next key can be tried and
    // no response stream is left dangling. Any other response is streamed straight through.
    if (ROTATE_STATUSES.has(resp.status)) {
      const buffer = Buffer.from(await resp.arrayBuffer());
      return { status: resp.status, body: buffer, headers: resp.headers, contentType: resp.headers.get("content-type") || "" };
    }
    return { status: resp.status, stream: resp.body, headers: resp.headers, contentType: resp.headers.get("content-type") || "" };
  };

  let result;
  try {
    result = await runRotation({ keys, send, shouldRotate: (status) => ROTATE_STATUSES.has(status) });
  } catch (err) {
    return serperError(502, err.message || "Rotation request failed");
  }

  // Best-effort key bookkeeping (cooldowns + success/failure counts), deferred past the response
  // so the streamed reply starts immediately.
  const ok = !result.exhausted && result.status >= 200 && result.status < 300;
  deferAfterResponse(() => applyRotationOutcome(result, { success: ok }));

  logToolCall({
    workspaceId,
    agentId,
    apiKeyId,
    toolId: account.tools.id,
    toolAccountId: account.id,
    toolName: account.tools.name,
    featureKey: FEATURE_KEY,
    input: { method, api: isScrape ? "scrape" : "search", path: subPath || "/", attempts: result.attempts },
    status: ok ? "SUCCESS" : "ERROR",
    error: ok ? null : `Serper returned ${result.status}`,
    latencyMs: Date.now() - startTime
  });

  // Pass Serper's response back as closely as possible (status, headers, body). Successful responses
  // are streamed through unbuffered; only the failover-status error payloads were buffered above.
  const responseHeaders = {};
  if (result.headers && typeof result.headers.forEach === "function") {
    result.headers.forEach((value, key) => {
      if (!STRIP_RESPONSE_HEADERS.has(key.toLowerCase())) responseHeaders[key] = value;
    });
  }
  if (!responseHeaders["content-type"] && result.contentType) {
    responseHeaders["content-type"] = result.contentType;
  }
  let responseBody = result.stream !== undefined ? result.stream : result.body;

  // Store cacheable successes: search responses are small JSON, so buffering them to populate
  // the cache is cheap (skipped when the upstream declares an oversized body).
  if (ok && cacheable) {
    const declaredLength = Number(result.headers?.get?.("content-length"));
    if (!Number.isFinite(declaredLength) || declaredLength <= MAX_CACHEABLE_BYTES) {
      const buffered = result.stream !== undefined
        ? Buffer.from(await new Response(result.stream).arrayBuffer())
        : Buffer.from(result.body);
      putCachedResponse({
        cacheKey,
        workspaceId,
        status: result.status,
        contentType: responseHeaders["content-type"],
        body: buffered,
        ttlSeconds: SEARCH_CACHE_TTL_SECONDS
      });
      responseBody = buffered;
    }
  }

  return new Response(responseBody, { status: result.status, headers: responseHeaders });
}
