"use client";

import { useMemo, useState } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { Eye, Terminal, X } from "lucide-react";

const LOGS_PER_PAGE = 50;

export default function LogsPage() {
  const { logs, agents, tools } = useMockStore();
  const [activeFilterAgent, setActiveFilterAgent] = useState("All");
  const [activeFilterTool, setActiveFilterTool] = useState("All");
  const [activeFilterStatus, setActiveFilterStatus] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [inspectLog, setInspectLog] = useState(null);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchesAgent = activeFilterAgent === "All" || log.agent_id === activeFilterAgent;
      const matchesTool = activeFilterTool === "All" || (log.tool_name || "").toLowerCase() === activeFilterTool.toLowerCase();
      const matchesStatus = activeFilterStatus === "All" || log.status === activeFilterStatus;
      return matchesAgent && matchesTool && matchesStatus;
    });
  }, [activeFilterAgent, activeFilterTool, activeFilterStatus, logs]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / LOGS_PER_PAGE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const pageStartIndex = (safeCurrentPage - 1) * LOGS_PER_PAGE;
  const paginatedLogs = filteredLogs.slice(pageStartIndex, pageStartIndex + LOGS_PER_PAGE);
  const successCount = logs.filter((log) => log.status === "SUCCESS").length;
  const deniedCount = logs.filter((log) => ["DENIED", "FAILED"].includes(log.status)).length;
  const avgLatency = logs.length
    ? Math.round(logs.reduce((sum, log) => sum + (Number(log.latency_ms) || 0), 0) / logs.length)
    : null;

  return (
    <>
      <DashboardHeader title="Activity Logs Audit" />

      <main className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto max-w-7xl">
        <section>
          <h1 className="text-xl font-bold text-on-surface">Execution Audit Logs</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Audit trail of agent tool calls, permission outcomes, approval queues, and gateway latency.
          </p>
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCard label="Total Logs" value={logs.length} />
          <SummaryCard label="Successful Calls" value={successCount} />
          <SummaryCard label="Denied / Failed" value={deniedCount} />
        </section>

        <section className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6">
          <div className="space-y-4 min-w-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-surface-container-low border border-outline-variant p-4 rounded text-xs">
              <FilterField label="Filter Agent">
                <select value={activeFilterAgent} onChange={(event) => setActiveFilterAgent(event.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary cursor-pointer outline-none">
                  <option value="All">All Agents</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>{agent.name}</option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Filter Tool">
                <select value={activeFilterTool} onChange={(event) => setActiveFilterTool(event.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary cursor-pointer outline-none">
                  <option value="All">All Tools</option>
                  {tools.map((tool) => (
                    <option key={tool.id} value={tool.name}>{tool.name}</option>
                  ))}
                </select>
              </FilterField>

              <FilterField label="Filter Status">
                <select value={activeFilterStatus} onChange={(event) => setActiveFilterStatus(event.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary cursor-pointer outline-none">
                  <option value="All">All Statuses</option>
                  <option value="SUCCESS">SUCCESS</option>
                  <option value="DENIED">DENIED</option>
                  <option value="FAILED">FAILED</option>
                  <option value="PENDING_APPROVAL">PENDING_APPROVAL</option>
                </select>
              </FilterField>
            </div>

            <div className="bg-surface-container border border-outline-variant rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[780px] text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-lowest border-b border-outline-variant font-mono text-[10px] text-on-surface-variant font-semibold">
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Agent</TableHead>
                      <TableHead>Tool Action</TableHead>
                      <TableHead align="center">Status</TableHead>
                      <TableHead align="right">Inspect</TableHead>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 font-mono text-xs">
                    {paginatedLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-surface-container-highest/15 transition-colors">
                        <td className="px-5 py-4 text-on-surface-variant">{formatTime(log.timestamp || log.created_at)}</td>
                        <td className="px-5 py-4 font-sans font-semibold text-on-surface">{log.agent_name || agents.find((agent) => agent.id === log.agent_id)?.name || "System"}</td>
                        <td className="px-5 py-4">
                          <span className="font-sans font-bold text-primary">{log.tool_name || "Tool"}</span>
                          <code className="block text-[9px] text-on-surface-variant mt-0.5">{log.feature_key || "unknown.feature"}</code>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <StatusPill status={log.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <button onClick={() => setInspectLog(log)} className="p-1.5 hover:bg-surface-container-high rounded text-primary hover:underline cursor-pointer" title="Inspect payloads">
                            <Eye className="w-3 h-3" />
                          </button>
                        </td>
                      </tr>
                    ))}

                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-12 text-center text-on-surface-variant font-sans">
                          No logs found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filteredLogs.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-outline-variant px-5 py-3 text-xs text-on-surface-variant">
                  <div className="font-mono text-[10px]">
                    Showing {pageStartIndex + 1}-{Math.min(pageStartIndex + LOGS_PER_PAGE, filteredLogs.length)} of {filteredLogs.length}
                  </div>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => setCurrentPage((page) => Math.max(1, page - 1))} disabled={safeCurrentPage <= 1} className="px-3 py-1.5 rounded border border-outline-variant bg-surface-container-low hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                      Previous
                    </button>
                    <span className="font-mono text-[10px]">Page {safeCurrentPage} of {totalPages}</span>
                    <button type="button" onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))} disabled={safeCurrentPage >= totalPages} className="px-3 py-1.5 rounded border border-outline-variant bg-surface-container-low hover:bg-surface-container-high disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer">
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="bg-surface-container border border-outline-variant p-5 rounded">
              <div className="flex items-center gap-2 mb-4">
                <Terminal className="w-4 h-4 text-primary" />
                <h3 className="text-sm font-bold text-on-surface">Log Summary</h3>
              </div>
              <div className="space-y-3">
                <SummaryLine label="Average latency" value={avgLatency === null ? "No data" : `${avgLatency}ms`} />
                <SummaryLine label="Current filter results" value={filteredLogs.length} />
                <SummaryLine label="Available tools" value={tools.length} />
              </div>
            </div>

            {inspectLog && (
              <div className="bg-surface-container border border-outline-variant p-5 rounded space-y-4 glow-primary">
                <div className="flex justify-between items-center pb-2 border-b border-outline-variant/30">
                  <h3 className="text-xs font-bold text-on-surface font-mono">Telemetry Inspector</h3>
                  <button onClick={() => setInspectLog(null)} className="text-on-surface-variant hover:text-on-surface cursor-pointer">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-3 font-mono text-[10px]">
                  <InspectorLine label="Transaction ID" value={inspectLog.id} />
                  <InspectorLine label="Action Signature" value={inspectLog.feature_key} primary />
                  <InspectorJson label="Input Params" value={inspectLog.input} />
                  <InspectorJson label="Output Response" value={inspectLog.output || inspectLog.error} />
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <InspectorLine label="Latency" value={`${inspectLog.latency_ms || 0}ms`} />
                    <InspectorLine label="Status" value={inspectLog.status} />
                  </div>
                </div>
              </div>
            )}
          </aside>
        </section>
      </main>
    </>
  );
}

