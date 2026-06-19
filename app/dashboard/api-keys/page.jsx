"use client";

import { useState } from "react";
import Link from "next/link";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { BookOpen, Check, Copy, Plus, TriangleAlert, X } from "lucide-react";

export default function ApiKeysPage() {
  const { apiKeys, agents, generateApiKey, revokeApiKey, rotateApiKey, hasPermission } = useMockStore();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [expiryDays, setExpiryDays] = useState("30");
  const [newRawKey, setNewRawKey] = useState("");
  const [copied, setCopied] = useState(false);
  const [copiedPrefix, setCopiedPrefix] = useState(null);

  const activeKeys = apiKeys.filter((key) => key.status !== "revoked");
  const revokedCount = apiKeys.length - activeKeys.length;

  const getAgentName = (id) => agents.find((agent) => agent.id === id)?.name || "Unknown Agent";

  const handleCreateKey = async (event) => {
    event.preventDefault();
    if (!keyName || !agentId) return;

    const res = await generateApiKey(agentId, keyName, parseInt(expiryDays, 10) || null);
    if (res.error) {
      alert(res.error);
      return;
    }

    setNewRawKey(res.rawKey);
    setKeyName("");
    setAgentId("");
    setShowCreateForm(false);
  };

  const handleRevoke = async (keyId) => {
    if (confirm("Are you sure you want to revoke this API key? Scripts using it will stop working immediately.")) {
      await revokeApiKey(keyId);
    }
  };

  const handleRotate = async (keyId) => {
    if (!confirm("Rotate this key? Any script using the old key will stop working immediately.")) return;
    const res = await rotateApiKey(keyId);
    if (res.error) {
      alert(res.error);
    } else {
      setNewRawKey(res.rawKey);
    }
  };

  const copyRawKey = async () => {
    await navigator.clipboard.writeText(newRawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const copyPrefix = async (key) => {
    await navigator.clipboard.writeText(key.key_prefix);
    setCopiedPrefix(key.id);
    setTimeout(() => setCopiedPrefix(null), 1600);
  };

  return (
    <>
      <DashboardHeader title="API Credentials" />

      <main className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto max-w-6xl">
        <section className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-on-surface">Agent API Keys</h1>
            <p className="text-xs text-on-surface-variant mt-1 max-w-2xl">
              Generate hashed access tokens for agents. Raw keys are displayed once, then stored only as hashes.
            </p>
          </div>
          {hasPermission("api_keys.create") && (
            <button
              onClick={() => setShowCreateForm((value) => !value)}
              className="px-4 py-2 bg-primary text-on-primary font-semibold text-sm rounded flex items-center justify-center gap-2 hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary w-full sm:w-fit"
            >
              {showCreateForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
              {showCreateForm ? "Close Form" : "Generate API Key"}
            </button>
          )}
        </section>

        <section className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryCard label="Active Keys" value={activeKeys.length} />
          <SummaryCard label="Assigned Agents" value={new Set(apiKeys.map((key) => key.agent_id)).size} />
          <SummaryCard label="Revoked Keys" value={revokedCount} />
        </section>

        {newRawKey && (
          <section className="p-5 sm:p-6 bg-tertiary-container text-on-tertiary-container border border-tertiary/30 rounded glow-tertiary space-y-4 max-w-2xl relative">
            <button
              onClick={() => setNewRawKey("")}
              className="absolute top-4 right-4 text-on-tertiary-container/80 hover:text-on-tertiary-container cursor-pointer"
              aria-label="Dismiss new key"
            >
              <X className="w-3 h-3" />
            </button>

            <div className="flex items-center gap-2 text-tertiary">
              <TriangleAlert className="w-4 h-4" />
              <h3 className="text-sm font-bold uppercase tracking-wider font-mono">Store Key Securely - Shown Once</h3>
            </div>

            <p className="text-xs leading-relaxed opacity-90">
              Copy this key now. TMCP stores only its hash, so it cannot be displayed again.
            </p>

            <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-surface/50 p-3 rounded border border-outline-variant/30">
              <code className="text-xs font-mono font-bold select-all flex-1 break-all text-on-surface">{newRawKey}</code>
              <button
                onClick={copyRawKey}
                className="px-3 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 flex items-center justify-center gap-1 cursor-pointer"
              >
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </section>
        )}

        {showCreateForm && (
          <form onSubmit={handleCreateKey} className="p-5 sm:p-6 bg-surface-container border border-outline-variant rounded space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-on-surface">Generate Access Token</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Key Label">
                <input
                  type="text"
                  required
                  value={keyName}
                  onChange={(event) => setKeyName(event.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none"
                  placeholder="Production workflow"
                />
              </Field>

              <Field label="Assign to Agent">
                <select
                  value={agentId}
                  required
                  onChange={(event) => setAgentId(event.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none cursor-pointer"
                >
                  <option value="">Choose agent</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.name} ({agent.status})
                    </option>
                  ))}
                </select>
              </Field>
            </div>

            <Field label="Expiration Period">
              <select
                value={expiryDays}
                onChange={(event) => setExpiryDays(event.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none cursor-pointer"
              >
                <option value="30">30 days</option>
                <option value="90">90 days</option>
                <option value="365">1 year</option>
                <option value="0">No expiration</option>
              </select>
            </Field>

            <div className="flex flex-col sm:flex-row justify-end gap-2">
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

        <section className="bg-surface-container border border-outline-variant rounded overflow-hidden">
          <div className="px-5 sm:px-6 py-4 border-b border-outline-variant bg-surface-container-lowest">
            <h3 className="text-sm font-bold text-on-surface">Keys Registry</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-outline-variant">
                  <TableHead>Key Name</TableHead>
                  <TableHead>Assigned Agent</TableHead>
                  <TableHead>Key Prefix</TableHead>
                  <TableHead>Expires</TableHead>
                  <TableHead>Last Used</TableHead>
                  <TableHead align="right">Actions</TableHead>
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
                          onClick={() => copyPrefix(key)}
                          className="p-1 hover:bg-surface-container-high rounded text-on-surface-variant hover:text-primary transition-colors cursor-pointer"
                          title="Copy key prefix"
                        >
                          {copiedPrefix === key.id ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">{key.expires_at ? key.expires_at.slice(0, 10) : "Never"}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{key.last_used_at ? key.last_used_at.replace("T", " ").slice(0, 19) : "Never"}</td>
                    <td className="px-6 py-4 text-right font-sans">
                      {key.status === "revoked" ? (
                        <span className="px-2 py-0.5 rounded font-mono text-[9px] bg-error-container text-error border border-error/10 uppercase font-bold">
                          Revoked
                        </span>
                      ) : (
                        <div className="flex justify-end gap-2">
                          {hasPermission("api_keys.rotate") && (
                            <button onClick={() => handleRotate(key.id)} className="px-2.5 py-1 bg-surface-container-high border border-outline hover:bg-surface-container-highest rounded text-[11px] font-semibold text-on-surface cursor-pointer">
                              Rotate
                            </button>
                          )}
                          {hasPermission("api_keys.revoke") && (
                            <button onClick={() => handleRevoke(key.id)} className="px-2.5 py-1 bg-error/15 border border-error/20 hover:bg-error/20 rounded text-[11px] font-bold text-error cursor-pointer">
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
                    <td colSpan="6" className="p-12 text-center text-on-surface-variant font-sans">
                      No API keys have been generated yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <ApiDocsCallout />
      </main>
    </>
  );
}

function ApiDocsCallout() {
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";

  return (
    <section className="bg-surface-container border border-outline-variant rounded p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
          <BookOpen className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-bold text-on-surface">Gateway Documentation</h3>
          <p className="text-xs text-on-surface-variant mt-1 leading-relaxed max-w-2xl">
            Open the public TMCP reference for endpoint schemas, live examples, per-tool snippets, and the agent-readable docs API.
          </p>
          <code className="block mt-3 text-[11px] font-mono text-primary bg-surface-container-lowest border border-outline-variant/50 rounded px-3 py-2 w-fit max-w-full break-all">
            GET {baseUrl}/api/gateway/docs
          </code>
        </div>
      </div>
      <Link href="/docs" className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer w-fit">
        Open Documentation
      </Link>
    </section>
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

function Field({ label, children }) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">{label}</label>
      {children}
    </div>
  );
}

function TableHead({ children, align }) {
  return (
    <th className={`px-6 py-3.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold ${align === "right" ? "text-right" : ""}`}>
      {children}
    </th>
  );
}
