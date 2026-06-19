import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Code2,
  Cpu,
  Globe,
  Layers,
  Mail,
  ShieldCheck,
  Sparkles,
  Workflow,
  Zap
} from "lucide-react";
import { PublicFooter, PublicHeader } from "@/components/public-shell";

export const metadata = {
  title: "About — TMCP Tool Gateway",
  description:
    "TMCP is a secure control plane that gives AI agents governed access to real tools. Built by Touhidul Islam Shadhin, web developer and automation specialist."
};

const principles = [
  {
    icon: ShieldCheck,
    title: "Security by default",
    text: "Provider credentials are encrypted at rest, never exposed to agents, and every action resolves to a single auditable identity."
  },
  {
    icon: Workflow,
    title: "Governed automation",
    text: "Feature-level permissions, daily limits, and approval gates keep autonomous workflows inside guardrails you define."
  },
  {
    icon: Layers,
    title: "One normalized surface",
    text: "Agents talk to a single gateway for discovery, execution, status, and documentation — no per-tool integration sprawl."
  }
];

const stack = [
  { icon: Cpu, label: "Next.js App Router" },
  { icon: Code2, label: "React + Tailwind" },
  { icon: Globe, label: "Supabase Auth & Data" },
  { icon: Zap, label: "Encrypted credential vault" }
];

const milestones = [
  { phase: "Connect", text: "Attach provider accounts for email, search, scraping, databases, SSH, AI models, and custom APIs." },
  { phase: "Govern", text: "Scope each agent key to exact feature keys with limits and approval requirements." },
  { phase: "Execute", text: "Agents call one gateway endpoint and TMCP enforces policy on every request." },
  { phase: "Audit", text: "Every execution is logged with input, output, and approval trail for full traceability." }
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />

      <main>
        {/* Hero */}
        <section className="border-b border-outline-variant bg-surface-container-lowest">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <div className="mb-5 inline-flex items-center gap-2 rounded border border-outline-variant bg-surface-container px-3 py-1.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant">
                About TMCP
              </span>
            </div>
            <h1 className="max-w-3xl text-4xl font-black tracking-tight text-on-surface sm:text-5xl">
              A control plane for trustworthy agent automation
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-on-surface-variant">
              TMCP (Tool Management & Control Plane) was built to solve a single problem: giving AI agents real,
              useful access to external tools without handing over the keys to everything. It sits between your
              agents and your providers, enforcing permissions, approvals, and limits on every action while keeping
              credentials encrypted and out of model context.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/docs"
                className="inline-flex items-center justify-center gap-2 rounded bg-primary px-5 py-3 text-sm font-bold text-on-primary hover:brightness-110"
              >
                Read the documentation
                <BookOpen className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center justify-center gap-2 rounded border border-outline-variant bg-surface-container px-5 py-3 text-sm font-bold text-on-surface hover:bg-surface-container-high"
              >
                Open the dashboard
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </section>

        {/* Mission / principles */}
        <section className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="mb-8 max-w-2xl">
            <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">Why it exists</p>
            <h2 className="mt-2 text-2xl font-bold text-on-surface">
              Automation should be powerful and accountable
            </h2>
            <p className="mt-3 text-sm leading-7 text-on-surface-variant">
              Most agent failures aren&apos;t intelligence problems — they&apos;re access problems. TMCP makes the
              boundary explicit so teams can move fast without giving an autonomous system unlimited reach.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {principles.map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded border border-outline-variant bg-surface-container p-6">
                <Icon className="mb-4 h-5 w-5 text-primary" />
                <h3 className="text-sm font-bold text-on-surface">{title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{text}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works timeline */}
        <section className="border-y border-outline-variant bg-surface-container-low">
          <div className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
            <div className="mb-8 max-w-2xl">
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">The lifecycle</p>
              <h2 className="mt-2 text-2xl font-bold text-on-surface">From connection to audit</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              {milestones.map(({ phase, text }, index) => (
                <div key={phase} className="relative rounded border border-outline-variant bg-surface-container p-6">
                  <span className="text-3xl font-black text-primary/30">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="mt-2 text-sm font-bold text-on-surface">{phase}</h3>
                  <p className="mt-2 text-xs leading-relaxed text-on-surface-variant">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Developer */}
        <section id="developer" className="mx-auto max-w-7xl px-5 py-16 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-[1fr_1.2fr] lg:items-center">
            <div className="rounded-lg border border-outline-variant bg-surface-container p-8">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary text-2xl font-black text-on-primary">
                  TS
                </div>
                <div>
                  <h3 className="text-lg font-bold text-on-surface">Touhidul Islam Shadhin</h3>
                  <p className="text-xs font-mono uppercase tracking-widest text-on-surface-variant">
                    Web Developer &amp; Automation Specialist
                  </p>
                </div>
              </div>
              <p className="mt-5 text-sm leading-7 text-on-surface-variant">
                I design and build web applications and automation systems that connect tools, data, and AI into
                dependable workflows. TMCP is my take on what a production-grade gateway for agent tooling should
                look like — secure, observable, and easy to govern.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href="mailto:touhiduliet@gmail.com"
                  className="inline-flex items-center gap-2 rounded bg-primary px-4 py-2.5 text-xs font-bold text-on-primary hover:brightness-110"
                >
                  <Mail className="h-4 w-4" />
                  touhiduliet@gmail.com
                </a>
                <Link
                  href="/docs"
                  className="inline-flex items-center gap-2 rounded border border-outline-variant bg-surface-container-high px-4 py-2.5 text-xs font-bold text-on-surface hover:bg-surface-container-highest"
                >
                  Explore the gateway
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>

            <div>
              <p className="text-[10px] font-mono font-bold uppercase tracking-widest text-primary">Built with</p>
              <h2 className="mt-2 text-2xl font-bold text-on-surface">A focused, modern stack</h2>
              <p className="mt-3 text-sm leading-7 text-on-surface-variant">
                TMCP is engineered as a single, cohesive platform — authentication, credential storage, permission
                enforcement, and an agent-readable API working together rather than bolted on.
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {stack.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded border border-outline-variant bg-surface-container p-4"
                  >
                    <Icon className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-on-surface">{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-outline-variant bg-surface-container-lowest">
          <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-5 py-14 lg:flex-row lg:items-center lg:px-8">
            <div>
              <h2 className="text-2xl font-bold text-on-surface">Ready to govern your agents?</h2>
              <p className="mt-2 max-w-xl text-sm leading-7 text-on-surface-variant">
                Connect a tool, issue a scoped key, and watch every action flow through a single accountable gateway.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-flex shrink-0 items-center gap-2 rounded bg-primary px-6 py-3 text-sm font-bold text-on-primary hover:brightness-110"
            >
              Get started
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