function SummaryCard({ label, value }) {
  return (
    <div className="bg-surface-container border border-outline-variant rounded p-4">
      <p className="text-[9px] font-mono text-on-surface-variant uppercase tracking-widest">{label}</p>
      <p className="text-xl font-bold text-on-surface mt-1">{value}</p>
    </div>
  );
}

function FilterField({ label, children }) {
  return (
    <div>
      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">{label}</label>
      {children}
    </div>
  );
}

function TableHead({ children, align }) {
  return (
    <th className={`px-5 py-3.5 ${align === "center" ? "text-center" : align === "right" ? "text-right" : ""}`}>{children}</th>
  );
}

function StatusPill({ status = "UNKNOWN" }) {
  const isSuccess = status === "SUCCESS";
  const isDenied = ["DENIED", "FAILED"].includes(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
      isSuccess
        ? "bg-green-500/10 text-green-400 border-green-500/20"
        : isDenied
        ? "bg-error-container text-error border-error/20"
        : "bg-surface-container-highest text-on-surface border-outline-variant"
    }`}>
      {status}
    </span>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs text-on-surface-variant">{label}</span>
      <span className="font-mono text-xs font-bold text-on-surface">{value}</span>
    </div>
  );
}

function InspectorLine({ label, value, primary }) {
  return (
    <div>
      <span className="text-on-surface-variant">{label}:</span>
      <p className={`${primary ? "text-primary" : "text-on-surface"} font-semibold truncate select-all`}>{value || "None"}</p>
    </div>
  );
}

function InspectorJson({ label, value }) {
  return (
    <div>
      <span className="text-on-surface-variant">{label}:</span>
      <pre className="p-2 bg-surface-container-lowest rounded border border-outline-variant/30 overflow-x-auto max-h-32 text-on-surface">
        {JSON.stringify(value || null, null, 2)}
      </pre>
    </div>
  );
}

function formatTime(value) {
  if (!value) return "--";
  return String(value).replace("T", " ").slice(0, 19);
}
