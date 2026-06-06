"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { ArrowLeft, Puzzle, ExternalLink, Unplug } from "lucide-react";

export default function ToolDetailPage({ params }) {
  const router = useRouter();
  const { toolId } = use(params);
  const { 
    tools, 
    features, 
    toolAccounts, 
    addToolAccount, 
    disconnectToolAccount, 
    logs,
    hasPermission,
    user,
    agents
  } = useMockStore();

  const [showAddAccount, setShowAddAccount] = useState(false);
  const [accountLabel, setAccountLabel] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountKey, setAccountKey] = useState("");

  const tool = tools.find((t) => t.id === toolId);
  if (!tool) {
    return (
      <div className="p-6 text-center text-on-surface-variant">
        Tool integration not found.
      </div>
    );
  }

  const toolFeatures = features.filter((f) => f.tool_id === toolId);
  const connectedAccounts = toolAccounts.filter((a) => a.tool_id === toolId);
  const toolLogs = logs.filter((l) => l.tool_name.toLowerCase() === tool.name.toLowerCase());

  const handleAddAccount = (e) => {
    e.preventDefault();
    if (!accountLabel) return;

    const res = addToolAccount(toolId, accountLabel, {
      email: accountEmail,
      key: accountKey
    });

    if (res.error) {
      alert(res.error);
    } else {
      setAccountLabel("");
      setAccountEmail("");
      setAccountKey("");
      setShowAddAccount(false);
    }
  };

  const handleDisconnect = (accountId) => {
    if (confirm("Are you sure you want to disconnect this account? Agents using this account will lose access.")) {
      disconnectToolAccount(accountId);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const headers = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Pass the tool slug so the server only requests the scopes for THIS tool
      const res = await fetch(`/api/connections/google/start?tool=${encodeURIComponent(tool.slug)}`, { headers });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || "Failed to start Google OAuth flow");
      }
    } catch (err) {
      alert("Error starting connection: " + err.message);
    }
  };

  return (
    <>
      <DashboardHeader title={`Manage ${tool.name}`} />

      <main className="p-6 space-y-6 flex-1 overflow-y-auto max-w-6xl">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push("/dashboard/tools")}
            className="p-1.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-on-surface">{tool.name}</h1>
            <p className="text-xs text-on-surface-variant mt-0.5">Configure accounts, security parameters, and access permissions.</p>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel: Description and Accounts */}
          <div className="col-span-12 lg:col-span-7 space-y-6">
            
            {/* Tool Information */}
            <div className="bg-surface-container border border-outline-variant p-6 rounded">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-surface-container-high rounded flex items-center justify-center border border-outline-variant text-primary font-bold">
                    {tool.official_website_url ? (
                      <img 
                        src={`https://www.google.com/s2/favicons?sz=64&domain=${tool.official_website_url}`}
                        alt={tool.name}
                        className="w-8 h-8 object-contain"
                        onError={(e) => { e.target.style.display = "none"; }}
                      />
                    ) : (
                      <Puzzle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-on-surface">{tool.name}</h2>
                    <p className="text-xs text-on-surface-variant font-mono">{tool.provider} • {tool.category}</p>
                  </div>
                </div>
                <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold border ${
                  tool.is_enabled 
                    ? "bg-green-500/10 text-green-400 border-green-500/20" 
                    : "bg-surface-container-highest text-on-surface border-outline-variant"
                }`}>
                  {tool.is_enabled ? "ENABLED" : "DISABLED"}
                </span>
              </div>
              <p className="text-xs text-on-surface-variant leading-relaxed mb-4">{tool.description}</p>
              {tool.official_website_url && (
                <a 
                  href={tool.official_website_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-xs text-primary hover:underline font-semibold flex items-center gap-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  Visit official website
                </a>
              )}
            </div>

            {/* Labeled Connected Accounts */}
            <div className="bg-surface-container border border-outline-variant p-6 rounded space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Connected Accounts</h3>
                  <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">Multi-account label mapping</p>
                </div>
                {hasPermission("tools.connect_account") && (
                  <button
                    onClick={() => setShowAddAccount(!showAddAccount)}
                    className="px-3 py-1.5 bg-primary/10 border border-primary/20 text-primary font-semibold text-xs rounded hover:bg-primary/20 active:scale-95 transition-all cursor-pointer"
                  >
                    {showAddAccount ? "Cancel" : "Connect Account"}
                  </button>
                )}
              </div>

              {/* Add Account Panel Form */}
              {showAddAccount && (
                tool.provider.toLowerCase() === "google" ? (
                  <div className="p-6 bg-surface-container-low border border-outline-variant rounded flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                      <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.48 3.77v3.12h4.01c2.34-2.16 3.69-5.32 3.69-8.74z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.01-3.12c-1.12.75-2.55 1.19-3.95 1.19-3.05 0-5.63-2.06-6.55-4.83H1.31v3.23A11.99 11.99 0 0 0 12 24z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.45 14.33a7.19 7.19 0 0 1 0-4.66V6.44H1.31a11.99 11.99 0 0 0 0 11.12l4.14-3.23z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.31 0 3.23 2.68 1.31 6.58l4.14 3.23c.92-2.77 3.5-4.83 6.55-4.83z"
                        />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-on-surface">Connect with Google OAuth</h4>
                      <p className="text-[10px] text-on-surface-variant max-w-xs mt-1">
                        Authorizing Gmail and Google Drive requires secure OAuth validation directly with Google.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleConnectGoogle}
                      className="px-4 py-2 bg-white text-black hover:bg-neutral-100 font-bold text-xs rounded flex items-center gap-2 border border-neutral-300 shadow-sm transition-all active:scale-95 cursor-pointer"
                    >
                      Continue with Google
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleAddAccount} className="p-4 bg-surface-container-low border border-outline-variant rounded space-y-4">
                    <h4 className="text-xs font-bold text-on-surface">Credentials Mapping</h4>
                    
                    {(tool.slug === "hunter-io" || tool.slug === "consulti") ? (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label</label>
                          <input
                            type="text"
                            required
                            value={accountLabel}
                            onChange={(e) => setAccountLabel(e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary"
                            placeholder={tool.slug === "hunter-io" ? "e.g. My Hunter API Key" : "e.g. Consulti Production Key"}
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">API Key (AES Encrypted)</label>
                          <input
                            type="password"
                            required
                            value={accountKey}
                            onChange={(e) => setAccountKey(e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary"
                            placeholder="Enter your API Key"
                          />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label</label>
                            <input
                              type="text"
                              required
                              value={accountLabel}
                              onChange={(e) => setAccountLabel(e.target.value)}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary"
                              placeholder="e.g. Clients Support Email"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Email / ID</label>
                            <input
                              type="text"
                              value={accountEmail}
                              onChange={(e) => setAccountEmail(e.target.value)}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary"
                              placeholder="support@company.com"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">API Key or Password (AES Encrypted)</label>
                          <input
                            type="password"
                            value={accountKey}
                            onChange={(e) => setAccountKey(e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary"
                            placeholder="••••••••••••••••"
                          />
                        </div>
                      </>
                    )}

                    <div className="flex justify-end gap-2">
                      <button
                        type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary"
                      >
                        Authenticate Account
                      </button>
                    </div>
                  </form>
                )
              )}

              {/* Accounts Table */}
              <div className="space-y-2">
                {connectedAccounts.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-3.5 bg-surface-container-low border border-outline-variant/65 rounded">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-on-surface">{account.label}</span>
                        <span className="px-1.5 py-0.5 rounded font-mono text-[8px] bg-green-500/10 text-green-400 border border-green-500/20 uppercase">
                          {account.status}
                        </span>
                      </div>
                      <p className="font-mono text-[10px] text-on-surface-variant mt-1">{account.account_email || "system@gateway.local"}</p>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[9px] font-mono text-on-surface-variant">AES-256-GCM SECURE</p>
                        <p className="text-[9px] text-on-surface-variant mt-0.5">Connected {account.created_at.slice(0, 10)}</p>
                      </div>
                      
                      {hasPermission("tools.disconnect_account") && (
                        <button
                          onClick={() => handleDisconnect(account.id)}
                          className="p-1 hover:bg-surface-container-highest text-error rounded cursor-pointer"
                          title="Disconnect Account"
                        >
                          <Unplug className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {connectedAccounts.length === 0 && (
                  <div className="p-8 text-center border border-dashed border-outline-variant/60 rounded bg-surface-container-lowest">
                    <Unplug className="text-outline w-6 h-6 mb-1" />
                    <p className="text-xs text-on-surface-variant">No accounts connected to this tool yet.</p>
                  </div>
                )}
              </div>
            </div>

          </div>

          {/* Right Panel: Features and Recent Logs */}
          <div className="col-span-12 lg:col-span-5 space-y-6">
            
            {/* Exposed Features */}
            <div className="bg-surface-container border border-outline-variant p-6 rounded space-y-4">
              <div>
                <h3 className="text-sm font-bold text-on-surface">Available Features</h3>
                <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">Exposed API Call signatures</p>
              </div>

              <div className="divide-y divide-outline-variant/30 space-y-3">
                {toolFeatures.map((feat) => (
                  <div key={feat.id} className="pt-3 first:pt-0">
                    <div className="flex justify-between items-start">
                      <code className="text-[11px] font-bold text-primary font-mono">{feat.feature_key}</code>
                      <div className="flex gap-1">
                        {feat.is_dangerous && (
                          <span className="px-1.5 py-0.5 bg-error/15 text-error rounded font-mono text-[7px] font-bold border border-error/20">
                            DANGEROUS
                          </span>
                        )}
                        {feat.requires_approval && (
                          <span className="px-1.5 py-0.5 bg-tertiary/15 text-tertiary rounded font-mono text-[7px] font-bold border border-tertiary/20">
                            APPROVAL REQ
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-on-surface-variant mt-1 leading-relaxed">{feat.description}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Logs (Filtered) */}
            <div className="bg-surface-container border border-outline-variant p-6 rounded space-y-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-bold text-on-surface">Execution Logs</h3>
                  <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">History of tool calls</p>
                </div>
                <button 
                  onClick={() => router.push("/dashboard/logs")}
                  className="text-primary hover:underline text-xs font-semibold"
                >
                  View All
                </button>
              </div>

              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {toolLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-surface-container-low border border-outline-variant/40 rounded flex flex-col justify-between gap-1 text-[11px]">
                    <div className="flex justify-between items-center font-mono text-[10px]">
                      <span className="text-on-surface-variant">{(log.timestamp || log.created_at || "").slice(11, 19)}</span>
                      <span className={`px-1.5 py-0.1 rounded text-[8px] font-bold ${
                        log.status === "SUCCESS" 
                          ? "bg-green-500/10 text-green-400" 
                          : "bg-error-container text-error"
                      }`}>
                        {log.status}
                      </span>
                    </div>
                    
                    <p className="text-on-surface font-semibold">{log.agent_name || agents.find(a => a.id === log.agent_id)?.name || "System"}</p>
                    <code className="text-on-surface-variant font-mono text-[9px] truncate bg-surface-container-lowest px-1 rounded py-0.5">{JSON.stringify(log.input)}</code>
                  </div>
                ))}

                {toolLogs.length === 0 && (
                  <p className="text-xs text-on-surface-variant text-center py-6">No logs for this tool yet.</p>
                )}
              </div>
            </div>

          </div>
        </div>
      </main>
    </>
  );
}
