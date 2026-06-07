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
    // 1. Authenticate the Agent
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

  // Support both JSON-RPC 2.0 (method/params) and action-based format
  let action, tool_account_id, feature_key, input = {}, jsonrpcId;

  if (reqBody.jsonrpc === '2.0') {
    // JSON-RPC 2.0 — map method to action
    jsonrpcId = reqBody.id;
    const params = reqBody.params || {};
    if (reqBody.method === 'tools/list') {
      action = 'tools.list';
    } else if (reqBody.method === 'tools/call') {
      action = 'tools.call';
      tool_account_id = params.tool_account_id || params.account_id;
      feature_key = params.feature_key || params.name;
      input = params.input || params.arguments || {};
    } else {
      const rpcErr = { jsonrpc: '2.0', id: reqBody.id, error: { code: -32601, message: `Method not found: ${reqBody.method}` } };
      return NextResponse.json(rpcErr, { status: 404 });
    }
  } else {
    // Legacy action-based format
    action = reqBody.action;
    tool_account_id = reqBody.tool_account_id || reqBody.account_id;
    feature_key = reqBody.feature_key;
    input = reqBody.input || {};
  }

  // Helper to wrap response in JSON-RPC if needed
  const respond = (body, status = 200) => {
    if (jsonrpcId !== undefined) {
      if (body.success === false || body.error) {
        return NextResponse.json({ jsonrpc: '2.0', id: jsonrpcId, error: { code: -32000, message: body.error || 'Error' } }, { status });
      }
      return NextResponse.json({ jsonrpc: '2.0', id: jsonrpcId, result: body }, { status });
    }
    return NextResponse.json(body, { status });
  };

  // -------------------------------------------------------------
  // ACTION: tools.list
  // -------------------------------------------------------------
  if (action === "tools.list") {
    try {
      // Get all accounts connected in this workspace
      const { data: accounts, error: accError } = await supabaseAdmin
        .from("tool_accounts")
        .select(`
          id,
          label,
          tool_id,
          tools (
            name,
            tool_type,
            is_enabled
          )
        `)
        .eq("workspace_id", workspaceId)
        .eq("status", "connected");

      if (accError) throw accError;

      // Filter based on permissions
      const toolsList = [];

      for (const account of accounts) {
        if (!account.tools?.is_enabled) continue;

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
            account_label: account.label,
            tool_account_id: account.id,
            features: allowedFeatures
          });
        }
      }

      return respond({ success: true, tools: toolsList });
    } catch (err) {
      console.error("Error in tools.list:", err);
      return respond({ success: false, error: "Failed to list tools" }, 500);
    }
  }

  // -------------------------------------------------------------
  // ACTION: tools.call
  // -------------------------------------------------------------
  if (action === "tools.call") {
    if (!tool_account_id || !feature_key) {
      return respond({ success: false, error: "Missing tool_account_id or feature_key parameter" }, 400);
    }

    let toolRecord = null;
    let accountRecord = null;

    try {
      // Validate tool account ownership & load tool details
      const { data: account, error: accError } = await supabaseAdmin
        .from("tool_accounts")
        .select(`
          id,
          label,
          tool_id,
          workspace_id,
          connection_metadata,
          tools (
            id,
            name,
            tool_type,
            is_enabled,
            mcp_server_url,
            rest_base_url,
            mcp_config,
            rest_config
          )
        `)
        .eq("id", tool_account_id)
        .eq("workspace_id", workspaceId)
        .single();

      if (accError || !account) {
        throw new Error("Tool account not found or access denied");
      }

      accountRecord = account;
      toolRecord = account.tools;

      if (!toolRecord || !toolRecord.is_enabled) {
        throw new Error("Associated tool is disabled");
      }

      // Check agent permission matrix
      const permCheck = await checkAgentToolPermission({
        agentId,
        toolAccountId: tool_account_id,
        featureKey: feature_key
      });

      if (!permCheck.allowed) {
        // Log access denied
        const latencyMs = Math.round(performance.now() - startTime);
        await logToolCall({
          workspaceId,
          agentId,
          apiKeyId,
          toolId: toolRecord.id,
          toolAccountId: tool_account_id,
          toolName: toolRecord.name,
          featureKey: feature_key,
          input,
          status: "DENIED",
          error: permCheck.reason || "Permission Denied",
          latencyMs
        });

        return respond({ success: false, error: permCheck.reason || "Permission Denied" }, 403);
      }

      // Check daily rate limit
      const limitOk = await checkRateLimit({
        agentId,
        apiKeyId,
        featureKey: feature_key,
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
          toolAccountId: tool_account_id,
          toolName: toolRecord.name,
          featureKey: feature_key,
          input,
          status: "DENIED",
          error: limitErr,
          latencyMs
        });

        return respond({ success: false, error: limitErr }, 429);
      }

      // Check manual approval requirement
      if (permCheck.requiresApproval) {
        // Create manual approval entry in DB
        const { data: approval, error: apprError } = await supabaseAdmin
          .from("tool_approvals")
          .insert({
            workspace_id: workspaceId,
            agent_id: agentId,
            api_key_id: apiKeyId,
            tool_id: toolRecord.id,
            tool_account_id: tool_account_id,
            feature_key: feature_key,
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
          toolAccountId: tool_account_id,
          toolName: toolRecord.name,
          featureKey: feature_key,
          input,
          status: "PENDING_APPROVAL",
          error: "Action queued. Awaiting administrator approval.",
          latencyMs
        });

        return respond({
          success: false,
          status: "pending",
          approval_id: approval.id,
          message: "Action queued. Dangerous tool call requires approval."
        });
      }

      // Load connection credentials
      const { data: creds, error: credsError } = await supabaseAdmin
        .from("tool_account_credentials")
        .select(
          "encrypted_access_token, encrypted_refresh_token, encrypted_api_key, encrypted_client_secret," +
          "encrypted_private_key, encrypted_private_key_passphrase, encrypted_password, encrypted_sudo_password"
        )
        .eq("tool_account_id", tool_account_id)
        .maybeSingle();

      // Attach non-sensitive connection metadata so tool handlers can read host/port/username etc.
      toolRecord._connectionMetadata = accountRecord.connection_metadata || {};

      // Execute Tool Router
      const data = await runTool({
        tool: toolRecord,
        featureKey: feature_key,
        input,
        credentialRecord: creds
      });

      const latencyMs = Math.round(performance.now() - startTime);

      // Log successful call
      await logToolCall({
        workspaceId,
        agentId,
        apiKeyId,
        toolId: toolRecord.id,
        toolAccountId: tool_account_id,
        toolName: toolRecord.name,
        featureKey: feature_key,
        input,
        output: data,
        status: "SUCCESS",
        latencyMs
      });

      return respond({
        success: true,
        feature_key,
        data
      });

    } catch (err) {
      console.error("Error executing tool call:", err);
      const latencyMs = Math.round(performance.now() - startTime);

      // Log failure
      if (toolRecord) {
        await logToolCall({
          workspaceId,
          agentId,
          apiKeyId,
          toolId: toolRecord.id,
          toolAccountId: tool_account_id,
          toolName: toolRecord.name,
          featureKey: feature_key,
          input,
          status: "FAILED",
          error: err.message || "Execution Failed",
          latencyMs
        });
      }

      return respond({ success: false, error: err.message || "Failed to execute tool" }, 500);
    }
  }

  return respond({ success: false, error: "Unsupported gateway action" }, 400);
}
