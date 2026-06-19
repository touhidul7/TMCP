"use client";

import { useMemo } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { useRouter } from "next/navigation";
import { Activity, Bot, ClipboardCheck, KeyRound, Network, Plus, Puzzle, ShieldCheck, TriangleAlert } from "lucide-react";

export default function DashboardOverview() {
  const router = useRouter();
  const { getWorkspaceStats, approvals, agents, tools, toolAccounts, apiKeys, logs } = useMockStore();
  const stats = useMemo(() => getWorkspaceStats(), [getWorkspaceStats]);
  const failedCalls = stats.failedCallsCount || 0;
  const enabledTools = tools.filter((tool) => tool.is_enabled !== false).length;
  const disabledAgents = agents.filter((agent) => agent.status !== "active").length;
  const activeKeyCount = apiKeys.filter((key) => key.status === "active").length;
  const avgLatency = logs.length
    ? Math.round(logs.reduce((sum, log) => sum + (Number(log.latency_ms) || 0), 0) / logs.length)
    : null;
  const activityBuckets = buildActivityBuckets(logs);
  const toolSummary = buildToolSummary(tools, toolAccounts);
  const healthStatus = failedCalls > 0 || stats.pendingApprovals > 0 ? "Needs Review" : "Operational";

  return (
    <>
      <DashboardHeader title="Dashboard Overview" />

      <main className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="grid grid-cols-12 gap-4">
          <section className="col-span-12 lg:col-span-4 bg-surface-container-low border border-outline-variant p-5 sm:p-6 rounded">
            <div className="flex justify-between items-start mb-6">
              <h3 className="text-sm font-bold text-on-surface">System Health</h3>
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-mono text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                {healthStatus.toUpperCase()}
              </span>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-end gap-4">
                <span className="text-xs text-on-surface-variant">Gateway calls logged</span>
                <span className="font-mono text-sm font-semibold text-primary">{stats.totalCalls}</span>
              </div>

              <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden">
                <div
                  className={`h-full rounded-full ${failedCalls > 0 ? "bg-tertiary" : "bg-primary"}`}
                  style={{ width: stats.totalCalls > 0 ? `${Math.max(8, 100 - Number.parseFloat(stats.failedCallsPercentage))}%` : "100%" }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-1">
                <HealthMetric label="Avg Latency" value={avgLatency === null ? "No data" : `${avgLatency}ms`} />
                <HealthMetric label="Enabled Tools" value={enabledTools} />
              </div>
            </div>
          </section>

          <section className="col-span-12 lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            <MetricCard icon={Puzzle} label="Total Tools" value={stats.totalTools} detail={`${enabledTools} enabled`} onClick={() => router.push("/dashboard/tools")} />
            <MetricCard icon={Network} label="Accounts" value={stats.connectedAccounts} detail={`${toolSummary.connectedToolCount} tools connected`} onClick={() => router.push("/dashboard/connections")} />
            <MetricCard icon={Bot} label="Active Agents" value={stats.activeAgents} detail={`${disabledAgents} disabled`} onClick={() => router.push("/dashboard/agents")} />
            <MetricCard icon={KeyRound} label="API Keys" value={stats.apiKeysCount} detail={`${activeKeyCount} active keys`} onClick={() => router.push("/dashboard/api-keys")} />
            <MetricCard icon={TriangleAlert} label="Failed Calls" value={stats.failedCallsPercentage} detail={`${failedCalls} failed or denied`} danger onClick={() => router.push("/dashboard/logs")} />
            <MetricCard icon={ClipboardCheck} label="Approvals" value={stats.pendingApprovals} detail={stats.pendingApprovals > 0 ? "Require attention" : "All clear"} warning onClick={() => router.push("/dashboard/approvals")} />
          </section>
        </div>

        <div className="grid grid-cols-12 gap-4">
          <section className="col-span-12 xl:col-span-8 bg-surface-container-low border border-outline-variant rounded overflow-hidden flex flex-col">
            <div className="px-4 sm:px-6 py-4 border-b border-outline-variant flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-container-lowest">
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
                <h3 className="text-sm font-bold text-on-surface">Recent Logs</h3>
                <span className="px-2 py-0.5 bg-surface-container-highest text-on-surface font-mono text-[9px] rounded font-semibold w-fit">
                  {stats.recentLogs.length} shown
                </span>
              </div>
              <button onClick={() => router.push("/dashboard/logs")} className="text-primary hover:underline text-xs font-semibold cursor-pointer w-fit">
                View detailed logs
              </button>
            </div>

            <div className="overflow-x-auto flex-1">
              <table className="w-full min-w-[720px] text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-lowest border-b border-outline-variant">
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Agent / Source</TableHead>
                    <TableHead>Event</TableHead>
                    <TableHead align="right">Status</TableHead>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {stats.recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-highest/20 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-[11px] text-on-surface-variant">{(log.timestamp || log.created_at || "").slice(11, 19) || "--"}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/10 p-1 rounded-full flex items-center justify-center">
                            <Bot className="text-primary w-3 h-3" />
                          </span>
                          <span className="text-xs font-semibold text-on-surface">{log.agent_name || agents.find(a => a.id === log.agent_id)?.name || "System"}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-on-surface-variant">
                        Called <span className="text-on-surface font-semibold">{log.tool_name || "tool"}</span> <code>{log.feature_key || "unknown.feature"}</code>
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <StatusPill status={log.status} />
                      </td>
                    </tr>
                  ))}
                  {stats.recentLogs.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-10 text-center text-xs text-on-surface-variant">
                        No tool calls logged yet. Run a gateway request to populate this table.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="col-span-12 xl:col-span-4 bg-surface-container-low border border-outline-variant rounded p-5 sm:p-6 flex flex-col">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-on-surface">Tool Calls Activity</h3>
              <p className="text-xs text-on-surface-variant">Logged gateway volume by recent hour</p>
            </div>

            <div className="flex-1 flex flex-col justify-end">
              <div className="flex items-end justify-between gap-1 h-32">
                {activityBuckets.map((bucket) => (
                  <div
                    key={bucket.label}
                    className="w-full bg-primary/20 rounded-t-sm group hover:bg-primary/50 transition-all cursor-help relative"
                    style={{ height: `${Math.max(8, bucket.percent)}%` }}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-surface px-1.5 py-0.5 rounded border border-outline-variant font-mono text-[9px] whitespace-nowrap text-on-surface z-20">
                      {bucket.count} calls
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex justify-between mt-2">
                <span className="font-mono text-[10px] text-on-surface-variant">{activityBuckets[0]?.label}</span>
                <span className="font-mono text-[10px] text-primary font-bold">NOW</span>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-outline-variant flex justify-between">
              <HealthMetric label="Total Calls" value={stats.totalCalls} />
              <HealthMetric label="Peak Hour" value={`${Math.max(...activityBuckets.map(b => b.count), 0)} calls`} alignRight />
            </div>
          </section>
        </div>

        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-6">
          {toolSummary.cards.map((card) => (
            <div key={card.title} className="bg-surface-container border border-outline-variant rounded p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center border border-outline-variant">
                <card.icon className="text-primary w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-semibold text-on-surface">{card.title}</h4>
                <p className="text-[11px] text-on-surface-variant">{card.detail}</p>
              </div>
            </div>
          ))}
          <button
            onClick={() => router.push("/dashboard/tools/add")}
            className="bg-surface-container border border-outline-variant rounded p-4 flex items-center gap-4 group cursor-pointer hover:bg-surface-container-high transition-colors text-left"
          >
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform glow-primary">
              <Plus className="text-on-primary w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-primary">Add Source</h4>
              <p className="text-[11px] text-on-surface-variant">Register a tool or API</p>
            </div>
          </button>
        </section>
      </main>
    </>
  );
}

function MetricCard({ icon: Icon, label, value, detail, danger, warning, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`bg-surface-container border border-outline-variant p-4 rounded text-left cursor-pointer transition-colors ${
        danger ? "hover:border-error/50" : warning ? "hover:border-tertiary/50" : "hover:border-primary/50"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <Icon className={`${danger ? "text-error" : warning ? "text-tertiary" : "text-primary"} w-4 h-4`} />
        <span className="text-xs font-semibold text-on-surface-variant">{label}</span>
      </div>
      <p className={`text-2xl font-bold ${danger ? "text-error" : warning ? "text-tertiary" : "text-on-surface"}`}>{value}</p>
      <p className="text-[11px] text-on-surface-variant mt-1 font-semibold">{detail}</p>
    </button>
  );
}

function HealthMetric({ label, value, alignRight }) {
  return (
    <div className={alignRight ? "text-right" : ""}>
      <p className="text-[11px] text-on-surface-variant mb-0.5 uppercase font-semibold">{label}</p>
      <p className="font-mono text-sm font-semibold text-on-surface">{value}</p>
    </div>
  );
}

function TableHead({ children, align }) {
  return (
    <th className={`px-6 py-2.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold ${align === "right" ? "text-right" : ""}`}>
      {children}
    </th>
  );
}

function StatusPill({ status = "UNKNOWN" }) {
  const isSuccess = status === "SUCCESS";
  const isDenied = status === "DENIED" || status === "FAILED";
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[9px] font-semibold border ${
      isSuccess
        ? "bg-green-500/10 text-green-400 border-green-500/20"
        : isDenied
        ? "bg-error-container text-error border-error/20"
        : "bg-surface-container-highest text-on-surface border-outline-variant"
    }`}>
      <span className={`w-1 h-1 rounded-full ${isSuccess ? "bg-green-400" : isDenied ? "bg-error" : "bg-outline"}`} />
      {status}
    </span>
  );
}

function buildActivityBuckets(logs) {
  const buckets = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(Date.now() - (6 - index) * 60 * 60 * 1000);
    return {
      label: `${String(date.getHours()).padStart(2, "0")}:00`,
      hour: date.getHours(),
      count: 0,
      percent: 0
    };
  });

  logs.forEach((log) => {
    const value = log.created_at || log.timestamp;
    if (!value) return;
    const hour = new Date(value).getHours();
    const bucket = buckets.find((item) => item.hour === hour);
    if (bucket) bucket.count += 1;
  });

  const max = Math.max(...buckets.map((bucket) => bucket.count), 1);
  return buckets.map((bucket) => ({
    ...bucket,
    percent: Math.round((bucket.count / max) * 100)
  }));
}

function buildToolSummary(tools, accounts) {
  const connectedToolIds = new Set(accounts.map((account) => account.tool_id));
  const categoryCounts = tools.reduce((acc, tool) => {
    const key = tool.category || "Uncategorized";
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const icons = [Puzzle, ShieldCheck, Activity];
  const cards = Object.entries(categoryCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([title, count], index) => ({
      title,
      detail: `${count} registered tool${count === 1 ? "" : "s"}`,
      icon: icons[index] || Puzzle
    }));

  while (cards.length < 3) {
    cards.push({
      title: cards.length === 0 ? "Tool Registry" : cards.length === 1 ? "Connected Tools" : "Execution Logs",
      detail: cards.length === 0 ? `${tools.length} total tools` : cards.length === 1 ? `${connectedToolIds.size} tools connected` : `${accounts.length} accounts`,
      icon: icons[cards.length] || Puzzle
    });
  }

  return {
    connectedToolCount: connectedToolIds.size,
    cards
  };
}
