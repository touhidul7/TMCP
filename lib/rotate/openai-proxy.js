import { NextResponse } from "next/server";
import { validateAgentApiKey } from "../auth/api-key-auth";
import { checkAgentToolPermission, checkMinuteRateLimit } from "../permissions/check-agent-tool-permission";
const { scopeAllows } = require("../auth/key-scopes");
import { logToolCall } from "../logs/log-tool-call";
import { deferAfterResponse } from "../async/defer";
import { getRotationCandidates, resolveRotateAccount, applyRotationOutcome } from "./key-pool-db";
import { cacheKeyFor, getCachedResponse, putCachedResponse } from "./response-cache";
const { decryptText } = require("../crypto/decrypt");
const { runRotation } = require("./rotate-core");

// Embeddings are deterministic per model+input, so identical requests within this window are
// served from the response cache instead of spending pool quota. 0 disables. Chat completions
// and responses are never cached.
const EMBEDDINGS_CACHE_TTL_SECONDS = Number(process.env.TMCP_EMBEDDINGS_CACHE_TTL ?? 3600);

const PROVIDERS = {
  gemini: {
    slug: "gemini-rotate",
    featurePrefix: "gemini_rotate",
    base: "https://generativelanguage.googleapis.com/v1beta/openai"
  },
  openrouter: {
    slug: "openrouter-rotate",
    featurePrefix: "openrouter_rotate",
    base: "https://openrouter.ai/api/v1"
  }
};

// OpenAI-style error envelope so clients can handle errors exactly as they would from OpenAI.
function openAiError(status, message, type = "invalid_request_error") {
  return NextResponse.json({ error: { message, type } }, { status });
}

// Route by explicit header override, otherwise by the model name (gemini* -> Gemini).
function pickProvider({ model, headerProvider }) {
  if (headerProvider && PROVIDERS[headerProvider]) return headerProvider;
  const m = String(model || "").toLowerCase();
  if (m.startsWith("gemini") || m.startsWith("models/gemini") || m.includes("gemini")) return "gemini";
  return "openrouter";
}

function featureForEndpoint(endpointPath) {
  if (endpointPath.includes("embeddings")) return "embeddings";
  if (endpointPath.includes("responses")) return "responses";
  return "chat";
}

