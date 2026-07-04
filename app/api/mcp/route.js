import { NextResponse } from "next/server";
import { validateAgentApiKey } from "@/lib/auth/api-key-auth";
import { runGatewayCall } from "@/lib/gateway/run-gateway-call";
import {
  listAgentMcpTools,
  handleInitialize,
  toolCallResultFromOutcome,
  rpcResult,
  rpcError,
  RPC_ERRORS
} from "@/lib/mcp/protocol";

// TMCP's MCP server endpoint (Streamable HTTP transport, stateless).
//
//   • JSON-RPC 2.0 bodies speak real MCP: initialize, notifications/initialized, ping,
//     tools/list, and tools/call — so Claude Desktop/Code, Cursor, and any other MCP client can
//     connect with just this URL and an `Authorization: Bearer mcp_live_...` header.
//   • Bodies without a `jsonrpc` field keep the original TMCP action format
//     ({ action: "tools.list" | "tools.call", ... }) for existing integrations.
//
// The server returns JSON responses (never SSE) and issues no session id, both of which the
// Streamable HTTP spec allows. GET/DELETE are 405 since there are no server-initiated streams
// and no sessions to delete.

export async function POST(request) {
  const startTime = performance.now();

  let agentContext;
  try {
    agentContext = await validateAgentApiKey(request);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message || "Unauthorized" },
      { status: 401 }
    );
  }

  let reqBody;
  try {
    reqBody = await request.json();
  } catch {
    return NextResponse.json(
      rpcError(null, RPC_ERRORS.PARSE_ERROR, "Invalid JSON body"),
      { status: 400 }
    );
  }

  if (reqBody && reqBody.jsonrpc === "2.0") {
    return handleMcpMessage(reqBody, agentContext, startTime);
  }
  if (Array.isArray(reqBody)) {
    // JSON-RPC batching was removed in MCP 2025-06-18.
    return NextResponse.json(
      rpcError(null, RPC_ERRORS.INVALID_REQUEST, "Batch requests are not supported"),
      { status: 400 }
    );
  }

  return handleLegacyAction(reqBody || {}, agentContext, startTime);
}

// The spec requires 405 when the server offers no server-initiated SSE stream (GET) and no
// session to terminate (DELETE).
export async function GET() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

export async function DELETE() {
  return new Response(null, { status: 405, headers: { Allow: "POST" } });
}

// ---------------------------------------------------------------------------
// MCP (JSON-RPC 2.0)
// ---------------------------------------------------------------------------

async function handleMcpMessage(message, agentContext, startTime) {
  const { workspaceId, agentId, apiKeyId } = agentContext;
  const { id, method, params } = message;

  // Notifications (no id) expect no body; 202 Accepted per the Streamable HTTP transport.
  if (id === undefined || id === null) {
    return new Response(null, { status: 202 });
  }

  try {
    if (method === "initialize") {
      return NextResponse.json(handleInitialize(id, params));
    }

    if (method === "ping") {
      return NextResponse.json(rpcResult(id, {}));
    }

    if (method === "tools/list") {
      const entries = await listAgentMcpTools({ workspaceId, agentId });
      return NextResponse.json(
        rpcResult(id, {
          tools: entries.map(({ name, description, inputSchema }) => ({
            name,
            description,
            inputSchema
          }))
        })
      );
    }

    if (method === "tools/call") {
      const name = params?.name;
      if (!name || typeof name !== "string") {
        return NextResponse.json(rpcError(id, RPC_ERRORS.INVALID_PARAMS, "Missing tool name"));
      }
      const input = params?.arguments || params?.input || {};

      // Resolve the MCP tool name against the agent's allowed set. Raw feature keys
      // ("gmail.send") with an explicit account id are also accepted for compatibility with
      // the previous JSON-RPC dialect.
      let toolAccountId;
      let featureKey;
      const explicitAccount = params?.tool_account_id || params?.account_id;
      if (explicitAccount && name.includes(".")) {
        toolAccountId = explicitAccount;
        featureKey = params?.feature_key || name;
      } else {
        const entries = await listAgentMcpTools({ workspaceId, agentId });
        const entry = entries.find((e) => e.name === name)
          || (name.includes(".") ? entries.find((e) => e.featureKey === name) : null);
        if (!entry) {
          return NextResponse.json(rpcError(id, RPC_ERRORS.INVALID_PARAMS, `Unknown tool: ${name}`));
        }
        toolAccountId = entry.toolAccountId;
        featureKey = entry.featureKey;
      }

      const outcome = await runGatewayCall({
        workspaceId,
        agentId,
        apiKeyId,
        toolAccountId,
        featureKey,
        input,
        startTime
      });

      if (outcome.kind === "not_found") {
        return NextResponse.json(rpcError(id, RPC_ERRORS.INVALID_PARAMS, outcome.error));
      }
      return NextResponse.json(rpcResult(id, toolCallResultFromOutcome(outcome)));
    }

    // Optional capability listings some clients probe for even when not advertised.
    if (method === "resources/list") {
      return NextResponse.json(rpcResult(id, { resources: [] }));
    }
    if (method === "prompts/list") {
      return NextResponse.json(rpcResult(id, { prompts: [] }));
    }

    return NextResponse.json(rpcError(id, RPC_ERRORS.METHOD_NOT_FOUND, `Method not found: ${method}`));
  } catch (err) {
    console.error("MCP request failed:", err);
    return NextResponse.json(
      rpcError(id, RPC_ERRORS.INTERNAL_ERROR, err.message || "Internal error")
    );
  }
}

