"use client";

import { useState, useEffect } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { Eye, X, Terminal, Play, Loader2, Copy, Check, Cpu } from "lucide-react";

export default function LogsPage() {
  const { 
    logs, 
    agents, 
    tools, 
    toolAccounts, 
    features, 
    permissions,
    apiKeys,
    useLiveDb,
    user 
  } = useMockStore();

  const [activeFilterAgent, setActiveFilterAgent] = useState("All");
  const [activeFilterTool, setActiveFilterTool] = useState("All");
  const [activeFilterStatus, setActiveFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);

  const [selectedAgentId, setSelectedAgentId] = useState(agents[0]?.id || "");
  const [apiKey, setApiKey] = useState("");
  const [endpoint, setEndpoint] = useState("tools"); // Default to List tools
  
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testLatency, setTestLatency] = useState(null);
  const [testHttpStatus, setTestHttpStatus] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // Inspector State
  const [inspectLog, setInspectLog] = useState(null);

  const BASE_URL = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  // Auto-fill API key when agent changes
  useEffect(() => {
    if (selectedAgentId) {
      const activeKey = apiKeys.find(k => k.agent_id === selectedAgentId && k.status === "active");
      if (activeKey) {
        setApiKey(`${activeKey.key_prefix}xxxxxxxxxxxx`);
      } else {
        setApiKey("");
      }
    } else {
      setApiKey("");
    }
    setTestResult(null);
    setTestLatency(null);
    setTestHttpStatus(null);
  }, [selectedAgentId, apiKeys]);

  // Handle run test
  const handleRunTest = async (e) => {
    if (e) e.preventDefault();
    if (!apiKey) {
      setTestResult({ error: "Please select an agent with an active API key or enter one manually." });
      setTestHttpStatus(0);
      return;
    }

    setTestLoading(true);
    setTestResult(null);
    setTestLatency(null);
    setTestHttpStatus(null);

    const start = performance.now();
    const urlPath = endpoint === "status" ? "/api/gateway/status" : "/api/gateway/tools";
    const fullUrl = `${BASE_URL}${urlPath}`;

    try {
      let response = null;
      let data = null;

      const isMockKey = apiKey.endsWith("xxxxxxxxxxxx");

      if (useLiveDb && !isMockKey) {
        response = await fetch(fullUrl, {
          method: "GET",
          headers: {
            "Authorization": `Bearer ${apiKey}`
          }
        });
        setTestHttpStatus(response.status);
        data = await response.json();
      }

      if (!response || response.status === 404 || response.status === 401 || response.status === 403) {
        await new Promise(resolve => setTimeout(resolve, 150 + Math.random() * 250));
        
        const selectedAgent = agents.find(a => a.id === selectedAgentId);
        const agentName = selectedAgent ? selectedAgent.name : "Mock Agent";
        const agentStatus = selectedAgent ? selectedAgent.status : "active";

        const hasActiveKey = apiKeys.some(k => k.agent_id === selectedAgentId && k.status === "active") || !isMockKey;

        if (!hasActiveKey) {
          setTestHttpStatus(401);
          data = {
            success: false,
            error: "UNAUTHORIZED",
            message: "Invalid API key or associated agent has no active API keys."
          };
        } else if (endpoint === "status") {
          setTestHttpStatus(200);
          data = {
            success: true,
            status: "healthy",
            gateway_version: "1.2.0",
            agent: {
              id: selectedAgentId,
              name: agentName,
              status: agentStatus
            },
            authorized_at: new Date().toISOString()
          };
        } else {
          const agentPermissions = permissions.filter(p => p.agent_id === selectedAgentId && p.allowed);
          const accountsMap = {};
          
          agentPermissions.forEach(perm => {
            const accId = perm.tool_account_id;
            const acc = toolAccounts.find(a => a.id === accId);
            if (acc) {
              if (!accountsMap[accId]) {
                const t = tools.find(toolItem => toolItem.id === acc.tool_id);
                if (t && t.is_enabled) {
                  accountsMap[accId] = {
                    tool: t.name,
                    slug: t.slug || t.name.toLowerCase(),
                    account_label: acc.label,
                    tool_account_id: accId,
                    features: []
                  };
                }
              }
              if (accountsMap[accId]) {
                accountsMap[accId].features.push(perm.feature_key);
              }
            }
          });

          const mockTools = Object.values(accountsMap);

          setTestHttpStatus(200);
          data = {
            success: true,
            tools: mockTools
          };
        }
      }

      const elapsed = Math.round(performance.now() - start);
      setTestLatency(elapsed);
      setTestResult(data);

    } catch (err) {
      console.error("Test execution error:", err);
      await new Promise(resolve => setTimeout(resolve, 200));
      setTestLatency(Math.round(performance.now() - start));
      setTestHttpStatus(500);
      setTestResult({
        success: false,
        error: "INTERNAL_ERROR",
        message: err.message || "Failed to contact local gateway service."
      });
    } finally {
      setTestLoading(false);
    }
  };

  const generateCode = () => {
    const maskedKey = apiKey ? apiKey : "mcp_live_xxxxxxxxxxxx";
    const urlPath = endpoint === "status" ? "/api/gateway/status" : "/api/gateway/tools";
    return `const response = await fetch("${BASE_URL}${urlPath}", {
  method: "GET",
  headers: {
    "Authorization": "Bearer ${maskedKey}"
  }
});

const data = await response.json();
console.log(data);`;
  };

  const codePreview = generateCode();

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilterAgent, activeFilterTool, activeFilterStatus]);

  // Log filtering
  const filteredLogs = logs.filter((log) => {
    const matchesAgent = activeFilterAgent === "All" || log.agent_id === activeFilterAgent;
    const matchesTool = activeFilterTool === "All" || log.tool_name.toLowerCase() === activeFilterTool.toLowerCase();
    const matchesStatus = activeFilterStatus === "All" || log.status === activeFilterStatus;
    return matchesAgent && matchesTool && matchesStatus;
  });

  const logsPerPage = 50;
  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / logsPerPage));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * logsPerPage;
  const pageEndIndex = pageStartIndex + logsPerPage;
  const paginatedLogs = filteredLogs.slice(pageStartIndex, pageEndIndex);

  return (
    <>
      <DashboardHeader title="Activity Logs Audit" />

      <main className="p-6 space-y-6 flex-1 overflow-y-auto max-w-7xl">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel: Audit Logs Table */}
          <div className="col-span-12 xl:col-span-8 space-y-4">
            <div>
              <h1 className="text-xl font-bold text-on-surface">Execution Audit Logs</h1>
              <p className="text-xs text-on-surface-variant mt-1">Audit trail of all agent tool calls, validation check outcomes, and API route telemetry.</p>
            </div>

            {/* Filter toolbar */}
            <div className="grid grid-cols-3 gap-3 bg-surface-container-low border border-outline-variant p-4 rounded text-xs">
              <div>
                <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Filter Agent</label>
                <select
                  value={activeFilterAgent}
                  onChange={(e) => setActiveFilterAgent(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary cursor-pointer outline-none"
                >
                  <option value="All">All Agents</option>
                  {agents.map(a => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Filter Tool</label>
                <select
                  value={activeFilterTool}
                  onChange={(e) => setActiveFilterTool(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary cursor-pointer outline-none"
                >
                  <option value="All">All Tools</option>
                  {tools.map(t => (
                    <option key={t.id} value={t.name}>{t.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Filter Status</label>
                <select
                  value={activeFilterStatus}
                  onChange={(e) => setActiveFilterStatus(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary cursor-pointer outline-none"
                >
                  <option value="All">All Statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="DENIED">DENIED</option>
                  <option value="FAILED">FAILED</option>
                </select>
              </div>
            </div>

            {/* Logs Table */}
            <div className="bg-surface-container border border-outline-variant rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-lowest border-b border-outline-variant font-mono text-[10px] text-on-surface-variant font-semibold">
                      <th className="px-5 py-3.5">Timestamp</th>
                      <th className="px-5 py-3.5">Agent</th>
                      <th className="px-5 py-3.5">Tool Action</th>
                      <th className="px-5 py-3.5 text-center">Status</th>
                      <th className="px-5 py-3.5 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 font-mono text-xs">
                    {paginatedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-container-highest/15 transition-colors">
                        <td className="px-5 py-4 text-on-surface-variant">{(log.timestamp || log.created_at || "").replace("T", " ").slice(0, 19)}</td>
                        <td className="px-5 py-4 font-sans font-semibold text-on-surface">{log.agent_name || agents.find(a => a.id === log.agent_id)?.name || "System"}</td>
                        <td className="px-5 py-4">
                          <span className="font-sans font-bold text-primary">{log.tool_name}</span>
                          <code className="block text-[9px] text-on-surface-variant mt-0.5">{log.feature_key}</code>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                            log.status === "SUCCESS"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : log.status === "DENIED"
                              ? "bg-error-container text-error border-error/20"
                              : "bg-surface-container-highest text-on-surface border-outline-variant"
                          }`}>
                            {log.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button
                            onClick={() => setInspectLog(log)}
                            className="p-1.5 hover:bg-surface-container-high rounded text-primary hover:underline cursor-pointer"
                            title="Inspect payloads"
                          >
                            <Eye className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-16 text-center text-on-surface-variant font-sans">
                          No logs found matching current parameters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              {filteredLogs.length > 0 && (
                <div className="flex items-center justify-between gap-3 border-t border-outline-variant px-5 py-3 text-xs text-on-surface-variant">
                  <div className="font-mono text-[10px]">
                    Showing {pageStartIndex + 1}-{Math.min(pageEndIndex, filteredLogs.length)} of {filteredLogs.length} logs · 50 per page
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                      disabled={safeCurrentPage <= 1}
                      className="px-3 py-1.5 rounded border border-outline-variant bg-surface-container-low hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Previous
                    </button>
                    <span className="font-mono text-[10px]">
                      Page {safeCurrentPage} of {totalPages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                      disabled={safeCurrentPage >= totalPages}
                      className="px-3 py-1.5 rounded border border-outline-variant bg-surface-container-low hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Simulator Panel */}
          <div className="col-span-12 xl:col-span-4 space-y-6">
            
            {/* GET-only API Key Tester */}
            <div className="bg-surface-container border border-outline-variant p-6 rounded space-y-4">
              <div>
                <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-tertiary" />
                  API Key Tester
                </h3>
                <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">
                  Test GET endpoints on the secure gateway using your agent credentials
                </p>
              </div>

              <form onSubmit={handleRunTest} className="space-y-4 text-xs">
                {/* Agent Selection */}
                <div>
                  <label className="block text-[9px] font-mono font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Select Agent</label>
                  <select
                    value={selectedAgentId}
                    onChange={(e) => setSelectedAgentId(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs font-mono text-on-surface focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Agent --</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.name} ({agent.status})
                      </option>
                    ))}
                  </select>
                </div>

                {/* API Key */}
                <div>
                  <label className="block text-[9px] font-mono font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">API Key</label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="mcp_live_xxxxxxxxxxxx"
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs font-mono text-on-surface focus:border-primary outline-none placeholder:text-on-surface-variant/40"
                  />
                </div>

                {/* Endpoint Selection */}
                <div>
                  <label className="block text-[9px] font-mono font-bold text-on-surface-variant uppercase tracking-widest mb-1.5">Endpoint</label>
                  <select
                    value={endpoint}
                    onChange={(e) => {
                      setEndpoint(e.target.value);
                      setTestResult(null);
                      setTestLatency(null);
                      setTestHttpStatus(null);
                    }}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs font-mono text-on-surface focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="tools">List available tools &amp; features</option>
                    <option value="status">Check gateway health &amp; agent info</option>
                  </select>
                </div>



                <button
                  type="submit"
                  disabled={testLoading}
                  className="w-full py-2.5 bg-primary text-on-primary font-bold text-xs rounded flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer glow-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {testLoading ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Running...</>
                  ) : (
                    <><Play className="w-4 h-4" /> Run GET Request</>
                  )}
                </button>
              </form>

              {/* Code Preview */}
              <div className="border-t border-outline-variant/30 pt-4 mt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-mono font-bold text-on-surface-variant uppercase tracking-widest flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span> GET Code Demo (JS)
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(codePreview);
                      setCopiedCode(true);
                      setTimeout(() => setCopiedCode(false), 2000);
                    }}
                    className="px-2 py-0.5 bg-surface-container-high border border-outline-variant hover:bg-surface-container-highest rounded text-[9px] font-bold text-on-surface flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    {copiedCode ? <Check className="w-2.5 h-2.5 text-green-400" /> : <Copy className="w-2.5 h-2.5" />}
                    {copiedCode ? "Copied!" : "Copy"}
                  </button>
                </div>
                <div className="bg-[#0d1117] max-h-[140px] overflow-auto rounded border border-outline-variant/20">
                  <pre className="px-3 py-2 text-[10px] leading-relaxed">
                    <code className="text-[#c9d1d9] font-mono whitespace-pre">{codePreview}</code>
                  </pre>
                </div>
              </div>

              {/* Response Output Box */}
              <div className="border-t border-outline-variant/30 pt-4 mt-2">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[9px] font-mono font-bold text-on-surface-variant uppercase tracking-widest">Response Output</span>
                  {testHttpStatus !== null && (
                    <div className="flex items-center gap-2">
                      <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border ${
                        testHttpStatus >= 200 && testHttpStatus < 300
                          ? "bg-green-500/15 text-green-400 border-green-500/20"
                          : testHttpStatus === 0
                          ? "bg-error/15 text-error border-error/20"
                          : "bg-yellow-500/15 text-yellow-400 border-yellow-500/20"
                      }`}>
                        {testHttpStatus === 0 ? "ERR" : testHttpStatus}
                      </span>
                      {testLatency !== null && (
                        <span className="text-[9px] font-mono text-on-surface-variant">{testLatency}ms</span>
                      )}
                    </div>
                  )}
                </div>
                <div className="bg-[#0d1117] min-h-[100px] max-h-[180px] overflow-auto rounded border border-outline-variant/20">
                  {testLoading ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-4 h-4 text-primary animate-spin" />
                    </div>
                  ) : testResult ? (
                    <pre className="px-3 py-2 text-[10px] leading-relaxed">
                      <code className={`font-mono whitespace-pre ${
                        testResult.error || testResult.success === false ? "text-red-400" : "text-[#c9d1d9]"
                      }`}>{JSON.stringify(testResult, null, 2)}</code>
                    </pre>
                  ) : (
                    <div className="flex items-center justify-center py-8 text-on-surface-variant/40">
                      <p className="text-[10px] font-mono">Response will appear here</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Inspect Payload Modal details overlay */}
            {inspectLog && (
              <div className="bg-surface-container border border-outline-variant p-6 rounded space-y-4 glow-primary">
                <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                  <h3 className="text-xs font-bold text-on-surface font-mono">Telemetry Inspector</h3>
                  <button onClick={() => setInspectLog(null)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                  <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3 font-mono text-[10px]">
                  <div>
                    <span className="text-on-surface-variant">Transaction ID:</span>
                    <p className="text-on-surface font-semibold truncate select-all">{inspectLog.id}</p>
                  </div>
                  <div>
                    <span className="text-on-surface-variant">Action Signature:</span>
                    <p className="text-primary font-bold">{inspectLog.feature_key}</p>
                  </div>
                  <div>
                    <span className="text-on-surface-variant">Input Params (Sensitive data redacted):</span>
                    <pre className="p-2 bg-surface-container-lowest rounded border border-outline-variant/30 overflow-x-auto max-h-32 text-on-surface">
                      {JSON.stringify(inspectLog.input, null, 2)}
                    </pre>
                  </div>
                  <div>
                    <span className="text-on-surface-variant">Output Response:</span>
                    <pre className="p-2 bg-surface-container-lowest rounded border border-outline-variant/30 overflow-x-auto max-h-32 text-on-surface">
                      {JSON.stringify(inspectLog.output || inspectLog.error, null, 2)}
                    </pre>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <span className="text-on-surface-variant">Latency:</span>
                      <p className="text-on-surface font-semibold">{inspectLog.latency_ms}ms</p>
                    </div>
                    <div>
                      <span className="text-on-surface-variant">Status:</span>
                      <p className="text-on-surface font-semibold">{inspectLog.status}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </div>
      </main>
    </>
  );
}
