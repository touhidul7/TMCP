"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMockStore } from "@/lib/mock-store";
import {
  LayoutDashboard,
  Puzzle,
  Network,
  Bot,
  Key,
  Users,
  Shield,
  History,
  FileCheck,
  Settings,
  Cpu,
  Plus,
  FileText,
  LogOut
} from "lucide-react";

const iconMap = {
  dashboard: LayoutDashboard,
  extension: Puzzle,
  hub: Network,
  smart_toy: Bot,
  vpn_key: Key,
  group: Users,
  security: Shield,
  history_2: History,
  fact_check: FileCheck,
  settings: Settings,
};

export default function DashboardSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, workspaces, currentWorkspace, switchWorkspace, handleLogout, hasPermission } = useMockStore();

  const menuItems = [
    { name: "Dashboard", path: "/dashboard", icon: "dashboard", perm: "tools.view" },
    { name: "Tools", path: "/dashboard/tools", icon: "extension", perm: "tools.view" },
    { name: "Connections", path: "/dashboard/connections", icon: "hub", perm: "tools.view" },
    { name: "Agents", path: "/dashboard/agents", icon: "smart_toy", perm: "agents.view" },
    { name: "API Keys", path: "/dashboard/api-keys", icon: "vpn_key", perm: "api_keys.view" },
    { name: "Users", path: "/dashboard/users", icon: "group", perm: "users.view" },
    { name: "Roles", path: "/dashboard/roles", icon: "security", perm: "settings.view" },
    { name: "Logs", path: "/dashboard/logs", icon: "history_2", perm: "logs.view" },
    { name: "Approvals", path: "/dashboard/approvals", icon: "fact_check", perm: "approvals.view" },
    { name: "Settings", path: "/dashboard/settings", icon: "settings", perm: "settings.view" },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-[280px] border-r border-outline-variant bg-surface-container-low flex flex-col py-4 z-50">
      {/* Brand Logo & Workspace Switcher */}
      <div className="px-6 mb-8 space-y-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-primary rounded flex items-center justify-center glow-primary">
              <Cpu className="w-4 h-4 text-on-primary" />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-primary">TMCP Gateway</h1>
          </div>
          <p className="font-mono text-xs text-on-surface-variant px-1">v2.4.0-stable</p>
        </div>

        {/* Workspace Switcher */}
        {workspaces && workspaces.length > 0 && (
          <div className="px-1">
            <select
              value={currentWorkspace || ""}
              onChange={(e) => switchWorkspace(e.target.value)}
              className="w-full bg-surface-container-highest border border-outline-variant rounded px-2.5 py-1.5 text-xs text-on-surface focus:border-primary outline-none cursor-pointer font-semibold truncate"
            >
              {workspaces.map(ws => (
                <option key={ws.id} value={ws.id}>
                  {ws.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-2 space-y-1">
        {menuItems.map((item) => {
          if (!hasPermission(item.perm)) return null;
          const isActive = pathname === item.path || (item.path !== "/dashboard" && pathname.startsWith(item.path));
          const Icon = iconMap[item.icon] || Puzzle;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded transition-all duration-150 ${
                isActive
                  ? "text-primary bg-secondary-container/10 border-l-4 border-primary font-medium scale-[0.99]"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* Sidebar Footer */}
      <div className="mt-auto px-6 py-4 space-y-4">
        {hasPermission("tools.add") && (
          <button
            onClick={() => router.push("/dashboard/tools/add")}
            className="w-full py-2.5 px-4 bg-primary text-on-primary font-semibold text-sm rounded flex items-center justify-center gap-2 hover:brightness-110 active:scale-[0.98] transition-all glow-primary cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Register New Tool
          </button>
        )}

        <div className="space-y-2">
          <a
            href="https://docs.google.com/document/d/1AMFSpXXrH0hVG9YY76VYgpTYPJutWbc6gJ6wIOdqN5g/edit?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-1 py-1 text-xs text-on-surface-variant hover:text-on-surface transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            SOP Instructions
          </a>
          <button
            onClick={async () => {
              const { supabase } = await import("@/lib/supabase/client");
              await supabase.auth.signOut();
              handleLogout();
              router.push("/login");
            }}
            className="w-full flex items-center gap-3 px-1 py-1 text-xs text-error/80 hover:text-error transition-colors cursor-pointer text-left font-semibold"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {/* Current Signed In User Profile */}
        {user && (
          <div className="flex items-center gap-3 pt-4 border-t border-outline-variant">
            <div className="w-8 h-8 rounded bg-surface-container-highest flex items-center justify-center text-primary font-bold text-sm">
              {(user.name || user.email || "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-xs font-semibold text-on-surface truncate">{user.name || user.email || "User"}</span>
              <span className="font-mono text-[9px] text-on-surface-variant tracking-wider uppercase">
                {user.role}
              </span>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
