"use client";

import { useState } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { Plus, X, TriangleAlert, Copy, Check } from "lucide-react";

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

  const handleCreateKey = (e) => {
    e.preventDefault();
    if (!keyName || !agentId) return;

    const res = generateApiKey(agentId, keyName, parseInt(expiryDays) || null);
    if (res.error) {
      alert(res.error);
    } else {
      setNewRawKey(res.rawKey);
      setKeyName("");
      setShowCreateForm(false);
    }
  };

  const handleRevoke = (keyId) => {
    if (confirm("Are you sure you want to revoke this API key? This action is permanent and cannot be undone.")) {
      revokeApiKey(keyId);
    }
  };

  const handleRotate = (keyId) => {
    if (confirm("Are you sure you want to rotate this key? Any script using the old key will stop working immediately.")) {
      const res = rotateApiKey(keyId);
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
      </main>
    </>
  );
}
