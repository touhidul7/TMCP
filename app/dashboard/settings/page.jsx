"use client";

import { useState, useEffect } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { supabase } from "@/lib/supabase/client";
import { ShieldCheck, Eye, EyeOff, Check, Loader2, Trash2 } from "lucide-react";

async function getAuthHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { "Content-Type": "application/json" };
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

export default function SettingsPage() {
  const { user, workspaces, currentWorkspace, hasPermission } = useMockStore();
  const activeWorkspaceName = workspaces.find(w => w.id === currentWorkspace)?.name || "TMCP Default Workspace";
  const [workspaceNameDraft, setWorkspaceNameDraft] = useState(null);
  const workspaceName = workspaceNameDraft ?? activeWorkspaceName;
  // OpenRouter key for Tassistant Chatbot — stored encrypted server-side, never in the browser.
  const [openrouterKey, setOpenrouterKey] = useState("");
  const [keyConfigured, setKeyConfigured] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [verifyError, setVerifyError] = useState("");
  const [saveStatus, setSaveStatus] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch("/api/assistant/key", { headers: await getAuthHeaders() });
        const data = await res.json();
        if (active && data.success) setKeyConfigured(Boolean(data.configured));
      } catch {
        // Non-fatal: treat as not configured if we cannot reach the server.
      }
    })();
    return () => { active = false; };
  }, []);

  const handleSaveOpenRouterKey = async (e) => {
    e.preventDefault();
    setVerifyError("");
    setVerifySuccess(false);
    if (!openrouterKey.trim()) {
      setVerifyError("Please enter an OpenRouter key first.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/assistant/key", {
        method: "POST",
        headers: await getAuthHeaders(),
        body: JSON.stringify({ openrouterKey: openrouterKey.trim() })
      });
      const data = await res.json();
      if (data.success) {
        setKeyConfigured(true);
        setOpenrouterKey("");
        setSaveStatus("Saved securely on the server.");
        // Tell the floating widget the key state changed.
        window.dispatchEvent(new Event("tmcp_openrouter_key_changed"));
        setTimeout(() => setSaveStatus(""), 3000);
      } else {
        setVerifyError(data.error || "Failed to save key");
      }
    } catch (err) {
      setVerifyError("Network error: " + err.message);
    } finally {
      setSaving(false);
    }
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
        headers: await getAuthHeaders(),
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

  const handleRemoveOpenRouterKey = async () => {
    if (!confirm("Remove the saved OpenRouter key? Tassistant will stop working until a new key is added.")) return;
    setSaving(true);
    setVerifyError("");
    try {
      const res = await fetch("/api/assistant/key", { method: "DELETE", headers: await getAuthHeaders() });
      const data = await res.json();
      if (data.success) {
        setKeyConfigured(false);
        setOpenrouterKey("");
        setSaveStatus("Key removed.");
        window.dispatchEvent(new Event("tmcp_openrouter_key_changed"));
        setTimeout(() => setSaveStatus(""), 3000);
      } else {
        setVerifyError(data.error || "Failed to remove key");
      }
    } catch (err) {
      setVerifyError("Network error: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleResetWorkspace = () => {
    if (confirm("CRITICAL WARNING: This will delete all local agents, custom tools, API keys, and logs from local storage, returning the workspace to its default seed data. Proceed?")) {
      localStorage.removeItem("tmcp_store");
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

        {/* Encryption status */}
        <div className="bg-surface-container border border-outline-variant p-6 rounded space-y-4">
          <div>
            <h3 className="text-sm font-bold text-on-surface">Credentials Encryption (AES-256-GCM)</h3>
            <p className="text-[10px] text-on-surface-variant font-mono uppercase tracking-wider mt-0.5">Server-managed encryption for stored tokens</p>
          </div>

          <div className="space-y-4">
            <p className="text-xs text-on-surface-variant leading-relaxed">
              Third-party credentials (Gmail tokens, API keys, database passwords, and similar) are encrypted at rest
              with AES-256-GCM before they are stored. The master encryption key is held only in the server
              environment (<code className="font-mono text-on-surface">APP_ENCRYPTION_KEY</code>) and is never sent to
              the browser, embedded in the app, or exposed in this page.
            </p>

            <div className="flex items-center gap-2 bg-surface-container-lowest p-3 rounded border border-green-500/20 text-xs">
              <ShieldCheck className="text-green-400 w-4 h-4 shrink-0" />
              <span className="text-on-surface font-semibold">Encryption active</span>
              <span className="text-on-surface-variant">— key managed securely server-side.</span>
            </div>
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
              Tassistant is a floating virtual assistant that resides globally on your dashboard to answer questions and troubleshoot agent connection issues. To activate it, enter your OpenRouter API Key. The key is encrypted and stored on the server — it is never kept in your browser.
            </p>

            {keyConfigured && (
              <div className="flex items-center justify-between gap-2 bg-surface-container-lowest p-3 rounded border border-green-500/20 text-xs">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="text-green-400 w-4 h-4 shrink-0" />
                  <span className="text-on-surface font-semibold">A key is configured</span>
                  <span className="text-on-surface-variant">— enter a new key below to replace it.</span>
                </span>
                <button
                  type="button"
                  onClick={handleRemoveOpenRouterKey}
                  disabled={saving}
                  className="px-2.5 py-1 border border-error/30 bg-error/10 hover:bg-error/20 rounded text-[10px] font-bold text-error flex items-center gap-1 cursor-pointer disabled:opacity-50"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              </div>
            )}

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showKey ? "text" : "password"}
                  value={openrouterKey}
                  onChange={(e) => setOpenrouterKey(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary outline-none pr-10"
                  placeholder={keyConfigured ? "Enter a new key to replace the saved one" : "sk-or-v1-..."}
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
                disabled={saving}
                className="px-4 py-2 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
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
