"use client";

import { useEffect, useMemo, useState } from "react";
import DashboardHeader from "@/components/dashboard-header";
import { TrendingUp, AlertTriangle, CheckCircle2, XCircle, Clock } from "lucide-react";

// Series + status colors validated (dataviz six checks) against the app surface #1d2027:
// blue/red pass lightness band, chroma, CVD ΔE 66.4, and ≥3:1 contrast. Status hues are the
// fixed status palette, always paired with a text label — never color alone.
const SERIES_SUCCESS = "#3987e5";
const SERIES_ERROR = "#e66767";
const STATUS = {
  active: { color: "#0ca30c", label: "Active" },
  cooling: { color: "#fab219", label: "Cooling" },
  disabled: { color: "#d03b3b", label: "Disabled" }
};

const numberFmt = new Intl.NumberFormat("en-US");
const compact = (n) => (n >= 10000 ? new Intl.NumberFormat("en-US", { notation: "compact" }).format(n) : numberFmt.format(n));

function StatTile({ label, value, hint, icon: Icon }) {
  return (
    <div className="bg-surface-container border border-outline-variant rounded p-4">
      <div className="flex items-center gap-2 text-on-surface-variant">
        {Icon && <Icon className="w-3.5 h-3.5" />}
        <span className="text-[10px] font-semibold uppercase font-mono tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold text-on-surface mt-2">{value}</div>
      {hint && <div className="text-[10px] text-on-surface-variant mt-1">{hint}</div>}
    </div>
  );
}

