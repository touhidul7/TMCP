import { NextResponse } from "next/server";
import { validateAgentApiKey } from "@/lib/auth/api-key-auth";
import { runGatewayCall } from "@/lib/gateway/run-gateway-call";
import { supabaseAdmin } from "@/lib/supabase/admin";

export async function POST(request) {
  const startTime = performance.now();
  let agentContext = null;
  let reqBody = null;

  try {
    agentContext = await validateAgentApiKey(request);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Unauthorized" },
      { status: 401 }
    );
  }

  const { workspaceId, agentId, apiKeyId } = agentContext;

  try {
    reqBody = await request.json();
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { tool, action, input = {}, tool_account_id, account_id } = reqBody;
  // Agents may send either account_id (friendly alias) or tool_account_id (internal name).
  // Normalize both so future SSH/VPS/shared-hosting accounts can be selected reliably.
  const requestedAccountId = tool_account_id || account_id;

  if (!action) {
    return NextResponse.json(
      { success: false, error: "Missing action parameter" },
      { status: 400 }
    );
  }

  try {
    // Resolve the target account. An explicit account id is used as-is; the tool-name form
    // fetches the workspace's connected accounts and matches slug/name case-insensitively
    // (that matching can't be pushed into SQL safely).
    let resolvedAccountId = requestedAccountId || null;

    if (!resolvedAccountId && tool) {
      const { data: accounts, error: accError } = await supabaseAdmin
        .from("tool_accounts")
        .select("id, label, tools ( slug, name )")
        .eq("workspace_id", workspaceId)
        .eq("status", "connected");

      if (accError) throw accError;

      const matchingAccounts = (accounts || []).filter(a => {
        const slug = a.tools?.slug || "";
        const name = a.tools?.name || "";
        return slug.toLowerCase() === tool.toLowerCase() || name.toLowerCase() === tool.toLowerCase();
      });

      if (matchingAccounts.length > 1) {
        return NextResponse.json(
          {
            success: false,
            error: `Multiple connected accounts found for tool '${tool}'. Please provide account_id or tool_account_id.`,
            accounts: matchingAccounts.map(a => ({
              account_id: a.id,
              tool_account_id: a.id,
              account_label: a.label
            }))
          },
          { status: 400 }
        );
      }

      resolvedAccountId = matchingAccounts[0]?.id || null;
    }

    if (!resolvedAccountId) {
      return NextResponse.json(
        { success: false, error: `No connected account found for tool: ${tool || 'unknown'}` },
        { status: 404 }
      );
    }

    // Shared gateway pipeline: permission matrix, daily rate limit, approval gate, execution,
    // and audit logging (same code path as the MCP server's tools/call).
    const outcome = await runGatewayCall({
      workspaceId,
      agentId,
      apiKeyId,
      toolAccountId: resolvedAccountId,
      featureKey: action,
      input,
      startTime
    });

    switch (outcome.kind) {
      case "success":
        return NextResponse.json({
          success: true,
          result: outcome.data,
          latency_ms: outcome.latencyMs
        });
      case "pending":
        return NextResponse.json({
          success: false,
          status: "pending",
          approval_id: outcome.approvalId,
          message: "Action queued. Dangerous tool call requires approval.",
          poll_url: `/api/gateway/approvals/${outcome.approvalId}`
        });
      case "denied":
        return NextResponse.json({ success: false, error: outcome.error }, { status: 403 });
      case "rate_limited":
        return NextResponse.json({ success: false, error: outcome.error }, { status: 429 });
      case "disabled":
        return NextResponse.json({ success: false, error: outcome.error }, { status: 400 });
      case "not_found":
        return NextResponse.json(
          { success: false, error: requestedAccountId ? `Connected account not found or not accessible: ${requestedAccountId}` : outcome.error },
          { status: 404 }
        );
      default:
        return NextResponse.json(
          { success: false, error: outcome.error || "Failed to execute tool" },
          { status: 500 }
        );
    }
  } catch (err) {
    console.error("Error executing gateway tool call:", err);
    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute tool" },
      { status: 500 }
    );
  }
}
