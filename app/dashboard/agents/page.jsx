"use client";

import { useState } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { useRouter } from "next/navigation";
import { Plus, X, Bot, Trash2 } from "lucide-react";

export default function AgentsPage() {
  const router = useRouter();
  const { agents, apiKeys, createAgent, updateAgent, deleteAgent, hasPermission } = useMockStore();

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [agentName, setAgentName] = useState("");
  const [agentDesc, setAgentDesc] = useState("");

  const getApiKeyCount = (agentId) => {
    return apiKeys.filter((k) => k.agent_id === agentId).length;
  };

  const handleCreateAgent = (e) => {
    e.preventDefault();
    if (!agentName) return;

    const res = createAgent(agentName, agentDesc);
    if (res.error) {
      alert(res.error);
    } else {
      setAgentName("");
      setAgentDesc("");
      setShowCreateForm(false);
    }
  };

  const toggleAgentStatus = (agentId, currentStatus) => {
    const nextStatus = currentStatus === "active" ? "disabled" : "active";
    updateAgent(agentId, { status: nextStatus });
  };

  const handleDeleteAgent = (agentId) => {
    if (confirm("Are you sure you want to delete this agent? This will revoke all API keys associated with it and wipe all configurations.")) {
      deleteAgent(agentId);
    }
  };

  return (
    <>
      <DashboardHeader title="Agents Management" />

      <main className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-on-surface">AI Agents Registry</h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Create agents, manage status, view associated API tokens, and configure strict tool calling permissions.
            </p>
          </div>
          {hasPermission("agents.create") && (
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2 bg-primary text-on-primary font-semibold text-sm rounded flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary"
            >
              {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateForm ? "Close Form" : "Create Agent"}
            </button>
          )}
        </div>

        {/* Create Agent Panel Form */}
        {showCreateForm && (
          <form onSubmit={handleCreateAgent} className="p-6 bg-surface-container border border-outline-variant rounded space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-on-surface">Register Agent Profile</h3>
            
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Agent Name</label>
                <input
                  type="text"
                  required
                  value={agentName}
                  onChange={(e) => setAgentName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none"
                  placeholder="e.g. Lead Research Agent"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Description</label>
                <textarea
                  value={agentDesc}
                  onChange={(e) => setAgentDesc(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none h-20 resize-none"
                  placeholder="Performs lookup, domain searches, and syncs pipelines with CRM."
                />
              </div>
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
                Initialize Agent
              </button>
            </div>
          </form>
        )}

        {/* Agents Grid list */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {agents.map((agent) => {
            const keyCount = getApiKeyCount(agent.id);
            return (
              <div 
                key={agent.id}
                className="bg-surface-container border border-outline-variant rounded p-6 flex flex-col justify-between hover:border-primary/50 transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-primary/10 rounded flex items-center justify-center border border-primary/20 text-primary">
                        <Bot className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">{agent.name}</h3>
                        <p className="font-mono text-[9px] text-on-surface-variant">ID: {agent.id}</p>
                      </div>
                    </div>

                    <button
                      onClick={() => toggleAgentStatus(agent.id, agent.status)}
                      className={`px-2 py-0.5 rounded font-mono text-[8px] font-bold border cursor-pointer uppercase ${
                        agent.status === "active"
                          ? "bg-green-500/10 text-green-400 border-green-500/20"
                          : "bg-surface-container-highest text-on-surface border-outline-variant"
                      }`}
                    >
                      {agent.status}
                    </button>
                  </div>

                  <p className="text-xs text-on-surface-variant leading-relaxed line-clamp-2 mb-6">
                    {agent.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-outline-variant/30 flex justify-between items-center mt-auto text-xs">
                  <div className="flex gap-4">
                    <div>
                      <span className="text-on-surface-variant">API Keys: </span>
                      <span className="font-mono font-bold text-on-surface">{keyCount} active</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => router.push(`/dashboard/agents/${agent.id}`)}
                      className="px-3 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 cursor-pointer glow-primary"
                    >
                      Permissions Matrix
                    </button>
                    {hasPermission("agents.delete") && (
                      <button
                        onClick={() => handleDeleteAgent(agent.id)}
                        className="p-1.5 hover:bg-error/10 text-error rounded cursor-pointer"
                        title="Delete agent"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
