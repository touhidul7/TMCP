import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Database,
  FileClock,
  KeyRound,
  LockKeyhole,
  Network,
  ScrollText,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Terminal,
  Workflow
} from "lucide-react";
import { ProductSignal, PublicFooter, PublicHeader } from "@/components/public-shell";

const capabilities = [
  {
    icon: Network,
    title: "Connect Operational Tools",
    text: "Attach provider accounts for search, scraping, email, GitHub, SSH, Google tools, databases, AI models, and custom APIs."
  },
  {
    icon: KeyRound,
    title: "Issue Agent Keys",
    text: "Create scoped API keys per agent so every external workflow resolves to one identity."
  },
  {
    icon: ShieldCheck,
    title: "Control Every Action",
    text: "Grant feature-level permissions, daily limits, and approval gates before tools can be used."
  },
  {
    icon: Terminal,
    title: "Call One Gateway",
    text: "Agents use one normalized API for execution, tool discovery, status, and documentation."
  }
];

const lifecycle = [
  {
    icon: Network,
    step: "01",
    title: "Connect",
    text: "Link provider accounts and store credentials encrypted — agents never see the secrets."
  },
  {
    icon: SlidersHorizontal,
    step: "02",
    title: "Govern",
    text: "Scope each agent key to exact feature keys, with daily limits and approval requirements."
  },
  {
    icon: Terminal,
    step: "03",
    title: "Execute",
    text: "Agents send one gateway request; TMCP enforces policy and routes to the right tool runner."
  },
  {
    icon: FileClock,
    step: "04",
    title: "Audit",
    text: "Every call is logged with input, output, and approval trail for complete traceability."
  }
];

const governance = [
  {
    icon: LockKeyhole,
    title: "Encrypted credential vault",
    text: "Provider tokens and API keys are encrypted at rest and resolved server-side, never returned to the model."
  },
  {
    icon: ShieldCheck,
    title: "Approval-gated actions",
    text: "Mark dangerous features so they pause for human approval before any irreversible operation runs."
  },
  {
    icon: SlidersHorizontal,
    title: "Per-key rate limits",
    text: "Cap daily usage per agent key to contain runaway loops and unexpected cost."
  },
  {
    icon: ScrollText,
    title: "Full audit logs",
    text: "Searchable execution history with feature key, account, status, and payload for every request."
  }
];

const useCases = [
  {
    icon: Workflow,
    title: "Autonomous workflows",
    text: "Let agents enrich leads, send outreach, and update CRMs — each action permission-checked at the gateway."
  },
  {
    icon: Database,
    title: "Data & operations",
    text: "Give agents safe, read-or-write scoped access to databases, sheets, and storage with mutations gated."
  },
  {
    icon: Terminal,
    title: "DevOps automation",
    text: "Run SSH commands, manage repos, and trigger deploys behind approvals and rate limits."
  }
];

