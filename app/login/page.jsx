"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { Network } from "lucide-react";
import logo from "../../app/icon.png";
import Image from "next/image";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    const redirectIfSignedIn = (session) => {
      if (!active) return;
      if (session) {
        router.replace("/dashboard");
      } else {
        setCheckingSession(false);
      }
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      redirectIfSignedIn(session);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (session) router.replace("/dashboard");
      }
    );

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  const handleOAuthLogin = async (provider) => {
    setError("");
    setIsLoading(true);
    try {
      const { supabase } = await import("@/lib/supabase/client");
      const { error: oauthErr } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`
        }
      });
      if (oauthErr) throw oauthErr;
    } catch (err) {
      setError(err.message || `Failed to sign in with ${provider}`);
      setIsLoading(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background text-foreground">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Blur Ambient Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tertiary/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 glassmorphic p-8 rounded-lg glow-primary relative z-10">
        <div className="flex flex-col items-center">
          {/* <div className="w-12 h-12 bg-primary rounded flex items-center justify-center mb-3 glow-primary"> */}
            <Image className="border-2 border-white rounded-md mb-3" src={logo} alt="TMCP Logo" width={48} height={48} />
          {/* </div> */}
          <h2 className="text-2xl font-bold tracking-tight text-on-surface text-center">
            Sign in to TMCP Gateway
          </h2>
          <p className="mt-2 text-xs text-on-surface-variant font-mono text-center">
            Continue with your provider to access the Dashboard
          </p>
        </div>

        {error && (
          <div className="p-3 bg-error-container text-on-error-container border border-error/20 rounded text-xs">
            {error}
          </div>
        )}

        <div className="mt-8 space-y-4">
          <button
            onClick={() => handleOAuthLogin("google")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant rounded text-sm font-semibold text-on-surface transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v3.92h6.69a5.74 5.74 0 0 1-2.48 3.77v3.12h4.01c2.34-2.16 3.69-5.32 3.69-8.74z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.97-1.08 7.96-2.91l-4.01-3.12c-1.12.75-2.55 1.19-3.95 1.19-3.05 0-5.63-2.06-6.55-4.83H1.31v3.23A11.99 11.99 0 0 0 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.45 14.33a7.19 7.19 0 0 1 0-4.66V6.44H1.31a11.99 11.99 0 0 0 0 11.12l4.14-3.23z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.96 1.19 15.24 0 12 0 7.31 0 3.23 2.68 1.31 6.58l4.14 3.23c.92-2.77 3.5-4.83 6.55-4.83z"
              />
            </svg>
            Continue with Google
          </button>
          
          <button
            onClick={() => handleOAuthLogin("github")}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-surface-container-low hover:bg-surface-container-high border border-outline-variant rounded text-sm font-semibold text-on-surface transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
          >
            <svg className="w-5 h-5 fill-current text-white" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.385.6.11.82-.26.82-.577v-2.234c-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22v3.293c0 .319.22.694.825.576C20.565 21.795 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
            </svg>
            Continue with GitHub
          </button>
        </div>
      </div>
    </div>
  );
}
