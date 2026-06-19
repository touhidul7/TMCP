"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { buildGatewaySnippets } from "@/lib/docs/gateway-docs";

export default function GatewayCodeTabs({ baseUrl, toolSlug, featureKey, accountId, compact = false }) {
  const [activeTab, setActiveTab] = useState("curl");
  const [copied, setCopied] = useState(false);
  const snippets = buildGatewaySnippets({ baseUrl, toolSlug, featureKey, accountId });
  const tabs = [
    { id: "curl", label: "cURL" },
    { id: "javascript", label: "JS" },
    { id: "python", label: "Python" }
  ];

  const copySnippet = async () => {
    await navigator.clipboard.writeText(snippets[activeTab]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <div className="border border-outline-variant/50 rounded overflow-hidden bg-surface-container-lowest">
      <div className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-low">
        <div className="flex">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-[10px] font-bold font-mono uppercase border-r border-outline-variant/30 cursor-pointer ${
                activeTab === tab.id
                  ? "bg-primary/10 text-primary"
                  : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={copySnippet}
          className="mr-2 px-2.5 py-1 bg-surface-container-high border border-outline-variant rounded text-[10px] font-bold text-on-surface flex items-center gap-1 cursor-pointer hover:bg-surface-container-highest"
        >
          {copied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className={`bg-[#0d1117] overflow-x-auto ${compact ? "p-3 text-[10px]" : "p-4 text-[11px]"} leading-relaxed`}>
        <code className="text-[#c9d1d9] font-mono whitespace-pre">{snippets[activeTab]}</code>
      </pre>
    </div>
  );
}