// Two-series daily line chart (success / errors) with a crosshair + tooltip hover layer.
function DailyChart({ daily }) {
  const [hover, setHover] = useState(null);

  const W = 640, H = 200, PAD_L = 36, PAD_R = 12, PAD_T = 12, PAD_B = 24;
  const innerW = W - PAD_L - PAD_R;
  const innerH = H - PAD_T - PAD_B;
  const n = daily.length;

  const maxY = Math.max(1, ...daily.map((d) => Math.max(d.success, d.error)));
  const niceMax = Math.ceil(maxY / 4) * 4;
  const x = (i) => PAD_L + (n <= 1 ? innerW / 2 : (i / (n - 1)) * innerW);
  const y = (v) => PAD_T + innerH - (v / niceMax) * innerH;
  const path = (key) => daily.map((d, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(d[key]).toFixed(1)}`).join("");

  const yTicks = [0, niceMax / 2, niceMax];
  const xLabelEvery = Math.max(1, Math.floor(n / 5));

  const onMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    const i = Math.round(((px - PAD_L) / innerW) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, i)));
  };

  const last = daily[n - 1];

  return (
    <div className="relative">
      {/* Legend — two series, so identity is never color-alone */}
      <div className="flex items-center gap-4 mb-2">
        <span className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: SERIES_SUCCESS }} /> Successful calls
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-on-surface-variant">
          <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: SERIES_ERROR }} /> Failed / denied
        </span>
      </div>

      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Gateway calls per day"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {yTicks.map((t) => (
          <g key={t}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y(t)} y2={y(t)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
            <text x={PAD_L - 6} y={y(t) + 3} textAnchor="end" fontSize="9" fill="#8f95a3">{compact(t)}</text>
          </g>
        ))}
        {daily.map((d, i) =>
          i % xLabelEvery === 0 ? (
            <text key={d.date} x={x(i)} y={H - 8} textAnchor="middle" fontSize="9" fill="#8f95a3">
              {d.date.slice(5)}
            </text>
          ) : null
        )}

        <path d={path("success")} fill="none" stroke={SERIES_SUCCESS} strokeWidth="2" strokeLinejoin="round" />
        <path d={path("error")} fill="none" stroke={SERIES_ERROR} strokeWidth="2" strokeLinejoin="round" />

        {/* Direct labels at the line ends */}
        {n > 0 && (
          <>
            <text x={W - PAD_R} y={y(last.success) - 5} textAnchor="end" fontSize="9" fontWeight="600" fill="#e1e2ec">{compact(last.success)}</text>
            <text x={W - PAD_R} y={y(last.error) + 11} textAnchor="end" fontSize="9" fontWeight="600" fill="#e1e2ec">{compact(last.error)}</text>
          </>
        )}

        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={PAD_T} y2={PAD_T + innerH} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
            <circle cx={x(hover)} cy={y(daily[hover].success)} r="3.5" fill={SERIES_SUCCESS} stroke="#1d2027" strokeWidth="2" />
            <circle cx={x(hover)} cy={y(daily[hover].error)} r="3.5" fill={SERIES_ERROR} stroke="#1d2027" strokeWidth="2" />
          </g>
        )}
      </svg>

      {hover !== null && (
        <div
          className="absolute pointer-events-none bg-surface-container-highest border border-outline-variant rounded px-2.5 py-1.5 text-[10px] text-on-surface shadow-lg"
          style={{ left: `${(x(hover) / W) * 100}%`, top: 20, transform: x(hover) > W * 0.7 ? "translateX(-105%)" : "translateX(8px)" }}
        >
          <div className="font-mono text-on-surface-variant">{daily[hover].date}</div>
          <div className="mt-0.5"><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: SERIES_SUCCESS }} />{numberFmt.format(daily[hover].success)} succeeded</div>
          <div><span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: SERIES_ERROR }} />{numberFmt.format(daily[hover].error)} failed</div>
        </div>
      )}
    </div>
  );
}

// Single-hue horizontal bar list (magnitude comparison; identity lives in the row labels).
function BarList({ items, valueKey = "calls", valueLabel = "calls" }) {
  const max = Math.max(1, ...items.map((i) => i[valueKey] ?? i.value ?? 0));
  return (
    <div className="space-y-2">
      {items.map((item) => {
        const value = item[valueKey] ?? item.value ?? 0;
        return (
          <div key={item.name} className="group">
            <div className="flex items-center justify-between text-[10px] mb-0.5">
              <span className="text-on-surface truncate pr-2">{item.name}</span>
              <span className="text-on-surface-variant font-mono shrink-0">
                {compact(value)}
                {typeof item.errors === "number" && item.errors > 0 && (
                  <span className="hidden group-hover:inline text-[9px]" style={{ color: SERIES_ERROR }}> · {compact(item.errors)} failed</span>
                )}
              </span>
            </div>
            <div className="h-2 bg-surface-container-lowest rounded-sm overflow-hidden">
              <div
                className="h-full rounded-r"
                style={{ width: `${Math.max(2, (value / max) * 100)}%`, background: SERIES_SUCCESS }}
              />
            </div>
          </div>
        );
      })}
      {items.length === 0 && <p className="text-[10px] text-on-surface-variant">No {valueLabel} recorded in this window.</p>}
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <div className="bg-surface-container border border-outline-variant rounded p-4">
      <h3 className="text-xs font-bold text-on-surface">{title}</h3>
      {subtitle && <p className="text-[10px] text-on-surface-variant mt-0.5 mb-3">{subtitle}</p>}
      {children}
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/analytics/summary")
      .then((r) => r.json())
      .then((body) => {
        if (cancelled) return;
        if (!body.success) setError(body.error || "Failed to load analytics");
        else setData(body);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const totals = data?.totals;
  const successRate = totals?.success_rate != null ? `${Math.round(totals.success_rate * 100)}%` : "—";

  const poolSummary = useMemo(() => {
    if (!data?.key_pool?.length) return null;
    const active = data.key_pool.filter((k) => k.status === "active").length;
    return `${active}/${data.key_pool.length} keys active`;
  }, [data]);

  return (
    <>
      <DashboardHeader title="Usage Analytics" />

      <main className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto max-w-6xl">
        <div>
          <h1 className="text-xl font-bold text-on-surface">Usage &amp; Rotation Analytics</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Last {data?.window_days || 30} days of gateway activity, LLM token consumption, and key-pool health.
          </p>
        </div>

        {loading && <p className="text-xs text-on-surface-variant">Loading analytics…</p>}
        {error && <p className="text-xs" style={{ color: SERIES_ERROR }}>{error}</p>}

        {data && (
          <>
            {/* Headline stats */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <StatTile label="Total calls" value={compact(totals.calls)} hint={`${data.window_days}-day window`} icon={TrendingUp} />
              <StatTile label="Success rate" value={successRate} icon={CheckCircle2} />
              <StatTile label="Avg latency" value={totals.avg_latency_ms != null ? `${numberFmt.format(totals.avg_latency_ms)} ms` : "—"} icon={Clock} />
              <StatTile label="LLM tokens" value={compact(totals.llm_tokens)} hint="via rotate endpoints" icon={TrendingUp} />
              <StatTile
                label="Rescued calls"
                value={compact(totals.rescued_calls)}
                hint="succeeded only via key failover"
                icon={AlertTriangle}
              />
            </div>

            <Card title="Calls per day" subtitle="Successful vs failed/denied gateway calls (UTC days)">
              <DailyChart daily={data.daily} />
            </Card>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card title="Calls by tool" subtitle="Top tools in the window — hover a row for failures">
                <BarList items={data.by_tool} />
              </Card>
              <Card title="Calls by agent" subtitle="Top agents in the window — hover a row for failures">
                <BarList items={data.by_agent} />
              </Card>
            </div>

            <div className="grid lg:grid-cols-2 gap-4">
              <Card title="LLM tokens by model" subtitle="Token usage reported by rotate-endpoint responses">
                <BarList items={data.tokens_by_model} valueKey="tokens" valueLabel="tokens" />
              </Card>

              <Card title="Key pool health" subtitle={poolSummary || "No rotation pools configured"}>
                {data.key_pool.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-[10px]">
                      <thead>
                        <tr className="text-on-surface-variant uppercase font-mono text-[9px]">
                          <th className="text-left py-1.5 font-semibold">Key</th>
                          <th className="text-left py-1.5 font-semibold">Status</th>
                          <th className="text-right py-1.5 font-semibold">OK</th>
                          <th className="text-right py-1.5 font-semibold">Fail</th>
                          <th className="text-right py-1.5 font-semibold">Last success</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.key_pool.map((k, i) => {
                          const st = STATUS[k.status] || STATUS.disabled;
                          const failing = k.failure_count > 0 && !k.last_success_at;
                          return (
                            <tr key={i} className="border-t border-outline-variant/30 text-on-surface">
                              <td className="py-1.5 font-mono">{k.label} {k.key_hint && <span className="text-on-surface-variant">{k.key_hint}</span>}</td>
                              <td className="py-1.5">
                                <span className="inline-flex items-center gap-1.5">
                                  <span className="inline-block w-2 h-2 rounded-full" style={{ background: st.color }} />
                                  {st.label}
                                  {failing && (
                                    <span className="inline-flex items-center gap-0.5" style={{ color: STATUS.disabled.color }}>
                                      <XCircle className="w-3 h-3" /> never succeeded
                                    </span>
                                  )}
                                </span>
                              </td>
                              <td className="py-1.5 text-right font-mono tabular-nums">{numberFmt.format(k.success_count)}</td>
                              <td className="py-1.5 text-right font-mono tabular-nums">{numberFmt.format(k.failure_count)}</td>
                              <td className="py-1.5 text-right font-mono text-on-surface-variant">
                                {k.last_success_at ? k.last_success_at.slice(0, 10) : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[10px] text-on-surface-variant">
                    Connect a rotate tool and add pool keys to see per-key health here.
                  </p>
                )}
              </Card>
            </div>

            {data.truncated && (
              <p className="text-[10px] text-on-surface-variant">
                Note: aggregates are computed over the most recent {numberFmt.format(20000)} log rows in the window.
              </p>
            )}
          </>
        )}
      </main>
    </>
  );
}
