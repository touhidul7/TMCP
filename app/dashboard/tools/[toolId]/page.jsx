"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { ArrowLeft, Puzzle, ExternalLink, Unplug, Pencil, X, Check, ChevronDown, ChevronUp } from "lucide-react";

export default function ToolDetailPage({ params }) {
  const router = useRouter();
  const { toolId } = use(params);
  const { 
    tools, 
    features, 
    toolAccounts, 
    addToolAccount, 
    updateTool,
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

  // Edit tool state
  const [showEdit, setShowEdit] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");
  const [editSuccess, setEditSuccess] = useState(false);

  // Edit form fields
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editWebsite, setEditWebsite] = useState("");
  const [editUrl, setEditUrl] = useState("");
  const [editMethod, setEditMethod] = useState("POST");
  const [editAuthType, setEditAuthType] = useState("none");
  const [editAuthHeaderName, setEditAuthHeaderName] = useState("X-API-KEY");
  const [editEnabled, setEditEnabled] = useState(true);

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

  const isCustomRest = tool.tool_type === "custom_rest";
  const isCustomMcp  = tool.tool_type === "custom_mcp";
  const isBuiltIn    = tool.tool_type === "built_in";

  // Initialize edit form when opening
  const openEdit = () => {
    setEditName(tool.name || "");
    setEditDesc(tool.description || "");
    setEditWebsite(tool.official_website_url || "");
    setEditUrl(tool.rest_base_url || tool.mcp_server_url || "");
    setEditMethod(tool.rest_config?.method || "POST");
    setEditAuthType(tool.rest_config?.auth?.type || "none");
    setEditAuthHeaderName(tool.rest_config?.auth?.header_name || "X-API-KEY");
    setEditEnabled(tool.is_enabled !== false);
    setEditError("");
    setEditSuccess(false);
    setShowEdit(true);
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    setEditSaving(true);
    setEditError("");
    setEditSuccess(false);

    const updates = {
      name: editName.trim(),
      description: editDesc.trim(),
      official_website_url: editWebsite.trim(),
      is_enabled: editEnabled,
    };

    if (isCustomRest) {
      const newConfig = {
        ...(tool.rest_config || {}),
        url: editUrl.trim(),
        method: editMethod,
        auth: {
          type: editAuthType,
          header_name: editAuthType === "bearer" ? "Authorization"
                     : editAuthType === "none" ? null
                     : editAuthHeaderName
        },
        // Keep headers clean — no placeholders
        headers: { "Content-Type": "application/json" },
      };
      updates.rest_base_url = editUrl.trim();
      updates.rest_config = newConfig;
    }

    if (isCustomMcp) {
      updates.mcp_server_url = editUrl.trim();
    }

    const res = await updateTool(toolId, updates);
    setEditSaving(false);
    if (res.error) {
      setEditError(res.error);
    } else {
      setEditSuccess(true);
      setTimeout(() => { setShowEdit(false); setEditSuccess(false); }, 1200);
    }
  };

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
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded font-mono text-[9px] font-bold border ${
                    tool.is_enabled 
                      ? "bg-green-500/10 text-green-400 border-green-500/20" 
                      : "bg-surface-container-highest text-on-surface border-outline-variant"
                  }`}>
                    {tool.is_enabled ? "ENABLED" : "DISABLED"}
                  </span>
                  {hasPermission("tools.add") && (
                    <button
                      onClick={showEdit ? () => setShowEdit(false) : openEdit}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-container-high border border-outline-variant text-on-surface-variant hover:text-on-surface hover:border-primary font-semibold text-xs rounded transition-all cursor-pointer"
                    >
                      {showEdit ? <X className="w-3 h-3" /> : <Pencil className="w-3 h-3" />}
                      {showEdit ? "Cancel" : "Edit Tool"}
                    </button>
                  )}
                </div>
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

            {/* Edit Tool Panel */}
            {showEdit && (
              <div className="bg-surface-container border border-primary/30 p-6 rounded space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">Edit Tool Configuration</h3>
                    <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">Update API endpoints, headers, and credentials</p>
                  </div>
                  <span className="px-2 py-0.5 bg-primary/10 text-primary rounded font-mono text-[9px] font-bold border border-primary/20">
                    {tool.tool_type?.replace("_", " ").toUpperCase() || "TOOL"}
                  </span>
                </div>

                <form onSubmit={handleSaveEdit} className="space-y-4">
                  {/* Name & Description */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Tool Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => setEditName(e.target.value)}
                        required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                        placeholder="e.g. Serper Search"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Website URL</label>
                      <input
                        type="text"
                        value={editWebsite}
                        onChange={e => setEditWebsite(e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                        placeholder="https://serper.dev"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Description</label>
                    <textarea
                      value={editDesc}
                      onChange={e => setEditDesc(e.target.value)}
                      rows={2}
                      className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none resize-none"
                      placeholder="Describe what this tool does…"
                    />
                  </div>

                  {/* REST API Config */}
                  {isCustomRest && (
                    <>
                      <div className="border-t border-outline-variant/40 pt-4">
                        <p className="text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-3">REST API Configuration</p>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2">
                            <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">API Endpoint URL</label>
                            <input
                              type="text"
                              value={editUrl}
                              onChange={e => setEditUrl(e.target.value)}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                              placeholder="https://api.example.com/endpoint"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Method</label>
                            <select
                              value={editMethod}
                              onChange={e => setEditMethod(e.target.value)}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono cursor-pointer"
                            >
                              <option>GET</option>
                              <option>POST</option>
                              <option>PUT</option>
                              <option>PATCH</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Auth config — defines WHERE the connected account key is injected */}
                      <div className="p-4 bg-surface-container-lowest border border-outline-variant/50 rounded space-y-3">
                        <div className="flex items-center justify-between">
                          <p className="text-[9px] font-semibold text-on-surface-variant uppercase font-mono">Authentication Method</p>
                          <span className="text-[9px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">
                            Key injected from Connected Account
                          </span>
                        </div>
                        <p className="text-[10px] text-on-surface-variant leading-relaxed">
                          The real API key comes from the <strong>Connected Account</strong> (stored encrypted). This only defines <em>where</em> the gateway injects it.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Auth Type</label>
                            <select
                              value={editAuthType}
                              onChange={e => setEditAuthType(e.target.value)}
                              className="w-full bg-surface-container-low border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none cursor-pointer"
                            >
                              <option value="none">No Auth (Public)</option>
                              <option value="bearer">Bearer Token → Authorization header</option>
                              <option value="api_key">API Key → Custom header (e.g. X-API-KEY)</option>
                              <option value="url_param">API Key → URL query param (e.g. ?token=)</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">
                              {editAuthType === "url_param" ? "Param Name" : "Header Name"}
                            </label>
                            <input
                              type="text"
                              disabled={editAuthType === "none" || editAuthType === "bearer"}
                              value={editAuthType === "bearer" ? "Authorization" : editAuthHeaderName}
                              onChange={e => setEditAuthHeaderName(e.target.value)}
                              className="w-full bg-surface-container-low border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none disabled:opacity-40 font-mono"
                              placeholder={editAuthType === "url_param" ? "token" : "X-API-KEY"}
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* MCP Config */}
                  {isCustomMcp && (
                    <div className="border-t border-outline-variant/40 pt-4">
                      <p className="text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-3">MCP Server Configuration</p>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">MCP Server URL</label>
                        <input
                          type="text"
                          value={editUrl}
                          onChange={e => setEditUrl(e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="https://mcp.example.com/sse"
                        />
                      </div>
                    </div>
                  )}

                  {/* Enable/Disable toggle */}
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setEditEnabled(!editEnabled)}
                      className={`relative w-9 h-5 rounded-full transition-colors cursor-pointer ${editEnabled ? "bg-primary" : "bg-outline-variant"}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${editEnabled ? "translate-x-4" : "translate-x-0"}`} />
                    </button>
                    <span className="text-xs font-semibold text-on-surface">
                      Tool {editEnabled ? "Enabled" : "Disabled"}
                    </span>
                  </div>

                  {editError && (
                    <div className="p-3 bg-error/10 border border-error/20 rounded text-xs text-error font-mono">
                      {editError}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setShowEdit(false)}
                      className="px-4 py-1.5 bg-surface-container-high border border-outline-variant text-on-surface-variant font-semibold text-xs rounded hover:bg-surface-container-highest transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={editSaving}
                      className="flex items-center gap-1.5 px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-60 glow-primary"
                    >
                      {editSaving ? (
                        <span className="animate-pulse">Saving…</span>
                      ) : editSuccess ? (
                        <><Check className="w-3 h-3" /> Saved!</>
                      ) : (
                        "Save Changes"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

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

              {showAddAccount && (
                isBuiltIn ? (
                  /* Google OAuth flow */
                  <div className="p-4 border border-dashed border-primary/30 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      This tool requires Google OAuth. Click below to authenticate and authorize access.
                    </p>
                    <button
                      onClick={handleConnectGoogle}
                      className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary"
                    >
                      Connect with Google OAuth
                    </button>
                  </div>
                ) : (
                  /* API Key / credentials form */
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label</label>
                        <input
                          type="text"
                          value={accountLabel}
                          onChange={(e) => setAccountLabel(e.target.value)}
                          required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. Clients Support Email"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Email / ID</label>
                        <input
                          type="text"
                          value={accountEmail}
                          onChange={(e) => setAccountEmail(e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
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
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                        placeholder="••••••••••••••••"
                      />
                    </div>

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
