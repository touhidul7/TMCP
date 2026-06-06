import { NextResponse } from "next/server";
import { validateAgentApiKey } from "@/lib/auth/api-key-auth";
import { checkAgentToolPermission } from "@/lib/permissions/check-agent-tool-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function GET(request) {
  try {
    const agentContext = await validateAgentApiKey(request);
    const { workspaceId, agentId } = agentContext;

    const { searchParams } = new URL(request.url);
    const toolFilter = searchParams.get("tool");

    // Fetch accounts in this workspace
    const { data: accounts, error: accError } = await supabaseAdmin
      .from("tool_accounts")
      .select(`
        id,
        label,
        tool_id,
        tools (
          id,
          name,
          slug,
          tool_type,
          is_enabled
        )
      `)
      .eq("workspace_id", workspaceId)
      .eq("status", "connected");

    if (accError) throw accError;

    const toolsList = [];

    for (const account of accounts) {
      if (!account.tools?.is_enabled) continue;

      // Filter by tool slug or name if parameter provided
      const toolSlug = account.tools.slug || account.tools.name.toLowerCase();
      if (toolFilter && toolSlug.toLowerCase() !== toolFilter.toLowerCase()) {
        continue;
      }

      // Fetch features of this tool
      const { data: features } = await supabaseAdmin
        .from("tool_features")
        .select("feature_key, is_enabled")
        .eq("tool_id", account.tool_id)
        .eq("is_enabled", true);

      if (!features || features.length === 0) continue;

      const allowedFeatures = [];
      for (const feat of features) {
        const perm = await checkAgentToolPermission({
          agentId,
          toolAccountId: account.id,
          featureKey: feat.feature_key
        });
        if (perm.allowed) {
          allowedFeatures.push(feat.feature_key);
        }
      }

      if (allowedFeatures.length > 0) {
        toolsList.push({
          tool: account.tools.name,
          slug: toolSlug,
          account_label: account.label,
          tool_account_id: account.id,
          features: allowedFeatures
        });
      }
    }

    return NextResponse.json({
      success: true,
      tools: toolsList
    });

  } catch (error) {
    console.error("Gateway tools error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
