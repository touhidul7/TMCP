// Pure, side-effect-free MCP protocol logic (no DB, no Next.js) so it can be unit tested the
// same way rotate-core.js is. lib/mcp/protocol.js layers the database-backed pieces on top.

const LATEST_PROTOCOL_VERSION = "2025-06-18";
const SUPPORTED_PROTOCOL_VERSIONS = new Set([
  "2025-06-18",
  "2025-03-26",
  "2024-11-05"
]);

const SERVER_INFO = { name: "TMCP Gateway", version: "1.0.0" };

const SERVER_CAPABILITIES = {
  tools: { listChanged: false }
};

const SERVER_INSTRUCTIONS =
  "TMCP exposes this workspace's connected tool accounts as MCP tools, filtered by the calling " +
  "agent's permission matrix. Some tools are approval-gated: calls to them return a pending " +
  "approval id instead of a result, and an administrator must approve the action in the TMCP " +
  "dashboard before it runs.";

// MCP tool names must be simple identifiers, so feature keys ("gmail.send") become "gmail__send".
// No seeded feature key contains "__", which makes the mapping reversible; when the same feature
// is allowed on more than one connected account, a "--<account prefix>" suffix disambiguates.
function mcpToolName(featureKey, accountId, ambiguous) {
  const base = featureKey.split(".").join("__");
  return ambiguous ? `${base}--${accountId.slice(0, 8)}` : base;
}

function rpcResult(id, result) {
  return { jsonrpc: "2.0", id, result };
}

function rpcError(id, code, message, data) {
  return { jsonrpc: "2.0", id, error: { code, message, ...(data !== undefined ? { data } : {}) } };
}

const RPC_ERRORS = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
};

function handleInitialize(id, params) {
  const requested = params?.protocolVersion;
  const protocolVersion = SUPPORTED_PROTOCOL_VERSIONS.has(requested)
    ? requested
    : LATEST_PROTOCOL_VERSION;

  return rpcResult(id, {
    protocolVersion,
    capabilities: SERVER_CAPABILITIES,
    serverInfo: SERVER_INFO,
    instructions: SERVER_INSTRUCTIONS
  });
}

// Shape a runGatewayCall outcome as an MCP tools/call result. Execution-level failures are tool
// results with isError (so the model can read and react to them), not protocol errors.
function toolCallResultFromOutcome(outcome) {
  if (outcome.kind === "success") {
    const structured = outcome.data !== null && typeof outcome.data === "object" && !Array.isArray(outcome.data)
      ? outcome.data
      : undefined;
    return {
      content: [{ type: "text", text: JSON.stringify(outcome.data, null, 2) }],
      ...(structured ? { structuredContent: structured } : {}),
      isError: false
    };
  }

  if (outcome.kind === "pending") {
    const pending = {
      status: "pending_approval",
      approval_id: outcome.approvalId,
      message:
        "This action is approval-gated. It has been queued for an administrator; poll " +
        `GET /api/gateway/approvals/${outcome.approvalId} with the same API key to retrieve the result once decided.`
    };
    return {
      content: [{ type: "text", text: JSON.stringify(pending, null, 2) }],
      structuredContent: pending,
      isError: false
    };
  }

  return {
    content: [{ type: "text", text: outcome.error || "Tool execution failed" }],
    isError: true
  };
}

module.exports = {
  LATEST_PROTOCOL_VERSION,
  SERVER_INFO,
  SERVER_CAPABILITIES,
  SERVER_INSTRUCTIONS,
  mcpToolName,
  rpcResult,
  rpcError,
  RPC_ERRORS,
  handleInitialize,
  toolCallResultFromOutcome
};
