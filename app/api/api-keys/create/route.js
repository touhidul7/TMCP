import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";
const { generateApiKey } = require("@/lib/crypto/generate-api-key");
const { hashApiKey } = require("@/lib/crypto/hash-api-key");

const CreateKeySchema = z.object({
  agentId: z.string().uuid(),
  name: z.string().min(1, "Name is required"),
  expiryDays: z.number().nullable().optional()
});

export async function POST(request) {
  try {
    const userContext = await requireUser(request);
    await requirePermission(userContext, "api_keys.create");

    const body = await request.json();
    const parsed = CreateKeySchema.parse(body);

    const { raw, prefix } = generateApiKey();
    const hashedKey = hashApiKey(raw);

    const expiresAt = parsed.expiryDays
      ? new Date(Date.now() + parsed.expiryDays * 24 * 60 * 60 * 1000).toISOString()
      : null;

    const { data: keyRecord, error } = await supabaseAdmin
      .from("api_keys")
      .insert({
        workspace_id: userContext.workspace_id,
        user_id: userContext.id,
        agent_id: parsed.agentId,
        name: parsed.name,
        key_hash: hashedKey,
        key_prefix: prefix,
        expires_at: expiresAt,
        status: "active"
      })
      .select("id, name, key_prefix, status, expires_at, created_at")
      .single();

    if (error) throw error;

    return NextResponse.json({
      success: true,
      rawKey: raw, // Shown once in frontend
      key: keyRecord
    });

  } catch (err) {
    console.error("Error creating API key:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to create API key" },
      { status: err.message?.includes("Unauthorized") ? 401 : err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
