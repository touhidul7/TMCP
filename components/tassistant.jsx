"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bot, X, Send, CornerDownLeft, Sparkles, MessageSquare, AlertCircle, Key, Trash2 } from "lucide-react";
import { useMockStore } from "@/lib/mock-store";
import { GATEWAY_ENDPOINTS, getExampleInput, getGatewaySchemas } from "@/lib/docs/gateway-docs";

export default function Tassistant() {
  const router = useRouter();
  const pathname = usePathname();
  const {
    useLiveDb,
    user,
    workspaces,
    currentWorkspace,
    users,
    tools,
    features,
    toolAccounts,
    agents,
    apiKeys,
    permissions,
    logs,
    approvals,
    getWorkspaceStats
  } = useMockStore();
  const [isOpen, setIsOpen] = useState(false);
  const [openrouterKey, setOpenrouterKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("tmcp_openrouter_key") || "";
  });
  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: "Hello! I am **Tassistant**, your AI guide to the TMCP Gateway. Ask me anything about workspaces, tool accounts, agent API keys, custom REST configurations, or how to troubleshoot gateway errors!"
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const messagesEndRef = useRef(null);
  const assistantContext = useMemo(() => {
    return buildAssistantContext({
      pathname,
      useLiveDb,
      user,
      workspaces,
      currentWorkspace,
      users,
      tools,
      features,
      toolAccounts,
      agents,
      apiKeys,
      permissions,
      logs,
      approvals,
      getWorkspaceStats
    });
  }, [
    pathname,
    useLiveDb,
    user,
    workspaces,
    currentWorkspace,
    users,
    tools,
    features,
    toolAccounts,
    agents,
    apiKeys,
    permissions,
    logs,
    approvals,
    getWorkspaceStats
  ]);

  useEffect(() => {
    const handleKeyChanged = () => {
      setOpenrouterKey(localStorage.getItem("tmcp_openrouter_key") || "");
    };

    window.addEventListener("tmcp_openrouter_key_changed", handleKeyChanged);
    return () => {
      window.removeEventListener("tmcp_openrouter_key_changed", handleKeyChanged);
    };
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading]);

  const handleSend = async (textToSend) => {
    const text = textToSend || input;
    if (!text.trim() || isLoading) return;

    if (!openrouterKey) {
      setError("Please configure your OpenRouter API Key in the Settings page.");
      return;
    }

    const newMessages = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    if (!textToSend) setInput("");
    setIsLoading(true);
    setError("");

    try {
      // We only send the message history to the backend endpoint, keeping the backend stateless
      const res = await fetch("/api/assistant/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openrouterKey,
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          context: assistantContext
        })
      });

      const data = await res.json();
      if (data.success && data.reply) {
        setMessages(prev => [...prev, { role: "assistant", content: data.reply.content }]);
      } else {
        setError(data.error || "Failed to receive response from assistant");
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm("Clear chat history?")) {
      setMessages([
        {
          role: "assistant",
          content: "Hello! I am **Tassistant**, your AI guide to the TMCP Gateway. Ask me anything about workspaces, tool accounts, agent API keys, custom REST configurations, or how to troubleshoot gateway errors!"
        }
      ]);
      setError("");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const suggestionChips = [
    "How does the approvals queue work?",
    "How to fix a 401 error?",
    "How to connect IMAP Email?",
    "How to add an agent permission?",
    "What built-in tools are available?",
    "How to connect GitHub?"
  ];

  // A basic custom Markdown parser to render bold, code blocks, inline code, and lists nicely in JSX
  const parseMarkdown = (text) => {
    if (!text) return "";
    
    // Split text by code blocks: ```code```
    const parts = text.split(/(```[\s\S]*?```)/g);
    
    return parts.map((part, index) => {
      // If it's a code block
      if (part.startsWith("```") && part.endsWith("```")) {
        const codeContent = part.slice(3, -3);
        const lines = codeContent.split("\n");
        // Remove optional language identifier from first line (e.g. ```json)
        const firstLine = lines[0].trim();
        const codeLines = ["json", "javascript", "python", "bash", "sh", "curl", "http"].includes(firstLine.toLowerCase())
          ? lines.slice(1)
          : lines;
        
        return (
          <div key={index} className="my-3 rounded overflow-hidden border border-outline-variant bg-surface-container-lowest font-mono text-[11px] leading-relaxed">
            {firstLine && (
              <div className="bg-surface-container border-b border-outline-variant px-3 py-1 text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
                {firstLine}
              </div>
            )}
            <pre className="p-3 overflow-x-auto text-primary whitespace-pre">
              <code>{codeLines.join("\n").trim()}</code>
            </pre>
          </div>
        );
      }
      
      // For standard text, parse inline code `code`, bold **bold**, bullet lines, and paragraphs
      const lines = part.split("\n");
      return (
        <div key={index} className="space-y-1.5">
          {lines.map((line, lIndex) => {
            let processedLine = line;
            
            // Check for list bullet
            const isBullet = line.trim().startsWith("- ") || line.trim().startsWith("* ");
            if (isBullet) {
              processedLine = line.trim().substring(2);
            }
            
            // Render inline formats: bold **text** and inline `code`
            const inlineParts = processedLine.split(/(\*\*.*?\*\*|`.*?`)/g);
            const renderedLine = inlineParts.map((subPart, sIndex) => {
              if (subPart.startsWith("**") && subPart.endsWith("**")) {
                return <strong key={sIndex} className="font-bold text-on-surface">{subPart.slice(2, -2)}</strong>;
              }
              if (subPart.startsWith("`") && subPart.endsWith("`")) {
                return (
                  <code key={sIndex} className="bg-surface-container border border-outline-variant px-1 py-0.5 rounded text-[10px] font-mono text-tertiary">
                    {subPart.slice(1, -1)}
                  </code>
                );
              }
              return subPart;
            });

            if (isBullet) {
              return (
                <ul key={lIndex} className="list-disc pl-4 text-xs text-on-surface-variant">
                  <li>{renderedLine}</li>
                </ul>
              );
            }
            
            if (line.trim() === "") {
              return <div key={lIndex} className="h-1" />;
            }
            
            return <p key={lIndex} className="text-xs text-on-surface-variant leading-relaxed">{renderedLine}</p>;
          })}
        </div>
      );
    });
  };

  return (
    <>
      {/* Floating Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-xl cursor-pointer ${
          isOpen 
            ? "bg-error text-on-error hover:scale-105" 
            : "bg-primary text-on-primary hover:scale-110 glow-primary animate-pulse"
        }`}
        title="Tassistant AI Guide"
      >
        {isOpen ? <X className="w-5 h-5" /> : <Bot className="w-6 h-6" />}
      </button>

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-20 left-4 right-4 z-50 h-[calc(100vh-100px)] max-h-[520px] rounded-xl border border-outline-variant bg-surface-container/90 backdrop-blur-md shadow-2xl flex flex-col overflow-hidden animate-slide-up transition-all sm:left-auto sm:right-6 sm:w-[380px] sm:h-[520px] sm:max-h-[calc(100vh-100px)]">
          
          {/* Header */}
          <div className="px-4 py-3 bg-surface-container-high border-b border-outline-variant flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Bot className="w-4 h-4 text-primary animate-bounce" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
                  Tassistant Guide
                  <span className="w-2 h-2 rounded-full bg-green-400 animate-ping"></span>
                </h3>
                <p className="text-[9px] text-on-surface-variant uppercase font-mono tracking-wider">TMCP Assistant</p>
              </div>
            </div>
            
            <div className="flex items-center gap-1.5">
              <button
                onClick={clearChat}
                className="p-1.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-error transition-colors cursor-pointer"
                title="Clear Chat"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 hover:bg-surface-container rounded text-on-surface-variant hover:text-on-surface transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Message Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-background/40">
            {messages.map((m, idx) => (
              <div 
                key={idx} 
                className={`flex gap-2.5 max-w-[85%] ${
                  m.role === "user" ? "ml-auto flex-row-reverse" : ""
                }`}
              >
                {m.role === "assistant" && (
                  <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Sparkles className="w-3 h-3 text-primary" />
                  </div>
                )}
                
                <div className={`p-3 rounded-lg text-xs space-y-1 ${
                  m.role === "user" 
                    ? "bg-primary text-on-primary rounded-tr-none font-medium shadow"
                    : "bg-surface-container border border-outline-variant/30 rounded-tl-none"
                }`}>
                  {m.role === "user" ? (
                    <p className="leading-relaxed whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    parseMarkdown(m.content)
                  )}
                </div>
              </div>
            ))}
            
            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex gap-2.5 max-w-[85%]">
                <div className="w-6 h-6 rounded bg-primary/10 border border-primary/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Sparkles className="w-3 h-3 text-primary animate-spin" />
                </div>
                <div className="p-3 bg-surface-container border border-outline-variant/30 rounded-lg rounded-tl-none flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.3s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:-0.15s]"></div>
                  <div className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce"></div>
                </div>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-error-container text-on-error-container border border-error/20 rounded-lg text-[11px] flex gap-2 items-start">
                <AlertCircle className="w-4 h-4 text-error flex-shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold">Chat Error</p>
                  <p className="opacity-90 leading-relaxed">{error}</p>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Action Suggestion Chips (Shown only when chat is idle and key exists) */}
          {openrouterKey && messages.length === 1 && !isLoading && (
            <div className="px-4 py-2.5 border-t border-outline-variant/30 bg-surface-container-lowest/50 space-y-1.5">
              <p className="text-[9px] font-semibold text-on-surface-variant uppercase font-mono tracking-wider">Quick Suggestions</p>
              <div className="flex flex-wrap gap-1.5">
                {suggestionChips.map((chip, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSend(chip)}
                    className="px-2 py-1 bg-surface-container hover:bg-surface-container-high border border-outline-variant/40 rounded-full text-[10px] text-on-surface-variant hover:text-primary transition-all text-left cursor-pointer"
                  >
                    {chip}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Key Not Set Warning Panel */}
          {!openrouterKey && (
            <div className="p-4 border-t border-outline-variant bg-surface-container-high/60 flex flex-col items-center text-center gap-3">
              <div className="w-8 h-8 rounded-full bg-warning/15 flex items-center justify-center text-warning">
                <Key className="w-4 h-4" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-bold text-on-surface">OpenRouter Key Required</p>
                <p className="text-[10px] text-on-surface-variant leading-relaxed max-w-[280px]">
                  Tassistant requires an OpenRouter API key to converse. Please enter your key on the settings page.
                </p>
              </div>
              <button
                onClick={() => {
                  setIsOpen(false);
                  router.push("/dashboard/settings");
                }}
                className="w-full py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 transition-all cursor-pointer shadow-md"
              >
                Go to Settings
              </button>
            </div>
          )}

          {/* Input Panel */}
          {openrouterKey && (
            <div className="p-3 bg-surface-container-high border-t border-outline-variant flex items-end gap-2 relative">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Ask Tassistant... (Press Enter)"
                disabled={isLoading}
                className="flex-1 bg-surface-container-lowest border border-outline-variant/70 rounded-lg px-3 py-2 text-xs text-on-surface placeholder-on-surface-variant/50 focus:border-primary outline-none max-h-24 resize-none min-h-[36px]"
              />
              <button
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="h-[36px] w-[36px] bg-primary text-on-primary rounded-lg flex items-center justify-center hover:brightness-110 active:scale-95 transition-all disabled:opacity-40 cursor-pointer shadow"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function buildAssistantContext({
  pathname,
  useLiveDb,
  user,
  workspaces,
  currentWorkspace,
  users,
  tools,
  features,
  toolAccounts,
  agents,
  apiKeys,
  permissions,
  logs,
  approvals,
  getWorkspaceStats
}) {
  const toolById = new Map(tools.map((tool) => [tool.id, tool]));
  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const accountById = new Map(toolAccounts.map((account) => [account.id, account]));
  const workspace = workspaces.find((item) => item.id === currentWorkspace);
  const stats = typeof getWorkspaceStats === "function" ? getWorkspaceStats() : {};

  const toolFeatureMap = features.reduce((acc, feature) => {
    if (!acc[feature.tool_id]) acc[feature.tool_id] = [];
    acc[feature.tool_id].push({
      key: feature.feature_key,
      name: feature.name,
      description: feature.description,
      dangerous: Boolean(feature.is_dangerous),
      default_requires_approval: Boolean(feature.requires_approval),
      example_input: getExampleInput(feature.feature_key)
    });
    return acc;
  }, {});

  const connectedAccounts = toolAccounts.map((account) => {
    const tool = toolById.get(account.tool_id);
    return {
      id: account.id,
      label: account.label,
      status: account.status,
      auth_type: account.auth_type,
      account_email: account.account_email || null,
      tool: tool ? {
        id: tool.id,
        name: tool.name,
        slug: tool.slug,
        provider: tool.provider,
        enabled: tool.is_enabled !== false
      } : null,
      created_at: account.created_at || null
    };
  });

  const agentSummaries = agents.map((agent) => {
    const agentPermissions = permissions.filter((permission) => permission.agent_id === agent.id && permission.allowed);
    const agentKeys = apiKeys.filter((key) => key.agent_id === agent.id);
    return {
      id: agent.id,
      name: agent.name,
      status: agent.status,
      description: agent.description,
      active_api_keys: agentKeys.filter((key) => key.status === "active").length,
      revoked_api_keys: agentKeys.filter((key) => key.status !== "active").length,
      api_key_prefixes: agentKeys.map((key) => ({
        name: key.name,
        prefix: key.key_prefix,
        status: key.status,
        last_used_at: key.last_used_at || null,
        expires_at: key.expires_at || null
      })),
      allowed_feature_count: agentPermissions.length,
      approval_required_count: agentPermissions.filter((permission) => permission.requires_approval).length
    };
  });

  const allowedPermissions = permissions
    .filter((permission) => permission.allowed)
    .slice(0, 100)
    .map((permission) => {
      const agent = agentById.get(permission.agent_id);
      const account = accountById.get(permission.tool_account_id);
      const tool = account ? toolById.get(account.tool_id) : null;
      return {
        agent: agent?.name || permission.agent_id,
        tool: tool?.name || "Unknown tool",
        tool_slug: tool?.slug || null,
        account_label: account?.label || permission.tool_account_id,
        feature_key: permission.feature_key,
        requires_approval: Boolean(permission.requires_approval),
        daily_limit: permission.daily_limit || null
      };
    });

  const toolSummaries = tools.map((tool) => {
    const accounts = toolAccounts.filter((account) => account.tool_id === tool.id);
    return {
      id: tool.id,
      name: tool.name,
      slug: tool.slug,
      provider: tool.provider,
      category: tool.category,
      type: tool.tool_type,
      enabled: tool.is_enabled !== false,
      public: Boolean(tool.is_public),
      dangerous: Boolean(tool.is_dangerous),
      connected_account_count: accounts.length,
      connected_account_labels: accounts.map((account) => account.label),
      feature_count: (toolFeatureMap[tool.id] || []).length,
      features: (toolFeatureMap[tool.id] || []).slice(0, 12)
    };
  });

  const recentLogs = logs.slice(0, 20).map((log) => ({
    id: log.id,
    timestamp: log.timestamp || log.created_at || null,
    agent: log.agent_name || agentById.get(log.agent_id)?.name || log.agent_id || null,
    tool: log.tool_name || null,
    feature_key: log.feature_key,
    status: log.status,
    error: log.error || null,
    latency_ms: log.latency_ms || null
  }));

  const pendingApprovals = approvals
    .filter((approval) => approval.status === "pending")
    .slice(0, 20)
    .map((approval) => ({
      id: approval.id,
      agent: approval.agent_name || agentById.get(approval.agent_id)?.name || approval.agent_id || null,
      tool: approval.tool_name || null,
      feature_key: approval.feature_key,
      status: approval.status,
      created_at: approval.created_at || null
    }));

  return {
    generated_at: new Date().toISOString(),
    sanitized: true,
    secret_policy: "No raw API keys, OAuth tokens, passwords, private keys, or encrypted credential payloads are included.",
    current_page: {
      path: pathname,
      purpose: describePage(pathname)
    },
    app: {
      name: "TMCP Tool Gateway",
      mode: useLiveDb ? "Supabase live database" : "local browser storage",
      public_docs_path: "/docs",
      gateway_base_path: "/api/gateway"
    },
    workspace: {
      id: currentWorkspace,
      name: workspace?.name || "Unknown workspace",
      current_user: user ? {
        id: user.id,
        name: user.name || user.email || user.id,
        email: user.email || null,
        role: user.role || null
      } : null,
      user_count: users.length,
      stats
    },
    gateway_docs: {
      endpoints: GATEWAY_ENDPOINTS,
      schemas: getGatewaySchemas(),
      auth_header: "Authorization: Bearer <mcp_live_api_key>",
      execute_request_shape: {
        tool: "Tool slug, such as gmail, github, ssh, serper, or scrapedo.",
        action: "Feature key, such as gmail.search or slack.post_message.",
        input: "Feature-specific JSON input.",
        account_id: "Optional connected account id when more than one account exists for a tool."
      }
    },
    tools: toolSummaries,
    connected_accounts: connectedAccounts,
    agents: agentSummaries,
    allowed_permissions: allowedPermissions,
    recent_logs: recentLogs,
    pending_approvals: pendingApprovals,
    troubleshooting_hints: [
      "401 usually means missing, revoked, expired, or copied-only-prefix API key.",
      "403 or DENIED usually means the agent lacks a checked permission for the requested account and feature key.",
      "Pending approval means the permission requires admin approval before execution.",
      "500 gateway errors usually require checking connected account status, auth type, provider credentials, and runner support."
    ]
  };
}

function describePage(pathname = "") {
  if (pathname === "/dashboard") return "Workspace overview with health, metrics, recent calls, and connected tool coverage.";
  if (pathname.includes("/dashboard/tools/add")) return "Register a custom REST or MCP tool.";
  if (pathname.includes("/dashboard/tools/")) return "Tool detail page for connection setup, feature docs, permissions, and code snippets.";
  if (pathname.includes("/dashboard/tools")) return "Tools registry and search.";
  if (pathname.includes("/dashboard/agents/")) return "Agent detail and permission matrix.";
  if (pathname.includes("/dashboard/agents")) return "Agent list and creation page.";
  if (pathname.includes("/dashboard/api-keys")) return "Agent API key creation, rotation, revocation, and docs entry point.";
  if (pathname.includes("/dashboard/logs")) return "Gateway execution audit logs.";
  if (pathname.includes("/dashboard/approvals")) return "Manual approval queue for gated tool calls.";
  if (pathname.includes("/dashboard/connections")) return "Connected tool accounts overview.";
  if (pathname.includes("/dashboard/users")) return "Workspace user management.";
  if (pathname.includes("/dashboard/roles")) return "Workspace roles and permissions overview.";
  if (pathname.includes("/dashboard/settings")) return "Workspace settings, encryption key controls, and Tassistant OpenRouter setup.";
  return "Dashboard area.";
}
