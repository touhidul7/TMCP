"use client";

import { useMockStore } from "@/lib/mock-store";
import { ShieldOff, ArrowLeft } from "lucide-react";
import Link from "next/link";

/**
 * PermissionGuard — wraps a page and shows an "Access Denied" screen
 * if the current user lacks the required permission key.
 *
 * Usage:
 *   <PermissionGuard permission="users.view">
 *     <PageContent />
 *   </PermissionGuard>
 */
export default function PermissionGuard({ permission, children }) {
  const { hasPermission, user } = useMockStore();

  // While user is not yet loaded, render nothing (avoids flicker)
  if (!user) return null;

  if (!hasPermission(permission)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
        {/* Ambient glow */}
        <div className="absolute w-72 h-72 bg-error/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center gap-6 max-w-md">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-error/10 border border-error/20 flex items-center justify-center glow-error">
            <ShieldOff className="w-9 h-9 text-error" />
          </div>

          {/* Text */}
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-on-surface tracking-tight">
              Access Denied
            </h1>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              You don&apos;t have permission to view this page.
              <br />
              Contact your workspace owner to request access.
            </p>
          </div>

          {/* Role badge */}
          <div className="flex items-center gap-2 px-4 py-2 bg-surface-container border border-outline-variant rounded-full">
            <span className="w-2 h-2 rounded-full bg-primary/60" />
            <span className="text-xs font-mono text-on-surface-variant">
              Your role:{" "}
              <span className="text-primary font-bold uppercase tracking-wider">
                {user.role}
              </span>
            </span>
          </div>

          {/* Missing permission */}
          <div className="w-full px-4 py-3 bg-surface-container-low border border-outline-variant rounded text-left">
            <p className="text-[10px] font-mono text-on-surface-variant uppercase tracking-wider mb-1">
              Required permission
            </p>
            <p className="text-xs font-bold text-error font-mono">{permission}</p>
          </div>

          {/* Back button */}
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-on-primary text-sm font-semibold rounded hover:brightness-110 active:scale-[0.98] transition-all glow-primary"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return children;
}
