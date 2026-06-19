"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import logo from "@/app/icon.png";
import { ArrowRight, BookOpen, KeyRound, LayoutDashboard, Menu, Network, X } from "lucide-react";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Documentation", href: "/docs" },
  { label: "About", href: "/about" },
  { label: "Sign in", href: "/login" }
];

function isLinkActive(pathname, href) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function PublicHeader() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-outline-variant/70 bg-background/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded border border-outline-variant bg-surface-container">
            <Image src={logo} alt="TMCP logo" width={22} height={22} priority />
          </span>
          <span>
            <span className="block text-sm font-bold text-on-surface">TMCP</span>
            <span className="block text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">Tool Gateway</span>
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => {
            const isActive = isLinkActive(pathname, link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs font-semibold transition-colors ${
                  isActive ? "text-primary" : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href="/login"
            className="hidden items-center gap-2 rounded bg-primary px-3.5 py-2 text-xs font-bold text-on-primary hover:brightness-110 sm:inline-flex"
          >
            Dashboard
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>

          {/* Mobile menu toggle */}
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-9 w-9 items-center justify-center rounded border border-outline-variant bg-surface-container text-on-surface md:hidden"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileOpen && (
        <div className="border-t border-outline-variant bg-background/98 backdrop-blur md:hidden">
          <nav className="mx-auto flex max-w-7xl flex-col gap-1 px-5 py-3">
            {NAV_LINKS.map((link) => {
              const isActive = isLinkActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded px-3 py-2.5 text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-surface-container text-primary"
                      : "text-on-surface-variant hover:bg-surface-container hover:text-on-surface"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="mt-2 inline-flex items-center justify-center gap-2 rounded bg-primary px-4 py-2.5 text-sm font-bold text-on-primary hover:brightness-110"
            >
              Open Dashboard
              <ArrowRight className="h-4 w-4" />
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="border-t border-outline-variant bg-surface-container-low">
      <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 md:grid-cols-4 lg:px-8">
        <div className="md:col-span-2">
          <div className="mb-3 flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded border border-outline-variant bg-surface-container">
              <Image src={logo} alt="TMCP logo" width={22} height={22} />
            </span>
            <span className="text-sm font-bold text-on-surface">TMCP Tool Gateway</span>
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-on-surface-variant">
            A governed API gateway for giving agents controlled access to connected tools, provider accounts, approvals, limits, and execution logs.
          </p>
        </div>

        <FooterGroup title="Product" links={[["Home", "/"], ["Documentation", "/docs"], ["About", "/about"], ["Dashboard", "/login"]]} />
        <div>
          <h3 className="mb-3 text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant">Gateway</h3>
          <div className="space-y-2 text-xs text-on-surface-variant">
            <div className="flex items-center gap-2"><Network className="h-3.5 w-3.5 text-primary" /> Tool routing</div>
            <div className="flex items-center gap-2"><KeyRound className="h-3.5 w-3.5 text-primary" /> Agent API keys</div>
            <div className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-primary" /> Public docs</div>
          </div>
        </div>
      </div>
      <div className="flex flex-col items-center justify-between gap-2 border-t border-outline-variant/60 px-5 py-4 text-center text-[10px] font-mono uppercase tracking-widest text-on-surface-variant sm:flex-row">
        <span>TMCP / Secure tool gateway for agent operations</span>
        <span className="normal-case tracking-normal">
          Built by{" "}
          <Link href="/about" className="font-semibold text-on-surface hover:text-primary">
            Touhidul Islam Shadhin
          </Link>
        </span>
      </div>
    </footer>
  );
}

function FooterGroup({ title, links }) {
  return (
    <div>
      <h3 className="mb-3 text-[10px] font-mono font-bold uppercase tracking-widest text-on-surface-variant">{title}</h3>
      <div className="space-y-2">
        {links.map(([label, href]) => (
          <Link key={href} href={href} className="block text-xs text-on-surface-variant hover:text-on-surface">
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function ProductSignal() {
  return (
    <div className="relative overflow-hidden rounded border border-outline-variant bg-surface-container shadow-2xl shadow-black/20">
      <div className="flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest px-4 py-3">
        <div className="flex items-center gap-2">
          <LayoutDashboard className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-on-surface">Gateway Console</span>
        </div>
        <span className="rounded border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-[9px] font-mono font-bold text-green-400">LIVE</span>
      </div>
      <div className="grid gap-3 p-4 sm:grid-cols-3">
        {[
          ["POST", "/api/gateway/execute", "Run approved tool actions"],
          ["GET", "/api/gateway/tools", "Discover allowed features"],
          ["GET", "/api/gateway/docs", "Agent-readable reference"]
        ].map(([method, path, text]) => (
          <div key={path} className="rounded border border-outline-variant/60 bg-surface-container-low p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[8px] font-mono font-bold text-primary">{method}</span>
              <span className="truncate text-[10px] font-mono text-on-surface">{path}</span>
            </div>
            <p className="text-[11px] leading-relaxed text-on-surface-variant">{text}</p>
          </div>
        ))}
      </div>
      <pre className="border-t border-outline-variant bg-[#0d1117] p-4 text-[11px] leading-relaxed text-[#c9d1d9] overflow-x-auto">{`curl -X POST "/api/gateway/execute" \\
  -H "Authorization: Bearer mcp_live_..." \\
  -d '{"tool":"serper","action":"serper.search"}'`}</pre>
    </div>
  );
}
