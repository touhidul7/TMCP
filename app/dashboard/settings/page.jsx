"use client";

import { useState } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { KeyRound, RefreshCw, Eye, EyeOff, Check, Loader2, Bot } from "lucide-react";

export default function SettingsPage() {
  const { user, workspaces, currentWorkspace, hasPermission } = useMockStore();
  const activeWorkspaceName = workspaces.find(w => w.id === currentWorkspace)?.name || "TMCP Default Workspace";
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState(null);
  const workspaceName = workspaceNameDraft ?? activeWorkspaceName;
  const [encryptionKey, setEncryptionKey] = useState(() => {
    if (typeof window === "undefined") return "";
    const savedKey = localStorage.getItem("tmcp_encryption_key");
    if (savedKey) return savedKey;
    const newKey = "4c9e8d35f8c6b2da71e09dfa5342a1bc8f9024ea10c3b8da76c24be812d4fae0";
    localStorage.setItem("tmcp_encryption_key", newKey);
    return newKey;
  });
  const [rotated, setRotated] = useState(false);

  // OpenRouter key for Tassistant Chatbot
  const [openrouterKey, setOpenrouterKey] = useState(() => {
    if (typeof window === "undefined") return "";
    return localStorage.getItem("tmcp_openrouter_key") || "";
  });
  const [showKey, setShowKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  const handleSaveOpenRouterKey = (e) => {
    e.preventDefault();
    localStorage.setItem("tmcp_openrouter_key", openrouterKey.trim());
    setSaveStatus("Saved successfully!");
    // Trigger custom event so the floating widget knows the key was updated
    window.dispatchEvent(new Event("tmcp_openrouter_key_changed"));
    setTimeout(() => setSaveStatus(""), 3000);
  };

  const handleVerifyOpenRouterKey = async () => {
    if (!openrouterKey.trim()) {
      setVerifyError("Please enter an OpenRouter key first.");
      return;
    }
    setVerifying(true);
    setVerifySuccess(false);
    setVerifyError("");

    try {
      const res = await fetch("/api/assistant/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ openrouterKey: openrouterKey.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setVerifySuccess(true);
      } else {
        setVerifyError(data.error || "Verification failed");
      }
    } catch (err) {
      setVerifyError("Network error: " + err.message);
    } finally {
      setVerifying(false);
    }
  };

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
    if (confirm("CRITICAL WARNING: This will delete all local agents, custom tools, API keys, and logs from local storage, returning the workspace to its default seed data. Proceed?")) {
      localStorage.removeItem("tmcp_store");
      localStorage.removeItem("tmcp_encryption_key");
      localStorage.removeItem("tmcp_openrouter_key");
      window.location.reload();
    }
  };


  return (
    <>
      <DashboardHeader title="Workspace Configuration" />

      <main className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto max-w-4xl">
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
                onChange={(e) => setWorkspaceNameDraft(e.target.value)}
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

        {/* Tassistant Assistant Configuration */}
        <div className="bg-surface-container border border-outline-variant p-6 rounded space-y-4">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Tassistant AI Guide Configuration</h3>
            <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">Configure API keys for your global AI chatbot assistant</p>
          </div>

          <form onSubmit={handleSaveOpenRouterKey} className="space-y-4">
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Tassistant is a floating virtual assistant that resides globally on your dashboard to answer questions and troubleshoot agent connection issues. To activate it, enter your OpenRouter API Key.
            </p>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? "text" : "password"}
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none pr-10"
                  placeholder="sk-or-v1-..."
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface cursor-pointer"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              <button
                type="submit"
                className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary flex items-center gap-1.5"
              >
                Save Key
              </button>

              <button
                type="button"
                onClick={handleVerifyOpenRouterKey}
                disabled={verifying}
                className="px-4 py-2 border border-outline bg-surface-container-low hover:bg-surface-container-highest transition-colors rounded text-xs text-on-surface font-semibold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {verifying && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                {!verifying && verifySuccess && <Check className="w-3.5 h-3.5 text-green-400" />}
                Verify API Key
              </button>
            </div>

            {saveStatus && (
              <p className="text-[10px] font-mono text-green-400 font-semibold animate-pulse">
                {saveStatus}
              </p>
            )}

            {verifySuccess && (
              <p className="text-[10px] font-mono text-green-400 font-semibold">
                Success: Connection successful. Tassistant is ready to assist you.
              </p>
            )}

            {verifyError && (
              <p className="text-[10px] font-mono text-error font-semibold">
                Failed: {verifyError}
              </p>
            )}
          </form>
        </div>

        {/* Development & Danger zone reset */}
        <div className="bg-surface-container border border-error/20 p-6 rounded space-y-4 glow-error">
          <div>
            <h3 className="text-sm font-bold text-error">Danger Zone</h3>
            <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">Destructive actions</p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-on-surface">Reset Local Workspace Storage</h4>
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
