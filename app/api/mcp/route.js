import { NextResponse } from "next/server";
import { validateAgentApiKey } from "@/lib/auth/api-key-auth";
import { checkAgentToolPermission, countDailyUsage } from "@/lib/permissions/check-agent-tool-permission";
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

      const enabledAccounts = (accounts || []).filter((a) => a.tools?.is_enabled);
      if (enabledAccounts.length === 0) {
        return respond({ success: true, tools: [] });
      }

      // Batch the feature and permission lookups (one query each) instead of querying per
      // account and per feature — the old shape was O(accounts × features) round trips.
      const toolIds = [...new Set(enabledAccounts.map((a) => a.tool_id))];
      const accountIds = enabledAccounts.map((a) => a.id);

      const [featuresRes, permsRes] = await Promise.all([
        supabaseAdmin
          .from("tool_features")
          .select("tool_id, feature_key")
          .in("tool_id", toolIds)
          .eq("is_enabled", true),
        supabaseAdmin
          .from("agent_tool_permissions")
          .select("tool_account_id, feature_key")
          .eq("agent_id", agentId)
          .in("tool_account_id", accountIds)
          .eq("allowed", true)
      ]);

      if (featuresRes.error) throw featuresRes.error;
      if (permsRes.error) throw permsRes.error;

      const featuresByTool = new Map();
      for (const feat of featuresRes.data || []) {
        if (!featuresByTool.has(feat.tool_id)) featuresByTool.set(feat.tool_id, []);
        featuresByTool.get(feat.tool_id).push(feat.feature_key);
      }

      const allowedByAccount = new Set(
        (permsRes.data || []).map((p) => `${p.tool_account_id}:${p.feature_key}`)
      );

      const toolsList = [];
      for (const account of enabledAccounts) {
        const features = featuresByTool.get(account.tool_id) || [];
        const allowedFeatures = features.filter((featureKey) =>
          allowedByAccount.has(`${account.id}:${featureKey}`)
        );

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

      // Permission check, rate-limit count, and credentials load are independent — run them in
      // one parallel round trip instead of three sequential ones.
      const [permCheck, dailyUsed, credsResult] = await Promise.all([
        checkAgentToolPermission({
          agentId,
          toolAccountId: tool_account_id,
          featureKey: feature_key
        }),
        countDailyUsage({ agentId, apiKeyId, featureKey: feature_key }),
        supabaseAdmin
          .from("tool_account_credentials")
          .select(
            "encrypted_access_token, encrypted_refresh_token, encrypted_api_key, encrypted_client_secret," +
            "encrypted_private_key, encrypted_private_key_passphrase, encrypted_password, encrypted_sudo_password"
          )
          .eq("tool_account_id", tool_account_id)
          .maybeSingle()
      ]);

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

      // Daily rate limit (null count = counting failed; fail safe and allow).
      const limitOk = dailyUsed === null || dailyUsed < permCheck.dailyLimit;

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

      // Credentials were loaded in parallel above.
      if (credsResult.error) throw credsResult.error;
      const creds = credsResult.data;

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
