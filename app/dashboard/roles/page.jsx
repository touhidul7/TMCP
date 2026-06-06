"use client";

import DashboardHeader from "@/components/dashboard-header";
import { CheckCircle, XCircle } from "lucide-react";

export default function RolesPage() {
  const permissionsList = [
    { key: "tools.view", label: "View Tools Catalog", desc: "Can view built-in and registered custom tools." },
    { key: "tools.add", label: "Register Tools", desc: "Can add custom REST APIs or MCP Server integrations." },
    { key: "tools.edit", label: "Edit Tools Configuration", desc: "Can modify descriptions, endpoints, or features." },
    { key: "tools.delete", label: "Delete Custom Tools", desc: "Can permanently remove custom integrations." },
    { key: "tools.connect_account", label: "Connect Labeled Accounts", desc: "Can link API keys or credentials to tools." },
    { key: "tools.disconnect_account", label: "Disconnect Accounts", desc: "Can unlink active accounts from tools." },
    
    { key: "agents.view", label: "View Agent Profiles", desc: "Can see active agents list." },
    { key: "agents.create", label: "Register New Agents", desc: "Can initialize agent profiles." },
    { key: "agents.edit", label: "Edit Agent Details", desc: "Can update names, descriptions, or status." },
    { key: "agents.delete", label: "Delete Agent Profiles", desc: "Can wipe agent metadata and permissions." },

    { key: "api_keys.view", label: "View Hashed Keys", desc: "Can view key prefixes and usage counters." },
    { key: "api_keys.create", label: "Generate API Tokens", desc: "Can generate API keys and assign to agents." },
    { key: "api_keys.rotate", label: "Rotate API Keys", desc: "Can refresh keys while maintaining agents mapping." },
    { key: "api_keys.revoke", label: "Revoke API Credentials", desc: "Can permanently disable API access." },

    { key: "users.view", label: "View Workspace Members", desc: "Can browse invited team directory." },
    { key: "users.invite", label: "Invite Team Members", desc: "Can add new emails to the workspace." },
    { key: "users.remove", label: "Remove Members", desc: "Can delete user access from workspace." },
    { key: "users.change_role", label: "Modify Member Roles", desc: "Can alter workspace roles of members." },

    { key: "logs.view", label: "View Execution Logs", desc: "Can browse execution audits and parameters." },
    
    { key: "approvals.view", label: "View Pending Approvals", desc: "Can see dangerous calls waiting queue." },
    { key: "approvals.approve", label: "Authorize Dangerous Actions", desc: "Can approve blocked agent calls." },
    { key: "approvals.reject", label: "Reject Dangerous Actions", desc: "Can deny blocked agent calls." },

    { key: "settings.view", label: "View System Settings", desc: "Can inspect workspaces configurations." },
    { key: "settings.edit", label: "Modify Global Config", desc: "Can modify workspace metadata or encryption key." },
  ];

  const roleHeaders = ["Owner", "Admin", "Developer", "Operator", "Viewer"];

  const rolePermissions = {
    Owner: ["tools.view", "tools.add", "tools.edit", "tools.delete", "tools.connect_account", "tools.disconnect_account", "agents.view", "agents.create", "agents.edit", "agents.delete", "api_keys.view", "api_keys.create", "api_keys.revoke", "api_keys.rotate", "users.view", "users.invite", "users.remove", "users.change_role", "logs.view", "approvals.view", "approvals.approve", "approvals.reject", "settings.view", "settings.edit"],
    Admin: ["tools.view", "tools.add", "tools.edit", "tools.connect_account", "tools.disconnect_account", "agents.view", "agents.create", "agents.edit", "agents.delete", "api_keys.view", "api_keys.create", "api_keys.revoke", "api_keys.rotate", "users.view", "users.invite", "logs.view", "approvals.view", "approvals.approve", "approvals.reject", "settings.view", "settings.edit"],
    Developer: ["tools.view", "tools.add", "tools.edit", "agents.view", "agents.create", "agents.edit", "api_keys.view", "api_keys.create", "logs.view"],
    Operator: ["tools.view", "agents.view", "api_keys.view", "logs.view", "approvals.view", "approvals.approve", "approvals.reject"],
    Viewer: ["tools.view", "agents.view", "api_keys.view", "logs.view"]
  };

  return (
    <>
      <DashboardHeader title="Workspace Roles Configuration" />

      <main className="p-6 space-y-6 flex-1 overflow-y-auto max-w-6xl">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Access Role Matrix</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Global access controls for human dashboard accounts by role. These credentials do not affect agent API key constraints.
          </p>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-outline-variant">
                  <th className="px-6 py-4 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Permission Action</th>
                  {roleHeaders.map((role) => (
                    <th key={role} className="px-6 py-4 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold text-center">{role}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-xs">
                {permissionsList.map((perm) => (
                  <tr key={perm.key} className="hover:bg-surface-container-highest/10 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-on-surface">{perm.label}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5">{perm.desc}</p>
                      <code className="text-[9px] font-mono text-primary mt-1 block font-bold">{perm.key}</code>
                    </td>
                    {roleHeaders.map((role) => {
                      const hasPerm = rolePermissions[role].includes(perm.key);
                      return (
                        <td key={role} className="px-6 py-4 text-center">
                          {hasPerm 
                            ? <CheckCircle className="w-4 h-4 text-green-400 mx-auto" />
                            : <XCircle className="w-4 h-4 text-on-surface-variant/30 mx-auto" />
                          }
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  );
}
