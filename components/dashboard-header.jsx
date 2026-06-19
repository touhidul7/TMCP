/* eslint-disable @next/next/no-img-element */
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useMockStore } from "@/lib/mock-store";
import { Search, AlertTriangle, Bell, Terminal, Bot, Puzzle } from "lucide-react";

export default function DashboardHeader({ title }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, approvals, tools, agents, logs } = useMockStore();

  const quickLinks = [
    { label: "Global View", href: "/dashboard" },
    { label: "Logs", href: "/dashboard/logs" },
    { label: "Health", href: "/dashboard/settings" },
  ];

  const [searchQuery, setSearchQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const cleanQuery = searchQuery.trim().toLowerCase();
  
  const filteredTools = cleanQuery && tools ? tools.filter(t => 
    t.name.toLowerCase().includes(cleanQuery) ||
    t.provider.toLowerCase().includes(cleanQuery) ||
    (t.description && t.description.toLowerCase().includes(cleanQuery))
  ) : [];

  const filteredAgents = cleanQuery && agents ? agents.filter(a => 
    a.name.toLowerCase().includes(cleanQuery) ||
    (a.description && a.description.toLowerCase().includes(cleanQuery))
  ) : [];

  const filteredLogs = cleanQuery && logs ? logs.filter(l => 
    (l.tool_name && l.tool_name.toLowerCase().includes(cleanQuery)) ||
    (l.feature_key && l.feature_key.toLowerCase().includes(cleanQuery)) ||
    (l.input && typeof l.input === 'string' && l.input.toLowerCase().includes(cleanQuery)) ||
    (l.input && typeof l.input === 'object' && JSON.stringify(l.input).toLowerCase().includes(cleanQuery))
  ).slice(0, 5) : [];

  const pendingApprovalsCount = approvals.filter(a => a.status === "pending").length;

  return (
    <header className="border-b border-outline-variant bg-surface flex flex-col gap-3 px-4 py-3 sticky top-14 lg:top-0 z-40 xl:flex-row xl:items-center xl:justify-between lg:px-6">
      <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-center xl:gap-6">
        <h2 className="text-base font-bold text-on-surface truncate xl:w-52" title={title || "TMCP Platform"}>
          {title || "TMCP Platform"}
        </h2>
        
        {/* Search */}
        <div ref={searchRef} className="relative w-full md:block xl:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            className="bg-surface-container-lowest border border-outline-variant rounded pl-10 pr-4 py-1.5 w-full md:w-80 text-sm focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-outline/70 text-on-surface"
            placeholder="Search tools, agents, or logs..."
          />
          {isOpen && searchQuery.trim() !== "" && (
            <div className="absolute top-full left-0 mt-2 w-full md:w-96 bg-surface-container-high border border-outline-variant rounded-lg shadow-2xl overflow-hidden z-50 max-h-120 overflow-y-auto backdrop-blur-md bg-opacity-95">
              {filteredTools.length === 0 && filteredAgents.length === 0 && filteredLogs.length === 0 ? (
                <div className="p-6 text-center text-on-surface-variant text-sm">
                  No results found for <span className="font-semibold text-on-surface">&quot;{searchQuery}&quot;</span>
                </div>
              ) : (
                <div className="py-2 text-xs space-y-2">
                  {filteredTools.length > 0 && (
                    <div>
                      <div className="px-3 py-1 font-bold uppercase tracking-wider font-mono text-outline text-[9px] bg-surface-container-highest/45 border-y border-outline-variant/30">
                        Tools ({filteredTools.length})
                      </div>
                      {filteredTools.map(tool => (
                        <button
                          key={tool.id}
                          onClick={() => {
                            router.push(`/dashboard/tools/${tool.id}`);
                            setSearchQuery("");
                            setIsOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-container-highest/60 flex items-center gap-3 transition-colors group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded bg-surface-container-low flex items-center justify-center border border-outline-variant text-primary shrink-0">
                            {tool.official_website_url ? (
                              <img
                                src={`https://www.google.com/s2/favicons?sz=64&domain=${tool.official_website_url}`}
                                alt={tool.name}
                                className="w-5 h-5 object-contain"
                                onError={(e) => { e.target.style.display = "none"; }}
                              />
                            ) : (
                              <Puzzle className="w-4 h-4" />
                            )}
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-on-surface group-hover:text-primary transition-colors text-xs">{tool.name}</div>
                            <div className="text-[10px] text-on-surface-variant font-mono">{tool.provider}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredAgents.length > 0 && (
                    <div>
                      <div className="px-3 py-1 font-bold uppercase tracking-wider font-mono text-outline text-[9px] bg-surface-container-highest/45 border-y border-outline-variant/30">
                        Agents ({filteredAgents.length})
                      </div>
                      {filteredAgents.map(agent => (
                        <button
                          key={agent.id}
                          onClick={() => {
                            router.push(`/dashboard/agents/${agent.id}`);
                            setSearchQuery("");
                            setIsOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-container-highest/60 flex items-center gap-3 transition-colors group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded bg-surface-container-low flex items-center justify-center border border-outline-variant text-primary shrink-0">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-on-surface group-hover:text-primary transition-colors text-xs">{agent.name}</div>
                            <div className="text-[10px] text-on-surface-variant truncate">{agent.description || "No description"}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {filteredLogs.length > 0 && (
                    <div>
                      <div className="px-3 py-1 font-bold uppercase tracking-wider font-mono text-outline text-[9px] bg-surface-container-highest/45 border-y border-outline-variant/30">
                        Logs ({filteredLogs.length})
                      </div>
                      {filteredLogs.map(log => (
                        <button
                          key={log.id}
                          onClick={() => {
                            router.push(`/dashboard/logs`);
                            setSearchQuery("");
                            setIsOpen(false);
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-surface-container-highest/60 flex items-center gap-3 transition-colors group cursor-pointer"
                        >
                          <div className="w-8 h-8 rounded bg-surface-container-low flex items-center justify-center border border-outline-variant text-primary shrink-0">
                            <Terminal className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <div className="font-bold text-on-surface group-hover:text-primary transition-colors flex items-center gap-2 text-xs">
                              <span>{log.tool_name || "Tool"}</span>
                              <span className="text-[9px] text-outline font-normal">({log.feature_key})</span>
                            </div>
                            <div className="text-[10px] text-on-surface-variant truncate font-mono">
                              {typeof log.input === 'object' ? JSON.stringify(log.input) : String(log.input)}
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick links */}
        <div className="hidden gap-4 sm:flex">
          {quickLinks.map((link) => {
            const isActive =
              link.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={
                  isActive
                    ? "text-xs font-semibold text-primary border-b-2 border-primary pb-1"
                    : "text-xs font-semibold text-on-surface-variant hover:text-on-surface transition-colors"
                }
              >
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 xl:gap-4">
        {/* Approvals Quick Access */}
        {pendingApprovalsCount > 0 && (
          <button
            onClick={() => router.push("/dashboard/approvals")}
            className="flex items-center gap-1.5 px-3 py-1 bg-error-container text-on-error-container rounded text-xs font-semibold hover:brightness-110 transition-all cursor-pointer animate-pulse-slow"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            {pendingApprovalsCount} Approval{pendingApprovalsCount > 1 ? "s" : ""} Needed
          </button>
        )}

        <button
          onClick={() => router.push("/dashboard/tools/add")}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary-container text-on-secondary-container rounded text-xs font-semibold hover:bg-surface-container-highest transition-colors active:scale-95 duration-100 cursor-pointer"
        >
          Add Custom Tool
        </button>

        {/* Notifications and status icons */}
        <div className="flex gap-1 border-l border-outline-variant pl-2 ml-1">
          <button
            onClick={() => router.push("/dashboard/approvals")}
            className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container rounded-full relative cursor-pointer"
            title="Approvals"
          >
            <Bell className="w-4 h-4" />
            {pendingApprovalsCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border border-surface"></span>
            )}
          </button>
          
          <button
            onClick={() => router.push("/dashboard/logs")}
            className="p-2 text-on-surface-variant hover:text-primary transition-colors hover:bg-surface-container rounded-full cursor-pointer"
            title="Terminal logs"
          >
            <Terminal className="w-4 h-4" />
          </button>

          <div className="w-8 h-8 rounded-full bg-surface-container-highest flex items-center justify-center text-primary text-xs font-bold font-mono ml-2">
            {user ? user.role.slice(0, 2).toUpperCase() : "VI"}
          </div>
        </div>
      </div>
    </header>
  );
}
