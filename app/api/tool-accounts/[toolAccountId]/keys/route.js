import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { listPoolKeys, addPoolKey, deletePoolKey, ROTATE_SLUG_TO_PROVIDER } from "@/lib/rotate/key-pool-db";

function statusFor(message) {
  if (message?.includes("Unauthorized")) return 401;
  if (message?.includes("Forbidden")) return 403;
  if (message?.includes("NotFound")) return 404;
  return 400;
}

// Loads the account, verifies it belongs to the caller's workspace, and resolves its provider.
async function resolveRotateAccount(user, toolAccountId) {
  const { data: account, error } = await supabaseAdmin
    .from("tool_accounts")
    .select("id, workspace_id, tools ( slug, tool_type )")
    .eq("id", toolAccountId)
    .maybeSingle();

  if (error || !account) throw new Error("NotFound: Tool account not found");
  if (account.workspace_id !== user.workspace_id) {
    throw new Error("Forbidden: This tool account belongs to a different workspace");
  }
  // Built-in rotate tools map slug -> provider; user-defined rotators use their slug directly.
  const provider = ROTATE_SLUG_TO_PROVIDER[account.tools?.slug]
    || (account.tools?.tool_type === "custom_rotate" ? account.tools.slug : null);
  if (!provider) throw new Error("This tool does not support API key rotation");
  return { account, provider };
}

export async function GET(request, { params }) {
  try {
    const user = await requireUser(request);
    const { toolAccountId } = await params;
    const { account } = await resolveRotateAccount(user, toolAccountId);
    const keys = await listPoolKeys(account.id);
    return NextResponse.json({ success: true, keys });
  } catch (err) {
    const message = err.message || "Failed to list keys";
    return NextResponse.json({ success: false, error: message.replace(/^(NotFound|Forbidden|Unauthorized):\s*/, "") }, { status: statusFor(message) });
  }
}

export async function POST(request, { params }) {
  try {
    const user = await requireUser(request);
    await requirePermission(user, "tools.connect_account");
    const { toolAccountId } = await params;
    const { account, provider } = await resolveRotateAccount(user, toolAccountId);

    const { key, label } = await request.json();
    if (!key || !key.trim()) {
      return NextResponse.json({ success: false, error: "API key is required" }, { status: 400 });
    }

    const created = await addPoolKey({
      workspaceId: user.workspace_id,
      toolAccountId: account.id,
      provider,
      label,
      rawKey: key
    });
    return NextResponse.json({ success: true, key: created });
  } catch (err) {
    const message = err.message || "Failed to add key";
    return NextResponse.json({ success: false, error: message.replace(/^(NotFound|Forbidden|Unauthorized):\s*/, "") }, { status: statusFor(message) });
  }
}

export async function DELETE(request, { params }) {
  try {
    const user = await requireUser(request);
    await requirePermission(user, "tools.connect_account");
    const { toolAccountId } = await params;
    const { account } = await resolveRotateAccount(user, toolAccountId);

    const keyId = new URL(request.url).searchParams.get("keyId");
    if (!keyId) {
      return NextResponse.json({ success: false, error: "keyId query parameter is required" }, { status: 400 });
    }

    await deletePoolKey({ toolAccountId: account.id, keyId });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err.message || "Failed to remove key";
    return NextResponse.json({ success: false, error: message.replace(/^(NotFound|Forbidden|Unauthorized):\s*/, "") }, { status: statusFor(message) });
  }
}
