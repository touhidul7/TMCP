"use client";

import { useState } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import PermissionGuard from "@/components/permission-guard";
import { UserPlus, X } from "lucide-react";

export default function UsersPage() {
  const { users, inviteUser, changeUserRole, removeUser, hasPermission, user: currentUser } = useMockStore();

  return (
    <PermissionGuard permission="users.view">
      <UsersPageContent
        users={users}
        inviteUser={inviteUser}
        changeUserRole={changeUserRole}
        removeUser={removeUser}
        hasPermission={hasPermission}
        currentUser={currentUser}
      />
    </PermissionGuard>
  );
}

function UsersPageContent({ users, inviteUser, changeUserRole, removeUser, hasPermission, currentUser }) {

  const [showInviteForm, setShowInviteForm] = useState(false);
  const [inviteName, setInviteName] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("Viewer");

  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteFeedback, setInviteFeedback] = useState(null); // { type: 'success'|'error', msg }

  const handleInviteSubmit = async (e) => {
    e.preventDefault();
    if (!inviteName || !inviteEmail) return;
    setInviteLoading(true);
    setInviteFeedback(null);

    const res = await inviteUser(inviteName, inviteEmail, inviteRole);
    setInviteLoading(false);
    if (res && res.error) {
      setInviteFeedback({ type: 'error', msg: res.error });
    } else {
      setInviteFeedback({ type: 'success', msg: `Invitation sent to ${inviteEmail}!` });
      setInviteName("");
      setInviteEmail("");
      setInviteRole("Viewer");
      // Close after a short delay
      setTimeout(() => {
        setShowInviteForm(false);
        setInviteFeedback(null);
      }, 2000);
    }
  };

  const handleRoleChange = (userId, role) => {
    const res = changeUserRole(userId, role);
    if (res.error) {
      alert(res.error);
    }
  };

  const handleRemoveUser = (userId) => {
    if (confirm("Are you sure you want to remove this member from the workspace?")) {
      const res = removeUser(userId);
      if (res.error) {
        alert(res.error);
      }
    }
  };

  return (
    <>
      <DashboardHeader title="Workspace Users" />

      <main className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto max-w-6xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-on-surface">Team Directory</h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Invite team members, assign workspace roles, and control access permissions.
            </p>
          </div>
          {hasPermission("users.invite") && (
            <button
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="px-4 py-2 bg-primary text-on-primary font-semibold text-sm rounded flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary"
            >
              {showInviteForm ? <X className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
              {showInviteForm ? "Close Form" : "Invite User"}
            </button>
          )}
        </div>

        {/* Invite User Panel Form */}
        {showInviteForm && (
          <form onSubmit={handleInviteSubmit} className="p-6 bg-surface-container border border-outline-variant rounded space-y-4 max-w-xl">
            <h3 className="text-sm font-bold text-on-surface">Send Workspace Invitation</h3>

            {inviteFeedback && (
              <div className={`px-4 py-2.5 rounded text-xs font-semibold border ${
                inviteFeedback.type === 'success'
                  ? 'bg-green-500/10 border-green-500/30 text-green-400'
                  : 'bg-error-container border-error/30 text-on-error-container'
              }`}>
                {inviteFeedback.msg}
              </div>
            )}
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={inviteName}
                  onChange={(e) => setInviteName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none"
                  placeholder="e.g. John Miller"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none"
                  placeholder="john@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Workspace Role</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none cursor-pointer"
              >
                <option value="Admin">Admin (High permissions)</option>
                <option value="Developer">Developer (Manage tools/keys)</option>
                <option value="Operator">Operator (Approve actions)</option>
                <option value="Viewer">Viewer (Read-only)</option>
              </select>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowInviteForm(false); setInviteFeedback(null); }}
                className="px-4 py-1.5 border border-outline-variant hover:bg-surface-container-low transition-colors rounded text-xs text-on-surface-variant font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={inviteLoading}
                className="px-5 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {inviteLoading ? "Sending..." : "Send Invite"}
              </button>
            </div>
          </form>
        )}

        {/* Users Table Grid */}
        <div className="bg-surface-container border border-outline-variant rounded overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-lowest">
            <h3 className="text-sm font-bold text-on-surface">Active Members</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-lowest border-b border-outline-variant">
                  <th className="px-6 py-3.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">User Name</th>
                  <th className="px-6 py-3.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Email</th>
                  <th className="px-6 py-3.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Role</th>
                  <th className="px-6 py-3.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold">Joined Date</th>
                  <th className="px-6 py-3.5 font-mono text-[10px] text-on-surface-variant uppercase tracking-wider font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30 text-xs">
                {users.map((member) => (
                  <tr key={member.id} className="hover:bg-surface-container-highest/10 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-primary font-bold">
                          {member.name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-semibold text-on-surface">{member.name}</span>
                        {member.id === currentUser?.id && (
                          <span className="px-1.5 py-0.2 rounded font-mono text-[8px] bg-primary/20 text-primary border border-primary/25 font-bold">YOU</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-on-surface-variant">{member.email}</td>
                    <td className="px-6 py-4">
                      {hasPermission("users.change_role") && member.role !== "Owner" && member.id !== currentUser?.id ? (
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value)}
                          className="bg-surface-container-lowest border border-outline-variant rounded px-2.5 py-1 text-xs text-on-surface focus:border-primary cursor-pointer font-mono"
                        >
                          <option value="Admin">Admin</option>
                          <option value="Developer">Developer</option>
                          <option value="Operator">Operator</option>
                          <option value="Viewer">Viewer</option>
                        </select>
                      ) : (
                        <span className="px-2.5 py-1 bg-surface-container-high border border-outline-variant rounded font-mono text-[10px] uppercase font-semibold text-on-surface">
                          {member.role}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono text-on-surface-variant">
                      {member.joined_at.slice(0, 10)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {hasPermission("users.remove") && member.role !== "Owner" && member.id !== currentUser?.id && (
                        <button
                          onClick={() => handleRemoveUser(member.id)}
                          className="px-2.5 py-1 bg-error/15 border border-error/20 hover:bg-error/20 rounded font-bold text-error cursor-pointer"
                        >
                          Remove
                        </button>
                      )}
                    </td>
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
