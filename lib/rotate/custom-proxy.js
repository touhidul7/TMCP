import { NextResponse } from "next/server";
import { validateAgentApiKeyValue } from "../auth/api-key-auth";
import { checkAgentToolPermission } from "../permissions/check-agent-tool-permission";
import { logToolCall } from "../logs/log-tool-call";
import { deferAfterResponse } from "../async/defer";
import { getRotationCandidates, resolveRotateAccount, applyRotationOutcome } from "./key-pool-db";
const { decryptText } = require("../crypto/decrypt");
const { runRotation } = require("./rotate-core");

// Universal, user-defined rotating proxy. Where the built-in rotators (Gemini, Serper, Apify, …)
// hard-code one provider each, this serves any workspace-defined `custom_rotate` tool: the tool
// record supplies the upstream base URL, how the upstream expects its key (bearer header, custom
// header, or query parameter), and which status codes mean "rotate to the next key". Everything
// else — method, path, query, body, response — passes through unchanged, so any API with a
// per-key free tier becomes a rotating pool behind one TMCP agent key at /api/rotate/{slug}.

const DEFAULT_ROTATE_STATUSES = [401, 402, 403, 429];

const STRIP_REQUEST_HEADERS = new Set([
  "host", "authorization", "x-api-key", "content-length", "connection", "accept-encoding", "transfer-encoding"
]);
const STRIP_RESPONSE_HEADERS = new Set([
  "content-encoding", "content-length", "transfer-encoding", "connection"
]);

function rotateError(status, message) {
  return NextResponse.json({ error: { message, type: "tmcp_custom_rotate_error" } }, { status });
}

// TMCP key: Authorization Bearer, X-API-KEY header, or `token` query param — accept all three so
// the proxy is a drop-in regardless of how the upstream's own clients authenticate.
function extractTmcpKey(request, url) {
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.substring(7).trim();
  const apiKeyHeader = request.headers.get("X-API-KEY");
  if (apiKeyHeader && apiKeyHeader.trim()) return apiKeyHeader.trim();
  const tokenParam = url.searchParams.get("token");
  if (tokenParam && tokenParam.trim()) return tokenParam.trim();
  return null;
}

function rotateConfigFor(tool) {
  const cfg = tool.rest_config?.rotate || {};
  const statuses = Array.isArray(cfg.rotate_status_codes) && cfg.rotate_status_codes.length
    ? cfg.rotate_status_codes.map(Number).filter(Number.isFinite)
    : DEFAULT_ROTATE_STATUSES;
  return {
    baseUrl: (tool.rest_base_url || "").replace(/\/$/, ""),
    authType: cfg.auth_type || "bearer", // "bearer" | "header" | "query"
    authName: cfg.auth_name || (cfg.auth_type === "query" ? "api_key" : "X-API-KEY"),
    rotateStatuses: new Set(statuses)
  };
}

export async function handleCustomRotate(request, { slug, method = "GET" }) {
  const startTime = Date.now();
  const incomingUrl = new URL(request.url);

  const tmcpKey = extractTmcpKey(request, incomingUrl);
  if (!tmcpKey) {
    return rotateError(401, "Missing TMCP API key. Pass it as an 'Authorization: Bearer' header, an 'X-API-KEY' header, or the 'token' query parameter.");
  }

  let ctx;
  try {
    ctx = await validateAgentApiKeyValue(tmcpKey);
  } catch (err) {
    return rotateError(401, err.message || "Unauthorized");
  }
  const { workspaceId, agentId, apiKeyId } = ctx;

  let account;
  try {
    account = await resolveRotateAccount({ workspaceId, slug });
  } catch (accErr) {
    return rotateError(500, accErr.message || "Failed to resolve rotate account");
  }
  if (!account || account.tools?.tool_type !== "custom_rotate") {
    return rotateError(404, `No connected custom rotator '${slug}' is configured in this workspace.`);
  }

  const cfg = rotateConfigFor(account.tools);
  if (!cfg.baseUrl) {
    return rotateError(500, `Custom rotator '${slug}' has no upstream base URL configured.`);
  }

  const featureKey = `${slug}.proxy`;
  const perm = await checkAgentToolPermission({ agentId, toolAccountId: account.id, featureKey });
  if (!perm.allowed) {
    return rotateError(403, perm.reason || "Permission denied");
  }

  let keys;
  try {
    keys = await getRotationCandidates(account.id);
  } catch (err) {
    return rotateError(500, err.message || "Failed to read key pool");
  }
  if (!keys.length) {
    return rotateError(400, "No API keys are available in the rotation pool. Add keys in the tool settings.");
  }

  // Rebuild the target URL from the raw path after /api/rotate/{slug}, forwarding all query
  // params except the optional TMCP `token`.
  const proxyPrefix = `/api/rotate/${slug}`;
  const prefixIndex = incomingUrl.pathname.indexOf(proxyPrefix);
  const subPath = prefixIndex >= 0 ? incomingUrl.pathname.slice(prefixIndex + proxyPrefix.length) : "";
  const forwardParams = new URLSearchParams(incomingUrl.searchParams);
  forwardParams.delete("token");

  const hasBody = !["GET", "HEAD"].includes(method);
  const rawBody = hasBody ? Buffer.from(await request.arrayBuffer()) : null;

  const forwardHeaders = {};
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (STRIP_REQUEST_HEADERS.has(lower)) return;
    if (cfg.authType === "header" && lower === cfg.authName.toLowerCase()) return;
    forwardHeaders[key] = value;
  });

  const send = async (poolKey) => {
    const providerKey = decryptText(poolKey.encrypted_key);
    const headers = { ...forwardHeaders };
    const params = new URLSearchParams(forwardParams);

    if (cfg.authType === "bearer") headers["Authorization"] = `Bearer ${providerKey}`;
    else if (cfg.authType === "query") params.set(cfg.authName, providerKey);
    else headers[cfg.authName] = providerKey;

    const queryString = params.toString();
    const targetUrl = `${cfg.baseUrl}${subPath}${queryString ? `?${queryString}` : ""}`;

    const resp = await fetch(targetUrl, {
      method,
      headers,
      ...(hasBody && rawBody && rawBody.length ? { body: rawBody } : {})
    });

    // Failover statuses carry small error payloads — buffer them so the next key can be tried;
    // anything else streams straight through to the caller.
    if (cfg.rotateStatuses.has(resp.status)) {
      const buffer = Buffer.from(await resp.arrayBuffer());
      return { status: resp.status, body: buffer, headers: resp.headers, contentType: resp.headers.get("content-type") || "" };
    }
    return { status: resp.status, stream: resp.body, headers: resp.headers, contentType: resp.headers.get("content-type") || "" };
  };

  let result;
  try {
    result = await runRotation({ keys, send, shouldRotate: (status) => cfg.rotateStatuses.has(status) });
  } catch (err) {
    return rotateError(502, err.message || "Rotation request failed");
  }

  // Best-effort key bookkeeping, deferred past the response.
  const ok = !result.exhausted && result.status >= 200 && result.status < 300;
  deferAfterResponse(() => applyRotationOutcome(result, { success: ok }));

  logToolCall({
    workspaceId,
    agentId,
    apiKeyId,
    toolId: account.tools.id,
    toolAccountId: account.id,
    toolName: account.tools.name,
    featureKey,
    input: { method, path: subPath || "/", attempts: result.attempts },
    status: ok ? "SUCCESS" : "ERROR",
    error: ok ? null : `Upstream returned ${result.status}`,
    latencyMs: Date.now() - startTime
  });

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
