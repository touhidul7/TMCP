import { NextResponse } from "next/server";
import { validateAgentApiKey } from "@/lib/auth/api-key-auth";
import { checkAgentToolPermission } from "@/lib/permissions/check-agent-tool-permission";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { GATEWAY_ENDPOINTS, buildExecutePayload, buildGatewaySnippets, getGatewaySchemas } from "@/lib/docs/gateway-docs";

function getBaseUrl(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export async function GET(request) {
  try {
    const agentContext = await validateAgentApiKey(request);
    const { workspaceId, agentId, agentName } = agentContext;
    const baseUrl = getBaseUrl(request);

    const { data: accounts, error: accError } = await supabaseAdmin
      .from("tool_accounts")
      .select(`
        id,
        label,
        account_email,
        tool_id,
        tools (
          id,
          name,
          slug,
          description,
          tool_type,
          is_enabled
        )
      `)
      .eq("workspace_id", workspaceId)
      .eq("status", "connected");

    if (accError) throw accError;

    const toolDocs = [];

    for (const account of accounts || []) {
      if (!account.tools?.is_enabled) continue;

      const { data: features, error: featError } = await supabaseAdmin
        .from("tool_features")
        .select("feature_key, name, description, is_dangerous, requires_approval, is_enabled")
        .eq("tool_id", account.tool_id)
        .eq("is_enabled", true);

      if (featError) throw featError;

      const allowedFeatures = [];
      for (const feature of features || []) {
        const perm = await checkAgentToolPermission({
          agentId,
          toolAccountId: account.id,
          featureKey: feature.feature_key
        });

        if (!perm.allowed) continue;

        allowedFeatures.push({
          feature_key: feature.feature_key,
          name: feature.name,
          description: feature.description,
          is_dangerous: feature.is_dangerous,
          requires_approval: perm.requiresApproval || feature.requires_approval,
          daily_limit: perm.dailyLimit,
          example_request: buildExecutePayload({
            toolSlug: account.tools.slug,
            featureKey: feature.feature_key,
            accountId: account.id
          })
        });
      }

      if (allowedFeatures.length === 0) continue;

      const firstFeature = allowedFeatures[0].feature_key;
      toolDocs.push({
        tool: account.tools.name,
        slug: account.tools.slug,
        description: account.tools.description,
        tool_type: account.tools.tool_type,
        account: {
          account_id: account.id,
          label: account.label,
          account_email: account.account_email
        },
        features: allowedFeatures,
        examples: buildGatewaySnippets({
          baseUrl,
          toolSlug: account.tools.slug,
          featureKey: firstFeature,
          accountId: account.id
        })
      });
    }

    return NextResponse.json({
      success: true,
      gateway: {
        name: "TMCP Tool Gateway",
        version: "1.2.0",
        base_url: `${baseUrl}/api/gateway`,
        authentication: "Authorization: Bearer <mcp_live_api_key>"
      },
      agent: {
        id: agentId,
        name: agentName
      },
      endpoints: GATEWAY_ENDPOINTS,
      schemas: getGatewaySchemas(),
      tools: toolDocs
    });
  } catch (error) {
    console.error("Gateway docs error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Unauthorized" },
      { status: 401 }
    );
  }
}
