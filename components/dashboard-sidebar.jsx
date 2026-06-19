"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMockStore } from "@/lib/mock-store";
import logo from "../app/icon.png"
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
  Plus,
  FileText,
  LogOut,
  BookOpen
} from "lucide-react";
import Image from "next/image";

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
  docs: BookOpen,
};

export default function DashboardSidebar({ mobile = false, onNavigate }) {
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
    { name: "Documentation", path: "/docs", icon: "docs", perm: "api_keys.view" },
  ];

  return (
    <aside className={`${mobile ? "relative h-full w-full" : "fixed left-0 top-0 hidden h-screen w-70 lg:flex"} border-r border-outline-variant bg-surface-container-low flex-col py-4 z-50`}>
      {/* Brand Logo & Workspace Switcher */}
      <div className="px-6 mb-8 space-y-4">
        <div>
          <Link href="/dashboard" className="flex items-center gap-2 mb-1">
            <div className="w-10 h-10  rounded flex items-center justify-center">
              {/* <Cpu className="w-4 h-4 text-on-primary" /> */}
              <Image src={logo} alt="TMCP Logo" width={24} height={24} />
            </div>
            <h1 className="text-lg font-bold tracking-tight text-primary">TMCP</h1>
          </Link>
          {/* <p className="font-mono text-xs text-on-surface-variant px-1">v1.0.0</p> */}
        </div>

        {/* Workspace Switcher */}
        {workspaces && workspaces.length > 0 && (
          <div className="px-1">
            {workspaces.length > 1 ? (
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
            ) : (
              <div className="w-full bg-surface-container-highest/40 border border-outline-variant/30 rounded px-3 py-2 text-xs text-on-surface-variant font-semibold truncate select-none flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-primary/60"></span>
                {workspaces[0].name}
              </div>
            )}
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
              onClick={onNavigate}
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
