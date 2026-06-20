"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import { KeyRound, Plus, Trash2, Loader2, ShieldCheck, AlertTriangle, RefreshCw, Copy, Check } from "lucide-react";

const ROTATE_BASE_PATHS = {
  "gemini-rotate": "/api/gemini/v1",
  "openrouter-rotate": "/api/openrouter/v1"
};

async function authHeaders() {
  const { data: { session } } = await supabase.auth.getSession();
  const headers = { "Content-Type": "application/json" };
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}

function statusBadge(status) {
  if (status === "cooling") return "bg-warning/15 text-warning border-warning/30";
  if (status === "disabled") return "bg-surface-container-highest text-on-surface-variant border-outline-variant";
  return "bg-green-500/10 text-green-400 border-green-500/20";
}

export default function KeyPoolManager({ toolAccountId, providerLabel, toolSlug }) {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKey, setNewKey] = useState("");
  const [newLabel, setNewLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const basePath = ROTATE_BASE_PATHS[toolSlug] || "/api/v1";
  const baseUrl = typeof window !== "undefined" ? `${window.location.origin}${basePath}` : basePath;

  const copyBaseUrl = async () => {
    await navigator.clipboard.writeText(baseUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  const loadKeys = useCallback(async () => {
    try {
      const res = await fetch(`/api/tool-accounts/${toolAccountId}/keys`, { headers: await authHeaders() });
      const data = await res.json();
      if (data.success) setKeys(data.keys || []);
      else setError(data.error || "Failed to load keys");
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setLoading(false);
    }
  }, [toolAccountId]);

  // Initial load — fetch inline so state is only set after the awaited response.
  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/tool-accounts/${toolAccountId}/keys`, { headers: await authHeaders() });
        const data = await res.json();
        if (!active) return;
        if (data.success) setKeys(data.keys || []);
        else setError(data.error || "Failed to load keys");
      } catch (err) {
        if (active) setError("Network error: " + err.message);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [toolAccountId]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newKey.trim()) return;
    setAdding(true);
    setError("");
    try {
      const res = await fetch(`/api/tool-accounts/${toolAccountId}/keys`, {
        method: "POST",
        headers: await authHeaders(),
        body: JSON.stringify({ key: newKey.trim(), label: newLabel.trim() || null })
      });
      const data = await res.json();
      if (data.success) {
        setNewKey("");
        setNewLabel("");
        await loadKeys();
      } else {
        setError(data.error || "Failed to add key");
      }
    } catch (err) {
      setError("Network error: " + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (keyId) => {
    if (!confirm("Remove this API key from the rotation pool?")) return;
    setError("");
    try {
      const res = await fetch(`/api/tool-accounts/${toolAccountId}/keys?keyId=${encodeURIComponent(keyId)}`, {
        method: "DELETE",
        headers: await authHeaders()
      });
      const data = await res.json();
      if (data.success) await loadKeys();
      else setError(data.error || "Failed to remove key");
    } catch (err) {
      setError("Network error: " + err.message);
    }
  };

  return (
    <div className="mt-3 p-4 border border-outline-variant/60 rounded bg-surface-container-lowest space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <KeyRound className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-bold text-on-surface">{providerLabel} Key Pool</span>
          <span className="text-[9px] font-mono text-on-surface-variant">({keys.length} key{keys.length === 1 ? "" : "s"})</span>
        </div>
        <button onClick={loadKeys} className="text-on-surface-variant hover:text-on-surface cursor-pointer" title="Refresh">
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dedicated OpenAI-compatible base URL for this pool */}
      <div className="rounded border border-primary/20 bg-primary/5 p-2.5 space-y-1">
        <p className="text-[9px] font-bold uppercase font-mono tracking-wider text-on-surface-variant">OpenAI-Compatible Base URL</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate text-[11px] font-bold text-primary font-mono">{baseUrl}</code>
          <button onClick={copyBaseUrl} className="shrink-0 flex items-center gap-1 px-2 py-1 bg-surface-container border border-outline-variant rounded text-[9px] font-bold text-on-surface hover:bg-surface-container-high cursor-pointer">
            {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <p className="text-[9px] text-on-surface-variant">Use this as the base URL in any OpenAI-compatible app, with a TMCP agent API key as the bearer token.</p>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-[10px] text-on-surface-variant"><Loader2 className="w-3 h-3 animate-spin" /> Loading keys…</div>
      ) : (
        <div className="space-y-1.5">
          {keys.map((k) => (
            <div key={k.id} className="flex items-center justify-between gap-2 p-2 bg-surface-container rounded border border-outline-variant/40">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold border uppercase ${statusBadge(k.status)}`}>
                  {k.status}
                </span>
                <span className="text-[11px] font-semibold text-on-surface truncate">{k.label || "Unnamed key"}</span>
                <span className="text-[10px] font-mono text-on-surface-variant">{k.key_hint}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-[9px] font-mono text-green-400" title="Successful calls">{k.success_count}✓</span>
                <span className="text-[9px] font-mono text-error/80" title="Failed calls">{k.failure_count}✕</span>
                <button onClick={() => handleDelete(k.id)} className="text-error/70 hover:text-error cursor-pointer" title="Remove key">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
          {keys.length === 0 && (
            <div className="flex items-center gap-2 p-2 text-[10px] text-on-surface-variant">
              <AlertTriangle className="w-3.5 h-3.5 text-warning" />
              No keys yet. Add at least one API key so requests can be routed.
            </div>
          )}
        </div>
      )}

      <form onSubmit={handleAdd} className="flex flex-col sm:flex-row gap-2">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder="Label (optional)"
          className="sm:w-36 bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-[11px] text-on-surface focus:border-primary outline-none"
        />
        <input
          type="password"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
          placeholder="Paste a provider API key"
          className="flex-1 bg-surface-container border border-outline-variant rounded px-2.5 py-1.5 text-[11px] text-on-surface focus:border-primary outline-none font-mono"
        />
        <button
          type="submit"
          disabled={adding || !newKey.trim()}
          className="px-3 py-1.5 bg-primary text-on-primary font-bold text-[11px] rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
          Add Key
        </button>
      </form>

      {error && <p className="text-[10px] font-mono text-error">{error}</p>}

      <p className="flex items-center gap-1.5 text-[9px] text-on-surface-variant">
        <ShieldCheck className="w-3 h-3 text-green-400" /> Keys are encrypted (AES-256-GCM) and never returned to the browser.
      </p>
    </div>
  );
}
