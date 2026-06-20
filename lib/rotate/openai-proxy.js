import { NextResponse } from "next/server";
import { validateAgentApiKey } from "../auth/api-key-auth";
import { checkAgentToolPermission } from "../permissions/check-agent-tool-permission";
import { logToolCall } from "../logs/log-tool-call";
import { supabaseAdmin } from "../supabase/admin";
import { getRotationCandidates, markCooldown, markResult } from "./key-pool-db";
const { decryptText } = require("../crypto/decrypt");
const { runRotation } = require("./rotate-core");

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
  const { workspaceId, agentId, apiKeyId } = ctx;

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
  const { data: accounts, error: accErr } = await supabaseAdmin
    .from("tool_accounts")
    .select("id, tools ( id, slug, name, is_enabled )")
    .eq("workspace_id", workspaceId)
    .eq("status", "connected");
  if (accErr) return openAiError(500, accErr.message || "Failed to resolve rotate account", "api_error");

  const account = (accounts || []).find((a) => a.tools?.slug === cfg.slug && a.tools?.is_enabled !== false);
  if (!account) {
    return openAiError(400, `No connected '${cfg.slug}' account is configured in this workspace.`, "invalid_request_error");
  }

  // Honour the agent permission matrix.
  const featureKey = `${cfg.featurePrefix}.${featureForEndpoint(endpointPath)}`;
  const perm = await checkAgentToolPermission({ agentId, toolAccountId: account.id, featureKey });
  if (!perm.allowed) {
    return openAiError(403, perm.reason || "Permission denied", "permission_error");
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

  // Apply key cooldowns + success/failure bookkeeping (best-effort, non-blocking on errors).
  try {
    for (const cooled of result.cooled) {
      await markCooldown(cooled.keyId, cooled.cooldownSeconds);
    }
    if (result.keyId && !result.exhausted) {
      await markResult(result.keyId, result.stream ? true : (result.status >= 200 && result.status < 300));
    }
  } catch (bookErr) {
    console.error("Key pool bookkeeping error:", bookErr);
  }

  const ok = result.stream || (!result.exhausted && result.status >= 200 && result.status < 300);
  logToolCall({
    workspaceId,
    agentId,
    apiKeyId,
    toolId: account.tools.id,
    toolAccountId: account.id,
    toolName: account.tools.name,
    featureKey,
    input: { model: body.model, endpoint: endpointPath, stream: wantsStream, attempts: result.attempts },
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

  // Otherwise pass the provider JSON straight through (success or original error).
  return NextResponse.json(result.body, { status: result.status });
}
