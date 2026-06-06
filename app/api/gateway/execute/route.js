import { NextResponse } from "next/server";
import { validateAgentApiKey } from "@/lib/auth/api-key-auth";
import { checkAgentToolPermission, checkRateLimit } from "@/lib/permissions/check-agent-tool-permission";
import { logToolCall } from "@/lib/logs/log-tool-call";
import { supabaseAdmin } from "@/lib/supabase/admin";
const { runTool } = require("@/lib/tools/router");

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

  const { workspaceId, agentId, apiKeyId, agentName } = agentContext;

  try {
    reqBody = await request.json();
  } catch (e) {
    return NextResponse.json(
      { success: false, error: "Invalid JSON body" },
      { status: 400 }
    );
  }

  const { tool, action, input = {}, tool_account_id } = reqBody;

  if (!action) {
    return NextResponse.json(
      { success: false, error: "Missing action parameter" },
      { status: 400 }
    );
  }

  try {
    // 1. Fetch connected tool accounts in workspace
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
          is_enabled,
          mcp_server_url,
          rest_base_url,
          mcp_config,
          rest_config
        )
      `)
      .eq("workspace_id", workspaceId)
      .eq("status", "connected");

    if (accError) throw accError;

    // 2. Find matching account
    let selectedAccount = null;
    if (tool_account_id) {
      selectedAccount = accounts.find(a => a.id === tool_account_id);
    } else if (tool) {
      selectedAccount = accounts.find(a => {
        const slug = a.tools?.slug || "";
        const name = a.tools?.name || "";
        return slug.toLowerCase() === tool.toLowerCase() || name.toLowerCase() === tool.toLowerCase();
      });
    }

    if (!selectedAccount) {
      return NextResponse.json(
        { success: false, error: `No connected account found for tool: ${tool || 'unknown'}` },
        { status: 404 }
      );
    }

    const toolRecord = selectedAccount.tools;
    const resolvedAccountId = selectedAccount.id;

    if (!toolRecord || !toolRecord.is_enabled) {
      return NextResponse.json(
        { success: false, error: "Associated tool is disabled" },
        { status: 400 }
      );
    }

    // 3. Check agent permission matrix
    const permCheck = await checkAgentToolPermission({
      agentId,
      toolAccountId: resolvedAccountId,
      featureKey: action
    });

    if (!permCheck.allowed) {
      const latencyMs = Math.round(performance.now() - startTime);
      await logToolCall({
        workspaceId,
        agentId,
        apiKeyId,
        toolId: toolRecord.id,
        toolAccountId: resolvedAccountId,
        toolName: toolRecord.name,
        featureKey: action,
        input,
        status: "DENIED",
        error: permCheck.reason || "Permission Denied",
        latencyMs
      });

      return NextResponse.json(
        { success: false, error: permCheck.reason || "Permission Denied" },
        { status: 403 }
      );
    }

    // 4. Check daily rate limit
    const limitOk = await checkRateLimit({
      agentId,
      apiKeyId,
      featureKey: action,
      dailyLimit: permCheck.dailyLimit
    });

    if (!limitOk) {
      const latencyMs = Math.round(performance.now() - startTime);
      const limitErr = `Rate limit exceeded: Daily cap of ${permCheck.dailyLimit} reached.`;
      await logToolCall({
        workspaceId,
        agentId,
        apiKeyId,
        toolId: toolRecord.id,
        toolAccountId: resolvedAccountId,
        toolName: toolRecord.name,
        featureKey: action,
        input,
        status: "DENIED",
        error: limitErr,
        latencyMs
      });

      return NextResponse.json(
        { success: false, error: limitErr },
        { status: 429 }
      );
    }

    // 5. Check manual approval requirement
    if (permCheck.requiresApproval) {
      const { data: approval, error: apprError } = await supabaseAdmin
        .from("tool_approvals")
        .insert({
          workspace_id: workspaceId,
          agent_id: agentId,
          api_key_id: apiKeyId,
          tool_id: toolRecord.id,
          tool_account_id: resolvedAccountId,
          feature_key: action,
          input,
          status: "pending"
        })
        .select("id")
        .single();

      if (apprError) throw apprError;

      const latencyMs = Math.round(performance.now() - startTime);
      await logToolCall({
        workspaceId,
        agentId,
        apiKeyId,
        toolId: toolRecord.id,
        toolAccountId: resolvedAccountId,
        toolName: toolRecord.name,
        featureKey: action,
        input,
        status: "PENDING_APPROVAL",
        error: "Action queued. Awaiting administrator approval.",
        latencyMs
      });

      return NextResponse.json({
        success: false,
        status: "pending",
        approval_id: approval.id,
        message: "Action queued. Dangerous tool call requires approval."
      });
    }

    // 6. Load credentials
    const { data: creds } = await supabaseAdmin
      .from("tool_account_credentials")
      .select("encrypted_access_token, encrypted_refresh_token, encrypted_api_key, encrypted_client_secret")
      .eq("tool_account_id", resolvedAccountId)
      .maybeSingle();

    // 7. Run tool router
    const data = await runTool({
      tool: toolRecord,
      featureKey: action,
      input,
      credentialRecord: creds
    });

    const latencyMs = Math.round(performance.now() - startTime);

    // 8. Log successful call
    await logToolCall({
      workspaceId,
      agentId,
      apiKeyId,
      toolId: toolRecord.id,
      toolAccountId: resolvedAccountId,
      toolName: toolRecord.name,
      featureKey: action,
      input,
      output: data,
      status: "SUCCESS",
      latencyMs
    });

    return NextResponse.json({
      success: true,
      result: data,
      latency_ms: latencyMs
    });

  } catch (err) {
    console.error("Error executing gateway tool call:", err);
    const latencyMs = Math.round(performance.now() - startTime);

    return NextResponse.json(
      { success: false, error: err.message || "Failed to execute tool" },
      { status: 500 }
    );
  }
}
