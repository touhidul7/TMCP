import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const UpdateToolSchema = z.object({
  toolId: z.string().min(1),
  updates: z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    official_website_url: z.string().url().optional().or(z.literal("")),
    rest_base_url: z.string().optional(),
    rest_config: z.record(z.any()).optional(),
    mcp_server_url: z.string().optional(),
    mcp_config: z.record(z.any()).optional(),
    is_enabled: z.boolean().optional(),
  })
});

export async function POST(request) {
  try {
    const userContext = await requireUser(request);
    await requirePermission(userContext, "tools.add");

    const body = await request.json();
    const { toolId, updates } = UpdateToolSchema.parse(body);

    // Verify tool belongs to this workspace
    const { data: existing, error: fetchErr } = await supabaseAdmin
      .from("tools")
      .select("id, workspace_id, slug")
      .eq("id", toolId)
      .eq("workspace_id", userContext.workspace_id)
      .maybeSingle();

    if (fetchErr || !existing) {
      return NextResponse.json(
        { success: false, error: "Tool not found or access denied" },
        { status: 404 }
      );
    }

    // Apply the patch
    const { data: updated, error: updateErr } = await supabaseAdmin
      .from("tools")
      .update(updates)
      .eq("id", toolId)
      .select()
      .single();

    if (updateErr) throw updateErr;

    return NextResponse.json({ success: true, tool: updated });

  } catch (err) {
    console.error("Error updating tool:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to update tool" },
      { status: err.message?.includes("Unauthorized") ? 401 : err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
