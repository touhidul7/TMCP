"use client";

import { use, useState } from "react";
import { useRouter } from "next/navigation";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { ArrowLeft, Pencil } from "lucide-react";

export default function AgentDetailPage({ params }) {
  const router = useRouter();
  const { agentId } = use(params);
  
  const { 
    agents, 
    tools, 
    features, 
    toolAccounts, 
    permissions, 
    updatePermission,
    updateAgent,
    hasPermission
  } = useMockStore();

  const [editDesc, setEditDesc] = useState(false);
  const [descText, setDescText] = useState("");

  const agent = agents.find((a) => a.id === agentId);
  if (!agent) {
    return (
      <div className="p-6 text-center text-on-surface-variant">
        Agent profile not found.
      </div>
    );
  }

  const handleDescSave = () => {
    updateAgent(agent.id, { description: descText });
    setEditDesc(false);
  };

  const getPermission = (accountId, featureKey) => {
    // Match on actual DB fields (agent_id, tool_account_id, feature_key)
    // because real DB rows have UUID ids, not composite strings
    const found = permissions.find(
      (p) =>
        (p.agent_id === agent.id || p.id === `${agent.id}-${accountId}-${featureKey}`) &&
        (p.tool_account_id === accountId || p.id === `${agent.id}-${accountId}-${featureKey}`) &&
        p.feature_key === featureKey
    );

    if (!found) {
      const feature = features.find((f) => f.feature_key === featureKey);
      return {
        id: null,
        agent_id: agent.id,
        tool_account_id: accountId,
        feature_key: featureKey,
        allowed: false,
        daily_limit: 100,
        require_approval: feature?.requires_approval || false
      };
    }

    return found;
  };

  return (
    <>
      <DashboardHeader title={`Agent Profile: ${agent.name}`} />

      <main className="p-6 space-y-6 flex-1 overflow-y-auto max-w-6xl">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push("/dashboard/agents")}
            className="p-1.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-on-surface">{agent.name}</h1>
            <p className="text-xs text-on-surface-variant mt-0.5">Control access rights, daily quotas, and safety guidelines.</p>
          </div>
        </div>

        {/* Agent Profile Details */}
        <div className="bg-surface-container border border-outline-variant p-6 rounded relative overflow-hidden">
          <div className="flex justify-between items-start mb-4">
            <div>
              <span className={`px-2 py-0.5 rounded font-mono text-[8px] font-bold border uppercase ${
                agent.status === "active"
                  ? "bg-green-500/10 text-green-400 border-green-500/20"
                  : "bg-surface-container-highest text-on-surface border-outline-variant"
              }`}>
                {agent.status}
              </span>
              <p className="font-mono text-[10px] text-on-surface-variant mt-2">UUID: {agent.id}</p>
            </div>
          </div>

          {editDesc ? (
            <div className="space-y-2 max-w-xl">
              <textarea
                value={descText}
                onChange={(e) => setDescText(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary h-20"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDescSave}
                  className="px-3 py-1 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 cursor-pointer"
                >
                  Save
                </button>
                <button
                  onClick={() => setEditDesc(false)}
                  className="px-3 py-1 border border-outline hover:bg-surface-container rounded text-xs text-on-surface-variant cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="flex justify-between items-start gap-4">
              <p className="text-xs text-on-surface-variant max-w-3xl leading-relaxed">
                {agent.description || "No description set for this agent profile."}
              </p>
              {hasPermission("agents.edit") && (
                <button
                  onClick={() => {
                    setDescText(agent.description || "");
                    setEditDesc(true);
                  }}
                  className="px-3 py-1.5 border border-outline hover:bg-surface-container-high rounded text-xs text-on-surface font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  Edit Profile
                </button>
              )}
            </div>
          )}
        </div>

        {/* Permission Matrix */}
        <div className="bg-surface-container border border-outline-variant rounded overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-lowest flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div>
              <h3 className="text-sm font-bold text-on-surface">Agent Tool Permission Matrix</h3>
              <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">Control permissions down to account and feature levels</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
              <span className="font-mono text-[9px] text-on-surface-variant uppercase tracking-wider font-semibold">Changes auto-save</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-outline-variant">
                  <th className="px-6 py-3 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Tool</th>
                  <th className="px-6 py-3 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Connected Account</th>
                  <th className="px-6 py-3 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Feature / Action</th>
                  <th className="px-6 py-3 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold text-center">Allowed</th>
                  <th className="px-6 py-3 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold text-center">Daily Limit</th>
                  <th className="px-6 py-3 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold text-center">Manual Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {toolAccounts.map((account) => {
                  const tool = tools.find((t) => t.id === account.tool_id);
                  const toolFeats = features.filter((f) => f.tool_id === account.tool_id);

                  if (!tool) return null;

                  return toolFeats.map((feat) => {
                    const perm = getPermission(account.id, feat.feature_key);

                    return (
                      <tr key={`${account.id}-${feat.feature_key}`} className="hover:bg-surface-container-highest/15 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-surface-container-high rounded flex items-center justify-center border border-outline-variant text-primary text-[10px] font-bold">
                              {tool.official_website_url ? (
                                <img
                                  src={`https://www.google.com/s2/favicons?sz=64&domain=${tool.official_website_url}`}
                                  alt={tool.name}
                                  className="w-4 h-4 object-contain"
                                  onError={(e) => { e.target.style.display = "none"; }}
                                />
                              ) : (
                                "T"
                              )}
                            </div>
                            <span className="text-xs font-bold text-on-surface">{tool.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-xs font-semibold text-on-surface">{account.label}</span>
                          <span className="block font-mono text-[9px] text-on-surface-variant mt-0.5">{account.account_email}</span>
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-[10px] font-bold text-primary font-mono bg-surface-container-low px-1.5 py-0.5 rounded border border-outline-variant/30">{feat.feature_key}</code>
                          <span className="block text-[10px] text-on-surface-variant mt-1 leading-normal max-w-xs">{feat.description}</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={perm.allowed}
                            onChange={(e) => updatePermission(agent.id, account.id, feat.feature_key, "allowed", e.target.checked)}
                            className="w-4 h-4 bg-surface-container-lowest border border-outline-variant rounded text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="number"
                            disabled={!perm.allowed}
                            value={perm.daily_limit}
                            onChange={(e) => updatePermission(agent.id, account.id, feat.feature_key, "daily_limit", parseInt(e.target.value) || 0)}
                            className="w-16 bg-surface-container-lowest border border-outline-variant rounded px-2 py-1 text-center font-mono text-xs text-on-surface focus:border-primary disabled:opacity-40"
                          />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <input
                            type="checkbox"
                            disabled={!perm.allowed}
                            checked={perm.require_approval}
                            onChange={(e) => updatePermission(agent.id, account.id, feat.feature_key, "require_approval", e.target.checked)}
                            className="w-4 h-4 bg-surface-container-lowest border border-outline-variant rounded text-primary focus:ring-primary focus:ring-offset-0 cursor-pointer disabled:opacity-40"
                          />
                        </td>
                      </tr>
                    );
                  });
                })}

                {toolAccounts.length === 0 && (
                  <tr>
                    <td colSpan="6" className="p-16 text-center text-on-surface-variant">
                      No tool accounts connected. Please connect accounts in the Tools page first.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
