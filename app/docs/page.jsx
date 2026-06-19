"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import GatewayCodeTabs from "@/components/gateway-code-tabs";
import { ProductSignal, PublicFooter, PublicHeader } from "@/components/public-shell";
import { useMockStore } from "@/lib/mock-store";
import { GATEWAY_ENDPOINTS, buildGatewaySnippets, getGatewaySchemas } from "@/lib/docs/gateway-docs";
import { BookOpen, Check, Copy, FileJson, KeyRound, Lock, Network, ShieldCheck, Terminal } from "lucide-react";

const DOC_SECTIONS = [
  { id: "getting-started", label: "Getting Started" },
  { id: "endpoints", label: "Endpoints" },
  { id: "authentication", label: "Authentication" },
  { id: "examples", label: "Code Examples" },
  { id: "schemas", label: "Schemas" },
  { id: "tools", label: "Tool Reference" }
];

export default function PublicDocumentationPage() {
  const { tools, features, toolAccounts, agents, apiKeys, permissions } = useMockStore();
  const [copied, setCopied] = useState(null);
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-domain.com";
  const schemas = getGatewaySchemas();

  const connectedToolDocs = useMemo(() => {
    return toolAccounts
      .map((account) => {
        const tool = tools.find((item) => item.id === account.tool_id);
        if (!tool || tool.is_enabled === false) return null;
        const toolFeatures = features.filter((feature) => feature.tool_id === tool.id && feature.is_enabled !== false);
        return { account, tool, features: toolFeatures };
      })
      .filter(Boolean);
  }, [features, toolAccounts, tools]);

  const firstDoc = connectedToolDocs[0];
  const firstFeature = firstDoc?.features?.[0];
  const snippets = buildGatewaySnippets({
    baseUrl,
    toolSlug: firstDoc?.tool?.slug || "serper",
    featureKey: firstFeature?.feature_key || "serper.search",
    accountId: firstDoc?.account?.id || ""
  });

  const copyText = async (id, text) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <main>
        <section className="border-b border-outline-variant bg-surface-container-lowest">
          <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 lg:grid-cols-[1fr_420px] lg:px-8">
            <div>
              <div className="mb-4 flex items-center gap-2 text-primary">
                <BookOpen className="h-4 w-4" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Public Documentation</span>
              </div>
              <h1 className="max-w-3xl text-3xl font-black tracking-tight text-on-surface sm:text-5xl">
                TMCP Gateway API reference
              </h1>
              <p className="mt-5 max-w-3xl text-sm leading-7 text-on-surface-variant">
                Learn how agents authenticate, discover available tools, execute feature keys, request documentation,
                and handle approval-gated actions through the TMCP gateway.
              </p>
              <div className="mt-8 grid gap-3 sm:grid-cols-4">
                <Metric label="Tools" value={tools.length} />
                <Metric label="Connected" value={toolAccounts.length} />
                <Metric label="Agents" value={agents.length} />
                <Metric label="Keys" value={apiKeys.filter((key) => key.status !== "revoked").length} />
              </div>
            </div>
            <ProductSignal />
          </div>
        </section>

        {/* Quick navigation */}
        <nav className="sticky top-16 z-30 border-b border-outline-variant bg-background/95 backdrop-blur">
          <div className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-5 py-2 lg:px-8">
            {DOC_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#${section.id}`}
                className="whitespace-nowrap rounded px-3 py-1.5 text-xs font-semibold text-on-surface-variant transition-colors hover:bg-surface-container hover:text-on-surface"
              >
                {section.label}
              </a>
            ))}
          </div>
        </nav>

        <section id="getting-started" className="mx-auto grid max-w-7xl scroll-mt-28 grid-cols-1 gap-4 px-5 py-10 lg:grid-cols-4 lg:px-8">
          <InfoPanel icon={KeyRound} title="1. Create Key" text="Generate a one-time visible API key for an active agent." />
          <InfoPanel icon={Network} title="2. Connect Tools" text="Connect provider accounts and store credentials encrypted." />
          <InfoPanel icon={ShieldCheck} title="3. Grant Permissions" text="Allow specific feature keys and configure limits or approvals." />
          <InfoPanel icon={Terminal} title="4. Execute" text="Send gateway requests with tool, action, input, and optional account_id." />
        </section>

        <section id="endpoints" className="mx-auto grid max-w-7xl scroll-mt-28 grid-cols-1 gap-6 px-5 pb-10 xl:grid-cols-3 lg:px-8">
          <div className="xl:col-span-2 overflow-hidden rounded border border-outline-variant bg-surface-container">
            <div className="border-b border-outline-variant bg-surface-container-lowest px-6 py-4">
              <h2 className="text-sm font-bold text-on-surface">Endpoint Reference</h2>
              <p className="mt-0.5 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                Base URL: {baseUrl}/api/gateway
              </p>
            </div>
            <div className="divide-y divide-outline-variant/30">
              {GATEWAY_ENDPOINTS.map((endpoint) => (
                <div key={endpoint.path} className="flex flex-col justify-between gap-3 px-6 py-4 md:flex-row md:items-center">
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 rounded border px-2 py-0.5 text-[9px] font-mono font-bold ${
                      endpoint.method === "POST"
                        ? "border-green-500/20 bg-green-500/10 text-green-400"
                        : "border-blue-500/20 bg-blue-500/10 text-blue-400"
                    }`}>
                      {endpoint.method}
                    </span>
                    <div>
                      <code className="text-xs font-bold text-primary">{endpoint.path}</code>
                      <p className="mt-1 text-xs text-on-surface-variant">{endpoint.description}</p>
                    </div>
                  </div>
                  {endpoint.path === "/api/gateway/docs" && (
                    <button
                      type="button"
                      onClick={() => copyText("docs-curl", snippets.docsCurl)}
                      className="flex w-fit cursor-pointer items-center gap-1 rounded border border-outline-variant bg-surface-container-high px-3 py-1.5 text-[10px] font-bold text-on-surface hover:bg-surface-container-highest"
                    >
                      {copied === "docs-curl" ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
                      Copy docs cURL
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div id="authentication" className="scroll-mt-28 rounded border border-outline-variant bg-surface-container p-6">
            <div className="mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-bold text-on-surface">Authentication</h2>
            </div>
            <p className="text-xs leading-relaxed text-on-surface-variant">
              Use an agent API key in the bearer header. TMCP resolves the workspace, agent, permissions, approval requirements, and daily limits from that key.
            </p>
            <div className="mt-4 overflow-x-auto rounded border border-outline-variant/40 bg-[#0d1117] p-4">
              <code className="whitespace-pre text-[11px] font-mono text-[#c9d1d9]">Authorization: Bearer mcp_live_xxxxxxxxxxxx</code>
            </div>
            <Link href="/login" className="mt-4 inline-flex text-xs font-bold text-primary hover:underline">
              Sign in to create keys
            </Link>
          </div>
        </section>

        <section id="examples" className="mx-auto max-w-7xl scroll-mt-28 px-5 pb-10 lg:px-8">
          <div className="overflow-hidden rounded border border-outline-variant bg-surface-container">
            <div className="flex flex-col justify-between gap-3 border-b border-outline-variant bg-surface-container-lowest px-6 py-4 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-sm font-bold text-on-surface">Code Examples</h2>
                <p className="mt-0.5 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                  cURL, JavaScript, and Python for the current example feature
                </p>
              </div>
              <Link href="/login" className="text-xs font-bold text-primary hover:underline">
                Connect tools for account-specific examples
              </Link>
            </div>
            <div className="p-6">
              <GatewayCodeTabs
                baseUrl={baseUrl}
                toolSlug={firstDoc?.tool?.slug || "serper"}
                featureKey={firstFeature?.feature_key || "serper.search"}
                accountId={firstDoc?.account?.id || ""}
              />
            </div>
          </div>
        </section>

        <section id="schemas" className="mx-auto grid max-w-7xl scroll-mt-28 grid-cols-1 gap-6 px-5 pb-10 xl:grid-cols-2 lg:px-8">
          <SchemaPanel title="Execute Request" data={schemas.execute_request} />
          <SchemaPanel title="Gateway Responses" data={{ ...schemas.execute_success, ...schemas.approval_response }} />
        </section>

        <section id="tools" className="mx-auto max-w-7xl scroll-mt-28 px-5 pb-16 lg:px-8">
          <div className="overflow-hidden rounded border border-outline-variant bg-surface-container">
            <div className="border-b border-outline-variant bg-surface-container-lowest px-6 py-4">
              <h2 className="text-sm font-bold text-on-surface">Tool Feature Reference</h2>
              <p className="mt-0.5 text-[10px] font-mono uppercase tracking-wider text-on-surface-variant">
                Public examples use current workspace data when available.
              </p>
            </div>
            <div className="divide-y divide-outline-variant/30">
              {connectedToolDocs.map(({ account, tool, features: toolFeatures }) => (
                <div key={account.id} className="grid grid-cols-1 gap-4 px-6 py-5 lg:grid-cols-3">
                  <div>
                    <h3 className="text-sm font-bold text-on-surface">{tool.name}</h3>
                    <p className="mt-1 text-[10px] font-mono text-on-surface-variant">{tool.slug} / {account.label}</p>
                    <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{tool.description}</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:col-span-2">
                    {toolFeatures.map((feature) => {
                      const permCount = permissions.filter((perm) => perm.tool_account_id === account.id && perm.feature_key === feature.feature_key).length;
                      return (
                        <div key={`${account.id}-${feature.feature_key}`} className="rounded border border-outline-variant/50 bg-surface-container-low p-3">
                          <div className="flex justify-between gap-2">
                            <code className="text-[11px] font-bold text-primary">{feature.feature_key}</code>
                            <span className="text-[8px] font-mono text-on-surface-variant">{permCount} perms</span>
                          </div>
                          <p className="mt-1 text-[11px] leading-relaxed text-on-surface-variant">{feature.description}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {connectedToolDocs.length === 0 && (
                <div className="p-10 text-center text-sm text-on-surface-variant">
                  Sign in and connect a tool account to generate live account-specific documentation.
                </div>
              )}
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function Metric({ label, value }) {
  return (
    <div className="rounded border border-outline-variant bg-surface-container p-4">
      <p className="text-[9px] font-mono uppercase tracking-widest text-on-surface-variant">{label}</p>
      <p className="mt-1 text-xl font-bold text-on-surface">{value}</p>
    </div>
  );
}

function InfoPanel({ icon: Icon, title, text }) {
  return (
    <div className="rounded border border-outline-variant bg-surface-container p-5">
      <Icon className="mb-3 h-4 w-4 text-primary" />
      <h2 className="text-sm font-bold text-on-surface">{title}</h2>
      <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{text}</p>
    </div>
  );
}

function SchemaPanel({ title, data }) {
  return (
    <div className="overflow-hidden rounded border border-outline-variant bg-surface-container">
      <div className="flex items-center gap-2 border-b border-outline-variant bg-surface-container-lowest px-5 py-3">
        <FileJson className="h-4 w-4 text-primary" />
        <h2 className="text-sm font-bold text-on-surface">{title}</h2>
      </div>
      <div className="divide-y divide-outline-variant/20">
        {Object.entries(data).map(([key, value]) => (
          <div key={key} className="grid grid-cols-1 gap-2 px-5 py-3 md:grid-cols-3">
            <code className="text-[11px] font-bold text-primary">{key}</code>
            <p className="text-xs leading-relaxed text-on-surface-variant md:col-span-2">{String(value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
