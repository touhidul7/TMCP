"use client";

import { useState } from "react";
import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Puzzle, ChevronRight, SearchX } from "lucide-react";

export default function ToolsPage() {
  const router = useRouter();
  const { tools, toolAccounts, hasPermission } = useMockStore();
  const [searchTerm, setSearchTerm] = useState("");
  const [activeCategory, setActiveCategory] = useState("All");

  const categories = ["All", "AI/LLM", "Communication", "Marketing", "Productivity", "Storage", "Enrichment", "Infrastructure", "Payments", "Custom"];

  const getAccountCount = (toolId) => {
    return toolAccounts.filter((a) => a.tool_id === toolId).length;
  };

  const filteredTools = tools.filter((tool) => {
    const matchesSearch =
      tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.provider.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      activeCategory === "All" ||
      (activeCategory === "Custom" && tool.tool_type !== "built_in") ||
      tool.category === activeCategory;

    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <DashboardHeader title="Tools Registry" />

      <main className="p-4 sm:p-6 space-y-6 flex-1 overflow-y-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-on-surface">Platform Tools</h1>
            <p className="text-xs text-on-surface-variant mt-1">
              Browse available built-in integrations or register your own custom API / MCP gateways.
            </p>
          </div>
          {hasPermission("tools.add") && (
            <button
              onClick={() => router.push("/dashboard/tools/add")}
              className="px-4 py-2 bg-primary text-on-primary font-semibold text-sm rounded flex items-center gap-2 hover:brightness-110 active:scale-95 transition-all cursor-pointer glow-primary"
            >
              <Plus className="w-4 h-4" />
              Register New Tool
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-surface-container-low border border-outline-variant p-4 rounded">
          <div className="flex flex-wrap gap-1 w-full md:w-auto">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setActiveCategory(category)}
                className={`px-3 py-1.5 rounded text-xs font-semibold font-mono uppercase transition-all cursor-pointer ${
                  activeCategory === category
                    ? "bg-primary text-on-primary font-bold"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-4 h-4" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-surface-container-lowest border border-outline-variant rounded pl-10 pr-4 py-1.5 text-xs text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-outline/70"
              placeholder="Search tools by name..."
            />
          </div>
        </div>

        {/* Tools Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTools.map((tool) => {
            const accCount = getAccountCount(tool.id);
            return (
              <div
                key={tool.id}
                className="bg-surface-container border border-outline-variant hover:border-primary/50 transition-all rounded p-5 flex flex-col justify-between group relative overflow-hidden"
              >
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-surface-container-high rounded flex items-center justify-center border border-outline-variant text-primary group-hover:scale-105 transition-transform">
                        {tool.official_website_url ? (
                          <img
                            src={`https://www.google.com/s2/favicons?sz=64&domain=${tool.official_website_url}`}
                            alt={tool.name}
                            onError={(e) => {
                              e.target.style.display = "none";
                            }}
                            className="w-6 h-6 object-contain"
                          />
                        ) : (
                          <Puzzle className="w-4 h-4" />
                        )}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-on-surface">{tool.name}</h3>
                        <p className="font-mono text-[9px] text-on-surface-variant">{tool.provider}</p>
                      </div>
                    </div>
                    <span
                      className={`px-1.5 py-0.5 rounded font-mono text-[8px] font-bold ${
                        tool.tool_type === "built_in"
                          ? "bg-secondary-container text-on-secondary-container border border-outline-variant"
                          : tool.tool_type === "custom_mcp"
                          ? "bg-primary/10 text-primary border border-primary/20"
                          : "bg-tertiary/10 text-tertiary border border-tertiary/20"
                      }`}
                    >
                      {tool.tool_type.replace("_", " ").toUpperCase()}
                    </span>
                  </div>

                  <p className="text-xs text-on-surface-variant line-clamp-2 mb-4 leading-relaxed">
                    {tool.description}
                  </p>
                </div>

                <div className="pt-4 border-t border-outline-variant/30 flex justify-between items-center mt-auto">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        tool.is_enabled ? "bg-green-400 animate-pulse" : "bg-outline"
                      }`}
                    ></span>
                    <span className="text-[10px] text-on-surface-variant font-semibold">
                      {accCount} connected account{accCount !== 1 ? "s" : ""}
                    </span>
                  </div>

                  <button
                    onClick={() => router.push(`/dashboard/tools/${tool.id}`)}
                    className="text-primary hover:underline text-xs font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    Manage
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}

          {filteredTools.length === 0 && (
            <div className="col-span-full py-16 text-center border border-dashed border-outline-variant rounded bg-surface-container-lowest">
              <SearchX className="text-outline w-8 h-8 mb-2" />
              <p className="text-sm text-on-surface-variant">No tools found matching current filters.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
