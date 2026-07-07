import { NextResponse } from "next/server";
import { validateAgentApiKey } from "@/lib/auth/api-key-auth";
import { supabaseAdmin } from "@/lib/supabase/admin";
const { scopesWithinParent } = require("@/lib/auth/key-scopes");
const { generateApiKey } = require("@/lib/crypto/generate-api-key");
const { hashApiKey } = require("@/lib/crypto/hash-api-key");

const MIN_TTL_SECONDS = 60;
const MAX_TTL_SECONDS = 30 * 24 * 60 * 60; // 30 days
const DEFAULT_TTL_SECONDS = 60 * 60; // 1 hour
const MAX_SCOPES = 50;

// Mint a scoped, expiring child key from an existing agent key. The child inherits the same
// agent (so the permission matrix still applies) but can only reach the requested feature keys,
// and it can never be broader than its parent — a scoped key only mints narrower keys. Intended
// for handing time-boxed access to third-party agents without sharing the primary key.
export async function POST(request) {
  let ctx;
  try {
    ctx = await validateAgentApiKey(request);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Unauthorized" },
      { status: 401 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON body" }, { status: 400 });
  }

  const features = body.features;
  if (!Array.isArray(features) || features.length === 0 || features.length > MAX_SCOPES
    || !features.every((f) => typeof f === "string" && f.length > 0 && f.length < 200)) {
    return NextResponse.json(
      { success: false, error: `features must be a non-empty array of feature keys (max ${MAX_SCOPES}), e.g. ["serper.search", "gmail.*"]` },
      { status: 400 }
    );
  }

  if (!scopesWithinParent(features, ctx.scopes)) {
    return NextResponse.json(
      { success: false, error: "Requested scopes exceed this key's own scopes. A scoped key can only mint narrower keys." },
      { status: 403 }
    );
  }

  const ttl = Math.min(
    MAX_TTL_SECONDS,
    Math.max(MIN_TTL_SECONDS, Number(body.expires_in_seconds) || DEFAULT_TTL_SECONDS)
  );
  const expiresAt = new Date(Date.now() + ttl * 1000).toISOString();

  const { raw, prefix } = generateApiKey();

  const { data: keyRecord, error } = await supabaseAdmin
    .from("api_keys")
    .insert({
      workspace_id: ctx.workspaceId,
      user_id: ctx.keyUserId,
      agent_id: ctx.agentId,
      name: typeof body.name === "string" && body.name.trim()
        ? body.name.trim().slice(0, 80)
        : `scoped:${ctx.agentName}`,
      key_hash: hashApiKey(raw),
      key_prefix: prefix,
      status: "active",
      expires_at: expiresAt,
      scopes: features,
      parent_key_id: ctx.apiKeyId
    })
    .select("id, name, key_prefix, expires_at, scopes, created_at")
    .single();

  if (error) {
    console.error("Error minting scoped key:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to mint scoped key" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    api_key: raw, // shown once — TMCP stores only the hash
    key: keyRecord,
    expires_in_seconds: ttl
  });
}
