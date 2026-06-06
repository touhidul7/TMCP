"use client";

import { useState } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { Plus, X, TriangleAlert, Copy, Check, Cpu } from "lucide-react";

export default function ApiKeysPage() {
  const { apiKeys, agents, generateApiKey, revokeApiKey, rotateApiKey, hasPermission } = useMockStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [expiryDays, setExpiryDays] = useState("30");
  
  // Key display state
  const [newRawKey, setNewRawKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedPrefix, setCopiedPrefix] = useState(null);

  const getAgentName = (id) => {
    return agents.find((a) => a.id === id)?.name || "Unknown Agent";
  };

  const handleCreateKey = async (e) => {
    e.preventDefault();
    if (!keyName || !agentId) return;

    const res = await generateApiKey(agentId, keyName, parseInt(expiryDays) || null);
    if (res.error) {
      alert(res.error);
    } else {
      setNewRawKey(res.rawKey);
      setKeyName("");
      setShowCreateForm(false);
    }
  };

  const handleRevoke = async (keyId) => {
    if (confirm("Are you sure you want to revoke this API key? This action is permanent and cannot be undone.")) {
      await revokeApiKey(keyId);
    }
  };

  const handleRotate = async (keyId) => {
    if (confirm("Are you sure you want to rotate this key? Any script using the old key will stop working immediately.")) {
      const res = await rotateApiKey(keyId);
      if (res.error) {
        alert(res.error);
      } else {
        setNewRawKey(res.rawKey);
      }
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(newRawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <DashboardHeader title="API Credentials" />

      <main className="p-6 space-y-6 flex-1 overflow-y-auto max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-on-surface">Agent API Keys</h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Generate hashed access tokens to authorize external agent workflows through the secure tool gateway.
            </p>
          </div>
          {hasPermission("api_keys.create") && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-primary text-on-primary font-semibold text-sm rounded flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary"
            >
              {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateForm ? "Close Form" : "Generate API Key"}
            </button>
          )}
        </div>

        {/* Display New API Key Alert Box - SHOW ONCE */}
        {newRawKey && (
          <div className="p-6 bg-tertiary-container text-on-tertiary-container border border-tertiary/30 rounded glow-tertiary space-y-4 max-w-2xl relative">
            <button
              onClick={() => setNewRawKey("")}
              className="absolute top-4 right-4 text-on-tertiary-container/80 hover:text-on-tertiary-container cursor-pointer"
            >
              <X className="w-3 h-3" />
            </button>
            
            <div className="flex items-center gap-2 text-tertiary">
              <TriangleAlert className="w-4 h-4" />
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono">Store Key Securely - Shown Only Once</h3>
            </div>
            
            <p className="text-xs leading-relaxed opacity-90">
              For security, this raw key is stored as a SHA-256 hash in our database. We cannot show it to you again. Copy it now to authorize your agent script.
            </p>

            <div className="flex items-center gap-2 bg-surface/50 p-3 rounded border border-outline-variant/30">
              <code className="text-xs font-mono font-bold select-all flex-1 truncate text-on-surface">
                {newRawKey}
              </code>
              <button
                onClick={copyToClipboard}
                className="px-3 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 flex items-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        )}

        {/* Create API Key Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateKey} className="p-6 bg-surface-container border border-outline-variant rounded space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-on-surface">Generate Access Token</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Key Label</label>
                <input
                  type="text"
                  required
                  value={keyName}
                  onChange={(e) => setKeyName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none"
                  placeholder="e.g. Lead Research Script"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Assign to Agent</label>
                <select
                  value={agentId}
                  required
                  onChange={(e) => setAgentId(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none cursor-pointer"
                >
                  <option value="">-- Choose Agent --</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Expiration Period</label>
              <select
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none cursor-pointer"
              >
                <option value="30">30 Days</option>
                <option value="90">90 Days</option>
                <option value="365">1 Year</option>
                <option value="0">No Expiration (Never Expires)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-1.5 border border-outline-variant hover:bg-surface-container-low transition-colors rounded text-xs text-on-surface-variant font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary"
              >
                Generate Token
              </button>
            </div>
          </form>
        )}

        {/* Credentials Table */}
        <div className="bg-surface-container border border-outline-variant rounded overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-lowest">
            <h3 className="text-sm font-bold text-on-surface">Active Keys Registry</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-outline-variant">
                  <th className="px-6 py-3.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Key Name</th>
                  <th className="px-6 py-3.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Assigned Agent</th>
                  <th className="px-6 py-3.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Key Prefix</th>
                  <th className="px-6 py-3.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Expires</th>
                  <th className="px-6 py-3.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Last Used</th>
                  <th className="px-6 py-3.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 font-mono text-xs">
                {apiKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-surface-container-highest/10 transition-colors">
                    <td className="px-6 py-4 font-sans font-bold text-on-surface">{key.name}</td>
                    <td className="px-6 py-4 font-sans font-semibold text-primary">{getAgentName(key.agent_id)}</td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      <div className="flex items-center gap-2">
                        <span>{key.key_prefix}...</span>
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(key.key_prefix);
                            setCopiedPrefix(key.id);
                            setTimeout(() => setCopiedPrefix(null), 2000);
                          }}
                          className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                          title="Copy key prefix"
                        >
                          {copiedPrefix === key.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {key.expires_at ? key.expires_at.slice(0, 10) : "Never"}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {key.last_used_at ? key.last_used_at.replace("T", " ").slice(0, 19) : "Never"}
                    </td>
                    <td className="px-6 py-4 text-right font-sans">
                      {key.status === "revoked" ? (
                        <span className="px-2 py-0.5 rounded font-mono text-[9px] bg-error-container text-error border border-error/10 uppercase font-bold">
                          REVOKED
                        </span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          {hasPermission("api_keys.rotate") && (
                            <button
                              onClick={() => handleRotate(key.id)}
                              className="px-2.5 py-1 bg-surface-container-high border border-outline hover:bg-surface-container-highest rounded text-[11px] font-semibold text-on-surface cursor-pointer"
                            >
                              Rotate
                            </button>
                          )}
                          {hasPermission("api_keys.revoke") && (
                            <button
                              onClick={() => handleRevoke(key.id)}
                              className="px-2.5 py-1 bg-error/15 border border-error/20 hover:bg-error/20 rounded text-[11px] font-bold text-error cursor-pointer"
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}

                {apiKeys.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-16 text-center text-on-surface-variant font-sans">
                      No active API keys generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* API Usage Documentation */}
        <ApiUsageDocs />
      </main>
    </>
  );
}

function ApiUsageDocs() {
  const [activeTab, setActiveTab] = useState("curl");
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedId, setCopiedId] = useState(null);

  const tabs = [
    { id: "curl", label: "cURL" },
    { id: "python", label: "Python" },
    { id: "javascript", label: "JavaScript" },
    { id: "react", label: "React" },
    { id: "n8n", label: "n8n" },
  ];

  const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  // Individual cURL commands for copy buttons
  const curlExecute = `curl -X POST "${BASE_URL}/api/gateway/execute" \\
  -H "Authorization: Bearer mcp_live_xxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "tool": "gmail",
    "action": "gmail.search",
    "input": {
      "query": "from:client@example.com newer_than:7d"
    }
  }'`;

  const curlListTools = `curl -X GET "${BASE_URL}/api/gateway/tools" \\
  -H "Authorization: Bearer mcp_live_xxxxxxxxxxxx"`;

  const curlStatus = `curl -X GET "${BASE_URL}/api/gateway/status" \\
  -H "Authorization: Bearer mcp_live_xxxxxxxxxxxx"`;

  const snippets = {
    curl: `# 1. Execute a tool action
${curlExecute}

# 2. List available tools
${curlListTools}

# 3. Check gateway status
${curlStatus}`,

    python: `import requests

API_KEY = "mcp_live_xxxxxxxxxxxx"
BASE_URL = "${BASE_URL}"

# 1. Execute a tool action through the gateway
response = requests.post(
    f"{BASE_URL}/api/gateway/execute",
    headers={
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    },
    json={
        "tool": "gmail",
        "action": "gmail.search",
        "input": {
            "query": "from:client@example.com newer_than:7d"
        }
    }
)

result = response.json()
print(result)

# 2. List available tools
tools = requests.get(
    f"{BASE_URL}/api/gateway/tools",
    headers={"Authorization": f"Bearer {API_KEY}"}
).json()

for tool in tools["tools"]:
    print(f"{tool['name']} — {tool['description']}")`,

    javascript: `const API_KEY = "mcp_live_xxxxxxxxxxxx";
const BASE_URL = "${BASE_URL}";

// 1. Execute a tool action through the gateway
async function executeToolAction(tool, action, input) {
  const response = await fetch(\`\${BASE_URL}/api/gateway/execute\`, {
    method: "POST",
    headers: {
      "Authorization": \`Bearer \${API_KEY}\`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ tool, action, input })
  });

  if (!response.ok) {
    throw new Error(\`Gateway error: \${response.status}\`);
  }

  return response.json();
}

// Usage
const result = await executeToolAction("gmail", "gmail.search", {
  query: "from:client@example.com newer_than:7d"
});
console.log(result);

// 2. List available tools
const tools = await fetch(\`\${BASE_URL}/api/gateway/tools\`, {
  headers: { "Authorization": \`Bearer \${API_KEY}\` }
}).then(r => r.json());

console.log(tools);`,

    react: `import { useState } from "react";

const API_KEY = process.env.NEXT_PUBLIC_TMCP_API_KEY;
const BASE_URL = "${BASE_URL}";

// Custom hook for TMCP Gateway
function useTMCPGateway() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const execute = async (tool, action, input) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(\`\${BASE_URL}/api/gateway/execute\`, {
        method: "POST",
        headers: {
          "Authorization": \`Bearer \${API_KEY}\`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ tool, action, input })
      });

      if (!res.ok) throw new Error("Gateway request failed");
      return await res.json();
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
}

// Example component
export default function EmailSearch() {
  const { execute, loading, error } = useTMCPGateway();
  const [results, setResults] = useState(null);

  const handleSearch = async () => {
    const data = await execute("gmail", "gmail.search", {
      query: "from:client@example.com"
    });
    if (data) setResults(data);
  };

  return (
    <div>
      <button onClick={handleSearch} disabled={loading}>
        {loading ? "Searching..." : "Search Emails"}
      </button>
      {error && <p style={{ color: "red" }}>{error}</p>}
      {results && <pre>{JSON.stringify(results, null, 2)}</pre>}
    </div>
  );
}`,

    n8n: `// n8n HTTP Request Node Configuration
// ─────────────────────────────────────
// Use the "HTTP Request" node in your n8n workflow.

// Node Settings:
// ┌─────────────────────────────────────────────┐
// │  Method:  POST                              │
// │  URL:     ${BASE_URL}/api/gateway/execute    │
// │                                             │
// │  Authentication: Header Auth                │
// │    Name:  Authorization                     │
// │    Value: Bearer mcp_live_xxxxxxxxxxxx      │
// │                                             │
// │  Headers:                                   │
// │    Content-Type: application/json           │
// │                                             │
// │  Body (JSON):                               │
// │  {                                          │
// │    "tool": "gmail",                         │
// │    "action": "gmail.search",                │
// │    "input": {                               │
// │      "query": "from:client@example.com"     │
// │    }                                        │
// │  }                                          │
// └─────────────────────────────────────────────┘

// Credential Setup (recommended):
// 1. Go to Credentials → Add → "Header Auth"
// 2. Name: "TMCP Gateway"
// 3. Header Name: Authorization
// 4. Header Value: Bearer mcp_live_xxxxxxxxxxxx
// 5. Reference this credential in HTTP Request node

// Chaining with other nodes:
// [Trigger] → [HTTP Request (TMCP)] → [IF Status=SUCCESS]
//                                          ├─ [Process Data]
//                                          └─ [Error Handler]`
  };

  const copySnippet = () => {
    navigator.clipboard.writeText(snippets[activeTab]);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const copyText = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bg-surface-container border border-outline-variant rounded overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-lowest flex flex-col sm:flex-row justify-between sm:items-center gap-3">
        <div>
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Cpu className="w-4 h-4 text-primary" />
            API Usage Guide
          </h3>
          <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">
            Integrate TMCP Gateway into your agent workflows
          </p>
        </div>
      </div>

      {/* Quick Reference */}
      <div className="px-6 py-4 border-b border-outline-variant/50 bg-surface-container-low/50">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <span className="text-[9px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">Base URL</span>
            <code className="block text-xs font-mono text-primary bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant/30 truncate">
              {BASE_URL}/api/gateway
            </code>
          </div>
          <div className="space-y-1.5">
            <span className="text-[9px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">Auth Header</span>
            <code className="block text-xs font-mono text-primary bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant/30 truncate">
              Authorization: Bearer &lt;API_KEY&gt;
            </code>
          </div>
          <div className="space-y-1.5">
            <span className="text-[9px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">Content Type</span>
            <code className="block text-xs font-mono text-primary bg-surface-container-lowest px-3 py-2 rounded border border-outline-variant/30">
              application/json
            </code>
          </div>
        </div>
      </div>

      {/* Endpoint Reference with individual cURL + copy */}
      <div className="px-6 py-4 border-b border-outline-variant/50">
        <h4 className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-widest mb-4">Endpoints &amp; cURL Commands</h4>
        <div className="space-y-4">

          {/* POST /execute */}
          <div className="rounded border border-outline-variant/30 overflow-hidden">
            <div className="flex items-center justify-between bg-surface-container-lowest px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-green-500/15 text-green-400 border border-green-500/20 rounded text-[9px] font-mono font-bold">POST</span>
                <code className="text-xs font-mono text-on-surface font-semibold">/api/gateway/execute</code>
                <span className="text-[10px] text-on-surface-variant hidden sm:inline">— Execute a tool action</span>
              </div>
              <button
                onClick={() => copyText(curlExecute, "curl-execute")}
                className="px-2.5 py-1 bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest rounded text-[9px] font-bold text-on-surface flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedId === "curl-execute" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copiedId === "curl-execute" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="bg-[#0d1117] border-t border-outline-variant/20">
              <pre className="px-4 py-3 overflow-x-auto text-[11px] leading-relaxed">
                <code className="text-[#c9d1d9] font-mono whitespace-pre">{curlExecute}</code>
              </pre>
            </div>
          </div>

          {/* GET /tools */}
          <div className="rounded border border-outline-variant/30 overflow-hidden">
            <div className="flex items-center justify-between bg-surface-container-lowest px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded text-[9px] font-mono font-bold">GET</span>
                <code className="text-xs font-mono text-on-surface font-semibold">/api/gateway/tools</code>
                <span className="text-[10px] text-on-surface-variant hidden sm:inline">— List available tools &amp; features</span>
              </div>
              <button
                onClick={() => copyText(curlListTools, "curl-tools")}
                className="px-2.5 py-1 bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest rounded text-[9px] font-bold text-on-surface flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedId === "curl-tools" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copiedId === "curl-tools" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="bg-[#0d1117] border-t border-outline-variant/20">
              <pre className="px-4 py-3 overflow-x-auto text-[11px] leading-relaxed">
                <code className="text-[#c9d1d9] font-mono whitespace-pre">{curlListTools}</code>
              </pre>
            </div>
          </div>

          {/* GET /status */}
          <div className="rounded border border-outline-variant/30 overflow-hidden">
            <div className="flex items-center justify-between bg-surface-container-lowest px-4 py-2.5">
              <div className="flex items-center gap-3">
                <span className="px-2 py-0.5 bg-blue-500/15 text-blue-400 border border-blue-500/20 rounded text-[9px] font-mono font-bold">GET</span>
                <code className="text-xs font-mono text-on-surface font-semibold">/api/gateway/status</code>
                <span className="text-[10px] text-on-surface-variant hidden sm:inline">— Check gateway health &amp; agent info</span>
              </div>
              <button
                onClick={() => copyText(curlStatus, "curl-status")}
                className="px-2.5 py-1 bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest rounded text-[9px] font-bold text-on-surface flex items-center gap-1 cursor-pointer transition-colors"
              >
                {copiedId === "curl-status" ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                {copiedId === "curl-status" ? "Copied!" : "Copy"}
              </button>
            </div>
            <div className="bg-[#0d1117] border-t border-outline-variant/20">
              <pre className="px-4 py-3 overflow-x-auto text-[11px] leading-relaxed">
                <code className="text-[#c9d1d9] font-mono whitespace-pre">{curlStatus}</code>
              </pre>
            </div>
          </div>

        </div>
      </div>

      {/* Request Body Schema */}
      <div className="px-6 py-4 border-b border-outline-variant/50 bg-surface-container-low/30">
        <h4 className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-widest mb-3">Request Body Schema</h4>
        <div className="bg-surface-container-lowest rounded border border-outline-variant/30 overflow-hidden">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-outline-variant/30">
                <th className="px-4 py-2 text-[9px] font-mono text-on-surface-variant uppercase font-bold">Field</th>
                <th className="px-4 py-2 text-[9px] font-mono text-on-surface-variant uppercase font-bold">Type</th>
                <th className="px-4 py-2 text-[9px] font-mono text-on-surface-variant uppercase font-bold">Required</th>
                <th className="px-4 py-2 text-[9px] font-mono text-on-surface-variant uppercase font-bold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-xs">
              <tr>
                <td className="px-4 py-2.5 font-mono text-primary font-bold">tool</td>
                <td className="px-4 py-2.5 font-mono text-on-surface-variant">string</td>
                <td className="px-4 py-2.5"><span className="text-green-400 text-[9px] font-bold">YES</span></td>
                <td className="px-4 py-2.5 text-on-surface-variant">Tool slug (e.g. &quot;gmail&quot;, &quot;drive&quot;)</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-primary font-bold">action</td>
                <td className="px-4 py-2.5 font-mono text-on-surface-variant">string</td>
                <td className="px-4 py-2.5"><span className="text-green-400 text-[9px] font-bold">YES</span></td>
                <td className="px-4 py-2.5 text-on-surface-variant">Feature key (e.g. &quot;gmail.search&quot;)</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-primary font-bold">input</td>
                <td className="px-4 py-2.5 font-mono text-on-surface-variant">object</td>
                <td className="px-4 py-2.5"><span className="text-green-400 text-[9px] font-bold">YES</span></td>
                <td className="px-4 py-2.5 text-on-surface-variant">Action-specific input parameters</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-mono text-primary font-bold">account_id</td>
                <td className="px-4 py-2.5 font-mono text-on-surface-variant">string</td>
                <td className="px-4 py-2.5"><span className="text-on-surface-variant text-[9px]">optional</span></td>
                <td className="px-4 py-2.5 text-on-surface-variant">Specific tool account UUID (auto-selected if omitted)</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Code Examples with Tabs */}
      <div className="px-6 py-4">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">Code Examples</h4>
          <button
            onClick={copySnippet}
            className="px-3 py-1 bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest rounded text-[10px] font-bold text-on-surface flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            {copiedSnippet ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copiedSnippet ? "Copied!" : "Copy All"}
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex border-b border-outline-variant/50 mb-0">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 text-xs font-bold transition-all cursor-pointer border-b-2 ${
                activeTab === tab.id
                  ? "text-primary border-primary bg-primary/5"
                  : "text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-container-high/50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Code Block */}
        <div className="bg-[#0d1117] rounded-b border border-t-0 border-outline-variant/30 overflow-hidden">
          <pre className="p-5 overflow-x-auto text-[11px] leading-relaxed">
            <code className="text-[#c9d1d9] font-mono whitespace-pre">{snippets[activeTab]}</code>
          </pre>
        </div>
      </div>

      {/* Response Format */}
      <div className="px-6 pb-5">
        <h4 className="text-[10px] font-mono font-bold text-on-surface-variant uppercase tracking-widest mb-3">Response Format</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <span className="text-[9px] font-mono font-bold text-green-400 uppercase tracking-widest mb-1.5 block">✓ Success</span>
            <div className="bg-[#0d1117] rounded border border-green-500/20 p-4">
              <pre className="text-[11px] font-mono text-[#c9d1d9] whitespace-pre">{`{
  "success": true,
  "result": { ... },
  "transaction_id": "uuid",
  "latency_ms": 322
}`}</pre>
            </div>
          </div>
          <div>
            <span className="text-[9px] font-mono font-bold text-error uppercase tracking-widest mb-1.5 block">✗ Error</span>
            <div className="bg-[#0d1117] rounded border border-error/20 p-4">
              <pre className="text-[11px] font-mono text-[#c9d1d9] whitespace-pre">{`{
  "success": false,
  "error": "PERMISSION_DENIED",
  "message": "Agent not allowed to use gmail.send",
  "transaction_id": "uuid"
}`}</pre>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


