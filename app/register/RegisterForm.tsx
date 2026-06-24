"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail, ShieldCheck, User } from "lucide-react";
import AuthDeviceShell from "@/components/AuthDeviceShell";

export default function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordStrength =
    password.length === 0
      ? null
      : password.length < 6
        ? "weak"
        : password.length < 10
          ? "medium"
          : "strong";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Registration failed");
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
      ariaLabel="InterviewAI create account"
      browserPath="app.interviewai.local/register"
    >
      <div className="mock-form-wrap mock-register-wrap">
        <div className="mock-form-heading">
          <h2>Create account</h2>
          <p>Join InterviewAI and start practicing with AI interviews.</p>
        </div>

        <form onSubmit={handleSubmit} className="mock-login-form mock-register-form">
          {error && <div className="mock-login-error">{error}</div>}

          <label>
            <span>Full name</span>
            <div className="mock-input-wrap">
              <User size={16} />
              <input
                id="reg-name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                autoComplete="name"
              />
            </div>
          </label>

          <label>
            <span>Email address</span>
            <div className="mock-input-wrap">
              <Mail size={16} />
              <input
                id="reg-email"
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
            <span>Password</span>
            <div className="mock-input-wrap">
              <Lock size={16} />
              <input
                id="reg-password"
                type={showPassword ? "text" : "password"}
                placeholder="Min. 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
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

            {passwordStrength && (
              <div className={`mock-password-strength ${passwordStrength}`}>
                <div className="mock-strength-bars" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                </div>
                <small>
                  {passwordStrength === "weak"
                    ? "Weak password"
                    : passwordStrength === "medium"
                      ? "Medium password"
                      : "Strong password"}
                </small>
              </div>
            )}
          </label>

          <button
            id="register-btn"
            type="submit"
            className="mock-signin-btn"
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        <p className="mock-secure-note mock-register-note">
          <ShieldCheck size={14} />
          Your data is secure and encrypted
        </p>

        <p className="mock-create-note mock-register-note">
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </div>
    </AuthDeviceShell>
  );
}
