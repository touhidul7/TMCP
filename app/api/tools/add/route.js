import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth/require-user";
import { requirePermission } from "@/lib/auth/require-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { z } from "zod";

const AddToolSchema = z.object({
  name: z.string().min(1, "Name is required"),
  slug: z.string().min(1, "Slug is required"),
  provider: z.string().min(1, "Provider is required"),
  description: z.string().optional(),
  category: z.string().optional(),
  tool_type: z.enum(["built_in", "custom_mcp", "custom_rest"]),
  official_website_url: z.string().optional(),
  icon_url: z.string().optional(),
  icon_source: z.string().default("manual"),
  mcp_server_url: z.string().optional(),
  rest_base_url: z.string().optional(),
  mcp_config: z.any().optional(),
  rest_config: z.any().optional(),
  is_dangerous: z.boolean().default(false)
});

export async function POST(request) {
  try {
    const userContext = await requireUser(request);
    await requirePermission(userContext, "tools.add");

    const body = await request.json();
    const parsed = AddToolSchema.parse(body);

    // Create the tool record
    const { data: tool, error: toolError } = await supabaseAdmin
      .from("tools")
      .insert({
        workspace_id: userContext.workspace_id,
        owner_user_id: userContext.id,
        name: parsed.name,
        slug: parsed.slug,
        provider: parsed.provider,
        description: parsed.description,
        category: parsed.category,
        tool_type: parsed.tool_type,
        official_website_url: parsed.official_website_url,
        icon_url: parsed.icon_url,
        icon_source: parsed.icon_source,
        mcp_server_url: parsed.mcp_server_url,
        rest_base_url: parsed.rest_base_url,
        mcp_config: parsed.mcp_config,
        rest_config: parsed.rest_config,
        is_dangerous: parsed.is_dangerous,
        is_enabled: true
      })
      .select()
      .single();

    if (toolError) throw toolError;

    // Create associated tool features/actions
    const featuresToInsert = [];

    if (parsed.tool_type === "custom_mcp" && parsed.mcp_config?.features) {
      // Custom MCP lists features in config
      parsed.mcp_config.features.forEach((f) => {
        featuresToInsert.push({
          tool_id: tool.id,
          feature_key: `${parsed.slug}.${f.name}`,
          name: f.name.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
          description: f.description || `Custom MCP action ${f.name}`,
          is_dangerous: f.is_dangerous || false,
          requires_approval: f.requires_approval || false,
          is_enabled: true
        });
      });
    } else if (parsed.tool_type === "custom_rest") {
      // Custom REST tool represents one default feature/action
      featuresToInsert.push({
        tool_id: tool.id,
        feature_key: `${parsed.slug}.call`,
        name: parsed.name,
        description: parsed.description || "Custom REST API Call",
        is_dangerous: parsed.is_dangerous || false,
        requires_approval: false,
        is_enabled: true
      });
    }

    if (featuresToInsert.length > 0) {
      const { error: featError } = await supabaseAdmin
        .from("tool_features")
        .insert(featuresToInsert);

      if (featError) throw featError;
    }

    return NextResponse.json({ success: true, tool });

  } catch (err) {
    console.error("Error adding tool:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to add tool" },
      { status: err.message?.includes("Unauthorized") ? 401 : err.message?.includes("Forbidden") ? 403 : 500 }
    );
  }
}
