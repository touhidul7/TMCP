"use client";

import { useMockStore } from "@/lib/mock-store";
import DashboardHeader from "@/components/dashboard-header";
import { useRouter } from "next/navigation";
import { Puzzle, Unplug, Network } from "lucide-react";

export default function ConnectionsPage() {
  const router = useRouter();
  const { toolAccounts, tools, disconnectToolAccount, hasPermission } = useMockStore();

  const getToolInfo = (toolId) => {
    return tools.find((t) => t.id === toolId) || { name: "Unknown Tool", provider: "Unknown" };
  };

  const handleDisconnect = (accountId) => {
    if (confirm("Are you sure you want to disconnect this account? Agents using this account will lose access.")) {
      disconnectToolAccount(accountId);
    }
  };

  return (
    <>
      <DashboardHeader title="Connected Accounts" />

      <main className="p-6 space-y-6 flex-1 overflow-y-auto max-w-6xl">
        <div>
          <h1 className="text-xl font-bold text-on-surface">External Connections</h1>
          <p className="text-xs text-on-surface-variant mt-1">
            Overview of all active third-party account authentications mapped within your workspace.
          </p>
        </div>

        <div className="bg-surface-container border border-outline-variant rounded overflow-hidden">
          <div className="px-6 py-4 border-b border-outline-variant bg-surface-container-lowest">
            <h3 className="text-sm font-bold text-on-surface">Connections Matrix</h3>
          </div>

          <div className="divide-y divide-outline-variant/30">
            {toolAccounts.map((account) => {
              const tool = getToolInfo(account.tool_id);
              return (
                <div key={account.id} className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-surface-container-highest/10 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-surface-container-high rounded flex items-center justify-center border border-outline-variant text-primary font-bold">
                      {tool.official_website_url ? (
                        <img 
                          src={`https://www.google.com/s2/favicons?sz=64&domain=${tool.official_website_url}`}
                          alt={tool.name}
                          className="w-6 h-6 object-contain"
                          onError={(e) => { e.target.style.display = "none"; }}
                        />
                      ) : (
                        <Puzzle className="w-4 h-4" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-on-surface">{account.label}</span>
                        <span className="px-1.5 py-0.5 rounded font-mono text-[8px] bg-green-500/10 text-green-400 border border-green-500/20 uppercase font-semibold">
                          {account.status}
                        </span>
                      </div>
                      <p className="text-xs text-on-surface-variant mt-0.5">
                        Tool: <span className="text-on-surface font-semibold">{tool.name}</span> ({tool.provider})
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6 sm:self-center">
                    <div className="text-left sm:text-right font-mono text-xs">
                      <p className="text-on-surface">{account.account_email || "system@gateway.local"}</p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 uppercase tracking-wider font-semibold">Auth Type: {account.auth_type.replace("_", " ")}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => router.push(`/dashboard/tools/${account.tool_id}`)}
                        className="px-3 py-1.5 border border-outline hover:bg-surface-container-high rounded text-xs text-on-surface font-semibold cursor-pointer"
                      >
                        Settings
                      </button>
                      
                      {hasPermission("tools.disconnect_account") && (
                        <button
                          onClick={() => handleDisconnect(account.id)}
                          className="p-2 hover:bg-error/10 text-error rounded cursor-pointer"
                          title="Disconnect account"
                        >
                          <Unplug className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {toolAccounts.length === 0 && (
              <div className="p-16 text-center bg-surface-container-lowest">
                <Network className="text-outline w-10 h-10 mb-2" />
                <p className="text-sm text-on-surface-variant">No external accounts connected. Go to the Tools menu to add integrations.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
