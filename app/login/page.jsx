"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMockStore } from "@/lib/mock-store";
import { Network } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { handleLogin } = useMockStore();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("Owner");
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email) {
      setError("Email is required");
      return;
    }
    
    const loggedUser = handleLogin(email, password);
    if (isSignUp) {
      // Create owner-level workspace by default
      loggedUser.role = "Owner";
    } else {
      loggedUser.role = role;
    }
    // Update local storage role
    localStorage.setItem("tmcp_user", JSON.stringify(loggedUser));

    router.push("/dashboard");
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Blur Ambient Background Elements */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full -translate-x-1/2 -translate-y-1/2 blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-tertiary/5 rounded-full translate-x-1/2 translate-y-1/2 blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 glassmorphic p-8 rounded-lg glow-primary relative z-10">
        <div className="flex flex-col items-center">
          <div className="w-12 h-12 bg-primary rounded flex items-center justify-center mb-3 glow-primary">
            <Network className="text-on-primary w-5 h-5" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-on-surface text-center">
            {isSignUp ? "Create new Workspace" : "Sign in to TMCP Gateway"}
          </h2>
          <p className="mt-2 text-xs text-on-surface-variant font-mono">
            {isSignUp ? "Become the Workspace Owner" : "Select credentials to access Dashboard"}
          </p>
        </div>

        {error && (
          <div className="p-3 bg-error-container text-on-error-container border border-error/20 rounded text-xs">
            {error}
          </div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 font-mono uppercase tracking-wider">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-outline/50"
                placeholder="admin@tmcp.io"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-on-surface-variant mb-1 font-mono uppercase tracking-wider">
                Password
              </label>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all placeholder:text-outline/50"
                placeholder="••••••••"
              />
            </div>

            {!isSignUp && (
              <div>
                <label className="block text-xs font-semibold text-on-surface-variant mb-1 font-mono uppercase tracking-wider">
                  Select Member Role (For Mock Testing)
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded px-3 py-2 text-sm text-on-surface focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all cursor-pointer"
                >
                  <option value="Owner">Owner (Full Permissions)</option>
                  <option value="Admin">Admin (High Management)</option>
                  <option value="Developer">Developer (Can Add Tools/Keys)</option>
                  <option value="Operator">Operator (Can Approve Actions)</option>
                  <option value="Viewer">Viewer (Read-only Access)</option>
                </select>
              </div>
            )}
          </div>

          <div>
            <button
              type="submit"
              className="w-full py-2.5 px-4 bg-primary text-on-primary font-bold text-sm rounded hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer glow-primary"
            >
              {isSignUp ? "Initialize Workspace" : "Enter Platform"}
            </button>
          </div>
        </form>

        <div className="text-center pt-4 border-t border-outline-variant/30">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError("");
            }}
            className="text-xs text-primary hover:underline font-semibold cursor-pointer"
          >
            {isSignUp ? "Already have an account? Sign In" : "Need a new workspace? Initialize Workspace Owner"}
          </button>
        </div>
      </div>
    </div>
  );
}