export async function handleOpenAICompatible(request, { endpointPath, provider: forcedProvider, method = "POST" }) {
  const startTime = Date.now();
  const hasBody = method !== "GET";

  let ctx;
  try {
    ctx = await validateAgentApiKey(request);
  } catch (err) {
    return openAiError(401, err.message || "Unauthorized", "authentication_error");
  }
  const { workspaceId, agentId, apiKeyId, scopes } = ctx;

  let body = {};
  if (hasBody) {
    try {
      body = await request.json();
    } catch {
      return openAiError(400, "Invalid JSON body", "invalid_request_error");
    }
  }

  // A dedicated per-provider base URL (e.g. /api/gemini/v1) forces the provider;
  // the shared /api/v1 base falls back to choosing it from the model name.
  const provider = forcedProvider && PROVIDERS[forcedProvider]
    ? forcedProvider
    : pickProvider({ model: body.model, headerProvider: request.headers.get("x-tmcp-provider") });
  const cfg = PROVIDERS[provider];

  // Find the connected rotate account for this provider in the caller's workspace.
  let account;
  try {
    account = await resolveRotateAccount({ workspaceId, slug: cfg.slug });
  } catch (accErr) {
    return openAiError(500, accErr.message || "Failed to resolve rotate account", "api_error");
  }
  if (!account) {
    return openAiError(400, `No connected '${cfg.slug}' account is configured in this workspace.`, "invalid_request_error");
  }

  // Honour the key scope and the agent permission matrix.
  const featureKey = `${cfg.featurePrefix}.${featureForEndpoint(endpointPath)}`;
  if (!scopeAllows(scopes, featureKey)) {
    return openAiError(403, `This API key is scoped and does not permit '${featureKey}'.`, "permission_error");
  }
  const perm = await checkAgentToolPermission({ agentId, toolAccountId: account.id, featureKey });
  if (!perm.allowed) {
    return openAiError(403, perm.reason || "Permission denied", "permission_error");
  }
  const minuteCheck = await checkMinuteRateLimit({ agentId, apiKeyId, featureKey, perMinuteLimit: perm.perMinuteLimit });
  if (!minuteCheck.allowed) {
    return openAiError(429, `Rate limit exceeded: per-minute cap of ${perm.perMinuteLimit} reached. Retry shortly.`, "rate_limit_error");
  }

  // Response cache for embeddings: identical model+input within the TTL costs no pool quota.
  const cacheable = hasBody
    && featureForEndpoint(endpointPath) === "embeddings"
    && EMBEDDINGS_CACHE_TTL_SECONDS > 0;
  const cacheKey = cacheable
    ? cacheKeyFor({ accountId: account.id, method, path: endpointPath, body: JSON.stringify(body) })
    : null;
  if (cacheable) {
    const hit = await getCachedResponse(cacheKey);
    if (hit) {
      logToolCall({
        workspaceId, agentId, apiKeyId,
        toolId: account.tools.id, toolAccountId: account.id, toolName: account.tools.name,
        featureKey,
        input: { model: body.model, endpoint: endpointPath, cached: true, attempts: 0 },
        status: "SUCCESS",
        latencyMs: Date.now() - startTime
      });
      return new Response(hit.body, {
        status: hit.status,
        headers: { "Content-Type": hit.contentType || "application/json", "x-tmcp-cache": "hit" }
      });
    }
  }

  let keys;
  try {
    keys = await getRotationCandidates(account.id);
  } catch (err) {
    return openAiError(500, err.message || "Failed to read key pool", "api_error");
  }
  if (!keys.length) {
    return openAiError(400, "No API keys are available in the rotation pool. Add keys in the tool settings.", "no_keys_available");
  }

  const url = `${cfg.base}${endpointPath}`;
  const wantsStream = hasBody && body.stream === true;
  const send = async (poolKey) => {
    const providerKey = decryptText(poolKey.encrypted_key);
    const headers = { "Authorization": `Bearer ${providerKey}` };
    if (hasBody) headers["Content-Type"] = "application/json";
    if (provider === "openrouter") {
      headers["HTTP-Referer"] = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      headers["X-Title"] = "TMCP Rotate Gateway";
    }
    const resp = await fetch(url, { method, headers, ...(hasBody ? { body: JSON.stringify(body) } : {}) });
    const contentType = resp.headers.get("content-type") || "";

    // For a successful streaming response, hand the raw stream back without buffering.
    if (wantsStream && resp.ok && resp.body && contentType.includes("text/event-stream")) {
      return { status: resp.status, stream: resp.body, contentType };
    }

    const text = await resp.text();
    let json;
    try {
      json = text ? JSON.parse(text) : {};
    } catch {
      json = { raw: text };
    }
    return { status: resp.status, body: json, headers: resp.headers };
  };

  let result;
  try {
    result = await runRotation({ keys, send });
  } catch (err) {
    return openAiError(502, err.message || "Rotation request failed", "api_error");
  }

  // Key cooldowns + success/failure bookkeeping run after the response is sent, so they never
  // delay the reply — critically, a streaming response starts immediately.
  const ok = result.stream ? true : (!result.exhausted && result.status >= 200 && result.status < 300);
  deferAfterResponse(() => applyRotationOutcome(result, { success: ok }));

  logToolCall({
    workspaceId,
    agentId,
    apiKeyId,
    toolId: account.tools.id,
    toolAccountId: account.id,
    toolName: account.tools.name,
    featureKey,
    input: { model: body.model, endpoint: endpointPath, stream: wantsStream, attempts: result.attempts },
    // Providers report token usage on non-streamed responses; keep it in the log so the
    // analytics dashboard can aggregate tokens per agent/model without re-parsing bodies.
    output: !result.stream && result.body?.usage
      ? { model: result.body.model || body.model, usage: result.body.usage }
      : null,
    status: ok ? "SUCCESS" : "ERROR",
    error: ok ? null : (result.body?.error?.message || `Provider returned ${result.status}`),
    latencyMs: Date.now() - startTime
  });

  // Stream pass-through (Server-Sent Events) for streaming chat completions.
  if (result.stream) {
    return new Response(result.stream, {
      status: result.status,
      headers: {
        "Content-Type": result.contentType || "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive"
      }
    });
  }

  // Store cacheable embedding successes for identical future requests.
  if (cacheable && ok && !result.stream) {
    putCachedResponse({
      cacheKey,
      workspaceId,
      status: result.status,
      contentType: "application/json",
      body: Buffer.from(JSON.stringify(result.body)),
      ttlSeconds: EMBEDDINGS_CACHE_TTL_SECONDS
    });
  }

  // Otherwise pass the provider JSON straight through (success or original error).
  return NextResponse.json(result.body, { status: result.status });
}
