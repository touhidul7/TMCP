"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { supabase } from "./supabase/client";

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
  const [useLiveDb, setUseLiveDb] = useState(false);
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
  const [logs, setLogs] = useState([]);

  // Check if Supabase URL is the default or configured
  const isSupabaseConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    return url !== "" && !url.includes("your-supabase-project");
  };

  const fetchLiveDatabaseData = async (sessionUser) => {
    try {
      // Find requested workspace ID from cookie
      const getCookie = (name) => {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return null;
      };
      
      let requestedWsId = getCookie("tmcp_workspace_id");

      // 1. Get ALL workspace memberships
      const { data: members } = await supabase
        .from("workspace_members")
        .select("workspace_id, role")
        .eq("user_id", sessionUser.id);

      // 2. Get ALL owned workspaces
      const { data: ownedWorkspaces } = await supabase
        .from("workspaces")
        .select("id")
        .eq("owner_user_id", sessionUser.id);

      let wsId = null;
      let userRole = "Owner";
      let allWorkspaceIds = new Set();
      let workspaceRoleMap = {};

      if (members) {
        members.forEach(m => {
          allWorkspaceIds.add(m.workspace_id);
          workspaceRoleMap[m.workspace_id] = m.role;
        });
      }
      if (ownedWorkspaces) {
        ownedWorkspaces.forEach(w => {
          allWorkspaceIds.add(w.id);
          workspaceRoleMap[w.id] = "Owner";
        });
      }

      if (allWorkspaceIds.size > 0) {
        // If they requested a specific one and they have access, use it
        if (requestedWsId && allWorkspaceIds.has(requestedWsId)) {
          wsId = requestedWsId;
        } else {
          // Otherwise, pick the first one
          wsId = Array.from(allWorkspaceIds)[0];
        }
        userRole = workspaceRoleMap[wsId];
      }

      if (!wsId) {
        // Create workspace for user if none exists
        const userName = sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || sessionUser.email?.split('@')[0] || "User";
        const workspaceName = `${userName}'s Workspace`;

        const { data: newWs, error: wsCreateErr } = await supabase
          .from("workspaces")
          .insert({ name: workspaceName, owner_user_id: sessionUser.id })
          .select()
          .single();

        if (wsCreateErr || !newWs) {
          // Race condition: workspace was created by another request, fetch it
          const { data: existingWs } = await supabase
            .from("workspaces")
            .select("id")
            .eq("owner_user_id", sessionUser.id)
            .limit(1)
            .maybeSingle();
          if (existingWs) {
            wsId = existingWs.id;
          }
        } else {
          wsId = newWs.id;
        }

        if (wsId) {
          await supabase.from("workspace_members").upsert({
            workspace_id: wsId,
            user_id: sessionUser.id,
            role: "Owner",
            status: "active"
          }, { onConflict: "workspace_id,user_id" });

          allWorkspaceIds.add(wsId);
          workspaceRoleMap[wsId] = "Owner";
        }
        userRole = "Owner";
      }

      setCurrentWorkspace(wsId);
      
      const dbUser = {
        id: sessionUser.id,
        name: sessionUser.user_metadata?.full_name || sessionUser.user_metadata?.name || sessionUser.email.split("@")[0],
        email: sessionUser.email,
        role: userRole,
        status: "active"
      };
      setUser(dbUser);

      // Fetch Workspaces — deduplicated by ID
      if (allWorkspaceIds.size > 0) {
        const { data: wsData } = await supabase
          .from("workspaces")
          .select("*")
          .in("id", Array.from(allWorkspaceIds));
        if (wsData) {
          // Deduplicate by id to prevent showing same workspace twice
          const seen = new Set();
          const uniqueWs = wsData.filter(w => {
            if (seen.has(w.id)) return false;
            seen.add(w.id);
            return true;
          });
          setWorkspaces(uniqueWs);
        }
      }

      // Fetch users / workspace members
      let { data: wsMembers } = await supabase
        .from("workspace_members")
        .select("*")
        .eq("workspace_id", wsId);

      // Ensure the logged-in user has a workspace_members record
      const hasUserMember = wsMembers && wsMembers.some(m => m.user_id === sessionUser.id);
      if (!hasUserMember && wsId) {
        await supabase.from("workspace_members").insert({
          workspace_id: wsId,
          user_id: sessionUser.id,
          role: userRole || "Owner",
          status: "active"
        });
        // Re-fetch members list
        const { data: refetchedMembers } = await supabase
          .from("workspace_members")
          .select("*")
          .eq("workspace_id", wsId);
        if (refetchedMembers) wsMembers = refetchedMembers;
      }

      // Fetch invitations
      const { data: wsInvites } = await supabase
        .from("workspace_invitations")
        .select("*")
        .eq("workspace_id", wsId);

      const membersList = wsMembers ? wsMembers.map(m => ({
        id: m.user_id,
        name: m.user_id === sessionUser.id ? dbUser.name : "Team Member",
        email: m.user_id === sessionUser.id ? dbUser.email : "member@tmcp.io",
        role: m.role,
        status: m.status,
        joined_at: m.created_at
      })) : [];

      const invitesList = wsInvites ? wsInvites.map(i => ({
        id: i.id,
        name: i.email.split("@")[0],
        email: i.email,
        role: i.role,
        status: "pending",
        joined_at: i.created_at
      })) : [];

      setUsers([...membersList, ...invitesList]);

      // Fetch Tools
      const { data: dbTools } = await supabase.from("tools").select("*").eq("workspace_id", wsId);
      const dbSlugs = new Set((dbTools || []).map(t => t.slug));
      const filteredBuiltIns = INITIAL_BUILTIN_TOOLS.filter(t => !dbSlugs.has(t.slug))
                                                   .map(t => ({ ...t, workspace_id: wsId }));
      setTools([...filteredBuiltIns, ...(dbTools || [])]);

      // Fetch Tool Features
      const { data: dbFeatures } = await supabase.from("tool_features").select("*");
      const keptBuiltInIds = new Set(filteredBuiltIns.map(t => t.id));
      const filteredBuiltInFeatures = INITIAL_FEATURES.filter(f => keptBuiltInIds.has(f.tool_id));
      setFeatures([...filteredBuiltInFeatures, ...(dbFeatures || [])]);

      // Fetch Tool Accounts
      const { data: dbAccounts } = await supabase.from("tool_accounts").select("*").eq("workspace_id", wsId);
      setToolAccounts(dbAccounts || []);

      // Fetch Agents
      const { data: dbAgents } = await supabase.from("agents").select("*").eq("workspace_id", wsId);
      setAgents(dbAgents || []);

      // Fetch API Keys
      const { data: dbKeys } = await supabase.from("api_keys").select("*").eq("workspace_id", wsId);
      setApiKeys(dbKeys || []);

      // Fetch Permissions Matrix
      const { data: dbPerms } = await supabase.from("agent_tool_permissions").select("*").eq("workspace_id", wsId);
      setPermissions(dbPerms || []);

      // Fetch Logs
      const { data: dbLogs } = await supabase.from("tool_call_logs").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false });
      setLogs(dbLogs || []);

      // Fetch Approvals
      const { data: dbApprovals } = await supabase.from("tool_approvals").select("*").eq("workspace_id", wsId).order("created_at", { ascending: false });
      setApprovals(dbApprovals || []);

    } catch (e) {
      console.error("Error loading live database tables:", e);
    }
  };

  // Sync data on mount
  useEffect(() => {
    if (isSupabaseConfigured()) {
      setUseLiveDb(true);
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          fetchLiveDatabaseData(session.user);
        } else {
          // If no active DB session, check localStorage fallback
          const localUser = localStorage.getItem("tmcp_user");
          if (localUser) {
            setUser(JSON.parse(localUser));
          }
        }
      });

      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          fetchLiveDatabaseData(session.user);
        } else {
          setUser(null);
        }
      });

      return () => subscription.unsubscribe();
    } else {
      // LocalStorage Mock mode
      const savedUser = localStorage.getItem("tmcp_user");
      if (savedUser) {
        setUser(JSON.parse(savedUser));
      } else {
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
        const generatedPerms = [];
        INITIAL_AGENTS.forEach(agent => {
          INITIAL_ACCOUNTS.forEach(account => {
            INITIAL_FEATURES.filter(f => f.tool_id === account.tool_id).forEach(feature => {
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
    }
  }, []);

  // Save store updates (Mock mode fallback)
  const saveState = (updatedState) => {
    if (useLiveDb) return;
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

  const handleLogin = async (email, password) => {
    if (useLiveDb) {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        // If login fails, attempt auto-signup
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) throw signUpError;
        return signUpData.user;
      }
      return data.user;
    }

    const existing = users.find(u => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      setUser(existing);
      localStorage.setItem("tmcp_user", JSON.stringify(existing));
      return existing;
    } else {
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

  const handleLogout = async () => {
    if (useLiveDb) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem("tmcp_user");
  };

  const hasPermission = (permissionKey) => {
    if (!user) return false;
    const allowedKeys = DEFAULT_ROLE_PERMISSIONS[user.role] || [];
    return allowedKeys.includes(permissionKey);
  };

  const inviteUser = async (name, email, role) => {
    if (!hasPermission("users.invite")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      // Call the API route so Resend email is dispatched
      try {
        const res = await fetch("/api/users/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, role })
        });
        const data = await res.json();
        if (!data.success) return { error: data.error || "Failed to send invite" };
        fetchLiveDatabaseData(user);
        return { success: true };
      } catch (err) {
        return { error: err.message || "Failed to send invite" };
      }
    }

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

  const changeUserRole = async (userId, newRole) => {
    if (!hasPermission("users.change_role")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const { data: updatedMember } = await supabase
        .from("workspace_members")
        .update({ role: newRole })
        .eq("user_id", userId)
        .eq("workspace_id", currentWorkspace)
        .select();

      if (!updatedMember || updatedMember.length === 0) {
        await supabase
          .from("workspace_invitations")
          .update({ role: newRole })
          .eq("id", userId)
          .eq("workspace_id", currentWorkspace);
      }

      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const updated = users.map(u => u.id === userId ? { ...u, role: newRole } : u);
    setUsers(updated);
    saveState({ users: updated });
    return { success: true };
  };

  const removeUser = async (userId) => {
    if (!hasPermission("users.remove")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const { data: delMember } = await supabase
        .from("workspace_members")
        .delete()
        .eq("user_id", userId)
        .eq("workspace_id", currentWorkspace)
        .select();

      if (!delMember || delMember.length === 0) {
        await supabase
          .from("workspace_invitations")
          .delete()
          .eq("id", userId)
          .eq("workspace_id", currentWorkspace);
      }
      
      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const updated = users.filter(u => u.id !== userId);
    setUsers(updated);
    saveState({ users: updated });
    return { success: true };
  };

  const addTool = async (toolData) => {
    if (!hasPermission("tools.add")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const res = await fetch("/api/tools/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toolData)
      });
      const data = await res.json();
      if (!data.success) return { error: data.error };
      fetchLiveDatabaseData(user);
      return { success: true, tool: data.tool };
    }

    const toolId = `tool-${Date.now()}`;
    const newTool = {
      id: toolId,
      ...toolData,
      is_enabled: true,
      created_at: new Date().toISOString()
    };
    const updatedTools = [...tools, newTool];
    setTools(updatedTools);

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

  const addToolAccount = async (toolId, label, credentials) => {
    if (!hasPermission("tools.connect_account")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const mappedCredentials = { ...credentials };
      if (credentials.key && !credentials.apiKey) {
        mappedCredentials.apiKey = credentials.key;
      }
      const res = await fetch("/api/tool-accounts/add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId, label, credentials: mappedCredentials })
      });
      const data = await res.json();
      if (!data.success) return { error: data.error };
      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const accountId = `acc-${Date.now()}`;
    const newAccount = {
      id: accountId,
      tool_id: toolId,
      label,
      account_email: credentials.email || "custom-auth@gateway.local",
      status: "connected",
      auth_type: credentials.apiKey ? "api_key" : "oauth",
      created_at: new Date().toISOString()
    };

    const updatedAccounts = [...toolAccounts, newAccount];
    setToolAccounts(updatedAccounts);

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

  const disconnectToolAccount = async (accountId) => {
    if (!hasPermission("tools.disconnect_account")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const { error } = await supabase.from("tool_accounts").delete().eq("id", accountId);
      if (error) return { error: error.message };
      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const updatedAccounts = toolAccounts.filter(a => a.id !== accountId);
    setToolAccounts(updatedAccounts);
    const updatedPerms = permissions.filter(p => p.tool_account_id !== accountId);
    setPermissions(updatedPerms);
    saveState({ toolAccounts: updatedAccounts, permissions: updatedPerms });
    return { success: true };
  };

  const createAgent = async (name, description) => {
    if (!hasPermission("agents.create")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const { data, error } = await supabase
        .from("agents")
        .insert({ workspace_id: currentWorkspace, name, description, user_id: user.id })
        .select()
        .single();
      if (error) return { error: error.message };
      fetchLiveDatabaseData(user);
      return { success: true, agent: data };
    }

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

  const updateAgent = async (agentId, data) => {
    if (!hasPermission("agents.edit")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const { error } = await supabase.from("agents").update(data).eq("id", agentId);
      if (error) return { error: error.message };
      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const updated = agents.map(a => a.id === agentId ? { ...a, ...data } : a);
    setAgents(updated);
    saveState({ agents: updated });
    return { success: true };
  };

  const deleteAgent = async (agentId) => {
    if (!hasPermission("agents.delete")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const { error } = await supabase.from("agents").delete().eq("id", agentId);
      if (error) return { error: error.message };
      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const updatedAgents = agents.filter(a => a.id !== agentId);
    setAgents(updatedAgents);
    const updatedPerms = permissions.filter(p => p.agent_id !== agentId);
    setPermissions(updatedPerms);
    const updatedKeys = apiKeys.filter(k => k.agent_id !== agentId);
    setApiKeys(updatedKeys);
    saveState({ agents: updatedAgents, permissions: updatedPerms, apiKeys: updatedKeys });
    return { success: true };
  };

  const generateApiKey = async (agentId, name, expiryDays) => {
    if (!hasPermission("api_keys.create")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const res = await fetch("/api/api-keys/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agentId, name, expiryDays })
      });
      const data = await res.json();
      if (!data.success) return { error: data.error };
      fetchLiveDatabaseData(user);
      return { success: true, rawKey: data.rawKey, key: data.key };
    }

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

  const revokeApiKey = async (keyId) => {
    if (!hasPermission("api_keys.revoke")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const res = await fetch("/api/api-keys/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId })
      });
      const data = await res.json();
      if (!data.success) return { error: data.error };
      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const updated = apiKeys.map(k => k.id === keyId ? { ...k, status: "revoked" } : k);
    setApiKeys(updated);
    saveState({ apiKeys: updated });
    return { success: true };
  };

  const rotateApiKey = async (keyId) => {
    if (!hasPermission("api_keys.rotate")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const res = await fetch("/api/api-keys/rotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ keyId })
      });
      const data = await res.json();
      if (!data.success) return { error: data.error };
      fetchLiveDatabaseData(user);
      return { success: true, rawKey: data.rawKey };
    }

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

  const updatePermission = async (agentId, accountId, featureKey, field, value) => {
    if (useLiveDb) {
      // Optimistically update local state so checkbox toggles immediately
      const matchIdx = permissions.findIndex(
        (p) =>
          p.agent_id === agentId &&
          p.tool_account_id === accountId &&
          p.feature_key === featureKey
      );

      let optimisticPerms;
      if (matchIdx >= 0) {
        optimisticPerms = permissions.map((p, i) =>
          i === matchIdx ? { ...p, [field]: value } : p
        );
      } else {
        const account = toolAccounts.find((a) => a.id === accountId);
        optimisticPerms = [
          ...permissions,
          {
            id: `temp-${Date.now()}`,
            agent_id: agentId,
            tool_id: account?.tool_id,
            tool_account_id: accountId,
            feature_key: featureKey,
            allowed: field === "allowed" ? value : false,
            daily_limit: field === "daily_limit" ? parseInt(value) || 100 : 100,
            require_approval: field === "require_approval" ? value : false,
          },
        ];
      }
      setPermissions(optimisticPerms);

      try {
        // Get session token for authorization
        const { data: { session } } = await supabase.auth.getSession();
        const headers = { "Content-Type": "application/json" };
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
        if (currentWorkspace) {
          headers["x-workspace-id"] = currentWorkspace;
        }

        const res = await fetch("/api/permissions", {
          method: "POST",
          headers,
          body: JSON.stringify({ agentId, accountId, featureKey, field, value }),
        });
        const data = await res.json();
        if (!data.success) {
          console.error("Permission update failed:", data.error);
          // Revert on failure
          setPermissions(permissions);
        }
      } catch (err) {
        console.error("Permission update fetch error:", err);
        // Revert on error
        setPermissions(permissions);
      }
      return;
    }


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

  const approveRequest = async (approvalId, userId) => {
    if (!hasPermission("approvals.approve")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const { error } = await supabase
        .from("tool_approvals")
        .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() })
        .eq("id", approvalId);
      if (error) return { error: error.message };
      fetchLiveDatabaseData(user);
      return { success: true };
    }

    const approval = approvals.find(a => a.id === approvalId);
    if (!approval) return { error: "Request not found" };

    const updatedApprovals = approvals.map(a => a.id === approvalId ? {
      ...a,
      status: "approved",
      approved_by: userId,
      approved_at: new Date().toISOString()
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

  const rejectRequest = async (approvalId, userId) => {
    if (!hasPermission("approvals.reject")) return { error: "Insufficient permissions" };

    if (useLiveDb) {
      const { error } = await supabase
        .from("tool_approvals")
        .update({ status: "rejected", approved_by: userId, rejected_at: new Date().toISOString() })
        .eq("id", approvalId);
      if (error) return { error: error.message };
      fetchLiveDatabaseData(user);
      return { success: true };
    }

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

  const simulateToolCall = async (agentId, accountId, featureKey, customInput = {}) => {
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

    if (isAllowed && requiresApproval) {
      if (useLiveDb) {
        await supabase.from("tool_approvals").insert({
          workspace_id: currentWorkspace,
          agent_id: agentId,
          tool_id: tool.id,
          tool_account_id: accountId,
          feature_key: featureKey,
          input: customInput,
          status: "pending"
        });
        fetchLiveDatabaseData(user);
        return { status: "pending", message: "Action queued. Dangerous tool call requires approval." };
      }

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

    if (useLiveDb) {
      // Find active key prefix to simulate
      const agentKey = apiKeys.find(k => k.agent_id === agentId && k.status === "active");
      
      const { data: logRes, error: logErr } = await supabase.from("tool_call_logs").insert({
        workspace_id: currentWorkspace,
        agent_id: agentId,
        api_key_id: agentKey?.id,
        tool_id: tool.id,
        tool_account_id: accountId,
        tool_name: tool.name,
        feature_key: featureKey,
        input: customInput,
        output: isSuccess ? { simulated: true, result: "Successful response data from router" } : null,
        status: statusVal,
        error: errorVal,
        latency_ms: Math.floor(Math.random() * 400) + 50
      }).select().single();

      if (logErr) return { error: logErr.message };
      fetchLiveDatabaseData(user);
      return { status: statusVal, error: errorVal, log: logRes };
    }

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
    const activeKeyCount = apiKeys.filter(k => k.status === "active").length;
    const pendingCount = approvals.filter(a => a.status === "pending").length;
    
    // To match Stitch statistics when no custom records exist
    const statsPadding = {
      totalTools: tools.length + (useLiveDb ? 0 : 142),
      connectedAccounts: toolAccounts.length + (useLiveDb ? 0 : 48),
      activeAgents: agents.length + (useLiveDb ? 0 : 20),
      apiKeysCount: apiKeys.length + (useLiveDb ? 0 : 1021)
    };

    return {
      totalTools: statsPadding.totalTools,
      connectedAccounts: statsPadding.connectedAccounts,
      activeAgents: statsPadding.activeAgents,
      apiKeysCount: statsPadding.apiKeysCount,
      failedCallsPercentage: "0.02%",
      pendingApprovals: pendingCount,
      recentLogs: logs.slice(0, 10)
    };
  };

  const switchWorkspace = async (workspaceId) => {
    // Set cookie that expires in 30 days
    document.cookie = `tmcp_workspace_id=${workspaceId}; path=/; max-age=${60 * 60 * 24 * 30}`;
    setCurrentWorkspace(workspaceId);
    if (useLiveDb) {
      // Re-fetch from Supabase to get the real auth user object
      const { supabase } = await import("@/lib/supabase/client");
      const { data: { user: sessionUser } } = await supabase.auth.getUser();
      if (sessionUser) {
        await fetchLiveDatabaseData(sessionUser);
      } else {
        window.location.reload();
      }
    } else {
      window.location.reload();
    }
  };

  return (
    <MockStoreContext.Provider
      value={{
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
        getWorkspaceStats,
        switchWorkspace
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
