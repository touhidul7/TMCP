"use client";

import { useState, use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import GatewayCodeTabs from "@/components/gateway-code-tabs";
import KeyPoolManager from "@/components/key-pool-manager";
import { buildRotateSnippets, buildScrapeDoRotateSnippets, buildApifyRotateSnippets } from "@/lib/docs/gateway-docs";
import { ArrowLeft, Puzzle, ExternalLink, Unplug, Pencil, X, Check, ChevronDown, ChevronUp, Trash2, BookOpen } from "lucide-react";
import Image from "next/image";

export default function ToolDetailPage({ params }) {
  const router = useRouter();
  const { toolId } = use(params);
  const { 
    tools, 
    features, 
    toolAccounts, 
    addToolAccount, 
    updateTool,
    deleteTool,
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
  const [accountKey2, setAccountKey2] = useState(""); // secondary key (e.g. Twilio Auth Token)
  const [accountId, setAccountId] = useState("");     // sub-account ID (e.g. GHL Location ID)

  // Custom Email / Gmail App Password fields
  const [emailProtocol, setEmailProtocol] = useState("IMAP"); // IMAP or POP3
  const [imapHost, setImapHost] = useState("");
  const [imapPort, setImapPort] = useState("993");
  const [imapEncryption, setImapEncryption] = useState("SSL/TLS");
  const [smtpHost, setSmtpHost] = useState("");
  const [smtpPort, setSmtpPort] = useState("465");
  const [smtpEncryption, setSmtpEncryption] = useState("SSL/TLS");
  const [imapUsername, setImapUsername] = useState("");
  const [imapPassword, setImapPassword] = useState("");

  // SSH / FTP server fields
  const [serverHost, setServerHost] = useState("");
  const [serverPort, setServerPort] = useState("22");
  const [serverUser, setServerUser] = useState("");
  const [serverPassword, setServerPassword] = useState("");
  const [serverProtocol, setServerProtocol] = useState("SFTP"); // for FTP tool

  // SSH-specific fields
  const [sshAuthMethod, setSshAuthMethod]           = useState("Password"); // "Password" | "Private Key"
  const [sshPrivateKey, setSshPrivateKey]           = useState("");
  const [sshPassphrase, setSshPassphrase]           = useState("");
  const [sshWorkDir, setSshWorkDir]                 = useState("");
  const [sshConnTimeout, setSshConnTimeout]         = useState("30");
  const [sshCmdTimeout, setSshCmdTimeout]           = useState("60");
  const [sshUseSudo, setSshUseSudo]                 = useState(false);
  const [sshSudoPassword, setSshSudoPassword]       = useState("");
  const [sshRequireApproval, setSshRequireApproval] = useState(true);
  const [sshAllowedCmds, setSshAllowedCmds]         = useState("");
  const [sshBlockedCmds, setSshBlockedCmds]         = useState("");
  const [sshShowAdvanced, setSshShowAdvanced]       = useState(false);

  // Connection fields for databases/CRM/marketing tools
  const [connectionFields, setConnectionFields] = useState({});
  const setField = (key, val) => {
    setConnectionFields(prev => ({ ...prev, [key]: val }));
  };

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
  const [disconnectingId, setDisconnectingId] = useState(null); // account being disconnected
  const [confirmingId, setConfirmingId]     = useState(null); // account awaiting confirmation

  // Custom tool deletion state
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  const handleDeleteTool = async () => {
    setIsDeleting(true);
    setDeleteError("");
    const res = await deleteTool(toolId);
    setIsDeleting(false);
    if (res?.error) {
      setDeleteError(res.error);
    } else {
      router.push("/dashboard/tools");
    }
  };

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
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
  const exampleAccountId = connectedAccounts[0]?.id || "";

  const isCustomRest = tool.tool_type === "custom_rest";
  const isCustomMcp  = tool.tool_type === "custom_mcp";
  const isBuiltIn    = tool.tool_type === "built_in";
  const isScrapeDoRotate = tool.slug === "scrapedo-rotate";
  const isApifyRotate = tool.slug === "apify-rotate";
  const isRotateTool = tool.slug === "gemini-rotate" || tool.slug === "openrouter-rotate" || isScrapeDoRotate || isApifyRotate;
  const rotateBasePath = tool.slug === "gemini-rotate" ? "/api/gemini/v1" : isScrapeDoRotate ? "/api/scrapedo" : isApifyRotate ? "/api/apify/v2" : "/api/openrouter/v1";
  const rotateModel = tool.slug === "gemini-rotate" ? "gemini-2.5-flash" : "openai/gpt-4o-mini";

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

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!accountLabel) return;

    let credentials = {};
    let resolvedEmail = accountEmail;

    if (tool.slug === "custom-email" || tool.slug === "gmail-app") {
      credentials = {
        email: imapUsername,
        protocol: emailProtocol,
        incoming_host: imapHost,
        incoming_port: imapPort,
        incoming_encryption: imapEncryption,
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_encryption: smtpEncryption,
        password: imapPassword,
      };
      resolvedEmail = imapUsername;
    } else if (tool.slug === "ssh") {
      credentials = {
        // common
        host: serverHost,
        port: serverPort || "22",
        username: serverUser,
        auth_method: sshAuthMethod,
        // secret fields handled server-side by column name
        password:            sshAuthMethod === "Password"    ? serverPassword : undefined,
        private_key:         sshAuthMethod === "Private Key" ? sshPrivateKey  : undefined,
        private_key_passphrase: sshAuthMethod === "Private Key" ? sshPassphrase : undefined,
        // advanced / non-secret
        default_working_dir: sshWorkDir     || undefined,
        connection_timeout:  sshConnTimeout || undefined,
        command_timeout:     sshCmdTimeout  || undefined,
        use_sudo:            sshUseSudo,
        sudo_password:       sshUseSudo ? sshSudoPassword : undefined,
        require_approval:    sshRequireApproval,
        allowed_commands:    sshAllowedCmds  || undefined,
        blocked_commands:    sshBlockedCmds  || undefined,
      };
      resolvedEmail = `${serverUser}@${serverHost}`;
    } else if (tool.slug === "ftp") {
      credentials = { email: serverUser, key: serverPassword, host: serverHost, port: serverPort, protocol: serverProtocol };
      resolvedEmail = `${serverUser}@${serverHost}`;
    } else if (tool.slug === "twilio") {
      credentials = { email: accountEmail || "twilio-account", key: accountKey, auth_token: accountKey2 };
    } else if (tool.slug === "ghl") {
      credentials = { email: accountEmail || accountId, key: accountKey, location_id: accountId };
    } else if (tool.slug === "slack") {
      credentials = { key: accountKey, email: "slack-bot" };
    } else if (tool.slug === "github") {
      credentials = { key: accountKey, email: accountEmail || "github-pat" };
    } else if (tool.slug === "resend") {
      credentials = { key: accountKey, domain_name: accountEmail };
      resolvedEmail = accountEmail; // This is the domain name
    } else if (["postgresql", "mysql", "oracle"].includes(tool.slug)) {
      credentials = {
        host: connectionFields.host || "",
        port: connectionFields.port || (tool.slug === "postgresql" ? "5432" : tool.slug === "mysql" ? "3306" : "1521"),
        database: connectionFields.database || "",
        username: connectionFields.username || "",
        password: connectionFields.password || "",
        ssl: connectionFields.ssl || "Disable",
        sid: connectionFields.sid || "",
      };
      resolvedEmail = `${credentials.username}@${credentials.host}/${credentials.database || credentials.sid || ""}`;
    } else if (tool.slug === "redis") {
      credentials = {
        host: connectionFields.host || "",
        port: connectionFields.port || "6379",
        password: connectionFields.password || "",
        ssl: connectionFields.ssl === "true",
      };
      resolvedEmail = `redis://${credentials.host}:${credentials.port}`;
    } else if (tool.slug === "mongodb") {
      credentials = {
        uri: connectionFields.uri || "",
      };
      // Mask connection URI password for display
      resolvedEmail = credentials.uri.replace(/\/\/([^:]+):([^@]+)@/, "//***:***@");
    } else if (tool.slug === "salesforce") {
      credentials = {
        environment: connectionFields.environment || "Production",
        client_id: connectionFields.client_id || "",
        client_secret: connectionFields.client_secret || "",
        username: connectionFields.username || "",
        password: connectionFields.password || "",
        security_token: connectionFields.security_token || "",
      };
      resolvedEmail = `${credentials.username} [${credentials.environment}]`;
    } else if (tool.slug === "jira") {
      credentials = {
        instance_url: connectionFields.instance_url || "",
        email: connectionFields.email || "",
        api_token: connectionFields.api_token || "",
      };
      resolvedEmail = `${credentials.email} (${credentials.instance_url.replace(/^https?:\/\//, '')})`;
    } else if (tool.slug === "shopify") {
      credentials = {
        shop_domain: connectionFields.shop_domain || "",
        access_token: connectionFields.access_token || "",
      };
      resolvedEmail = credentials.shop_domain;
    } else if (tool.slug === "activecampaign") {
      credentials = {
        api_url: connectionFields.api_url || "",
        key: connectionFields.api_key || "",
      };
      resolvedEmail = credentials.api_url.replace(/^https?:\/\//, '');
    } else if (tool.slug === "bigquery") {
      credentials = {
        project_id: connectionFields.project_id || "",
        key: connectionFields.service_account_key || "",
        dataset: connectionFields.dataset || "",
      };
      resolvedEmail = `bigquery://${credentials.project_id}`;
    } else if (tool.slug === "mailchimp") {
      credentials = {
        key: accountKey,
        data_center: accountEmail || "us1",
      };
      resolvedEmail = `mailchimp-${accountEmail || "us1"}`;
    } else if (tool.slug === "asana") {
      credentials = { key: accountKey };
      resolvedEmail = "asana-connected";
    } else if (tool.slug === "serper") {
      credentials = { key: accountKey };
      resolvedEmail = "serper-connected";
    } else if (tool.slug === "scrapedo") {
      credentials = { key: accountKey };
      resolvedEmail = "scrapedo-connected";
    } else if (["gemini-rotate", "openrouter-rotate", "scrapedo-rotate", "apify-rotate"].includes(tool.slug)) {
      // Rotate tools hold a pool of keys (added separately), so the account itself stores no single key.
      credentials = {};
      resolvedEmail = `${tool.slug}-pool`;
    } else if (["whatsapp", "facebook", "instagram"].includes(tool.slug)) {
      // Meta tools store the access token (key) plus the relevant object id in connection metadata.
      const idKey = tool.slug === "whatsapp" ? "phone_number_id" : tool.slug === "facebook" ? "page_id" : "ig_user_id";
      credentials = { key: accountKey, [idKey]: accountId };
      resolvedEmail = accountId ? `${tool.slug}:${accountId}` : `${tool.slug}-connected`;
    } else if (["openrouter", "anthropic", "openai", "apify", "stitch", "notion", "airtable", "hubspot", "stripe", "linear"].includes(tool.slug)) {
      credentials = { key: accountKey };
      resolvedEmail = `${tool.slug}-connected`;
    } else {
      credentials = { email: accountEmail, key: accountKey };
    }

    const res = await addToolAccount(toolId, accountLabel, { ...credentials, email: resolvedEmail });

    if (res.error) {
      alert(res.error);
    } else {
      // Reset all fields
      setAccountLabel(""); setAccountEmail(""); setAccountKey(""); setAccountKey2(""); setAccountId("");
      setImapHost(""); setImapPort("993"); setSmtpHost(""); setSmtpPort("465");
      setImapUsername(""); setImapPassword(""); setEmailProtocol("IMAP");
      setServerHost(""); setServerPort(""); setServerUser(""); setServerPassword("");
      setConnectionFields({});
      setShowAddAccount(false);
    }
  };

  const handleDisconnect = async (accountId) => {
    // First click → show inline confirmation
    if (confirmingId !== accountId) {
      setConfirmingId(accountId);
      return;
    }
    // Second click (confirmed) → actually delete
    setConfirmingId(null);
    setDisconnectingId(accountId);
    const res = await disconnectToolAccount(accountId);
    setDisconnectingId(null);
    if (res?.error) alert(res.error);
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

      <main className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto max-w-6xl">
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
                      <Image 
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
                  {!isBuiltIn && tool.owner_user_id === user?.id && (
                    <button
                      onClick={() => setShowConfirmDelete(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-error/10 border border-error/20 text-error hover:bg-error/20 font-semibold text-xs rounded transition-all cursor-pointer"
                    >
                      <Trash2 className="w-3 h-3" />
                      Delete Tool
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
                /* ─── Google OAuth tools ─── */
                ["gmail", "drive", "sheets", "calendar"].includes(tool.slug) ? (
                  <div className="p-4 border border-dashed border-primary/30 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      This tool uses <strong>Google OAuth 2.0</strong>. Click below to authenticate and grant access via your Google account.
                    </p>
                    <button
                      onClick={handleConnectGoogle}
                      className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary"
                    >
                      Connect with Google OAuth
                    </button>
                  </div>

                /* ─── Custom Email / Gmail App Password form ─── */
                ) : ["custom-email", "gmail-app"].includes(tool.slug) ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider">
                        {tool.slug === "gmail-app" ? "Gmail App Password Setup" : "Custom Email Server Configuration"}
                      </p>
                      <span className="text-[8px] font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">AES-256 ENCRYPTED</span>
                    </div>

                    {/* Protocol selector — only for custom-email */}
                    {tool.slug === "custom-email" && (
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Incoming Protocol *</label>
                        <div className="flex gap-2">
                          {["IMAP", "POP3"].map(proto => (
                            <button
                              key={proto}
                              type="button"
                              onClick={() => {
                                setEmailProtocol(proto);
                                setImapPort(proto === "IMAP" ? "993" : "995");
                              }}
                              className={`flex-1 py-1.5 text-xs font-bold rounded border transition-all cursor-pointer ${
                                emailProtocol === proto
                                  ? "bg-primary text-on-primary border-primary glow-primary"
                                  : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:border-primary"
                              }`}
                            >
                              {proto}
                              <span className="ml-1 font-mono text-[9px] opacity-70">
                                ({proto === "IMAP" ? "port 993" : "port 995"})
                              </span>
                            </button>
                          ))}
                        </div>
                        <p className="text-[9px] text-on-surface-variant mt-1">
                          <strong>IMAP</strong> keeps emails on the server (recommended). <strong>POP3</strong> downloads and optionally removes them.
                        </p>
                      </div>
                    )}

                    {/* Account Label */}
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                      <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                        placeholder="e.g. Support Inbox" />
                    </div>

                    {/* Username & Password */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Email / Username *</label>
                        <input type="email" value={imapUsername} onChange={e => setImapUsername(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="user@example.com" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Password / App Password *</label>
                        <input type="password" value={imapPassword} onChange={e => setImapPassword(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="••••••••••••••••" />
                      </div>
                    </div>

                    {tool.slug !== "gmail-app" && (
                      <>
                        {/* Incoming Server */}
                        <div className="p-3 bg-surface-container border border-outline-variant/40 rounded space-y-3">
                          <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider">📥 Incoming Mail ({emailProtocol})</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">{emailProtocol} Server Host *</label>
                              <input type="text" value={imapHost} onChange={e => setImapHost(e.target.value)} required={tool.slug !== "gmail-app"}
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                                placeholder={emailProtocol === "IMAP" ? "imap.gmail.com" : "pop.gmail.com"} />
                            </div>
                            <div>
                              <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Port</label>
                              <input type="number" value={imapPort} onChange={e => setImapPort(e.target.value)} required={tool.slug !== "gmail-app"}
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                                placeholder={emailProtocol === "IMAP" ? "993" : "995"} />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Encryption</label>
                            <select value={imapEncryption} onChange={e => setImapEncryption(e.target.value)}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none cursor-pointer font-mono">
                              <option>SSL/TLS</option>
                              <option>STARTTLS</option>
                              <option>None</option>
                            </select>
                          </div>
                        </div>

                        {/* SMTP Outgoing Server */}
                        <div className="p-3 bg-surface-container border border-outline-variant/40 rounded space-y-3">
                          <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider">📤 Outgoing Mail (SMTP)</p>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-2">
                              <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">SMTP Server Host *</label>
                              <input type="text" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} required={tool.slug !== "gmail-app"}
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                                placeholder="smtp.gmail.com" />
                            </div>
                            <div>
                              <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Port</label>
                              <input type="number" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} required={tool.slug !== "gmail-app"}
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                                placeholder="465" />
                            </div>
                          </div>
                          <div>
                            <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Encryption</label>
                            <select value={smtpEncryption} onChange={e => setSmtpEncryption(e.target.value)}
                              className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none cursor-pointer font-mono">
                              <option>SSL/TLS</option>
                              <option>STARTTLS</option>
                              <option>None</option>
                            </select>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect Email Account
                      </button>
                    </div>
                  </form>

                /* ─── Slack Bot Token form ─── */
                ) : tool.slug === "slack" ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">Slack Bot Configuration</p>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                      <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                        placeholder="e.g. Company Slack Workspace" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Slack Bot Token *</label>
                      <input type="password" value={accountKey} onChange={e => setAccountKey(e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                        placeholder="xoxb-••••••••••••••" />
                      <p className="text-[9px] text-on-surface-variant mt-1">Get from <strong>api.slack.com/apps</strong> → OAuth &amp; Permissions → Bot User OAuth Token</p>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect Slack Bot
                      </button>
                    </div>
                  </form>

                /* ─── GitHub PAT form ─── */
                ) : tool.slug === "github" ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">GitHub Account Configuration</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                        <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. Company GitHub Org" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">GitHub Username</label>
                        <input type="text" value={accountEmail} onChange={e => setAccountEmail(e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="octocat" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Personal Access Token (PAT) *</label>
                      <input type="password" value={accountKey} onChange={e => setAccountKey(e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                        placeholder="ghp_••••••••••••••••" />
                      <p className="text-[9px] text-on-surface-variant mt-1">Get from <strong>github.com/settings/tokens</strong> → Generate new token (classic or fine-grained)</p>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect GitHub Account
                      </button>
                    </div>
                  </form>

                /* ─── Twilio Credential Form ─── */
                ) : tool.slug === "twilio" ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">Twilio API Settings</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                        <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. Sales Twilio Account" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Twilio Account Name / Email</label>
                        <input type="text" value={accountEmail} onChange={e => setAccountEmail(e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="sales@company.com" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account SID *</label>
                        <input type="password" value={accountKey} onChange={e => setAccountKey(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="AC••••••••••••••••••••••••••••••••" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Auth Token *</label>
                        <input type="password" value={accountKey2} onChange={e => setAccountKey2(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="••••••••••••••••••••••••••••••••" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect Twilio Account
                      </button>
                    </div>
                  </form>

                /* ─── API Key Rotation pool account ─── */
                ) : isRotateTool ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">Create Rotation Pool</p>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Pool Label *</label>
                      <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                        placeholder="e.g. Production Key Pool" />
                    </div>
                    {isScrapeDoRotate ? (
                      <p className="text-[10px] text-on-surface-variant leading-relaxed">
                        Create the pool first, then add multiple Scrape.do API tokens to it below. This tool gets its own dedicated
                        Scrape.do-compatible base URL (<code className="font-mono text-on-surface">/api/scrapedo</code>)
                        — use it in place of <code className="font-mono text-on-surface">https://api.scrape.do/</code> with a TMCP agent key as the
                        <code className="font-mono text-on-surface"> token</code>, and TMCP rotates across the pool with automatic failover.
                      </p>
                    ) : isApifyRotate ? (
                      <p className="text-[10px] text-on-surface-variant leading-relaxed">
                        Create the pool first, then add multiple Apify API tokens to it below. This tool gets its own dedicated
                        Apify-compatible base URL (<code className="font-mono text-on-surface">/api/apify/v2</code>)
                        — use it in place of <code className="font-mono text-on-surface">https://api.apify.com/v2</code> with a TMCP agent key as the bearer
                        token. Any Apify endpoint/actor works unchanged, and TMCP rotates across the pool with automatic failover.
                      </p>
                    ) : (
                      <p className="text-[10px] text-on-surface-variant leading-relaxed">
                        Create the pool first, then add multiple API keys to it below. This tool gets its own dedicated
                        OpenAI-compatible base URL (<code className="font-mono text-on-surface">{tool.slug === "gemini-rotate" ? "/api/gemini/v1" : "/api/openrouter/v1"}</code>)
                        — drop it into any OpenAI-compatible app with a TMCP agent key, and TMCP rotates across the pool with automatic failover.
                      </p>
                    )}
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Create Pool
                      </button>
                    </div>
                  </form>

                /* ─── Meta Social (WhatsApp / Facebook / Instagram) ─── */
                ) : ["whatsapp", "facebook", "instagram"].includes(tool.slug) ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">
                      {tool.slug === "whatsapp" ? "WhatsApp Cloud API Settings" : tool.slug === "facebook" ? "Facebook Page Settings" : "Instagram Graph API Settings"}
                    </p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                        <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. Brand Page" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">
                          {tool.slug === "whatsapp" ? "Phone Number ID *" : tool.slug === "facebook" ? "Page ID *" : "Instagram User ID *"}
                        </label>
                        <input type="text" value={accountId} onChange={e => setAccountId(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder={tool.slug === "whatsapp" ? "1029384756" : tool.slug === "facebook" ? "Page numeric ID" : "IG business account ID"} />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Access Token *</label>
                      <input type="password" value={accountKey} onChange={e => setAccountKey(e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                        placeholder="EAAB••••••••••••••" />
                      <p className="text-[9px] text-on-surface-variant mt-1">Get from <strong>developers.facebook.com</strong> → your App → Graph API access token (long-lived recommended).</p>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect {tool.name}
                      </button>
                    </div>
                  </form>

                /* ─── GoHighLevel Credential Form ─── */
                ) : tool.slug === "ghl" ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">GoHighLevel (GHL) Settings</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                        <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. Sub-Account Lead Gen" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Location / Sub-Account ID *</label>
                        <input type="text" value={accountId} onChange={e => setAccountId(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="Location ID" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">API Key / Access Token *</label>
                      <input type="password" value={accountKey} onChange={e => setAccountKey(e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                        placeholder="API Key" />
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect GHL Sub-Account
                      </button>
                    </div>
                  </form>

                /* ─── Resend Connection Form (API Key + Domain Name) ─── */
                ) : tool.slug === "resend" ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">Resend Connection Settings</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                        <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. My Website Resend" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Verified Domain Name *</label>
                        <input type="text" value={accountEmail} onChange={e => setAccountEmail(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="example.com" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">API Key (re_••••••••) *</label>
                      <input type="password" value={accountKey} onChange={e => setAccountKey(e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                        placeholder="re_••••••••••••••••••••" />
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect Resend Account
                      </button>
                    </div>
                  </form>

                /* ─── SQL Databases Form (PostgreSQL, MySQL, Oracle) ─── */
                ) : ["postgresql", "mysql", "oracle"].includes(tool.slug) ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">{tool.name} Connection Configuration</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                        <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. Production Database" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Host *</label>
                          <input type="text" value={connectionFields.host || ""} onChange={e => setField("host", e.target.value)} required
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                            placeholder="localhost" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Port</label>
                          <input type="number" value={connectionFields.port || ""} onChange={e => setField("port", e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                            placeholder={tool.slug === "postgresql" ? "5432" : tool.slug === "mysql" ? "3306" : "1521"} />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">{tool.slug === "oracle" ? "SID / Service Name *" : "Database Name *"}</label>
                        <input type="text" value={tool.slug === "oracle" ? (connectionFields.sid || "") : (connectionFields.database || "")} 
                          onChange={e => setField(tool.slug === "oracle" ? "sid" : "database", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder={tool.slug === "oracle" ? "ORCL" : "my_db"} />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Username *</label>
                        <input type="text" value={connectionFields.username || ""} onChange={e => setField("username", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="root" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Password *</label>
                        <input type="password" value={connectionFields.password || ""} onChange={e => setField("password", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="••••••••••••••••" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">SSL Mode</label>
                      <select value={connectionFields.ssl || "Disable"} onChange={e => setField("ssl", e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none cursor-pointer font-mono">
                        <option>Disable</option>
                        <option>Require</option>
                        <option>Prefer</option>
                        <option>Allow</option>
                      </select>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect Database
                      </button>
                    </div>
                  </form>

                /* ─── Redis Connection Form ─── */
                ) : tool.slug === "redis" ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">Redis Database Connection</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                        <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. Cache Cluster" />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Host *</label>
                          <input type="text" value={connectionFields.host || ""} onChange={e => setField("host", e.target.value)} required
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                            placeholder="localhost" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Port</label>
                          <input type="number" value={connectionFields.port || ""} onChange={e => setField("port", e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                            placeholder="6379" />
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Password (Optional)</label>
                        <input type="password" value={connectionFields.password || ""} onChange={e => setField("password", e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="••••••••••••••••" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">SSL / TLS Connection</label>
                        <select value={connectionFields.ssl || "false"} onChange={e => setField("ssl", e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none cursor-pointer font-mono">
                          <option value="false">Disable</option>
                          <option value="true">Enable SSL/TLS</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect Redis Key-Store
                      </button>
                    </div>
                  </form>

                /* ─── MongoDB Connection Form ─── */
                ) : tool.slug === "mongodb" ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">MongoDB Connection</p>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                      <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                        placeholder="e.g. MongoDB Atlas Primary" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">MongoDB Connection URI *</label>
                      <input type="text" value={connectionFields.uri || ""} onChange={e => setField("uri", e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                        placeholder="mongodb+srv://username:password@cluster.xxxx.mongodb.net/database" />
                      <p className="text-[9px] text-on-surface-variant mt-1">Make sure user credentials and DB targets are structured inside the Connection URI.</p>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect MongoDB Cluster
                      </button>
                    </div>
                  </form>

                /* ─── Salesforce Integration Form ─── */
                ) : tool.slug === "salesforce" ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">Salesforce API Configuration</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                        <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. Corporate Salesforce" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Environment Mode</label>
                        <select value={connectionFields.environment || "Production"} onChange={e => setField("environment", e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none cursor-pointer">
                          <option>Production</option>
                          <option>Sandbox</option>
                          <option>Developer Edition</option>
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Consumer Key (Client ID) *</label>
                        <input type="text" value={connectionFields.client_id || ""} onChange={e => setField("client_id", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="Client ID from Connected App" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Consumer Secret (Client Secret) *</label>
                        <input type="password" value={connectionFields.client_secret || ""} onChange={e => setField("client_secret", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="Client Secret" />
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Username *</label>
                        <input type="text" value={connectionFields.username || ""} onChange={e => setField("username", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="user@company.salesforce.com" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Password *</label>
                        <input type="password" value={connectionFields.password || ""} onChange={e => setField("password", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="••••••••••••••••" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Security Token *</label>
                        <input type="password" value={connectionFields.security_token || ""} onChange={e => setField("security_token", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="Token (case-sensitive)" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect Salesforce App
                      </button>
                    </div>
                  </form>

                /* ─── Jira Integration Form ─── */
                ) : tool.slug === "jira" ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">Jira Server Integration</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                        <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. Company Jira Cloud" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Jira Instance URL *</label>
                        <input type="text" value={connectionFields.instance_url || ""} onChange={e => setField("instance_url", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="https://company.atlassian.net" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Email Address *</label>
                        <input type="email" value={connectionFields.email || ""} onChange={e => setField("email", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="developer@company.com" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Atlassian API Token *</label>
                        <input type="password" value={connectionFields.api_token || ""} onChange={e => setField("api_token", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="Token from Atlassian profile settings" />
                      </div>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect Jira Project
                      </button>
                    </div>
                  </form>

                /* ─── Shopify Connection Form ─── */
                ) : tool.slug === "shopify" ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">Shopify Store API Settings</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                        <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. Staging Shopify Store" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Shopify Store Domain *</label>
                        <input type="text" value={connectionFields.shop_domain || ""} onChange={e => setField("shop_domain", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="my-shop.myshopify.com" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Admin API Access Token *</label>
                      <input type="password" value={connectionFields.access_token || ""} onChange={e => setField("access_token", e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                        placeholder="shpat_••••••••••••••••••••••••••••••••" />
                      <p className="text-[9px] text-on-surface-variant mt-1">Generate inside Shopify Admin panel → Settings → Apps and sales channels → Develop apps.</p>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect Shopify Store
                      </button>
                    </div>
                  </form>

                /* ─── ActiveCampaign Connection Form ─── */
                ) : tool.slug === "activecampaign" ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider mb-1">ActiveCampaign Connection Settings</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                        <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. Corporate ActiveCampaign" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">API URL Endpoint *</label>
                        <input type="text" value={connectionFields.api_url || ""} onChange={e => setField("api_url", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="https://company.api-us1.com" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">API Key *</label>
                      <input type="password" value={connectionFields.api_key || ""} onChange={e => setField("api_key", e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                        placeholder="Key from Settings → Developer page" />
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect ActiveCampaign
                      </button>
                    </div>
                  </form>

                /* ─── Google BigQuery Form ─── */
                ) : tool.slug === "bigquery" ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider">Google BigQuery Connection</p>
                      <span className="text-[8px] font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">SERVICE ACCOUNT</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                        <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. Analytics BigQuery" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">GCP Project ID *</label>
                        <input type="text" value={connectionFields.project_id || ""} onChange={e => setField("project_id", e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="my-project-123456" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Default Dataset (Optional)</label>
                      <input type="text" value={connectionFields.dataset || ""} onChange={e => setField("dataset", e.target.value)}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                        placeholder="analytics_v2" />
                      <p className="text-[9px] text-on-surface-variant mt-1">If set, queries will default to this dataset unless overridden per call.</p>
                    </div>
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Service Account Key (JSON) *</label>
                      <textarea
                        value={connectionFields.service_account_key || ""}
                        onChange={e => setField("service_account_key", e.target.value)}
                        required
                        rows={5}
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none resize-none font-mono"
                        placeholder={'{\n  "type": "service_account",\n  "project_id": "...",\n  "private_key": "...",\n  ...\n}'}
                      />
                      <p className="text-[9px] text-on-surface-variant mt-1">Paste the full JSON from <strong>GCP Console → IAM → Service Accounts → Keys → Add Key (JSON)</strong>. Stored AES-256 encrypted.</p>
                    </div>
                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect BigQuery Project
                      </button>
                    </div>
                  </form>

                /* ─── SSH Server form ─── */
                ) : tool.slug === "ssh" ? (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-4">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider">SSH Server Configuration</p>
                      <span className="text-[8px] font-mono bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 rounded">AES-256 ENCRYPTED</span>
                    </div>

                    {/* Account Label */}
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                      <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                        placeholder="e.g. Production Web Server" />
                    </div>

                    {/* Host, Port, Username */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="col-span-2">
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Host / IP Address *</label>
                        <input type="text" value={serverHost} onChange={e => setServerHost(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="192.168.1.100 or server.example.com" />
                      </div>
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Port</label>
                        <input type="number" value={serverPort} onChange={e => setServerPort(e.target.value)}
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                          placeholder="22" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Username *</label>
                      <input type="text" value={serverUser} onChange={e => setServerUser(e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                        placeholder="ubuntu, root, deploy…" />
                    </div>

                    {/* Authentication Method */}
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Authentication Method *</label>
                      <div className="flex gap-2">
                        {["Password", "Private Key"].map(method => (
                          <button
                            key={method}
                            type="button"
                            onClick={() => setSshAuthMethod(method)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded border transition-all cursor-pointer ${
                              sshAuthMethod === method
                                ? "bg-primary text-on-primary border-primary glow-primary"
                                : "bg-surface-container-low text-on-surface-variant border-outline-variant hover:border-primary"
                            }`}
                          >
                            {method === "Password" ? "🔑 Password" : "🗝️ Private Key"}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Password auth */}
                    {sshAuthMethod === "Password" && (
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Password *</label>
                        <input type="password" value={serverPassword} onChange={e => setServerPassword(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="••••••••••••••••" />
                      </div>
                    )}

                    {/* Private Key auth */}
                    {sshAuthMethod === "Private Key" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Private Key *</label>
                          <textarea
                            value={sshPrivateKey} onChange={e => setSshPrivateKey(e.target.value)}
                            required rows={5}
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-[10px] text-on-surface focus:border-primary outline-none resize-none font-mono"
                            placeholder={"-----BEGIN OPENSSH PRIVATE KEY-----\n...\n-----END OPENSSH PRIVATE KEY-----"}
                          />
                          <p className="text-[9px] text-on-surface-variant mt-1">Paste the contents of your <strong>~/.ssh/id_rsa</strong> or <strong>id_ed25519</strong> file. Stored AES-256 encrypted.</p>
                        </div>
                        <div>
                          <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Private Key Passphrase <span className="font-normal normal-case">(optional)</span></label>
                          <input type="password" value={sshPassphrase} onChange={e => setSshPassphrase(e.target.value)}
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                            placeholder="Leave blank if key has no passphrase" />
                        </div>
                      </div>
                    )}

                    {/* Advanced Settings Accordion */}
                    <div className="border border-outline-variant/40 rounded overflow-hidden">
                      <button
                        type="button"
                        onClick={() => setSshShowAdvanced(!sshShowAdvanced)}
                        className="w-full flex items-center justify-between px-3 py-2 bg-surface-container text-[9px] font-bold text-on-surface-variant uppercase font-mono tracking-wider hover:bg-surface-container-high transition-colors cursor-pointer"
                      >
                        <span>⚙️ Advanced Settings</span>
                        {sshShowAdvanced ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                      </button>
                      {sshShowAdvanced && (
                        <div className="p-3 space-y-3 bg-surface-container-lowest">

                          {/* Working Dir + Timeouts */}
                          <div className="grid grid-cols-3 gap-3">
                            <div className="col-span-3">
                              <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Default Working Directory</label>
                              <input type="text" value={sshWorkDir} onChange={e => setSshWorkDir(e.target.value)}
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                                placeholder="/home/ubuntu" />
                            </div>
                            <div>
                              <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Connection Timeout (s)</label>
                              <input type="number" value={sshConnTimeout} onChange={e => setSshConnTimeout(e.target.value)}
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                                placeholder="30" />
                            </div>
                            <div>
                              <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Command Timeout (s)</label>
                              <input type="number" value={sshCmdTimeout} onChange={e => setSshCmdTimeout(e.target.value)}
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                                placeholder="60" />
                            </div>
                          </div>

                          {/* Sudo */}
                          <div className="flex items-center gap-3">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface select-none">
                              <input type="checkbox" checked={sshUseSudo} onChange={e => setSshUseSudo(e.target.checked)}
                                className="accent-primary w-3.5 h-3.5 cursor-pointer" />
                              Use Sudo
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-on-surface select-none">
                              <input type="checkbox" checked={sshRequireApproval} onChange={e => setSshRequireApproval(e.target.checked)}
                                className="accent-primary w-3.5 h-3.5 cursor-pointer" />
                              Require Approval Before Execution
                            </label>
                          </div>

                          {sshUseSudo && (
                            <div>
                              <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Sudo Password <span className="font-normal normal-case">(optional)</span></label>
                              <input type="password" value={sshSudoPassword} onChange={e => setSshSudoPassword(e.target.value)}
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                                placeholder="Leave blank if sudo is passwordless" />
                            </div>
                          )}

                          {/* Allowed / Blocked Commands */}
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Allowed Commands <span className="font-normal normal-case">(comma-separated)</span></label>
                              <input type="text" value={sshAllowedCmds} onChange={e => setSshAllowedCmds(e.target.value)}
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                                placeholder="ls, cat, systemctl status" />
                            </div>
                            <div>
                              <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Blocked Commands <span className="font-normal normal-case">(comma-separated)</span></label>
                              <input type="text" value={sshBlockedCmds} onChange={e => setSshBlockedCmds(e.target.value)}
                                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                                placeholder="rm -rf, shutdown, reboot" />
                            </div>
                          </div>

                        </div>
                      )}
                    </div>

                    <div className="flex justify-end">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Connect SSH Server
                      </button>
                    </div>
                  </form>

                /* ─── Generic API Key form (Hunter, Consulti, Mailchimp, Asana, custom built-ins) ─── */
                ) : (
                  <form onSubmit={handleAddAccount} className="p-4 border border-dashed border-outline-variant/50 rounded bg-surface-container-lowest space-y-3">
                    {["asana", "serper", "scrapedo", "openrouter", "anthropic", "openai", "apify", "stitch", "notion", "airtable", "hubspot", "stripe", "linear"].includes(tool.slug) ? (
                      <div>
                        <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                        <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                          className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                          placeholder="e.g. Main Account" />
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Account Label *</label>
                          <input type="text" value={accountLabel} onChange={e => setAccountLabel(e.target.value)} required
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                            placeholder="e.g. Main Account" />
                        </div>
                        <div>
                          <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">
                            {tool.slug === "mailchimp" ? "Data Center (e.g. us19) *" : "Account Email / ID"}
                          </label>
                          <input type="text" value={accountEmail} onChange={e => setAccountEmail(e.target.value)} required={tool.slug === "mailchimp"}
                            className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none"
                            placeholder={tool.slug === "mailchimp" ? "us19" : "support@company.com"} />
                        </div>
                      </div>
                    )}
                    <div>
                      <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">
                        {tool.slug === "asana" ? "Personal Access Token (PAT) *" 
                         : tool.slug === "mailchimp" ? "API Key *" 
                         : tool.slug === "serper" ? "API Key *" 
                         : tool.slug === "scrapedo" ? "API Token *"
                         : "API Key / Access Token (AES-256 Encrypted) *"}
                      </label>
                      <input type="password" value={accountKey} onChange={e => setAccountKey(e.target.value)} required
                        className="w-full bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none font-mono"
                        placeholder="••••••••••••••••" />
                    </div>
                    <div className="flex justify-end gap-2">
                      <button type="submit"
                        className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary">
                        Authenticate Account
                      </button>
                    </div>
                  </form>
                )
              )}

              {/* Accounts Table */}
              <div className="space-y-2">
                {connectedAccounts.map((account) => (
                  <div key={account.id}>
                  <div className="flex items-center justify-between p-3.5 bg-surface-container-low border border-outline-variant/65 rounded">
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
                        <div className="flex items-center gap-1.5">
                          {confirmingId === account.id ? (
                            <>
                              <span className="text-[9px] text-error font-mono">Confirm remove?</span>
                              <button
                                onClick={() => handleDisconnect(account.id)}
                                disabled={disconnectingId === account.id}
                                className="px-2 py-1 bg-error text-on-error font-bold text-[9px] rounded cursor-pointer hover:brightness-110 active:scale-95 transition-all"
                              >
                                {disconnectingId === account.id ? "Removing…" : "Yes, Remove"}
                              </button>
                              <button
                                onClick={() => setConfirmingId(null)}
                                className="px-2 py-1 bg-surface-container-high text-on-surface font-bold text-[9px] rounded cursor-pointer hover:bg-surface-container-highest transition-colors"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => handleDisconnect(account.id)}
                              className="flex items-center gap-1 px-2.5 py-1 text-error border border-error/30 bg-error/5 hover:bg-error/15 font-semibold text-[9px] rounded cursor-pointer transition-all active:scale-95"
                              title="Disconnect Account"
                            >
                              <Unplug className="w-3 h-3" />
                              Disconnect
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {isRotateTool && (
                    <KeyPoolManager toolAccountId={account.id} providerLabel={tool.provider} toolSlug={tool.slug} />
                  )}
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

            {/* Developer Documentation */}
            <div className="bg-surface-container border border-outline-variant p-6 rounded space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-primary" />
                    API Documentation
                  </h3>
                  <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">
                    {isRotateTool ? "OpenAI-compatible usage" : "cURL, JavaScript, and Python examples"}
                  </p>
                </div>
                {!isRotateTool && exampleAccountId && (
                  <span className="px-2 py-0.5 rounded font-mono text-[8px] bg-green-500/10 text-green-400 border border-green-500/20 uppercase font-bold">
                    Account Selected
                  </span>
                )}
              </div>

              {isRotateTool ? (
                <div className="space-y-3">
                  <div className="rounded border border-primary/20 bg-primary/5 p-3 space-y-1">
                    <p className="text-[9px] font-bold uppercase font-mono tracking-wider text-on-surface-variant">Base URL</p>
                    <code className="block truncate text-[12px] font-bold text-primary font-mono">{baseUrl}{rotateBasePath}</code>
                    {isScrapeDoRotate ? (
                      <p className="text-[10px] text-on-surface-variant leading-relaxed">
                        Use this in place of <code className="font-mono text-on-surface">https://api.scrape.do/</code> — send the same
                        Scrape.do parameters, but pass a TMCP agent API key (<code className="font-mono text-on-surface">mcp_live_…</code>)
                        as the <code className="font-mono text-on-surface">token</code> query parameter. Required params:
                        <code className="font-mono text-on-surface"> token</code>, <code className="font-mono text-on-surface">url</code>.
                      </p>
                    ) : isApifyRotate ? (
                      <p className="text-[10px] text-on-surface-variant leading-relaxed">
                        Use this in place of <code className="font-mono text-on-surface">https://api.apify.com/v2</code> — keep the same
                        endpoint path, method, query, and body, but use a TMCP agent API key (<code className="font-mono text-on-surface">mcp_live_…</code>)
                        as the bearer token (or <code className="font-mono text-on-surface">token</code> query param). Any Apify endpoint/actor works unchanged.
                      </p>
                    ) : (
                      <p className="text-[10px] text-on-surface-variant leading-relaxed">
                        Set this as the base URL in any OpenAI-compatible app and use a TMCP agent API key
                        (<code className="font-mono text-on-surface">mcp_live_…</code>) as the bearer token. Endpoints:
                        <code className="font-mono text-on-surface"> /chat/completions</code>,
                        <code className="font-mono text-on-surface"> /responses</code>,
                        <code className="font-mono text-on-surface"> /embeddings</code>.
                      </p>
                    )}
                  </div>
                  <GatewayCodeTabs compact snippets={isScrapeDoRotate
                    ? buildScrapeDoRotateSnippets({ baseUrl, basePath: rotateBasePath })
                    : isApifyRotate
                    ? buildApifyRotateSnippets({ baseUrl, basePath: rotateBasePath })
                    : buildRotateSnippets({ baseUrl, basePath: rotateBasePath, model: rotateModel })} />
                  <p className="text-[10px] text-on-surface-variant leading-relaxed">
                    {isScrapeDoRotate
                      ? "Add your Scrape.do tokens to the pool above. TMCP rotates them automatically and fails over on rate-limit/credit errors."
                      : isApifyRotate
                      ? "Add your Apify tokens to the pool above. TMCP rotates them automatically and fails over on auth/quota/rate-limit errors."
                      : "Add your provider keys to the pool above. TMCP rotates them automatically and fails over on rate-limit/quota errors."}
                  </p>
                </div>
              ) : (
                <>
                  {!exampleAccountId && (
                    <div className="p-3 bg-tertiary/10 border border-tertiary/20 rounded text-[11px] text-on-surface-variant leading-relaxed">
                      Connect an account to include a concrete <code className="text-primary font-mono">account_id</code> in these examples.
                    </div>
                  )}

                  <div className="space-y-4">
                    {toolFeatures.map((feat) => (
                      <div key={`docs-${feat.id}`} className="space-y-2">
                        <div>
                          <code className="text-[11px] font-bold text-primary font-mono">{feat.feature_key}</code>
                          <p className="text-[11px] text-on-surface-variant mt-1">{feat.description}</p>
                        </div>
                        <GatewayCodeTabs
                          baseUrl={baseUrl}
                          toolSlug={tool.slug}
                          featureKey={feat.feature_key}
                          accountId={exampleAccountId}
                          compact
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}
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

      {showConfirmDelete && (
        <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-surface-container border border-error/25 rounded-lg max-w-md w-full p-6 space-y-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-linear-to-r from-error to-error/50" />
            
            <div className="flex items-center gap-3 text-error">
              <div className="w-10 h-10 rounded-full bg-error/10 flex items-center justify-center border border-error/25">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-on-surface">Delete Custom Tool</h3>
                <p className="text-xs text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">Dangerous Action</p>
              </div>
            </div>

            <div className="space-y-2 text-xs leading-relaxed text-on-surface-variant">
              <p>
                Are you absolutely sure you want to permanently delete the custom tool <strong>{tool.name}</strong>?
              </p>
              <p className="bg-surface-container-high p-3 rounded border border-outline-variant/30 font-mono text-[11px] text-error flex items-start gap-2">
                <span className="font-bold">⚠️ Warning:</span> This will permanently delete this tool registry, all its features, and disconnect all associated accounts. This action is irreversible.
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-error/15 border border-error/20 rounded text-xs text-error font-mono">
                {deleteError}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmDelete(false);
                  setDeleteError("");
                }}
                disabled={isDeleting}
                className="px-4 py-2 bg-surface-container-high border border-outline-variant text-on-surface-variant font-semibold text-xs rounded hover:bg-surface-container-highest transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteTool}
                disabled={isDeleting}
                className="px-4 py-2 bg-error text-on-error font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-60 flex items-center gap-1.5 shadow-md shadow-error/20"
              >
                {isDeleting ? (
                  <span className="animate-pulse">Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    Delete Permanently
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
