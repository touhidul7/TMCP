"use client";

import { useState } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { Eye, X } from "lucide-react";

export default function LogsPage() {
  const { 
    logs, 
    agents, 
    tools, 
    toolAccounts, 
    features, 
    simulateToolCall,
    permissions,
    user 
  } = useMockStore();

  const [activeFilterAgent, setActiveFilterAgent] = useState("All");
  const [activeFilterTool, setActiveFilterTool] = useState("All");
  const [activeFilterStatus, setActiveFilterStatus] = useState("All");

  // Simulator State
  const [simAgentId, setSimAgentId] = useState("");
  const [simAccountId, setSimAccountId] = useState("");
  const [simFeatureKey, setSimFeatureKey] = useState("");
  const [simInput, setSimInput] = useState(`{
  "query": "newer_than:7d from:partner@global.com"
}`);
  const [simResult, setSimResult] = useState(null);

  // Inspector State
  const [inspectLog, setInspectLog] = useState(null);

  const getToolAccountsList = () => {
    return toolAccounts;
  };

  const getSimFeaturesList = () => {
    const account = toolAccounts.find((a) => a.id === simAccountId);
    if (!account) return [];
    return features.filter((f) => f.tool_id === account.tool_id);
  };

  const handleSimulateCall = (e) => {
    e.preventDefault();
    if (!simAgentId || !simAccountId || !simFeatureKey) return;

    let parsedInput = {};
    try {
      parsedInput = JSON.parse(simInput);
    } catch (err) {
      alert("Invalid JSON format in simulated payload.");
      return;
    }

    const res = simulateToolCall(simAgentId, simAccountId, simFeatureKey, parsedInput);
    setSimResult(res);
  };

  // Log filtering
  const filteredLogs = logs.filter((log) => {
    const matchesAgent = activeFilterAgent === "All" || log.agent_id === activeFilterAgent;
    const matchesTool = activeFilterTool === "All" || log.tool_name.toLowerCase() === activeFilterTool.toLowerCase();
    const matchesStatus = activeFilterStatus === "All" || log.status === activeFilterStatus;
    return matchesAgent && matchesTool && matchesStatus;
  });

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
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-container-highest/15 transition-colors">
                        <td className="px-5 py-4 text-on-surface-variant">{(log.timestamp || log.created_at || "").replace("T", " ").slice(0, 19)}</td>
                        <td className="px-5 py-4 font-sans font-semibold text-on-surface">{log.agent_name}</td>
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
            </div>
          </div>

          {/* Right Panel: Simulator Panel */}
          <div className="col-span-12 xl:col-span-4 space-y-6">
            
            {/* Live Agent Gateway Simulator */}
            <div className="bg-surface-container border border-outline-variant p-6 rounded space-y-4">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Agent Gateway Simulator</h3>
                <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">Test API validation & RLS routing logic</p>
              </div>

              <form onSubmit={handleSimulateCall} className="space-y-4 text-xs">
                <div>
                  <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Triggering Agent</label>
                  <select
                    value={simAgentId}
                    required
                    onChange={(e) => setSimAgentId(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="">-- Select Agent API Key --</option>
                    {agents.map(a => (
                      <option key={a.id} value={a.id}>{a.name} ({a.status})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Target Tool Account</label>
                  <select
                    value={simAccountId}
                    required
                    onChange={(e) => {
                      setSimAccountId(e.target.value);
                      setSimFeatureKey("");
                    }}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="">-- Choose Connected Account --</option>
                    {getToolAccountsList().map(acc => {
                      const t = tools.find(x => x.id === acc.tool_id);
                      return (
                        <option key={acc.id} value={acc.id}>{t?.name} - {acc.label}</option>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Requested Feature</label>
                  <select
                    value={simFeatureKey}
                    required
                    disabled={!simAccountId}
                    onChange={(e) => setSimFeatureKey(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none cursor-pointer disabled:opacity-40"
                  >
                    <option value="">-- Select Feature Key --</option>
                    {getSimFeaturesList().map(f => (
                      <option key={f.id} value={f.feature_key}>{f.feature_key} {f.is_dangerous ? "⚠️" : ""}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Input Payload (JSON)</label>
                  <textarea
                    value={simInput}
                    onChange={(e) => setSimInput(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 font-mono text-xs text-on-surface focus:border-primary h-20 resize-y"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary"
                >
                  Trigger HTTP MCP Call
                </button>
              </form>

              {/* Simulator Execution Output Box */}
              {simResult && (
                <div className={`p-4 rounded border text-xs font-mono space-y-2 ${
                  simResult.status === "SUCCESS"
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : simResult.status === "pending"
                    ? "bg-tertiary/10 text-tertiary border-tertiary/20"
                    : "bg-error-container text-error border-error/20"
                }`}>
                  <div className="flex justify-between items-center font-bold">
                    <span>GATEWAY RESPONSE</span>
                    <span>{simResult.status?.toUpperCase() || "BLOCKED"}</span>
                  </div>
                  {simResult.message && <p>{simResult.message}</p>}
                  {simResult.error && <p>Error: {simResult.error}</p>}
                  {simResult.log && (
                    <pre className="text-[10px] p-2 bg-surface/40 rounded border border-outline-variant/30 overflow-x-auto max-h-40">
                      {JSON.stringify(simResult.log.output || simResult.log.error, null, 2)}
                    </pre>
                  )}
                </div>
              )}
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
