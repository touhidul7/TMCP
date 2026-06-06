"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

const MockStoreContext = createContext(null);

const INITIAL_BUILTIN_TOOLS = [
  {
    id: "tool-gmail",
    name: "Gmail",
    slug: "gmail",
    provider: "Google",
    description: "Read, search, draft, and send emails securely.",
    category: "Communication",
    tool_type: "built_in",
    official_website_url: "https://mail.google.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-drive",
    name: "Google Drive",
    slug: "drive",
    provider: "Google",
    description: "Search files, read documents, upload, and manage files.",
    category: "Storage",
    tool_type: "built_in",
    official_website_url: "https://drive.google.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: true,
  },
  {
    id: "tool-sheets",
    name: "Google Sheets",
    slug: "sheets",
    provider: "Google",
    description: "Read, write, and update spreadsheets.",
    category: "Productivity",
    tool_type: "built_in",
    official_website_url: "https://sheets.google.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-calendar",
    name: "Google Calendar",
    slug: "calendar",
    provider: "Google",
    description: "Schedule, list, and manage calendar events.",
    category: "Productivity",
    tool_type: "built_in",
    official_website_url: "https://calendar.google.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-hunter",
    name: "Hunter",
    slug: "hunter",
    provider: "Hunter.io",
    description: "Find and verify professional email addresses.",
    category: "Enrichment",
    tool_type: "built_in",
    official_website_url: "https://hunter.io",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  },
  {
    id: "tool-consulti",
    name: "Consulti",
    slug: "consulti",
    provider: "Consulti Inc",
    description: "Search and enrich company data.",
    category: "Enrichment",
    tool_type: "built_in",
    official_website_url: "https://consulti.com",
    icon_url: "",
    icon_source: "favicon",
    is_public: true,
    is_enabled: true,
    is_dangerous: false,
  }
];

const INITIAL_FEATURES = [
  // Gmail
  { id: "feat-g-search", tool_id: "tool-gmail", feature_key: "gmail.search", name: "Search Emails", description: "Search user's mailbox with custom filters", is_dangerous: false, requires_approval: false },
  { id: "feat-g-read", tool_id: "tool-gmail", feature_key: "gmail.read", name: "Read Emails", description: "Fetch email headers and bodies", is_dangerous: false, requires_approval: false },
  { id: "feat-g-draft", tool_id: "tool-gmail", feature_key: "gmail.create_draft", name: "Create Draft", description: "Prepare email drafts for review", is_dangerous: true, requires_approval: false },
  { id: "feat-g-send", tool_id: "tool-gmail", feature_key: "gmail.send", name: "Send Email", description: "Send emails directly on user behalf", is_dangerous: true, requires_approval: true },

  // Drive
  { id: "feat-d-search", tool_id: "tool-drive", feature_key: "drive.search", name: "Search Files", description: "Search files in Google Drive", is_dangerous: false, requires_approval: false },
  { id: "feat-d-read", tool_id: "tool-drive", feature_key: "drive.read", name: "Read File Content", description: "Read file contents", is_dangerous: false, requires_approval: false },
  { id: "feat-d-upload", tool_id: "tool-drive", feature_key: "drive.upload", name: "Upload File", description: "Upload new files to drive", is_dangerous: true, requires_approval: false },
  { id: "feat-d-delete", tool_id: "tool-drive", feature_key: "drive.delete", name: "Delete File", description: "Remove files permanently", is_dangerous: true, requires_approval: true },

  // Hunter
  { id: "feat-h-find", tool_id: "tool-hunter", feature_key: "hunter.find_email", name: "Find Email", description: "Get email address by name and domain", is_dangerous: false, requires_approval: false },
  { id: "feat-h-verify", tool_id: "tool-hunter", feature_key: "hunter.verify_email", name: "Verify Email", description: "Verify deliverability of an email", is_dangerous: false, requires_approval: false },
  { id: "feat-h-domain", tool_id: "tool-hunter", feature_key: "hunter.domain_search", name: "Domain Search", description: "List email addresses in a domain", is_dangerous: false, requires_approval: false },

  // Consulti
  { id: "feat-c-search", tool_id: "tool-consulti", feature_key: "consulti.search_company", name: "Search Company", description: "Search directories for company records", is_dangerous: false, requires_approval: false },
  { id: "feat-c-enrich", tool_id: "tool-consulti", feature_key: "consulti.enrich_company", name: "Enrich Company", description: "Fetch details, size, and tech stack of a company", is_dangerous: false, requires_approval: false }
];

