"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { ArrowLeft, Wifi } from "lucide-react";

export default function AddToolPage() {
  const router = useRouter();
  const { addTool, user } = useMockStore();

  const [toolType, setToolType] = useState("custom_mcp"); // custom_mcp, custom_rest
  const [name, setName] = useState("");
  const [provider, setProvider] = useState("");
  const [description, setDescription] = useState("");
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [iconUrl, setIconUrl] = useState("");
  
  // Custom MCP specific
  const [mcpServerUrl, setMcpServerUrl] = useState("");
  const [mcpTransport, setMcpTransport] = useState("http");
  const [mcpAuthType, setMcpAuthType] = useState("none");
  const [mcpAuthToken, setMcpAuthToken] = useState("");
  const [mcpFeaturesJson, setMcpFeaturesJson] = useState(`[
  {
    "name": "crm.search_contacts",
    "description": "Retrieve contact lists from database by email"
  },
  {
    "name": "crm.create_contact",
    "description": "Insert contact record into lead list"
  }
]`);

  // Custom REST specific
  const [restUrl, setRestUrl] = useState("");
  const [restMethod, setRestMethod] = useState("POST");
  const [restAuthType, setRestAuthType] = useState("none");
  // header_name: used when auth type is "api_key" — the header where the credential is injected (e.g. X-API-KEY)
  const [restAuthHeaderName, setRestAuthHeaderName] = useState("X-API-KEY");
  const [restHeadersJson, setRestHeadersJson] = useState(`{
  "Content-Type": "application/json"
}`);
  const [restInputSchema, setRestInputSchema] = useState(`{
  "type": "object",
  "properties": {
    "query": { "type": "string" }
  },
  "required": ["query"]
}`);

  // Test states
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null, success, error

  const handleTestConnection = () => {
    setTesting(true);
    setTestResult(null);
    setTimeout(() => {
      setTesting(false);
      if ((toolType === "custom_mcp" && mcpServerUrl) || (toolType === "custom_rest" && restUrl)) {
        setTestResult({
          success: true,
          message: toolType === "custom_mcp" 
            ? "Successfully pinged MCP Gateway. Identified 2 features." 
            : "Successfully pinged API. Received 200 OK."
        });
      } else {
        setTestResult({
          success: false,
          message: "Connection failed. Please provide a valid endpoint."
        });
      }
    }, 1500);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!name || !provider) return;

    let toolData = {
      name,
      slug: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      provider,
      description,
      category: "Custom",
      tool_type: toolType,
      official_website_url: websiteUrl,
      icon_url: iconUrl,
      icon_source: iconUrl ? "manual" : "generated"
    };

    if (toolType === "custom_mcp") {
      let parsedFeatures = [];
      try {
        parsedFeatures = JSON.parse(mcpFeaturesJson);
      } catch (err) {
        alert("Invalid features JSON format");
        return;
      }

      toolData.mcp_server_url = mcpServerUrl;
      toolData.mcp_config = {
        server_url: mcpServerUrl,
        transport: mcpTransport,
        auth: {
          type: mcpAuthType,
          token: mcpAuthToken
        },
        features: parsedFeatures
      };
    } else {
      let parsedHeaders = {};
      let parsedSchema = {};
      try {
        parsedHeaders = JSON.parse(restHeadersJson);
        parsedSchema = JSON.parse(restInputSchema);
      } catch (err) {
        alert("Invalid Headers or Input Schema JSON format");
        return;
      }

      toolData.rest_base_url = restUrl;
      toolData.rest_config = {
        url: restUrl,
        method: restMethod,
        auth: {
          type: restAuthType,
          // header_name is the HTTP header where the credential API key will be injected at runtime
          // e.g. "X-API-KEY" for Serper, "Authorization" for Bearer, or "token" for URL query param
          header_name: restAuthType === "api_key" ? restAuthHeaderName
                     : restAuthType === "bearer"  ? "Authorization"
                     : restAuthType === "url_param" ? restAuthHeaderName
                     : null
        },
        headers: parsedHeaders,
        input_schema: parsedSchema
      };
    }

    const res = addTool(toolData);
    if (res.error) {
      alert(res.error);
    } else {
      router.push("/dashboard/tools");
    }
  };

  return (
    <>
      <DashboardHeader title="Register New Tool" />

      <main className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto max-w-4xl">
        <div className="flex items-center gap-2">
          <button 
            onClick={() => router.push("/dashboard/tools")}
            className="p-1.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-on-surface cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-on-surface">Add Tool Source</h1>
            <p className="text-xs text-on-surface-variant mt-0.5">Define your REST API parameters or connect your MCP server.</p>
          </div>
        </div>

        {/* Tab Selection */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-surface-container-low border border-outline-variant rounded">
          <button
            onClick={() => setToolType("custom_mcp")}
            className={`py-2 text-xs font-semibold uppercase font-mono rounded cursor-pointer transition-all ${
              toolType === "custom_mcp"
                ? "bg-primary text-on-primary font-bold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Custom MCP Server
          </button>
          <button
            onClick={() => setToolType("custom_rest")}
            className={`py-2 text-xs font-semibold uppercase font-mono rounded cursor-pointer transition-all ${
              toolType === "custom_rest"
                ? "bg-primary text-on-primary font-bold"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            Custom REST API
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-6 bg-surface-container p-6 rounded border border-outline-variant">
          {/* General Metadata */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-on-surface pb-2 border-b border-outline-variant/30">General Info</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Tool Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  placeholder="Custom Contacts CRM"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Provider Name</label>
                <input
                  type="text"
                  required
                  value={provider}
                  onChange={(e) => setProvider(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  placeholder="Acme Inc"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none h-16 resize-none"
                placeholder="Synchronizes internal leads database and extracts company pipelines."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Website URL</label>
                <input
                  type="url"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  placeholder="https://acme.com"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Manual Icon URL (Optional)</label>
                <input
                  type="url"
                  value={iconUrl}
                  onChange={(e) => setIconUrl(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                  placeholder="https://acme.com/logo.png"
                />
              </div>
            </div>
          </div>

          {/* Custom MCP Specific Form */}
          {toolType === "custom_mcp" && (
            <div className="space-y-4 pt-4 border-t border-outline-variant/30">
              <h3 className="text-sm font-bold text-on-surface pb-2 border-b border-outline-variant/30 font-mono">MCP Configuration</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">MCP Server URL</label>
                  <input
                    type="url"
                    required
                    value={mcpServerUrl}
                    onChange={(e) => setMcpServerUrl(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    placeholder="https://mcp.acme.com/v1/api"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Transport Type</label>
                  <select
                    value={mcpTransport}
                    onChange={(e) => setMcpTransport(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none cursor-pointer"
                  >
                    <option value="http">HTTP POST (JSON-RPC)</option>
                    <option value="sse">SSE (Server-Sent Events)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Authorization</label>
                  <select
                    value={mcpAuthType}
                    onChange={(e) => setMcpAuthType(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary"
                  >
                    <option value="none">No Auth (Public)</option>
                    <option value="bearer">Bearer Token</option>
                    <option value="api_key">X-API-Key Header</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">API Key / Token</label>
                  <input
                    type="password"
                    disabled={mcpAuthType === "none"}
                    value={mcpAuthToken}
                    onChange={(e) => setMcpAuthToken(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none disabled:opacity-50"
                    placeholder={mcpAuthType === "none" ? "Not required" : "••••••••••••"}
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">
                  Exposed Features Schemas (JSON List)
                </label>
                <textarea
                  value={mcpFeaturesJson}
                  onChange={(e) => setMcpFeaturesJson(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none h-32 resize-y"
                />
              </div>
            </div>
          )}

          {/* Custom REST Specific Form */}
          {toolType === "custom_rest" && (
            <div className="space-y-4 pt-4 border-t border-outline-variant/30">
              <h3 className="text-sm font-bold text-on-surface pb-2 border-b border-outline-variant/30 font-mono">REST API Parameters</h3>
              
              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-3">
                  <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Endpoint URL</label>
                  <input
                    type="url"
                    required
                    value={restUrl}
                    onChange={(e) => setRestUrl(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    placeholder="https://api.acme.com/leads/search"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">HTTP Method</label>
                  <select
                    value={restMethod}
                    onChange={(e) => setRestMethod(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none cursor-pointer"
                  >
                    <option value="POST">POST</option>
                    <option value="GET">GET</option>
                    <option value="PUT">PUT</option>
                  </select>
                </div>
              </div>

              {/* Auth config — defines HOW credentials are injected, NOT what they are */}
              <div className="p-4 bg-surface-container-lowest border border-outline-variant/50 rounded space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-semibold text-on-surface-variant uppercase font-mono">Authentication Method</p>
                  <span className="text-[9px] text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded border border-primary/20">Credential injected from Connected Account</span>
                </div>
                <p className="text-[10px] text-on-surface-variant leading-relaxed">
                  The real API key is stored encrypted in the <strong>Connected Account</strong>. This setting only defines <em>where</em> the gateway injects it at runtime.
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Auth Type</label>
                    <select
                      value={restAuthType}
                      onChange={(e) => setRestAuthType(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary cursor-pointer outline-none"
                    >
                      <option value="none">No Auth (Public)</option>
                      <option value="bearer">Bearer Token → Authorization header</option>
                      <option value="api_key">API Key → Custom header (e.g. X-API-KEY)</option>
                      <option value="url_param">API Key → URL query param (e.g. ?token=)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">
                      {restAuthType === "url_param" ? "URL Param Name" : "Header Name"}
                    </label>
                    <input
                      type="text"
                      disabled={restAuthType === "none" || restAuthType === "bearer"}
                      value={restAuthType === "bearer" ? "Authorization" : restAuthHeaderName}
                      onChange={(e) => setRestAuthHeaderName(e.target.value)}
                      className="w-full bg-surface-container-low border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none disabled:opacity-40 font-mono"
                      placeholder={restAuthType === "url_param" ? "token" : "X-API-KEY"}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Headers (JSON)</label>
                  <textarea
                    value={restHeadersJson}
                    onChange={(e) => setRestHeadersJson(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none h-32 resize-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Input Schema (JSON Schema)</label>
                  <textarea
                    value={restInputSchema}
                    onChange={(e) => setRestInputSchema(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs font-mono text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none h-32 resize-none"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Test connection results */}
          {testResult && (
            <div className={`p-4 rounded border text-xs font-mono ${
              testResult.success 
                ? "bg-green-500/10 text-green-400 border-green-500/20" 
                : "bg-error-container text-error border-error/20"
            }`}>
              {testResult.message}
            </div>
          )}

          {/* Actions panel */}
          <div className="pt-6 border-t border-outline-variant/30 flex justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="px-4 py-2 border border-outline bg-surface-container-low hover:bg-surface-container-highest transition-colors rounded text-xs text-on-surface font-semibold flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {testing ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-primary border-t-transparent animate-spin rounded-full"></span>
                  Pinging Server...
                </>
              ) : (
                <>
                  <Wifi className="w-3 h-3" />
                  Test Endpoint
                </>
              )}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard/tools")}
                className="px-4 py-2 border border-outline-variant hover:bg-surface-container-low transition-colors rounded text-xs text-on-surface-variant font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary"
              >
                Save Integration
              </button>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}
