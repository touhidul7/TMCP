import { NextResponse } from "next/server";
import { validateAgentApiKeyValue } from "../auth/api-key-auth";
import { checkAgentToolPermission } from "../permissions/check-agent-tool-permission";
import { logToolCall } from "../logs/log-tool-call";
import { supabaseAdmin } from "../supabase/admin";
import { getRotationCandidates, markCooldown, markResult } from "./key-pool-db";
const { decryptText } = require("../crypto/decrypt");
const { runRotation } = require("./rotate-core");

// Apify exposes a full REST API. This gateway is a transparent, path-agnostic proxy for it: the
// caller swaps the base URL (https://api.apify.com/v2 -> {tmcp}/api/apify/v2) and the token (real
// Apify token -> TMCP agent key). Everything else — method, path, query, body, response — is passed
// through unchanged, so any Apify endpoint and any actor works without custom code. TMCP injects a
// real Apify token from the rotation pool and fails over to the next on auth/quota/rate-limit errors.
// Successful responses are streamed straight through (no full-body buffering), so large dataset
// downloads and run-sync outputs pass through with minimal memory overhead.
const APIFY_BASE = "https://api.apify.com/v2";
const PROXY_PREFIX = "/api/apify/v2";
const SLUG = "apify-rotate";
const FEATURE_KEY = "apify_rotate.proxy";

// Apify signals "this token can't serve the request" with these statuses — rotate to the next key.
const ROTATE_STATUSES = new Set([401, 402, 403, 408, 429]);

// Request headers we must not forward verbatim (set/replaced by us, or they would break proxying).
const STRIP_REQUEST_HEADERS = new Set([
  "host", "authorization", "content-length", "connection", "accept-encoding", "transfer-encoding"
]);
// Response headers that no longer apply once fetch has buffered and decoded the body.
const STRIP_RESPONSE_HEADERS = new Set([
  "content-encoding", "content-length", "transfer-encoding", "connection"
]);

// OpenAI-style/Apify-style error envelope so clients see a consistent JSON error shape.
function apifyError(status, message) {
  return NextResponse.json({ error: { message, type: "tmcp_apify_rotate_error" } }, { status });
}

// The TMCP key may arrive as a Bearer token (drop-in for Apify's header auth) or, like Apify's own
// API, as a `token` query parameter.
function extractTmcpKey(request, url) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.substring(7).trim();
  const tokenParam = url.searchParams.get("token");
  if (tokenParam && tokenParam.trim()) return tokenParam.trim();
  return null;
}

export async function handleApifyRotate(request, { method = "GET" } = {}) {
  const startTime = Date.now();
  const incomingUrl = new URL(request.url);

  const tmcpKey = extractTmcpKey(request, incomingUrl);
  if (!tmcpKey) {
    return apifyError(401, "Missing TMCP API key. Pass it as an 'Authorization: Bearer' header or the 'token' query parameter.");
  }

  let ctx;
  try {
    ctx = await validateAgentApiKeyValue(tmcpKey);
  } catch (err) {
    return apifyError(401, err.message || "Unauthorized");
  }
  const { workspaceId, agentId, apiKeyId } = ctx;

  // Resolve the connected apify-rotate account for this workspace.
  const { data: accounts, error: accErr } = await supabaseAdmin
    .from("tool_accounts")
    .select("id, tools ( id, slug, name, is_enabled )")
    .eq("workspace_id", workspaceId)
    .eq("status", "connected");
  if (accErr) return apifyError(500, accErr.message || "Failed to resolve rotate account");

  const account = (accounts || []).find((a) => a.tools?.slug === SLUG && a.tools?.is_enabled !== false);
  if (!account) {
    return apifyError(400, `No connected '${SLUG}' account is configured in this workspace.`);
  }

  // Honour the agent permission matrix (single gate covers the whole proxy).
  const perm = await checkAgentToolPermission({ agentId, toolAccountId: account.id, featureKey: FEATURE_KEY });
  if (!perm.allowed) {
    return apifyError(403, perm.reason || "Permission denied");
  }

  let keys;
  try {
    keys = await getRotationCandidates(account.id);
  } catch (err) {
    return apifyError(500, err.message || "Failed to read key pool");
  }
  if (!keys.length) {
    return apifyError(400, "No API tokens are available in the rotation pool. Add tokens in the tool settings.");
  }

  // Rebuild the target URL from the raw path (preserving exact encoding) after the proxy prefix,
  // forwarding all query params except the TMCP `token`.
  const prefixIndex = incomingUrl.pathname.indexOf(PROXY_PREFIX);
  const subPath = prefixIndex >= 0 ? incomingUrl.pathname.slice(prefixIndex + PROXY_PREFIX.length) : "";
  const forwardParams = new URLSearchParams(incomingUrl.searchParams);
  forwardParams.delete("token");
  const queryString = forwardParams.toString();
  const targetUrl = `${APIFY_BASE}${subPath}${queryString ? `?${queryString}` : ""}`;

  // Forward the request body unchanged for methods that carry one.
  const hasBody = !["GET", "HEAD"].includes(method);
  const rawBody = hasBody ? Buffer.from(await request.arrayBuffer()) : null;

  // Forward client headers transparently, minus the ones we replace or that break proxying.
  const forwardHeaders = {};
  request.headers.forEach((value, key) => {
    if (!STRIP_REQUEST_HEADERS.has(key.toLowerCase())) forwardHeaders[key] = value;
  });

  const send = async (poolKey) => {
    const apifyToken = decryptText(poolKey.encrypted_key);
    const headers = { ...forwardHeaders, Authorization: `Bearer ${apifyToken}` };
    const resp = await fetch(targetUrl, {
      method,
      headers,
      ...(hasBody && rawBody && rawBody.length ? { body: rawBody } : {})
    });

    // Failover statuses carry small error payloads — buffer them so the next token can be tried and
    // no response stream is left dangling. Any other response (success or a real error we will
    // return) is streamed straight through to the caller without buffering the body in memory.
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
    return apifyError(502, err.message || "Rotation request failed");
  }

  // Best-effort key bookkeeping (cooldowns + success/failure counts).
  try {
    for (const cooled of result.cooled) {
      await markCooldown(cooled.keyId, cooled.cooldownSeconds);
    }
    if (result.keyId && !result.exhausted) {
      await markResult(result.keyId, result.status >= 200 && result.status < 300);
    }
  } catch (bookErr) {
    console.error("Key pool bookkeeping error:", bookErr);
  }

  const ok = !result.exhausted && result.status >= 200 && result.status < 300;
  logToolCall({
    workspaceId,
    agentId,
    apiKeyId,
    toolId: account.tools.id,
    toolAccountId: account.id,
    toolName: account.tools.name,
    featureKey: FEATURE_KEY,
    input: { method, path: subPath || "/", attempts: result.attempts },
    status: ok ? "SUCCESS" : "ERROR",
    error: ok ? null : `Apify returned ${result.status}`,
    latencyMs: Date.now() - startTime
  });

  // Pass Apify's response back as closely as possible (status, headers, body). Successful responses
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
  const responseBody = result.stream !== undefined ? result.stream : result.body;
  return new Response(responseBody, { status: result.status, headers: responseHeaders });
}
