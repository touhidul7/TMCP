"use client";

import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { CheckCircle2 } from "lucide-react";

export default function ApprovalsPage() {
  const { 
    approvals, 
    agents, 
    tools, 
    toolAccounts, 
    approveRequest, 
    rejectRequest, 
    user,
    hasPermission 
  } = useMockStore();

  const handleApprove = (approvalId) => {
    if (!user) return;
    const res = approveRequest(approvalId, user.id);
    if (res.error) alert(res.error);
  };

  const handleReject = (approvalId) => {
    if (!user) return;
    const res = rejectRequest(approvalId, user.id);
    if (res.error) alert(res.error);
  };

  const getAgentName = (id) => agents.find(a => a.id === id)?.name || "Unknown Agent";
  const getToolName = (id) => tools.find(t => t.id === id)?.name || "Unknown Tool";
  const getAccountLabel = (id) => toolAccounts.find(a => a.id === id)?.label || "Unknown Account";

  const pendingApprovals = approvals.filter(a => a.status === "pending");
  const processedApprovals = approvals.filter(a => a.status !== "pending");

  return (
    <>
      <DashboardHeader title="Dangerous Action Queue" />

      <main className="p-6 space-y-6 flex-1 overflow-y-auto max-w-6xl">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Tool Call Approvals</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Authorize or reject dangerous tool actions triggered by external agents before they are processed by the tool router.
          </p>
        </div>

        {/* Pending Requests */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
            Pending Authorization
            <span className="px-2 py-0.5 rounded bg-tertiary-container text-tertiary font-mono text-[10px] font-bold">
              {pendingApprovals.length} Awaiting
            </span>
          </h3>

          <div className="space-y-4">
            {pendingApprovals.map((req) => (
              <div key={req.id} className="bg-surface-container border border-outline-variant rounded p-6 flex flex-col md:flex-row justify-between gap-6 hover:border-tertiary/60 transition-colors">
                <div className="space-y-4 flex-1">
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs font-mono">
                    <div>
                      <span className="text-on-surface-variant">Request ID: </span>
                      <span className="text-on-surface font-semibold">{req.id}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant">Triggered by: </span>
                      <span className="text-primary font-bold">{getAgentName(req.agent_id)}</span>
                    </div>
                    <div>
                      <span className="text-on-surface-variant">Endpoint: </span>
                      <span className="text-on-surface font-semibold">{getToolName(req.tool_id)} • {getAccountLabel(req.tool_account_id)}</span>
                    </div>
                  </div>

                  <div>
                    <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-1">Action Signature</span>
                    <code className="text-xs font-bold text-primary font-mono bg-surface-container-low px-2 py-1 rounded border border-outline-variant/30">
                      {req.feature_key}
                    </code>
                  </div>

                  <div>
                    <span className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider block mb-1">Input Arguments Payload Preview</span>
                    <pre className="p-3 bg-surface-container-lowest rounded border border-outline-variant/40 font-mono text-xs text-on-surface overflow-x-auto max-h-40">
                      {JSON.stringify(req.input, null, 2)}
                    </pre>
                  </div>
                </div>

                <div className="flex flex-row md:flex-col justify-end gap-2 self-end md:self-center">
                  {hasPermission("approvals.reject") ? (
                    <button
                      onClick={() => handleReject(req.id)}
                      className="px-4 py-2 border border-error bg-error/10 text-error font-bold text-xs rounded hover:bg-error/20 transition-all cursor-pointer text-center whitespace-nowrap"
                    >
                      Reject Request
                    </button>
                  ) : (
                    <span className="text-[10px] text-on-surface-variant italic">No approval rights</span>
                  )}
                  {hasPermission("approvals.approve") && (
                    <button
                      onClick={() => handleApprove(req.id)}
                      className="px-5 py-2 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer text-center whitespace-nowrap glow-primary"
                    >
                      Approve & Execute
                    </button>
                  )}
                </div>
              </div>
            ))}

            {pendingApprovals.length === 0 && (
              <div className="p-16 text-center border border-dashed border-outline-variant/60 rounded bg-surface-container-lowest">
                <CheckCircle2 className="text-green-400 w-10 h-10 mb-2 mx-auto" />
                <p className="text-sm text-on-surface-variant">Approvals queue is clean. No dangerous calls waiting authorization.</p>
              </div>
            )}
          </div>
        </div>

        {/* Audit / Processed Requests */}
        {processedApprovals.length > 0 && (
          <div className="space-y-4 pt-6">
            <h3 className="text-sm font-bold text-on-surface">Processed Approvals Audit</h3>
            <div className="bg-surface-container border border-outline-variant rounded overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container-lowest border-b border-outline-variant font-mono text-[10px] text-on-surface-variant font-semibold">
                      <th className="px-5 py-3">Req ID</th>
                      <th className="px-5 py-3">Agent</th>
                      <th className="px-5 py-3">Tool Call</th>
                      <th className="px-5 py-3 text-center">Status</th>
                      <th className="px-5 py-3 text-right">Processed At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30 font-mono text-xs">
                    {processedApprovals.map((req) => (
                      <tr key={req.id} className="hover:bg-surface-container-highest/10 transition-colors">
                        <td className="px-5 py-4 text-on-surface-variant">{req.id.slice(0, 8)}...</td>
                        <td className="px-5 py-4 font-sans font-semibold text-on-surface">{getAgentName(req.agent_id)}</td>
                        <td className="px-5 py-4">
                          <code className="text-primary font-bold font-mono">{req.feature_key}</code>
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold border uppercase ${
                            req.status === "approved"
                              ? "bg-green-500/10 text-green-400 border-green-500/20"
                              : "bg-error-container text-error border-error/20"
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right text-on-surface-variant">
                          {req.approved_at ? req.approved_at.slice(11, 19) : req.rejected_at ? req.rejected_at.slice(11, 19) : "Never"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
