import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
const { generateApiKey } = require("@/lib/crypto/generate-api-key");
const { hashApiKey } = require("@/lib/crypto/hash-api-key");

const RotateKeySchema = z.object({
  keyId: z.string().uuid()
});

export async function POST(request) {
  try {
    const userContext = await requireUser(request);
    await requirePermission(userContext, "api_keys.rotate");

    const body = await request.json();
    const parsed = RotateKeySchema.parse(body);

    const { raw, prefix } = generateApiKey();
    const hashedKey = hashApiKey(raw);

    const { data, error } = await supabaseAdmin
      .from("api_keys")
      .update({
        key_hash: hashedKey,
        key_prefix: prefix,
        last_used_at: null,
        created_at: new Date().toISOString() // reset created date on rotation
      })
      .eq("id", parsed.keyId)
      .eq("workspace_id", userContext.workspace_id)
      .select("id, name, key_prefix, status, expires_at")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      rawKey: raw, // Shown once in frontend
      key: data
    });

  } catch (err) {
    console.error("Error rotating API key:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to rotate API key" },
      { status: err.message?.includes("Unauthorized") ? 401 : err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