export default function Home() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <main>
        {/* Hero */}
        <section className="border-b border-outline-variant bg-surface-container-lowest">
          <div className="mx-auto grid min-h-[calc(100vh-64px)] max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-2 lg:px-8">
            <div className="max-w-2xl">
              <div className="mb-5 inline-flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-1.5">
                <LockKeyhole className="h-3.5 w-3.5 text-primary" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant">Scoped tool access for agents</span>
              </div>
              <h1 className="text-4xl font-black tracking-tight text-on-surface sm:text-5xl lg:text-6xl">
                TMCP Tool Gateway
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-on-surface-variant">
                A secure control plane for connecting real tools to AI agents with account encryption,
                feature permissions, approval queues, rate limits, and audit logs.
              </p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="/docs"
                  className="inline-flex items-center justify-center gap-2 rounded bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:brightness-110"
                >
                  Read Documentation
                  <BookOpen className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 rounded border border-outline-variant bg-surface-container px-5 py-3 text-sm font-bold text-on-surface hover:bg-surface-container-high"
                >
                  Open Dashboard
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
              <div className="mt-8 grid gap-3 text-xs text-on-surface-variant sm:grid-cols-3">
                {["Encrypted credentials", "Approval-gated actions", "Agent-readable docs"].map((item) => (
                  <div key={item} className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <ProductSignal />
          </div>
        </section>

        {/* Capabilities */}
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">Operational surface</p>
            <h2 className="mt-2 text-2xl font-bold text-on-surface">Everything an agent needs, governed in one place</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {capabilities.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded border border-outline-variant bg-surface-container p-5">
                <Icon className="mb-4 h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-on-surface">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="border-y border-outline-variant bg-surface-container-low">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">How it works</p>
              <h2 className="mt-2 text-2xl font-bold text-on-surface">Four steps from connection to audit</h2>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                TMCP standardizes the entire path an agent takes to use a tool — so policy is enforced the same way
                every time, no matter which provider is behind it.
              </p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {lifecycle.map(({ icon: Icon, step, title, text }) => (
                <div key={step} className="relative rounded border border-outline-variant bg-surface-container p-6">
                  <div className="flex items-center justify-between">
                    <Icon className="h-5 w-5 text-primary" />
                    <span className="text-2xl font-black text-primary/25">{step}</span>
                  </div>
                  <h3 className="mt-3 text-sm font-bold text-on-surface">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Governance / security */}
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">Built for control</p>
              <h2 className="mt-2 text-2xl font-bold text-on-surface">Guardrails on every request</h2>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                Autonomy is only safe when access is bounded. TMCP enforces who can do what, how often, and with which
                account — and keeps a record of all of it.
              </p>
              <Link
                href="/docs"
                className="mt-6 inline-flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container-high"
              >
                See the gateway API
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {governance.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded border border-outline-variant bg-surface-container p-5">
                  <Icon className="mb-3 h-5 w-5 text-primary" />
                  <h3 className="text-sm font-bold text-on-surface">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Use cases */}
        <section className="border-y border-outline-variant bg-surface-container-low">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">Where it fits</p>
              <h2 className="mt-2 text-2xl font-bold text-on-surface">One gateway, many workflows</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {useCases.map(({ icon: Icon, title, text }) => (
                <div key={title} className="rounded border border-outline-variant bg-surface-container p-6">
                  <Icon className="mb-4 h-5 w-5 text-primary" />
                  <h3 className="text-sm font-bold text-on-surface">{title}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats */}
        <section className="border-b border-outline-variant bg-surface-container-lowest">
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-14 md:grid-cols-3 lg:px-8">
            <Stat value="4" label="Gateway endpoints" />
            <Stat value="40+" label="Built-in tool integrations" />
            <Stat value="3" label="Snippet languages per tool" />
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="flex flex-col items-start justify-between gap-6 rounded-lg border border-outline-variant bg-surface-container p-8 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <div className="mb-3 inline-flex items-center gap-2 text-primary">
                <Sparkles className="h-4 w-4" />
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest">Get started</span>
              </div>
              <h2 className="text-2xl font-bold text-on-surface">Give your agents tools you can trust them with</h2>
              <p className="mt-2 text-sm leading-7 text-on-surface-variant">
                Connect a provider, issue a scoped key, and route every action through one accountable gateway.
              </p>
            </div>
            <div className="flex shrink-0 flex-col gap-3 sm:flex-row">
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:brightness-110"
              >
                Open Dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/about"
                className="inline-flex items-center justify-center gap-2 rounded border border-outline-variant bg-surface-container-high px-5 py-3 text-sm font-bold text-on-surface hover:bg-surface-container-highest"
              >
                Learn more
              </Link>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}

function Stat({ value, label }) {
  return (
    <div>
      <p className="text-3xl font-black text-on-surface">{value}</p>
      <p className="mt-1 text-xs font-mono uppercase tracking-widest text-on-surface-variant">{label}</p>
    </div>
  );
}
