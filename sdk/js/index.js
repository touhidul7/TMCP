"use strict";

/**
 * TMCP Gateway JavaScript SDK — zero-dependency client for the TMCP Tool Gateway.
 *
 *   const { TMCPClient } = require("tmcp-sdk");
 *   const tmcp = new TMCPClient({ baseUrl: "https://your-tmcp.example", apiKey: "mcp_live_..." });
 *   const result = await tmcp.execute({ tool: "serper", action: "serper.search", input: { query: "tmcp" } });
 *
 * Works in Node 18+ and any environment with global fetch.
 */

class TMCPError extends Error {
  constructor(message, { status, body } = {}) {
    super(message);
    this.name = "TMCPError";
    this.status = status;
    this.body = body;
  }
}

class TMCPClient {
  /**
   * @param {object} opts
   * @param {string} opts.baseUrl - TMCP deployment origin, e.g. "https://tmcp.example.com"
   * @param {string} opts.apiKey  - agent API key ("mcp_live_...")
   * @param {number} [opts.timeoutMs=60000]
   */
  constructor({ baseUrl, apiKey, timeoutMs = 60000 } = {}) {
    if (!baseUrl) throw new TMCPError("baseUrl is required");
    if (!apiKey) throw new TMCPError("apiKey is required");
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.apiKey = apiKey;
    this.timeoutMs = timeoutMs;
  }

  async _request(method, path, body) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        ...(body !== undefined ? { "Content-Type": "application/json" } : {})
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      signal: AbortSignal.timeout(this.timeoutMs)
    });
    let json;
    try {
      json = await res.json();
    } catch {
      throw new TMCPError(`Non-JSON response (HTTP ${res.status})`, { status: res.status });
    }
    if (!res.ok || json.success === false) {
      throw new TMCPError(json.error?.message || json.error || `HTTP ${res.status}`, { status: res.status, body: json });
    }
    return json;
  }

  /** Validate the key and return the agent identity. */
  status() {
    return this._request("GET", "/api/gateway/status");
  }

  /** Connected tools and feature keys this agent may call. */
  listTools() {
    return this._request("GET", "/api/gateway/tools");
  }

  /**
   * Execute a tool feature. Returns the full envelope; when the call is approval-gated the
   * envelope has status "pending" and an approval_id to poll with getApproval().
   * @param {object} p - { tool?, accountId?, action, input? }
   */
  execute({ tool, accountId, action, input = {} }) {
    return this._request("POST", "/api/gateway/execute", {
      ...(tool ? { tool } : {}),
      ...(accountId ? { tool_account_id: accountId } : {}),
      action,
      input
    });
  }

  /** Poll an approval-gated call; once approved and executed, the result is included. */
  getApproval(approvalId) {
    return this._request("GET", `/api/gateway/approvals/${approvalId}`);
  }

  /**
   * Execute and, if approval-gated, poll until decided or timeout.
   * @param {object} p - execute() params plus { pollIntervalMs=5000, pollTimeoutMs=300000 }
   */
  async executeAndWait({ pollIntervalMs = 5000, pollTimeoutMs = 300000, ...params }) {
    const first = await this.execute(params);
    if (first.status !== "pending") return first;
    const deadline = Date.now() + pollTimeoutMs;
    while (Date.now() < deadline) {
      await new Promise((r) => setTimeout(r, pollIntervalMs));
      const approval = await this.getApproval(first.approval_id);
      if (approval.status === "rejected") {
        throw new TMCPError("Approval was rejected", { body: approval });
      }
      if (approval.status === "approved" && approval.executed) {
        if (approval.execution_error) throw new TMCPError(approval.execution_error, { body: approval });
        return { success: true, result: approval.result, approval_id: approval.approval_id };
      }
    }
    throw new TMCPError("Timed out waiting for approval", { body: first });
  }

  /**
   * Mint a scoped, expiring child key (raw key returned once).
   * @param {object} p - { features: ["serper.search", "gmail.*"], expiresInSeconds?, name? }
   */
  mintScopedKey({ features, expiresInSeconds, name }) {
    return this._request("POST", "/api/gateway/keys/mint", {
      features,
      ...(expiresInSeconds ? { expires_in_seconds: expiresInSeconds } : {}),
      ...(name ? { name } : {})
    });
  }

  /**
   * OpenAI-compatible chat completion over the rotating key pools (non-streaming).
   * body is a standard chat.completions payload; provider is picked from the model name.
   */
  chat(body) {
    return this._request("POST", "/api/v1/chat/completions", body);
  }

  /** OpenAI-compatible embeddings over the rotating key pools (short-TTL cached server-side). */
  embeddings(body) {
    return this._request("POST", "/api/v1/embeddings", body);
  }
}

module.exports = { TMCPClient, TMCPError };
