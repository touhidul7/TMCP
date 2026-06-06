"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMockStore } from "@/lib/mock-store";
import DashboardSidebar from "@/components/dashboard-sidebar";

export default function DashboardLayout({ children }) {
  const router = useRouter();
  const { user } = useMockStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Check if user is present in localStorage or state
    const savedUser = localStorage.getItem("tmcp_user");
    if (!savedUser && !user) {
      router.push("/login");
    }
  }, [user, router]);

  if (!mounted || (!user && !localStorage.getItem("tmcp_user"))) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Sidebar Navigation */}
      <DashboardSidebar />

      {/* Main Panel Viewport */}
      <div className="ml-[280px] w-[calc(100%-280px)] min-h-screen flex flex-col bg-background">
        {children}
      </div>
    </div>
  );
}