// ---------------------------------------------------------------------------
// Legacy TMCP action format (pre-MCP integrations)
// ---------------------------------------------------------------------------

async function handleLegacyAction(reqBody, agentContext, startTime) {
  const { workspaceId, agentId, apiKeyId } = agentContext;
  const action = reqBody.action;

  if (action === "tools.list") {
    try {
      const entries = await listAgentMcpTools({ workspaceId, agentId });

      // Preserve the original account-grouped response shape.
      const byAccount = new Map();
      for (const entry of entries) {
        if (!byAccount.has(entry.toolAccountId)) {
          byAccount.set(entry.toolAccountId, {
            tool: entry.toolName,
            account_label: entry.accountLabel,
            tool_account_id: entry.toolAccountId,
            features: []
          });
        }
        byAccount.get(entry.toolAccountId).features.push(entry.featureKey);
      }

      return NextResponse.json({ success: true, tools: [...byAccount.values()] });
    } catch (err) {
      console.error("Error in tools.list:", err);
      return NextResponse.json({ success: false, error: "Failed to list tools" }, { status: 500 });
    }
  }

  if (action === "tools.call") {
    const toolAccountId = reqBody.tool_account_id || reqBody.account_id;
    const featureKey = reqBody.feature_key;
    const input = reqBody.input || {};

    if (!toolAccountId || !featureKey) {
      return NextResponse.json(
        { success: false, error: "Missing tool_account_id or feature_key parameter" },
        { status: 400 }
      );
    }

    const outcome = await runGatewayCall({
      workspaceId,
      agentId,
      apiKeyId,
      toolAccountId,
      featureKey,
      input,
      startTime
    });

    if (outcome.kind === "success") {
      return NextResponse.json({ success: true, feature_key: featureKey, data: outcome.data });
    }
    if (outcome.kind === "pending") {
      return NextResponse.json({
        success: false,
        status: "pending",
        approval_id: outcome.approvalId,
        message: "Action queued. Dangerous tool call requires approval."
      });
    }
    if (outcome.kind === "denied") {
      return NextResponse.json({ success: false, error: outcome.error }, { status: 403 });
    }
    if (outcome.kind === "rate_limited") {
      return NextResponse.json({ success: false, error: outcome.error }, { status: 429 });
    }
    // not_found and error both surfaced as 500 in the original implementation.
    return NextResponse.json(
      { success: false, error: outcome.error || "Failed to execute tool" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: false, error: "Unsupported gateway action" }, { status: 400 });
}