const INITIAL_ACCOUNTS = [
  { id: "acc-g-1", tool_id: "tool-gmail", label: "Personal Gmail", account_email: "admin.root@gmail.com", status: "connected", auth_type: "oauth", created_at: "2026-05-01T12:00:00Z" },
  { id: "acc-g-2", tool_id: "tool-gmail", label: "Client Support Gmail", account_email: "support@company.com", status: "connected", auth_type: "oauth", created_at: "2026-05-15T09:30:00Z" },
  { id: "acc-d-1", tool_id: "tool-drive", label: "Client Drive", account_email: "support@company.com", status: "connected", auth_type: "oauth", created_at: "2026-05-15T09:31:00Z" },
  { id: "acc-h-1", tool_id: "tool-hunter", label: "Main Hunter Account", account_email: "hunter-billing@company.com", status: "connected", auth_type: "api_key", created_at: "2026-05-02T14:00:00Z" }
];

const INITIAL_AGENTS = [
  { id: "agent-1", name: "Lead Research Agent", description: "Enriches leads and performs email verification.", status: "active", created_at: "2026-05-10T10:00:00Z" },
  { id: "agent-2", name: "Email Assistant Agent", description: "Drafts and replies to customer service tickets.", status: "active", created_at: "2026-05-12T11:00:00Z" },
  { id: "agent-3", name: "Drive Search Agent", description: "Organizes corporate drives and searches documentation.", status: "active", created_at: "2026-05-14T08:00:00Z" },
  { id: "agent-4", name: "Client Support Agent", description: "Handles live chats and queries.", status: "disabled", created_at: "2026-05-20T16:00:00Z" }
];

const INITIAL_KEYS = [
  { id: "key-1", agent_id: "agent-1", name: "Lead Research Dev", key_prefix: "mcp_live_e5f8a0", status: "active", last_used_at: "2026-06-06T00:42:01Z", expires_at: "2027-06-06T00:00:00Z", created_at: "2026-05-10T10:05:00Z" },
  { id: "key-2", agent_id: "agent-2", name: "Email Support Live", key_prefix: "mcp_live_9a2b8e", status: "active", last_used_at: "2026-06-06T00:31:55Z", expires_at: null, created_at: "2026-05-12T11:15:00Z" },
  { id: "key-3", agent_id: "agent-3", name: "Drive Reader API", key_prefix: "mcp_live_7c3f1d", status: "active", last_used_at: "2026-06-05T22:10:45Z", expires_at: "2026-12-31T23:59:59Z", created_at: "2026-05-14T08:10:00Z" }
];

const INITIAL_USERS = [
  { id: "usr-1", name: "Admin Root", email: "admin.root@tmcp.io", role: "Owner", status: "active", joined_at: "2026-05-01T00:00:00Z" },
  { id: "usr-2", name: "Sarah Connor", email: "sarah@tmcp.io", role: "Admin", status: "active", joined_at: "2026-05-05T09:00:00Z" },
  { id: "usr-3", name: "Alex Mercer", email: "alex@tmcp.io", role: "Developer", status: "active", joined_at: "2026-05-10T14:30:00Z" },
  { id: "usr-4", name: "Dave Bowman", email: "dave@tmcp.io", role: "Operator", status: "active", joined_at: "2026-05-12T10:15:00Z" },
  { id: "usr-5", name: "John Doe", email: "john@tmcp.io", role: "Viewer", status: "active", joined_at: "2026-05-20T11:00:00Z" }
];

const DEFAULT_ROLE_PERMISSIONS = {
  Owner: ["tools.view", "tools.add", "tools.edit", "tools.delete", "tools.connect_account", "tools.disconnect_account", "agents.view", "agents.create", "agents.edit", "agents.delete", "api_keys.view", "api_keys.create", "api_keys.revoke", "api_keys.rotate", "users.view", "users.invite", "users.remove", "users.change_role", "logs.view", "logs.export", "approvals.view", "approvals.approve", "approvals.reject", "settings.view", "settings.edit"],
  Admin: ["tools.view", "tools.add", "tools.edit", "tools.connect_account", "tools.disconnect_account", "agents.view", "agents.create", "agents.edit", "agents.delete", "api_keys.view", "api_keys.create", "api_keys.revoke", "api_keys.rotate", "users.view", "users.invite", "logs.view", "approvals.view", "approvals.approve", "approvals.reject", "settings.view", "settings.edit"],
  Developer: ["tools.view", "tools.add", "tools.edit", "agents.view", "agents.create", "agents.edit", "api_keys.view", "api_keys.create", "logs.view"],
  Operator: ["tools.view", "agents.view", "api_keys.view", "logs.view", "approvals.view", "approvals.approve", "approvals.reject"],
  Viewer: ["tools.view", "agents.view", "api_keys.view", "logs.view"]
};

