import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { supabaseAdmin } from "@/lib/supabase/admin";
const { encryptText } = require("@/lib/crypto/encrypt");
const { normalizeBaseUrl, resolveModel, DEFAULT_BASE_URL, DEFAULT_MODEL } = require("@/lib/assistant/config");

function errorStatus(message) {
  if (message?.includes("Unauthorized")) return 401;
  if (message?.includes("Forbidden")) return 403;
  return 400;
}

// Returns only whether a key is configured — never the key itself.
export async function GET(request) {
  try {
    const user = await requireUser(request);
    const { data, error } = await supabaseAdmin
      .from("user_assistant_settings")
      .select("encrypted_openrouter_key, base_url, model")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;
    return NextResponse.json({
      success: true,
      configured: Boolean(data?.encrypted_openrouter_key),
      baseUrl: data?.base_url || DEFAULT_BASE_URL,
      model: data?.model || DEFAULT_MODEL
    });
  } catch (err) {
    const message = err.message || "Failed to read assistant settings";
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) });
  }
}

// Saves (encrypts) the user's OpenRouter key.
export async function POST(request) {
  try {
    const user = await requireUser(request);
    const { openrouterKey, baseUrl, model } = await request.json();

    if (!openrouterKey || !openrouterKey.trim()) {
      return NextResponse.json({ success: false, error: "API key is required" }, { status: 400 });
    }

    const resolvedBaseUrl = normalizeBaseUrl(baseUrl);
    if (!/^https?:\/\//i.test(resolvedBaseUrl)) {
      return NextResponse.json(
        { success: false, error: "Base URL must start with http:// or https://" },
        { status: 400 }
      );
    }

    const encrypted = encryptText(openrouterKey.trim());
    const { error } = await supabaseAdmin
      .from("user_assistant_settings")
      .upsert(
        {
          user_id: user.id,
          encrypted_openrouter_key: encrypted,
          base_url: resolvedBaseUrl,
          model: resolveModel(model),
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      );

    if (error) throw error;
    return NextResponse.json({ success: true, configured: true, baseUrl: resolvedBaseUrl, model: resolveModel(model) });
  } catch (err) {
    const message = err.message || "Failed to save assistant settings";
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) });
  }
}

// Removes the stored key.
export async function DELETE(request) {
  try {
    const user = await requireUser(request);
    const { error } = await supabaseAdmin
      .from("user_assistant_settings")
      .update({ encrypted_openrouter_key: null, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true, configured: false });
  } catch (err) {
    const message = err.message || "Failed to remove assistant settings";
    return NextResponse.json({ success: false, error: message }, { status: errorStatus(message) });
  }
}
