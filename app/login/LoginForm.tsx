"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, ShieldCheck } from "lucide-react";
import AuthDeviceShell from "@/components/AuthDeviceShell";

export default function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Login failed");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthDeviceShell
      ariaLabel="InterviewAI sign in"
      browserPath="app.interviewai.local/signin"
    >
      <div className="mock-form-wrap">
        <div className="mock-form-heading">
          <h2>Welcome back</h2>
          <p>Sign in to continue to InterviewAI</p>
        </div>

        <form onSubmit={handleSubmit} className="mock-login-form">
          {error && <div className="mock-login-error">{error}</div>}

          <label>
            <span>Email address</span>
            <div className="mock-input-wrap">
              <Mail size={16} />
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
          </label>

          <label>
            <span className="mock-label-row">Password</span>
            <div className="mock-input-wrap">
              <Lock size={16} />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
              <button
                type="button"
                className="mock-password-toggle"
                onClick={() => setShowPassword((value) => !value)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          <button id="login-btn" type="submit" className="mock-signin-btn" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="mock-secure-note">
          <ShieldCheck size={14} />
          Your data is secure and encrypted
        </p>

        <p className="mock-create-note">
          New here? <Link href="/register">Create an account</Link>
        </p>
      </div>
    </AuthDeviceShell>
  );
}
