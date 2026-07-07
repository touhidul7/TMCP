# tmcp-sdk

Zero-dependency JavaScript client for the [TMCP Tool Gateway](../../README.md). Node 18+ (or any
runtime with global `fetch`).

```bash
npm install tmcp-sdk   # or copy index.js — it has no dependencies
```

```js
const { TMCPClient } = require("tmcp-sdk");

const tmcp = new TMCPClient({
  baseUrl: "https://your-tmcp-deployment.com",
  apiKey: "mcp_live_..." // agent API key from the TMCP dashboard
});

// Who am I?
const me = await tmcp.status();

// What can this agent call?
const tools = await tmcp.listTools();

// Run a tool feature
const search = await tmcp.execute({
  tool: "serper",
  action: "serper.search",
  input: { query: "tmcp gateway", num: 5 }
});

// Approval-gated call: execute and wait for an administrator's decision
const sent = await tmcp.executeAndWait({
  tool: "gmail",
  action: "gmail.send",
  input: { to: "client@example.com", subject: "Hello", body: "From TMCP" }
});

// Hand a narrower, expiring key to a third-party agent
const child = await tmcp.mintScopedKey({
  features: ["serper.search"],
  expiresInSeconds: 3600
});

// OpenAI-compatible chat over the rotating key pools
const reply = await tmcp.chat({
  model: "gemini-2.5-flash",
  messages: [{ role: "user", content: "Summarize TMCP in one sentence." }]
});
```

Errors throw `TMCPError` with `status` (HTTP) and `body` (the error payload).

The full machine-readable API description is served by your deployment at `GET /api/openapi`.
For MCP clients (Claude Desktop/Code, Cursor), skip the SDK entirely and connect to
`POST /api/mcp` with the same Bearer key.
