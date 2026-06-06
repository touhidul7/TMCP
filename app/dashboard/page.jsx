"use client";

import { useEffect, useState } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Puzzle, Network, Bot, KeyRound, TriangleAlert, ClipboardCheck, Cloud, Database, Globe, Plus, Info, X } from "lucide-react";

export default function DashboardOverview() {
  const router = useRouter();
  const { getWorkspaceStats, user, approvals } = useMockStore();
  const [stats, setStats] = useState(null);
  const [toastVisible, setToastVisible] = useState(false);

  useEffect(() => {
    setStats(getWorkspaceStats());
    
    // Simulate notification toast on load
    const timer = setTimeout(() => {
      setToastVisible(true);
    }, 2000);

    return () => clearTimeout(timer);
  }, [getWorkspaceStats, approvals]);

  if (!stats) return null;

  return (
    <>
      <DashboardHeader title="Dashboard Overview" />

      {/* Main Dashboard Canvas */}
      <main className="p-6 space-y-6 flex-1 overflow-y-auto">
        
        {/* Bento Stats Grid */}
        <div className="grid grid-cols-12 gap-4">
          
          {/* System Health Card */}
          <div className="col-span-12 lg:col-span-4 bg-surface-container-low border border-outline-variant p-6 rounded relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -translate-y-12 translate-x-12 blur-3xl"></div>
            <div className="flex justify-between items-start mb-6 relative z-10">
              <h3 className="text-sm font-bold text-on-surface">System Health</h3>
              <span className="flex items-center gap-1.5 px-2 py-0.5 bg-primary/10 text-primary border border-primary/20 rounded font-mono text-[10px] font-semibold">
                <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse"></span>
                OPERATIONAL
              </span>
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="flex justify-between items-end">
                <span className="text-xs text-on-surface-variant">Uptime (24h)</span>
                <span className="font-mono text-sm font-semibold text-primary">99.98%</span>
              </div>
              
              <div className="w-full bg-surface-container-highest h-1 rounded overflow-hidden flex gap-0.5">
                <div className="h-full w-full bg-primary/40 rounded-full"></div>
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-1">
                <div>
                  <p className="text-[11px] text-on-surface-variant mb-0.5 uppercase font-semibold">Latency</p>
                  <p className="font-mono text-sm font-semibold text-on-surface">
                    42ms <span className="text-primary text-[10px]">▼ 2ms</span>
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-on-surface-variant mb-0.5 uppercase font-semibold">CPU Load</p>
                  <p className="font-mono text-sm font-semibold text-on-surface">12.4%</p>
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Metrics Bento Grid */}
          <div className="col-span-12 lg:col-span-8 grid grid-cols-2 md:grid-cols-3 gap-4">
            
            {/* Total Tools */}
            <div 
              onClick={() => router.push("/dashboard/tools")}
              className="bg-surface-container border border-outline-variant p-4 rounded hover:border-primary/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Puzzle className="text-primary w-4 h-4" />
                <span className="text-xs font-semibold text-on-surface-variant">Total Tools</span>
              </div>
              <p className="text-2xl font-bold text-on-surface">{stats.totalTools}</p>
              <p className="text-[11px] text-primary mt-1 font-semibold">+12 this week</p>
            </div>

            {/* Connected Accounts */}
            <div 
              onClick={() => router.push("/dashboard/connections")}
              className="bg-surface-container border border-outline-variant p-4 rounded hover:border-primary/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Network className="text-primary w-4 h-4" />
                <span className="text-xs font-semibold text-on-surface-variant">Accounts</span>
              </div>
              <p className="text-2xl font-bold text-on-surface">{stats.connectedAccounts}</p>
              <p className="text-[11px] text-on-surface-variant mt-1">across 4 regions</p>
            </div>

            {/* Active Agents */}
            <div 
              onClick={() => router.push("/dashboard/agents")}
              className="bg-surface-container border border-outline-variant p-4 rounded hover:border-primary/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Bot className="text-primary w-4 h-4" />
                <span className="text-xs font-semibold text-on-surface-variant">Active Agents</span>
              </div>
              <p className="text-2xl font-bold text-on-surface">{stats.activeAgents}</p>
              <p className="text-[11px] text-tertiary mt-1 font-semibold">2 high priority</p>
            </div>

            {/* API Keys */}
            <div 
              onClick={() => router.push("/dashboard/api-keys")}
              className="bg-surface-container border border-outline-variant p-4 rounded hover:border-primary/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <KeyRound className="text-primary w-4 h-4" />
                <span className="text-xs font-semibold text-on-surface-variant">API Keys</span>
              </div>
              <p className="text-2xl font-bold text-on-surface">{stats.apiKeysCount}</p>
              <p className="text-[11px] text-on-surface-variant mt-1">88% active usage</p>
            </div>

            {/* Failed Calls */}
            <div 
              onClick={() => router.push("/dashboard/logs")}
              className="bg-surface-container border border-outline-variant p-4 rounded hover:border-error/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <TriangleAlert className="text-error w-4 h-4" />
                <span className="text-xs font-semibold text-on-surface-variant">Failed Calls</span>
              </div>
              <p className="text-2xl font-bold text-error">{stats.failedCallsPercentage}</p>
              <p className="text-[11px] text-error mt-1 font-semibold">3 total today</p>
            </div>

            {/* Pending Approvals */}
            <div 
              onClick={() => router.push("/dashboard/approvals")}
              className="bg-surface-container border border-outline-variant p-4 rounded hover:border-tertiary/50 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <ClipboardCheck className="text-tertiary w-4 h-4" />
                <span className="text-xs font-semibold text-on-surface-variant">Approvals</span>
              </div>
              <p className="text-2xl font-bold text-tertiary">{stats.pendingApprovals}</p>
              <div className="flex gap-2 items-center mt-1">
                {stats.pendingApprovals > 0 ? (
                  <>
                    <span className="w-1.5 h-1.5 rounded-full bg-error animate-pulse"></span>
                    <span className="text-[10px] text-error font-semibold">Require Attention</span>
                  </>
                ) : (
                  <span className="text-[10px] text-on-surface-variant font-semibold">All Clean</span>
                )}
              </div>
            </div>

          </div>

        </div>

        {/* Detailed Activity Section */}
        <div className="grid grid-cols-12 gap-4">
          
          {/* Recent Logs Table */}
          <div className="col-span-12 xl:col-span-8 bg-surface-container-low border border-outline-variant rounded overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
              <div className="flex items-center gap-4">
                <h3 className="text-sm font-bold text-on-surface">Recent Logs</h3>
                <div className="flex gap-1">
                  <span className="px-2 py-0.5 bg-surface-container-highest text-on-surface font-mono text-[9px] rounded font-semibold cursor-pointer">ALL</span>
                  <span className="px-2 py-0.5 hover:bg-surface-container-highest text-error font-mono text-[9px] rounded font-semibold cursor-pointer transition-colors">ERRORS</span>
                </div>
              </div>
              <button 
                onClick={() => router.push("/dashboard/logs")}
                className="text-primary hover:underline text-xs font-semibold cursor-pointer"
              >
                View detailed logs
              </button>
            </div>
            
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container-lowest border-b border-outline-variant">
                    <th className="px-6 py-2.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Timestamp</th>
                    <th className="px-6 py-2.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Agent / Source</th>
                    <th className="px-6 py-2.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Event</th>
                    <th className="px-6 py-2.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/30">
                  {stats.recentLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-surface-container-highest/20 transition-colors">
                      <td className="px-6 py-3.5 font-mono text-[11px] text-on-surface-variant">{log.timestamp.slice(11, 19)}</td>
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-2">
                          <span className="bg-primary/10 p-1 rounded-full flex items-center justify-center">
                            <Bot className="text-primary w-3 h-3" />
                          </span>
                          <span className="text-xs font-semibold text-on-surface">{log.agent_name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-3.5 text-xs text-on-surface-variant">
                        Called tool: <span className="text-on-surface font-semibold">{log.tool_name}</span> (<code>{log.feature_key}</code>)
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded font-mono text-[9px] font-semibold border ${
                          log.status === "SUCCESS"
                            ? "bg-green-500/10 text-green-400 border-green-500/20"
                            : log.status === "DENIED"
                            ? "bg-error-container text-error border-error/20"
                            : "bg-surface-container-highest text-on-surface border-outline-variant"
                        }`}>
                          <span className={`w-1 h-1 rounded-full ${
                            log.status === "SUCCESS" ? "bg-green-400" : log.status === "DENIED" ? "bg-error" : "bg-outline"
                          }`}></span>
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Tool Calls Activity Graph */}
          <div className="col-span-12 xl:col-span-4 bg-surface-container-low border border-outline-variant rounded p-6 flex flex-col relative overflow-hidden">
            <div className="absolute inset-0 opacity-5 pointer-events-none">
              <svg className="w-full h-full" preserveAspectRatio="none">
                <path d="M0 200 L50 180 L100 220 L150 140 L200 160 L250 100 L300 120 L350 50 L400 80" fill="none" stroke="#3b82f6" strokeWidth="2" vectorEffect="non-scaling-stroke"></path>
              </svg>
            </div>
            
            <div className="mb-6">
              <h3 className="text-sm font-bold text-on-surface">Tool Calls Activity</h3>
              <p className="text-xs text-on-surface-variant">Volume across last 24 hours</p>
            </div>
            
            <div className="flex-1 flex flex-col justify-end">
              <div className="flex items-end justify-between gap-1 h-32">
                <div className="w-full bg-primary/20 h-[30%] rounded-t-sm group hover:bg-primary/50 transition-all cursor-help relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-surface px-1.5 py-0.5 rounded border border-outline-variant font-mono text-[9px] whitespace-nowrap text-on-surface z-20">4.2k calls</div>
                </div>
                <div className="w-full bg-primary/20 h-[45%] rounded-t-sm group hover:bg-primary/50 transition-all cursor-help relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-surface px-1.5 py-0.5 rounded border border-outline-variant font-mono text-[9px] whitespace-nowrap text-on-surface z-20">6.1k calls</div>
                </div>
                <div className="w-full bg-primary/20 h-[35%] rounded-t-sm group hover:bg-primary/50 transition-all cursor-help relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-surface px-1.5 py-0.5 rounded border border-outline-variant font-mono text-[9px] whitespace-nowrap text-on-surface z-20">5.0k calls</div>
                </div>
                <div className="w-full bg-primary/60 h-[85%] rounded-t-sm group hover:bg-primary transition-all cursor-help relative glow-primary">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-surface px-1.5 py-0.5 rounded border border-outline-variant font-mono text-[9px] whitespace-nowrap text-primary font-bold z-20">12.8k calls</div>
                </div>
                <div className="w-full bg-primary/20 h-[65%] rounded-t-sm group hover:bg-primary/50 transition-all cursor-help relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-surface px-1.5 py-0.5 rounded border border-outline-variant font-mono text-[9px] whitespace-nowrap text-on-surface z-20">8.2k calls</div>
                </div>
                <div className="w-full bg-primary/20 h-[55%] rounded-t-sm group hover:bg-primary/50 transition-all cursor-help relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-surface px-1.5 py-0.5 rounded border border-outline-variant font-mono text-[9px] whitespace-nowrap text-on-surface z-20">7.4k calls</div>
                </div>
                <div className="w-full bg-primary/20 h-[40%] rounded-t-sm group hover:bg-primary/50 transition-all cursor-help relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 transition-transform bg-surface px-1.5 py-0.5 rounded border border-outline-variant font-mono text-[9px] whitespace-nowrap text-on-surface z-20">5.8k calls</div>
                </div>
              </div>
              <div className="flex justify-between mt-2">
                <span className="font-mono text-[10px] text-on-surface-variant">00:00</span>
                <span className="font-mono text-[10px] text-primary font-bold">NOW</span>
              </div>
            </div>
            
            <div className="mt-6 pt-6 border-t border-outline-variant flex justify-between">
              <div>
                <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Daily Average</p>
                <p className="font-mono text-xs font-semibold text-on-surface">8,421 calls</p>
              </div>
              <div>
                <p className="text-[10px] text-on-surface-variant uppercase font-semibold">Peak (2h ago)</p>
                <p className="font-mono text-xs font-semibold text-primary">14.1k calls/h</p>
              </div>
            </div>
          </div>

        </div>

        {/* Tool Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pb-6">
          <div className="bg-surface-container border border-outline-variant rounded p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center border border-outline-variant">
              <Cloud className="text-primary w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-on-surface">AWS Tools</h4>
              <p className="text-[11px] text-on-surface-variant">12 Connected</p>
            </div>
          </div>
          <div className="bg-surface-container border border-outline-variant rounded p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center border border-outline-variant">
              <Database className="text-secondary w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-on-surface">SQL Access</h4>
              <p className="text-[11px] text-on-surface-variant">8 Instances</p>
            </div>
          </div>
          <div className="bg-surface-container border border-outline-variant rounded p-4 flex items-center gap-4">
            <div className="w-10 h-10 rounded bg-surface-container-high flex items-center justify-center border border-outline-variant">
              <Globe className="text-tertiary w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-on-surface">Web Search</h4>
              <p className="text-[11px] text-on-surface-variant">3 Providers</p>
            </div>
          </div>
          <div 
            onClick={() => router.push("/dashboard/tools/add")}
            className="bg-surface-container border border-outline-variant rounded p-4 flex items-center gap-4 group cursor-pointer hover:bg-surface-container-high transition-colors"
          >
            <div className="w-10 h-10 rounded bg-primary flex items-center justify-center border border-primary/20 group-hover:scale-110 transition-transform glow-primary">
              <Plus className="text-on-primary w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-primary">Add Source</h4>
              <p className="text-[11px] text-on-surface-variant">Expand Registry</p>
            </div>
          </div>
        </div>

      </main>

      {/* Simulated Interaction Toast */}
      {toastVisible && (
        <div className="fixed bottom-6 right-6 bg-surface-container-highest border border-primary/50 p-4 rounded shadow-2xl flex items-center gap-4 z-50 animate-bounce glow-primary">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Info className="text-primary w-4 h-4" />
          </div>
          <div>
            <p className="text-xs font-semibold text-on-surface">System Check Complete</p>
            <p className="text-[10px] text-on-surface-variant">No anomalies detected in the last 15 minutes.</p>
          </div>
          <button 
            onClick={() => setToastVisible(false)}
            className="text-on-surface-variant hover:text-on-surface cursor-pointer ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </>
  );
}
