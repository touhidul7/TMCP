"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Network } from "lucide-react";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    router.push("/login");
  }, [router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
      <div className="flex flex-col items-center gap-3">
        <div className="w-12 h-12 bg-primary rounded flex items-center justify-center animate-pulse glow-primary">
          <Network className="text-on-primary w-5 h-5" />
        </div>
        <p className="text-sm font-mono text-on-surface-variant">Redirecting to TMCP Tool Gateway...</p>
      </div>
    </div>
  );
}
