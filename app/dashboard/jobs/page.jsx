"use client";

import { useEffect, useMemo, useState } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { CalendarClock, Play, Trash2 } from "lucide-react";

const inputCls = "w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none";
const labelCls = "block text-[10px] font-semibold text-on-surface-variant uppercase font-mono mb-1";

export default function JobsPage() {
  const { agents, apiKeys, toolAccounts, tools, features, hasPermission } = useMockStore();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);

  const [name, setName] = useState("");
  const [agentId, setAgentId] = useState("");
  const [apiKeyId, setApiKeyId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [featureKey, setFeatureKey] = useState("");
  const [inputJson, setInputJson] = useState("{}");
  const [interval, setIntervalMinutes] = useState("60");
  const [deliveryType, setDeliveryType] = useState("none");
  const [deliveryTarget, setDeliveryTarget] = useState("");

  const loadJobs = async () => {
    try {
      const res = await fetch("/api/jobs");
      const body = await res.json();
      if (body.success) setJobs(body.jobs);
      else setError(body.error || "Failed to load jobs");
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadJobs(); }, []);

  const agentKeys = useMemo(
    () => apiKeys.filter((k) => k.agent_id === agentId && k.status === "active"),
    [apiKeys, agentId]
  );
  const accountFeatures = useMemo(() => {
    const account = toolAccounts.find((a) => a.id === accountId);
    if (!account) return [];
    return features.filter((f) => f.tool_id === account.tool_id && f.is_enabled !== false);
  }, [toolAccounts, features, accountId]);

  const accountLabel = (id) => {
    const a = toolAccounts.find((x) => x.id === id);
    if (!a) return "Unknown account";
    const t = tools.find((x) => x.id === a.tool_id);
    return `${t?.name || "Tool"} — ${a.label}`;
  };
  const agentName = (id) => agents.find((a) => a.id === id)?.name || "Unknown agent";

  const createJob = async (e) => {
    e.preventDefault();
    let input;
    try {
      input = JSON.parse(inputJson || "{}");
    } catch {
      alert("Input must be valid JSON");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          agent_id: agentId,
          api_key_id: apiKeyId,
          tool_account_id: accountId,
          feature_key: featureKey,
          input,
          interval_minutes: parseInt(interval, 10) || 60,
          delivery: deliveryType === "none" ? { type: "none" } : { type: deliveryType, target: deliveryTarget }
        })
      });
      const body = await res.json();
      if (!body.success) {
        alert(body.error || "Failed to create job");
      } else {
        setName(""); setFeatureKey(""); setInputJson("{}");
        loadJobs();
      }
    } finally {
      setSaving(false);
    }
  };

  const patchJob = async (jobId, patch) => {
    const res = await fetch(`/api/jobs/${jobId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch)
    });
    const body = await res.json();
    if (!body.success) alert(body.error || "Failed to update job");
    loadJobs();
  };

  const deleteJob = async (jobId) => {
    if (!confirm("Delete this scheduled job?")) return;
    const res = await fetch(`/api/jobs/${jobId}`, { method: "DELETE" });
    const body = await res.json();
    if (!body.success) alert(body.error || "Failed to delete job");
    loadJobs();
  };

  const canEdit = hasPermission("agents.edit");

  return (
    <>
      <DashboardHeader title="Scheduled Jobs" />

      <main className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto max-w-6xl">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Scheduled Workflows</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Run an allowed tool action on an interval — through the same permission, rate-limit, and audit pipeline as
            live agent calls — and deliver the result to a webhook or email. Requires the platform scheduler
            (Vercel Cron hitting <code className="font-mono">/api/cron/run-jobs</code> with <code className="font-mono">CRON_SECRET</code>).
          </p>
        </div>

        {canEdit && (
          <form onSubmit={createJob} className="bg-surface-container border border-outline-variant rounded p-4 space-y-4">
            <h3 className="text-xs font-bold text-on-surface flex items-center gap-2">
              <CalendarClock className="w-3.5 h-3.5" /> New Job
            </h3>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Job Name *</label>
                <input className={inputCls} required value={name} onChange={(e) => setName(e.target.value)} placeholder="Daily competitor search" />
              </div>
              <div>
                <label className={labelCls}>Interval (minutes, min 5) *</label>
                <input className={inputCls} required type="number" min="5" value={interval} onChange={(e) => setIntervalMinutes(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Agent *</label>
                <select className={inputCls} required value={agentId} onChange={(e) => { setAgentId(e.target.value); setApiKeyId(""); }}>
                  <option value="">Select agent…</option>
                  {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>API Key *</label>
                <select className={inputCls} required value={apiKeyId} onChange={(e) => setApiKeyId(e.target.value)} disabled={!agentId}>
                  <option value="">Select key…</option>
                  {agentKeys.map((k) => <option key={k.id} value={k.id}>{k.name} ({k.key_prefix}…)</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Connected Account *</label>
                <select className={inputCls} required value={accountId} onChange={(e) => { setAccountId(e.target.value); setFeatureKey(""); }}>
                  <option value="">Select account…</option>
                  {toolAccounts.map((a) => <option key={a.id} value={a.id}>{accountLabel(a.id)}</option>)}
                </select>
              </div>
              <div>
                <label className={labelCls}>Feature Key *</label>
                <input className={`${inputCls} font-mono`} required list="job-features" value={featureKey}
                  onChange={(e) => setFeatureKey(e.target.value)} placeholder="serper.search" />
                <datalist id="job-features">
                  {accountFeatures.map((f) => <option key={f.feature_key} value={f.feature_key} />)}
                </datalist>
              </div>
            </div>

            <div>
              <label className={labelCls}>Input (JSON)</label>
              <textarea className={`${inputCls} font-mono min-h-20`} value={inputJson} onChange={(e) => setInputJson(e.target.value)} />
            </div>

            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Deliver Result Via</label>
                <select className={inputCls} value={deliveryType} onChange={(e) => setDeliveryType(e.target.value)}>
                  <option value="none">No delivery (log only)</option>
                  <option value="webhook">Webhook (POST JSON)</option>
                  <option value="email">Email</option>
                </select>
              </div>
              {deliveryType !== "none" && (
                <div>
                  <label className={labelCls}>{deliveryType === "webhook" ? "Webhook URL" : "Email Address"} *</label>
                  <input className={`${inputCls} font-mono`} required value={deliveryTarget} onChange={(e) => setDeliveryTarget(e.target.value)}
                    placeholder={deliveryType === "webhook" ? "https://example.com/hooks/tmcp" : "ops@example.com"} />
                </div>
              )}
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={saving}
                className="px-4 py-1.5 bg-primary text-on-primary font-bold text-xs rounded hover:brightness-110 active:scale-95 transition-all cursor-pointer disabled:opacity-50">
                {saving ? "Creating…" : "Create Job"}
              </button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          <h3 className="text-sm font-bold text-on-surface">Jobs</h3>
          {loading && <p className="text-xs text-on-surface-variant">Loading…</p>}
          {error && <p className="text-xs text-error">{error}</p>}
          {!loading && jobs.length === 0 && (
            <p className="text-xs text-on-surface-variant">No scheduled jobs yet.</p>
          )}

          {jobs.map((job) => (
            <div key={job.id} className="bg-surface-container border border-outline-variant rounded p-4 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-48">
                <div className="flex items-center gap-2">
                  <span className={`inline-block w-2 h-2 rounded-full ${job.is_enabled ? "bg-primary" : "bg-outline-variant"}`} />
                  <span className="text-xs font-bold text-on-surface">{job.name}</span>
                  <code className="text-[10px] font-mono text-on-surface-variant">{job.feature_key}</code>
                </div>
                <p className="text-[10px] text-on-surface-variant mt-1">
                  {agentName(job.agent_id)} · every {job.interval_minutes} min · next {job.next_run_at ? new Date(job.next_run_at).toLocaleString() : "—"}
                  {job.last_status && <> · last: <span className={job.last_status === "success" ? "text-primary" : "text-error"}>{job.last_status}</span></>}
                  {job.last_error && <> — {job.last_error.slice(0, 120)}</>}
                </p>
              </div>
              {canEdit && (
                <div className="flex items-center gap-2">
                  <button onClick={() => patchJob(job.id, { run_now: true })} title="Run at next scheduler tick"
                    className="p-1.5 rounded border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high cursor-pointer">
                    <Play className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => patchJob(job.id, { is_enabled: !job.is_enabled })}
                    className="px-2.5 py-1.5 rounded border border-outline-variant text-[10px] font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high cursor-pointer">
                    {job.is_enabled ? "Disable" : "Enable"}
                  </button>
                  <button onClick={() => deleteJob(job.id)}
                    className="p-1.5 rounded border border-outline-variant text-error/80 hover:text-error hover:bg-surface-container-high cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>
    </>
  );
}
