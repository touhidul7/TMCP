import { NextResponse } from "next/server";
import { validateAgentApiKeyValue } from "../auth/api-key-auth";
import { checkAgentToolPermission } from "../permissions/check-agent-tool-permission";
import { logToolCall } from "../logs/log-tool-call";
import { deferAfterResponse } from "../async/defer";
import { getRotationCandidates, resolveRotateAccount, applyRotationOutcome } from "./key-pool-db";
const { decryptText } = require("../crypto/decrypt");
const { runRotation } = require("./rotate-core");

// Scrape.do is a plain HTTP proxy API (not OpenAI-compatible): requests are made to
// https://api.scrape.do/?token=<token>&url=<encoded-url>&...  This gateway mirrors that exact
// shape — the caller sends the same params but with a TMCP agent API key as `token`, and TMCP
// swaps in a real Scrape.do token from the rotation pool, failing over on rate-limit/credit errors.
const SCRAPEDO_BASE = "https://api.scrape.do/";
const SLUG = "scrapedo-rotate";
const FEATURE_KEY = "scrapedo_rotate.scrape";

function scrapeError(status, message) {
  return NextResponse.json({ success: false, error: message }, { status });
}

// The TMCP key may arrive as the `token` query param (drop-in for scrape.do) or, for flexibility,
// as an Authorization: Bearer header.
function extractTmcpKey(request, url) {
  const tokenParam = url.searchParams.get("token");
  if (tokenParam && tokenParam.trim()) return tokenParam.trim();
  const auth = request.headers.get("Authorization") || "";
  if (auth.startsWith("Bearer ")) return auth.substring(7).trim();
  return null;
}

// Rotate to the next key when Scrape.do signals the current account is unusable for this request:
// 429 too many requests, 401 invalid token, 402 out of credits.
function scrapeDoShouldRotate(status) {
  return status === 429 || status === 401 || status === 402;
}

export async function handleScrapeDoRotate(request, { method = "GET" } = {}) {
  const startTime = Date.now();
  const incomingUrl = new URL(request.url);

  const tmcpKey = extractTmcpKey(request, incomingUrl);
  if (!tmcpKey) {
    return scrapeError(401, "Missing TMCP API key. Pass it as the 'token' query parameter or an 'Authorization: Bearer' header.");
  }

  let ctx;
  try {
    ctx = await validateAgentApiKeyValue(tmcpKey);
  } catch (err) {
    return scrapeError(401, err.message || "Unauthorized");
  }
  const { workspaceId, agentId, apiKeyId } = ctx;

  const targetUrl = incomingUrl.searchParams.get("url");
  if (!targetUrl) {
    return scrapeError(400, "Missing 'url' query parameter.");
  }

  // Resolve the connected scrapedo-rotate account for this workspace.
  let account;
  try {
    account = await resolveRotateAccount({ workspaceId, slug: SLUG });
  } catch (accErr) {
    return scrapeError(500, accErr.message || "Failed to resolve rotate account");
  }
  if (!account) {
    return scrapeError(400, `No connected '${SLUG}' account is configured in this workspace.`);
  }

  // Honour the agent permission matrix.
  const perm = await checkAgentToolPermission({ agentId, toolAccountId: account.id, featureKey: FEATURE_KEY });
  if (!perm.allowed) {
    return scrapeError(403, perm.reason || "Permission denied");
  }

  let keys;
  try {
    keys = await getRotationCandidates(account.id);
  } catch (err) {
    return scrapeError(500, err.message || "Failed to read key pool");
  }
  if (!keys.length) {
    return scrapeError(400, "No API keys are available in the rotation pool. Add keys in the tool settings.");
  }

  // Forward the request body unchanged for non-GET methods (Scrape.do relays it to the target).
  const hasBody = method !== "GET" && method !== "HEAD";
  const rawBody = hasBody ? Buffer.from(await request.arrayBuffer()) : null;
  const forwardHeaders = {};
  const contentType = request.headers.get("content-type");
  if (hasBody && contentType) forwardHeaders["Content-Type"] = contentType;

  const send = async (poolKey) => {
    const providerToken = decryptText(poolKey.encrypted_key);
    // Keep every incoming param except the TMCP token; inject the real Scrape.do token.
    const params = new URLSearchParams(incomingUrl.searchParams);
    params.set("token", providerToken);
    const resp = await fetch(`${SCRAPEDO_BASE}?${params.toString()}`, {
      method,
      headers: forwardHeaders,
      ...(hasBody && rawBody ? { body: rawBody } : {})
    });
    const buffer = Buffer.from(await resp.arrayBuffer());
    return {
      status: resp.status,
      body: buffer,
      headers: resp.headers,
      contentType: resp.headers.get("content-type") || "application/octet-stream"
    };
  };

  let result;
  try {
    result = await runRotation({ keys, send, shouldRotate: scrapeDoShouldRotate });
  } catch (err) {
    return scrapeError(502, err.message || "Rotation request failed");
  }

  // Best-effort key bookkeeping (cooldowns + success/failure counts), deferred past the response.
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
    input: { url: targetUrl, method, render: incomingUrl.searchParams.get("render") || undefined, attempts: result.attempts },
    status: ok ? "SUCCESS" : "ERROR",
    error: ok ? null : `Scrape.do returned ${result.status}`,
    latencyMs: Date.now() - startTime
  });

  // Pass the Scrape.do response straight back to the caller (content + relevant headers).
  const responseHeaders = { "Content-Type": result.contentType || "application/octet-stream" };
  if (result.headers && typeof result.headers.forEach === "function") {
    result.headers.forEach((value, name) => {
      if (name.toLowerCase().startsWith("scrape.do")) responseHeaders[name] = value;
    });
  }
  return new Response(result.body, { status: result.status, headers: responseHeaders });
}
