"use client";

import { useState, useEffect } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { KeyRound, RefreshCw } from "lucide-react";

export default function SettingsPage() {
  const { user, workspaces, currentWorkspace, hasPermission } = useMockStore();
  const [workspaceName, setWorkspaceName] = useState("TMCP Default Workspace");
  const [encryptionKey, setEncryptionKey] = useState("");
  const [rotated, setRotated] = useState(false);

  useEffect(() => {
    const activeWs = workspaces.find(w => w.id === currentWorkspace);
    if (activeWs) {
      setWorkspaceName(activeWs.name);
    }

    // Default mock encryption key if not generated
    const savedKey = localStorage.getItem("tmcp_encryption_key");
    if (savedKey) {
      setEncryptionKey(savedKey);
    } else {
      const newKey = "4c9e8d35f8c6b2da71e09dfa5342a1bc8f9024ea10c3b8da76c24be812d4fae0";
      setEncryptionKey(newKey);
      localStorage.setItem("tmcp_encryption_key", newKey);
    }
  }, [workspaces, currentWorkspace]);

  const handleRotateKey = () => {
    if (confirm("WARNING: Rotating the encryption key will require re-encryption of all stored third-party credentials. Proceed?")) {
      const array = new Uint8Array(32);
      window.crypto.getRandomValues(array);
      const newKey = Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
      setEncryptionKey(newKey);
      localStorage.setItem("tmcp_encryption_key", newKey);
      setRotated(true);
      setTimeout(() => setRotated(false), 3000);
    }
  };

  const handleResetWorkspace = () => {
    if (confirm("CRITICAL WARNING: This will delete all mock agents, custom tools, API keys, and logs from local storage, returning the workspace to its default seed data. Proceed?")) {
      localStorage.removeItem("tmcp_store");
      localStorage.removeItem("tmcp_encryption_key");
      window.location.reload();
    }
  };

  return (
    <>
      <DashboardHeader title="Workspace Configuration" />

      <main className="p-6 space-y-6 flex-1 overflow-y-auto max-w-4xl">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Global Settings</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Configure global workspace details, security parameters, and encryption layers.
          </p>
        </div>

        {/* Workspace Details */}
        <div className="bg-surface-container border border-outline-variant p-6 rounded space-y-4">
          <h3 className="text-sm font-bold text-on-surface pb-2 border-b border-outline-variant/30">Workspace Metadata</h3>
          
          <div className="grid grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Workspace Name</label>
              <input
                type="text"
                disabled={!hasPermission("settings.edit")}
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-[9px] font-semibold text-on-surface-variant uppercase font-mono mb-1">Active User Role</label>
              <div className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface-variant font-mono">
                {user ? user.role.toUpperCase() : "VIEWER"}
              </div>
            </div>
          </div>
        </div>

        {/* Encryption keys security parameters */}
        <div className="bg-surface-container border border-outline-variant p-6 rounded space-y-4">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Credentials Encryption (AES-256-GCM)</h3>
            <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">Secret workspace key used to seal client tokens</p>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-on-surface-variant leading-relaxed">
              We secure third-party credentials (like Gmail tokens and Hunter keys) on our database layer using AES-256-GCM encryption. The encryption key below is unique to your workspace and should never be exposed.
            </p>

            <div className="flex items-center gap-2 bg-surface-container-lowest p-3 rounded border border-outline-variant/40 font-mono text-xs select-all">
              <KeyRound className="text-primary w-4 h-4 mr-1" />
              <code className="flex-1 truncate text-on-surface font-bold">
                {encryptionKey}
              </code>
            </div>

            {hasPermission("settings.edit") && (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleRotateKey}
                  className="px-4 py-2 border border-outline bg-surface-container-low hover:bg-surface-container-highest transition-colors rounded text-xs text-on-surface font-semibold flex items-center gap-1.5 cursor-pointer glow-primary"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Rotate Encryption Key
                </button>
                {rotated && (
                  <span className="text-[10px] font-mono text-green-400 font-semibold animate-pulse">
                    Success: Key rotated and data re-sealed.
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Development & Danger zone reset */}
        <div className="bg-surface-container border border-error/20 p-6 rounded space-y-4 glow-error">
          <div>
            <h3 className="text-sm font-bold text-error">Danger Zone</h3>
            <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">Destructive actions</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-on-surface">Reset Mock Database Storage</h4>
              <p className="text-xs text-on-surface-variant max-w-lg">
                Clears all created agents, custom tools, permission matrices, API keys, and logs from local storage, returning the app back to its default state.
              </p>
            </div>

            <button
              onClick={handleResetWorkspace}
              className="px-4 py-2 bg-error/15 border border-error/20 hover:bg-error/30 rounded text-xs font-bold text-error cursor-pointer whitespace-nowrap"
            >
              Reset Storage
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