export function MockStoreProvider({ children }) {
  const [user, setUser] = useState(null);
  const [workspaces, setWorkspaces] = useState([{ id: "ws-1", name: "TMCP Default Workspace", owner_id: "usr-1" }]);
  const [currentWorkspace, setCurrentWorkspace] = useState("ws-1");
  const [users, setUsers] = useState(INITIAL_USERS);
  const [tools, setTools] = useState(INITIAL_BUILTIN_TOOLS);
  const [features, setFeatures] = useState(INITIAL_FEATURES);
  const [toolAccounts, setToolAccounts] = useState(INITIAL_ACCOUNTS);
  const [agents, setAgents] = useState(INITIAL_AGENTS);
  const [apiKeys, setApiKeys] = useState(INITIAL_KEYS);
  const [permissions, setPermissions] = useState([]);
  const [approvals, setApprovals] = useState([
    {
      id: "appr-1",
      agent_id: "agent-2",
      tool_id: "tool-gmail",
      tool_account_id: "acc-g-2",
      feature_key: "gmail.send",
      input: { to: "partner@global.com", subject: "Inquiry on Q3 Integration", body: "Hello, we wanted to request..." },
      status: "pending",
      created_at: "2026-06-06T06:12:00Z"
    }
  ]);
  const [logs, setLogs] = useState([
    {
      id: "log-1",
      timestamp: "2026-06-06T06:42:01Z",
      agent_name: "Lead Research Agent",
      agent_id: "agent-1",
      tool_name: "Hunter",
      feature_key: "hunter.find_email",
      input: { domain: "google.com", first_name: "Sundar", last_name: "Pichai" },
      output: { email: "sundar@google.com", confidence: 99 },
      status: "SUCCESS",
      latency_ms: 320
    },
    {
      id: "log-2",
      timestamp: "2026-06-06T06:31:55Z",
      agent_name: "Email Assistant Agent",
      agent_id: "agent-2",
      tool_name: "Gmail",
      feature_key: "gmail.search",
      input: { query: "newer_than:1d category:primary" },
      output: { count: 32, threads: ["t_123", "t_456"] },
      status: "SUCCESS",
      latency_ms: 480
    },
    {
      id: "log-3",
      timestamp: "2026-06-06T06:30:12Z",
      agent_name: "Lead Research Agent",
      agent_id: "agent-1",
      tool_name: "Google Drive",
      feature_key: "drive.delete",
      input: { file_id: "drive_doc_99" },
      output: null,
      status: "DENIED",
      error: "Unauthorized attempt on prod_db_write / drive.delete",
      latency_ms: 45
    },
    {
      id: "log-4",
      timestamp: "2026-06-05T22:10:45Z",
      agent_name: "Drive Search Agent",
      agent_id: "agent-3",
      tool_name: "Google Drive",
      feature_key: "drive.search",
      input: { query: "name contains 'q3_report'" },
      output: { files: [{ id: "file_q3", name: "q3_report.pdf", size: 1042100 }] },
      status: "SUCCESS",
      latency_ms: 290
    }
  ]);

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem("tmcp_user");
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    } else {
      // Default initial mock logged-in user
      const defaultUser = INITIAL_USERS[0];
      setUser(defaultUser);
      localStorage.setItem("tmcp_user", JSON.stringify(defaultUser));
    }

    const savedStore = localStorage.getItem("tmcp_store");
    if (savedStore) {
      const parsed = JSON.parse(savedStore);
      if (parsed.tools) setTools(parsed.tools);
      if (parsed.features) setFeatures(parsed.features);
      if (parsed.toolAccounts) setToolAccounts(parsed.toolAccounts);
      if (parsed.agents) setAgents(parsed.agents);
      if (parsed.apiKeys) setApiKeys(parsed.apiKeys);
      if (parsed.permissions) setPermissions(parsed.permissions);
      if (parsed.logs) setLogs(parsed.logs);
      if (parsed.approvals) setApprovals(parsed.approvals);
      if (parsed.users) setUsers(parsed.users);
    } else {
      // Initialize default permissions
      const generatedPerms = [];
      INITIAL_AGENTS.forEach(agent => {
        INITIAL_ACCOUNTS.forEach(account => {
          INITIAL_FEATURES.filter(f => f.tool_id === account.tool_id).forEach(feature => {
            // Give some default permissions
            const isSendOrDelete = ["gmail.send", "drive.delete"].includes(feature.feature_key);
            generatedPerms.push({
              id: `${agent.id}-${account.id}-${feature.feature_key}`,
              agent_id: agent.id,
              tool_id: account.tool_id,
              tool_account_id: account.id,
              feature_key: feature.feature_key,
              allowed: isSendOrDelete ? false : true,
              daily_limit: isSendOrDelete ? 5 : 100,
              require_approval: isSendOrDelete ? true : false,
            });
          });
        });
      });
      setPermissions(generatedPerms);
    }
  }, []);

  // Save store updates to localStorage
  const saveState = (updatedState) => {
    localStorage.setItem("tmcp_store", JSON.stringify({
      tools,
      features,
      toolAccounts,
      agents,
      apiKeys,
      permissions,
      logs,
      approvals,
      users,
      ...updatedState
    }));
  };

  const handleLogin = (email, password) => {
    // Basic mock authentication
    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      setUser(existing);
      localStorage.setItem("tmcp_user", JSON.stringify(existing));
      return existing;
    } else {
      // Create new owner account
      const newUser = {
        id: `usr-${Date.now()}`,
        name: email.split("@")[0],
        email: email,
        role: "Owner",
        status: "active",
        joined_at: new Date().toISOString()
      };
      const updatedUsers = [...users, newUser];
      setUsers(updatedUsers);
      setUser(newUser);
      localStorage.setItem("tmcp_user", JSON.stringify(newUser));
      saveState({ users: updatedUsers });
      return newUser;
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("tmcp_user");
  };

  const hasPermission = (permissionKey) => {
    if (!user) return false;
    const allowedKeys = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    return allowedKeys.includes(permissionKey);
  };

  // Actions
  const inviteUser = (name, email, role) => {
    if (!hasPermission("users.invite")) return { error: "Insufficient permissions" };
    const newUser = {
      id: `usr-${Date.now()}`,
      name,
      email,
      role,
      status: "active",
      joined_at: new Date().toISOString()
    };
    const updated = [...users, newUser];
    setUsers(updated);
    saveState({ users: updated });
    return { success: true };
  };

  const changeUserRole = (userId, newRole) => {
    if (!hasPermission("users.change_role")) return { error: "Insufficient permissions" };
    const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    setUsers(updated);
    saveState({ users: updated });
    return { success: true };
  };

  const removeUser = (userId) => {
    if (!hasPermission("users.remove")) return { error: "Insufficient permissions" };
    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    saveState({ users: updated });
    return { success: true };
  };

  const addTool = (toolData) => {
    if (!hasPermission("tools.add")) return { error: "Insufficient permissions" };
    const toolId = `tool-${Date.now()}`;
    const newTool = {
      id: toolId,
      ...toolData,
      is_enabled: true,
      created_at: new Date().toISOString()
    };

    const updatedTools = [...tools, newTool];
    setTools(updatedTools);

    // Save mock features based on configuration or inputs
    const newFeaturesList = [];
    if (toolData.tool_type === "custom_mcp" && toolData.mcp_config?.features) {
      toolData.mcp_config.features.forEach(f => {
        newFeaturesList.push({
          id: `feat-${Date.now()}-${f.name}`,
          tool_id: toolId,
          feature_key: f.name,
          name: f.name.split(".").pop().replace(/_/g, " "),
          description: f.description || `Custom MCP action ${f.name}`,
          is_dangerous: false,
          requires_approval: false
        });
      });
    } else if (toolData.tool_type === "custom_rest") {
      newFeaturesList.push({
        id: `feat-${Date.now()}-${toolData.slug}`,
        tool_id: toolId,
        feature_key: `${toolData.slug}.call`,
        name: toolData.name,
        description: toolData.description || "Custom API call",
        is_dangerous: false,
        requires_approval: false
      });
    }

    const updatedFeatures = [...features, ...newFeaturesList];
    setFeatures(updatedFeatures);

    saveState({ tools: updatedTools, features: updatedFeatures });
    return { success: true, tool: newTool };
  };

  const addToolAccount = (toolId, label, credentials) => {
    if (!hasPermission("tools.connect_account")) return { error: "Insufficient permissions" };
    const accountId = `acc-${Date.now()}`;
    const newAccount = {
      id: accountId,
      tool_id: toolId,
      label,
      account_email: credentials.email || "custom-auth@gateway.local",
      status: "connected",
      auth_type: credentials.key ? "api_key" : "oauth",
      created_at: new Date().toISOString()
    };

    const updatedAccounts = [...toolAccounts, newAccount];
    setToolAccounts(updatedAccounts);

    // Generate permissions entries for all agents
    const newPerms = [...permissions];
    const toolFeats = features.filter(f => f.tool_id === toolId);
    agents.forEach(agent => {
      toolFeats.forEach(feat => {
        newPerms.push({
          id: `${agent.id}-${accountId}-${feat.feature_key}`,
          agent_id: agent.id,
          tool_id: toolId,
          tool_account_id: accountId,
          feature_key: feat.feature_key,
          allowed: true,
          daily_limit: 100,
          require_approval: false
        });
      });
    });
    setPermissions(newPerms);

    saveState({ toolAccounts: updatedAccounts, permissions: newPerms });
    return { success: true };
  };

  const disconnectToolAccount = (accountId) => {
    if (!hasPermission("tools.disconnect_account")) return { error: "Insufficient permissions" };
    const updatedAccounts = toolAccounts.filter(a => a.id !== accountId);
    setToolAccounts(updatedAccounts);

    const updatedPerms = permissions.filter(p => p.tool_account_id !== accountId);
    setPermissions(updatedPerms);

    saveState({ toolAccounts: updatedAccounts, permissions: updatedPerms });
    return { success: true };
  };

  const createAgent = (name, description) => {
    if (!hasPermission("agents.create")) return { error: "Insufficient permissions" };
    const agentId = `agent-${Date.now()}`;
    const newAgent = {
      id: agentId,
      name,
      description,
      status: "active",
      created_at: new Date().toISOString()
    };

    const updatedAgents = [...agents, newAgent];
    setAgents(updatedAgents);

    // Set up default permissions for this agent
    const newPerms = [...permissions];
    toolAccounts.forEach(account => {
      features.filter(f => f.tool_id === account.tool_id).forEach(feat => {
        newPerms.push({
          id: `${agentId}-${account.id}-${feat.feature_key}`,
          agent_id: agentId,
          tool_id: account.tool_id,
          tool_account_id: account.id,
          feature_key: feat.feature_key,
          allowed: true,
          daily_limit: 100,
          require_approval: false
        });
      });
    });
    setPermissions(newPerms);

    saveState({ agents: updatedAgents, permissions: newPerms });
    return { success: true, agent: newAgent };
  };

  const updateAgent = (agentId, data) => {
    if (!hasPermission("agents.edit")) return { error: "Insufficient permissions" };
    const updated = agents.map(a => a.id === agentId ? { ...a, ...data } : a);
    setAgents(updated);
    saveState({ agents: updated });
    return { success: true };
  };

  const deleteAgent = (agentId) => {
    if (!hasPermission("agents.delete")) return { error: "Insufficient permissions" };
    const updatedAgents = agents.filter(a => a.id !== agentId);
    setAgents(updatedAgents);

    const updatedPerms = permissions.filter(p => p.agent_id !== agentId);
    setPermissions(updatedPerms);

    const updatedKeys = apiKeys.filter(k => k.agent_id !== agentId);
    setApiKeys(updatedKeys);

    saveState({ agents: updatedAgents, permissions: updatedPerms, apiKeys: updatedKeys });
    return { success: true };
  };

  const generateApiKey = (agentId, name, expiryDays) => {
    if (!hasPermission("api_keys.create")) return { error: "Insufficient permissions" };
    const rawSuffix = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const rawKey = `mcp_live_${rawSuffix}`;
    const prefix = rawKey.slice(0, 16);

    const expiresAt = expiryDays ? new Date(Date.now() + expiryDays * 24 * 60 * 60 * 1000).toISOString() : null;

    const newKey = {
      id: `key-${Date.now()}`,
      agent_id: agentId,
      name,
      key_prefix: prefix,
      status: "active",
      last_used_at: null,
      expires_at: expiresAt,
      created_at: new Date().toISOString()
    };

    const updated = [...apiKeys, newKey];
    setApiKeys(updated);
    saveState({ apiKeys: updated });

    return { success: true, rawKey, key: newKey };
  };

  const revokeApiKey = (keyId) => {
    if (!hasPermission("api_keys.revoke")) return { error: "Insufficient permissions" };
    const updated = apiKeys.map(k => k.id === keyId ? { ...k, status: "revoked" } : k);
    setApiKeys(updated);
    saveState({ apiKeys: updated });
    return { success: true };
  };

  const rotateApiKey = (keyId) => {
    if (!hasPermission("api_keys.rotate")) return { error: "Insufficient permissions" };
    const oldKey = apiKeys.find(k => k.id === keyId);
    if (!oldKey) return { error: "Key not found" };

    const rawSuffix = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const rawKey = `mcp_live_${rawSuffix}`;
    const prefix = rawKey.slice(0, 16);

    const updated = apiKeys.map(k => k.id === keyId ? {
      ...k,
      key_prefix: prefix,
      last_used_at: null,
      created_at: new Date().toISOString()
    } : k);

    setApiKeys(updated);
    saveState({ apiKeys: updated });

    return { success: true, rawKey };
  };

  const updatePermission = (agentId, accountId, featureKey, field, value) => {
    const permId = `${agentId}-${accountId}-${featureKey}`;
    let exists = permissions.find(p => p.id === permId);

    let updatedPerms;
    if (exists) {
      updatedPerms = permissions.map(p => p.id === permId ? { ...p, [field]: value } : p);
    } else {
      const account = toolAccounts.find(a => a.id === accountId);
      updatedPerms = [...permissions, {
        id: permId,
        agent_id: agentId,
        tool_id: account?.tool_id,
        tool_account_id: accountId,
        feature_key: featureKey,
        allowed: field === "allowed" ? value : true,
        daily_limit: field === "daily_limit" ? parseInt(value) || 100 : 100,
        require_approval: field === "require_approval" ? value : false
      }];
    }

    setPermissions(updatedPerms);
    saveState({ permissions: updatedPerms });
  };

  const approveRequest = (approvalId, userId) => {
    if (!hasPermission("approvals.approve")) return { error: "Insufficient permissions" };
    const approval = approvals.find(a => a.id === approvalId);
    if (!approval) return { error: "Request not found" };

    const updatedApprovals = approvals.map(a => a.id === approvalId ? {
      ...a,
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString()
    } : a);

    // Create log for approved action
    const agent = agents.find(a => a.id === approval.agent_id);
    const tool = tools.find(t => t.id === approval.tool_id);
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      agent_name: agent?.name || "System Agent",
      agent_id: approval.agent_id,
      tool_name: tool?.name || "External Tool",
      feature_key: approval.feature_key,
      input: approval.input,
      output: { success: true, action: "Approved and executed dangerous call" },
      status: "SUCCESS",
      latency_ms: 1200
    };

    const updatedLogs = [newLog, ...logs];
    setApprovals(updatedApprovals);
    setLogs(updatedLogs);

    saveState({ approvals: updatedApprovals, logs: updatedLogs });
    return { success: true };
  };

  const rejectRequest = (approvalId, userId) => {
    if (!hasPermission("approvals.reject")) return { error: "Insufficient permissions" };
    const approval = approvals.find(a => a.id === approvalId);
    if (!approval) return { error: "Request not found" };

    const updatedApprovals = approvals.map(a => a.id === approvalId ? {
      ...a,
      status: "rejected",
      approved_by: userId,
      rejected_at: new Date().toISOString()
    } : a);

    const agent = agents.find(a => a.id === approval.agent_id);
    const tool = tools.find(t => t.id === approval.tool_id);
    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      agent_name: agent?.name || "System Agent",
      agent_id: approval.agent_id,
      tool_name: tool?.name || "External Tool",
      feature_key: approval.feature_key,
      input: approval.input,
      output: null,
      status: "DENIED",
      error: "Dangerous tool request was rejected by admin.",
      latency_ms: 60
    };

    const updatedLogs = [newLog, ...logs];
    setApprovals(updatedApprovals);
    setLogs(updatedLogs);

    saveState({ approvals: updatedApprovals, logs: updatedLogs });
    return { success: true };
  };

  // Simulate a tool call from dashboard logs view
  const simulateToolCall = (agentId, accountId, featureKey, customInput = {}) => {
    const agent = agents.find(a => a.id === agentId);
    const account = toolAccounts.find(a => a.id === accountId);
    const tool = tools.find(t => t.id === account?.tool_id);
    const feature = features.find(f => f.feature_key === featureKey);

    if (!agent || !account || !tool || !feature) {
      return { error: "Invalid parameters for simulation" };
    }

    const perm = permissions.find(p => p.agent_id === agentId && p.tool_account_id === accountId && p.feature_key === featureKey);
    const isAllowed = perm ? perm.allowed : true;
    const requiresApproval = perm ? perm.require_approval : feature.requires_approval;

    // Check if dangerous / requires approval
    if (isAllowed && requiresApproval) {
      const newApproval = {
        id: `appr-${Date.now()}`,
        agent_id: agentId,
        tool_id: tool.id,
        tool_account_id: accountId,
        feature_key: featureKey,
        input: customInput,
        status: "pending",
        created_at: new Date().toISOString()
      };
      const updatedApprovals = [newApproval, ...approvals];
      setApprovals(updatedApprovals);
      saveState({ approvals: updatedApprovals });
      return { status: "pending", message: "Action queued. Dangerous tool call requires approval." };
    }

    const isSuccess = isAllowed && agent.status === "active";
    const statusVal = isSuccess ? "SUCCESS" : (agent.status !== "active" ? "FAILED" : "DENIED");
    const errorVal = isSuccess ? null : (agent.status !== "active" ? "Agent is disabled" : "Access denied by permission matrix");

    const newLog = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      agent_name: agent.name,
      agent_id: agentId,
      tool_name: tool.name,
      feature_key: featureKey,
      input: customInput,
      output: isSuccess ? { simulated: true, result: "Successful response data from router" } : null,
      status: statusVal,
      error: errorVal,
      latency_ms: Math.floor(Math.random() * 400) + 50
    };

    const updatedLogs = [newLog, ...logs];
    setLogs(updatedLogs);

    // Update API Key last used timestamp
    const agentKey = apiKeys.find(k => k.agent_id === agentId && k.status === "active");
    if (agentKey) {
      const updatedKeys = apiKeys.map(k => k.id === agentKey.id ? { ...k, last_used_at: new Date().toISOString() } : k);
      setApiKeys(updatedKeys);
      saveState({ logs: updatedLogs, apiKeys: updatedKeys });
    } else {
      saveState({ logs: updatedLogs });
    }

    return { status: statusVal, error: errorVal, log: newLog };
  };

  const getWorkspaceStats = () => {
    return {
      totalTools: tools.length + 142, // Add 142 to reach the 148 statistic from Stitch
      connectedAccounts: toolAccounts.length + 48, // Add 48 to reach 52 accounts from Stitch
      activeAgents: agents.length + 20, // Add 20 to reach 24 active agents
      apiKeysCount: apiKeys.length + 1021, // Add 1021 to reach 1024 API keys
      failedCallsPercentage: "0.02%",
      pendingApprovals: approvals.filter(a => a.status === "pending").length,
      recentLogs: logs.slice(0, 10)
    };
  };

  return (
    <MockStoreContext.Provider
      value={{
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
        hasPermission,
        handleLogin,
        handleLogout,
        inviteUser,
        changeUserRole,
        removeUser,
        addTool,
        addToolAccount,
        disconnectToolAccount,
        createAgent,
        updateAgent,
        deleteAgent,
        generateApiKey,
        revokeApiKey,
        rotateApiKey,
        updatePermission,
        approveRequest,
        rejectRequest,
        simulateToolCall,
        getWorkspaceStats
      }}
    >
      {children}
    </MockStoreContext.Provider>
  );
}

export function useMockStore() {
  const context = useContext(MockStoreContext);
  if (!context) {
    throw new Error("useMockStore must be used within a MockStoreProvider");
  }
  return context;
}
