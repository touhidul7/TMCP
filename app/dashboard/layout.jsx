"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import DashboardSidebar from "@/components/dashboard-sidebar";
import Tassistant from "@/components/tassistant";
import { Menu, X } from "lucide-react";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
      } else {
        setUser(session.user);
      }
      setLoading(false);
    };

    checkUser();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!session) {
          router.push("/login");
        } else {
          setUser(session.user);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground relative">
      {/* Sidebar Navigation */}
      <DashboardSidebar />

      {/* Main Panel Viewport */}
      <div className="w-full lg:ml-[280px] lg:w-[calc(100%-280px)] min-h-screen flex flex-col bg-background relative">
        <div className="lg:hidden sticky top-0 z-50 h-14 border-b border-outline-variant bg-surface flex items-center justify-between px-4">
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-2 rounded border border-outline-variant bg-surface-container text-on-surface"
            aria-label="Open dashboard navigation"
          >
            <Menu className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold text-primary">TMCP</span>
          <button
            onClick={() => router.push("/docs")}
            className="text-[10px] font-mono font-bold uppercase tracking-wider text-on-surface-variant"
          >
            Docs
          </button>
        </div>
        {children}
      </div>

      {mobileNavOpen && (
        <div className="fixed inset-0 z-[70] lg:hidden">
          <button
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
            onClick={() => setMobileNavOpen(false)}
            aria-label="Close navigation overlay"
          />
          <div className="absolute left-0 top-0 h-full w-[min(86vw,320px)] shadow-2xl shadow-black/40">
            <button
              onClick={() => setMobileNavOpen(false)}
              className="absolute right-3 top-3 z-10 p-2 rounded bg-surface-container-high text-on-surface"
              aria-label="Close dashboard navigation"
            >
              <X className="w-4 h-4" />
            </button>
            <DashboardSidebar mobile onNavigate={() => setMobileNavOpen(false)} />
          </div>
        </div>
      )}

      {/* Tassistant Global AI Assistant */}
      <Tassistant />
    </div>
  );
}
