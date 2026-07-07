// Machine-readable OpenAPI 3.1 description of the agent-facing TMCP surface. Served by
// GET /api/openapi so SDK generators and API tooling can consume the gateway directly.
// Keep in sync with lib/docs/gateway-docs.js and the route handlers it describes.

const bearerAuth = [{ bearerAuth: [] }];

const errorResponse = {
  description: "Error",
  content: {
    "application/json": {
      schema: {
        type: "object",
        properties: { success: { type: "boolean" }, error: { type: "string" } }
      }
    }
  }
};

export function buildOpenApiSpec(baseUrl) {
  return {
    openapi: "3.1.0",
    info: {
      title: "TMCP Tool Gateway API",
      version: "1.0.0",
      description:
        "One API and one key for every connected platform. Authenticate every endpoint with an " +
        "agent API key: `Authorization: Bearer mcp_live_...`. The MCP endpoint (/api/mcp) speaks " +
        "the Model Context Protocol over Streamable HTTP; the rotate bases (/api/v1, /api/gemini/v1, " +
        "/api/openrouter/v1) are OpenAI-compatible drop-ins backed by rotating key pools."
    },
    servers: [{ url: baseUrl }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", description: "TMCP agent API key (mcp_live_...)" }
      }
    },
    paths: {
      "/api/gateway/execute": {
        post: {
          summary: "Execute a tool feature",
          security: bearerAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["action"],
                  properties: {
                    tool: { type: "string", description: "Tool slug or name (alternative to account id)" },
                    tool_account_id: { type: "string", format: "uuid" },
                    account_id: { type: "string", format: "uuid", description: "Alias of tool_account_id" },
                    action: { type: "string", description: "Feature key, e.g. gmail.send" },
                    input: { type: "object", additionalProperties: true }
                  }
                }
              }
            }
          },
          responses: {
            200: {
              description: "Result (or pending approval envelope)",
              content: {
                "application/json": {
                  schema: {
                    type: "object",
                    properties: {
                      success: { type: "boolean" },
                      result: {},
                      latency_ms: { type: "integer" },
                      status: { type: "string", description: "'pending' when approval-gated" },
                      approval_id: { type: "string" },
                      poll_url: { type: "string" }
                    }
                  }
                }
              }
            },
            401: errorResponse, 403: errorResponse, 404: errorResponse, 429: errorResponse
          }
        }
      },
      "/api/gateway/tools": {
        get: {
          summary: "List allowed connected tools and feature keys",
          security: bearerAuth,
          responses: { 200: { description: "Allowed tools" }, 401: errorResponse }
        }
      },
      "/api/gateway/status": {
        get: {
          summary: "Validate the API key and return the agent identity",
          security: bearerAuth,
          responses: { 200: { description: "Agent identity" }, 401: errorResponse }
        }
      },
      "/api/gateway/docs": {
        get: {
          summary: "Agent-readable endpoint reference, schemas, and examples",
          security: bearerAuth,
          responses: { 200: { description: "Documentation payload" }, 401: errorResponse }
        }
      },
      "/api/gateway/approvals/{approvalId}": {
        get: {
          summary: "Poll an approval-gated call; returns the executed result once approved",
          security: bearerAuth,
          parameters: [{ name: "approvalId", in: "path", required: true, schema: { type: "string", format: "uuid" } }],
          responses: { 200: { description: "Approval status/result" }, 401: errorResponse, 404: errorResponse }
        }
      },
      "/api/gateway/keys/mint": {
        post: {
          summary: "Mint a scoped, expiring child API key",
          description: "The child key is bound to the same agent but restricted to the requested feature keys; it can never be broader than the minting key.",
          security: bearerAuth,
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  required: ["features"],
                  properties: {
                    features: { type: "array", items: { type: "string" }, description: "Feature keys or prefixes, e.g. ['serper.search', 'gmail.*']" },
                    expires_in_seconds: { type: "integer", minimum: 60, maximum: 2592000, default: 3600 },
                    name: { type: "string" }
                  }
                }
              }
            }
          },
          responses: { 200: { description: "New key (raw value shown once)" }, 401: errorResponse, 403: errorResponse }
        }
      },
      "/api/mcp": {
        post: {
          summary: "Model Context Protocol server (Streamable HTTP, JSON-RPC 2.0)",
          description: "Implements initialize, ping, tools/list, tools/call. Bodies without a jsonrpc field use the legacy action format.",
          security: bearerAuth,
          responses: { 200: { description: "JSON-RPC response" }, 401: errorResponse }
        }
      },
      "/api/v1/chat/completions": {
        post: {
          summary: "OpenAI-compatible chat completions over the rotating key pools",
          description: "Auto-selects Gemini or OpenRouter from the model name; /api/gemini/v1 and /api/openrouter/v1 force the provider. Supports stream:true.",
          security: bearerAuth,
          responses: { 200: { description: "Provider response (passed through)" }, 401: errorResponse, 403: errorResponse, 429: errorResponse }
        }
      },
      "/api/v1/embeddings": {
        post: {
          summary: "OpenAI-compatible embeddings over the rotating key pools (short-TTL cached)",
          security: bearerAuth,
          responses: { 200: { description: "Provider response (passed through)" }, 401: errorResponse }
        }
      },
      "/api/rotate/{slug}": {
        post: {
          summary: "Universal user-defined rotating proxy",
          description: "Transparent path-agnostic proxy for a workspace's custom_rotate tool: same path/query/body as the upstream, TMCP injects a pool key and fails over on the configured statuses. All HTTP methods are supported.",
          security: bearerAuth,
          parameters: [{ name: "slug", in: "path", required: true, schema: { type: "string" } }],
          responses: { 200: { description: "Upstream response (passed through)" }, 401: errorResponse, 404: errorResponse }
        }
      }
    }
  };
}
