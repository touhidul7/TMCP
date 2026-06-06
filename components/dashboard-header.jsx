"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMockStore } from "@/lib/mock-store";
import { Search, AlertTriangle, Bell, Terminal } from "lucide-react";

export default function DashboardHeader({ title }) {
  const router = useRouter();
  const { user, approvals } = useMockStore();

  const pendingApprovalsCount = approvals.filter(a => a.status === "pending").length;

  return (
    <header className="h-16 border-b border-outline-variant bg-surface flex items-center justify-between px-6 sticky top-0 z-40">
      <div className="flex items-center gap-6">
        <h2 className="text-base font-bold text-on-surface mr-4">{title || "TMCP Platform"}</h2>
        
        {/* Search */}
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="text"
            className="bg-surface-container-lowest border border-outline-variant rounded pl-10 pr-4 py-1.5 w-80 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-outline/70 text-on-surface"
            placeholder="Search tools, agents, or logs..."
          />
        </div>

        {/* Quick links */}
        <div className="flex gap-4">
          <Link href="/dashboard" className="text-xs font-semibold text-primary border-b-2 border-primary pb-1">
            Global View
          </Link>
          <Link href="/dashboard/logs" className="text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
            Logs
          </Link>
          <Link href="/dashboard/settings" className="text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors">
            Health
          </Link>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Approvals Quick Access */}
        {pendingApprovalsCount > 0 && (
          <button
            onClick={() => router.push("/dashboard/approvals")}
            className="flex items-center gap-1.5 px-3 py-1 bg-error-container text-on-error-container rounded text-xs font-semibold hover:brightness-110 transition-all cursor-pointer animate-pulse-slow"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {pendingApprovalsCount} Approval{pendingApprovalsCount > 1 ? "s" : ""} Needed
          </button>
        )}

        <button
          onClick={() => router.push("/dashboard/tools/add")}
          className="flex items-center gap-1.5 px-4 py-1.5 bg-secondary-container text-on-secondary-container rounded text-xs font-semibold hover:bg-surface-container-highest transition-colors active:scale-95 duration-100 cursor-pointer"
        >
          Add Custom Tool
        </button>

        {/* Notifications and status icons */}
        <div className="flex gap-1 border-l border-outline-variant pl-4 ml-1">
          <button
            onClick={() => router.push("/dashboard/approvals")}
            className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container rounded-full relative cursor-pointer"
            title="Approvals"
          >
            <Bell className="w-4 h-4" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border border-surface"></span>
            )}
          </button>
          
          <button
            onClick={() => router.push("/dashboard/logs")}
            className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container rounded-full cursor-pointer"
            title="Terminal logs"
          >
            <Terminal className="w-4 h-4" />
          </button>

          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-primary text-xs font-bold font-mono ml-2">
            {user ? user.role.slice(0, 2).toUpperCase() : "VI"}
          </div>
        </div>
      </div>
    </header>
  );
}
