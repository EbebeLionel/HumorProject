"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Logo from "../Logo";
import { afterPasswordSignIn } from "./actions";
import GoogleSignInButton from "./GoogleSignInButton";

type Mode = "login" | "signup";
type Message = { kind: "error" | "info"; text: string } | null;

const CALLBACK_PATH = "/auth/callback";

export default function LoginCard({ initialMode, initialError }: { initialMode: Mode; initialError: string | null }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<Message>(initialError ? { kind: "error", text: initialError } : null);

  const isSignup = mode === "signup";

  function onChange(event: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (message?.kind === "error") setMessage(null);
  }

  function switchMode() {
    setMode(isSignup ? "login" : "signup");
    setMessage(null);
  }

  async function goHome() {
    const { destination } = await afterPasswordSignIn();
    router.push(destination);
    router.refresh();
  }

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setMessage(null);
    const supabase = createClient();

    if (isSignup) {
      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.password,
        options: {
          emailRedirectTo: `${window.location.origin}${CALLBACK_PATH}`,
          // Copied into profiles after sign-in, so new users skip the name step
          data: { first_name: form.firstName.trim(), last_name: form.lastName.trim() },
        },
      });

      if (error) {
        setMessage({ kind: "error", text: error.message });
      } else if (data.session) {
        await goHome();
        return;
      } else {
        setMessage({ kind: "info", text: `Almost there! Check ${form.email.trim()} for a link to confirm your account.` });
      }
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: form.email.trim(),
      password: form.password,
    });

    if (error) {
      setMessage({ kind: "error", text: error.message });
      setLoading(false);
      return;
    }
    await goHome();
  }

  async function onForgotPassword() {
    const email = form.email.trim();
    if (!email) {
      setMessage({ kind: "error", text: "Type your email above first, then tap Forgot Password." });
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}${CALLBACK_PATH}`,
    });

    setMessage(
      error
        ? { kind: "error", text: error.message }
        : { kind: "info", text: "Check your inbox for a sign-in link. You can set a new password on your Profile." }
    );
  }

  return (
    <div className="auth">
      <div className="auth-box">
        <form className="auth-form" onSubmit={onSubmit}>
          <div className="auth-header">
            <div className="auth-logo">
              <Logo />
              <div className="auth-logo-ring" />
            </div>
            <h1 className="auth-title">{isSignup ? "Join the Fun" : "Welcome Back"}</h1>
            <p className="auth-subtitle">
              {isSignup ? "Create your Humor Project account" : "Sign in to your Humor Project account"}
            </p>
          </div>

          {message && (
            <div className={`auth-message ${message.kind === "error" ? "is-error" : "is-info"}`} role="alert">
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                {message.kind === "error" ? (
                  <path d="M15 9l-6 6M9 9l6 6" />
                ) : (
                  <path d="M8 12.5l2.5 2.5L16 9.5" />
                )}
              </svg>
              <span>{message.text}</span>
            </div>
          )}

          {isSignup && (
            <div className="auth-row">
              <label className="auth-input">
                <input name="firstName" value={form.firstName} onChange={onChange} autoComplete="given-name" required />
                <span>First Name</span>
                <i />
              </label>
              <label className="auth-input">
                <input name="lastName" value={form.lastName} onChange={onChange} autoComplete="family-name" required />
                <span>Last Name</span>
                <i />
              </label>
            </div>
          )}

          <label className="auth-input">
            <input type="email" name="email" value={form.email} onChange={onChange} autoComplete="email" required />
            <span>Email Address</span>
            <i />
          </label>

          <label className="auth-input">
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={onChange}
              autoComplete={isSignup ? "new-password" : "current-password"}
              minLength={6}
              required
            />
            <span>{isSignup ? "Create Password" : "Enter Password"}</span>
            <i />
          </label>

          <div className="auth-submit">
            <button type="submit" disabled={loading} className={loading ? "loading" : ""}>
              {loading ? (
                <span className="auth-loading">
                  <span className="spinner" />
                  {isSignup ? "Creating account…" : "Signing in…"}
                </span>
              ) : isSignup ? (
                "Sign Up"
              ) : (
                "Login"
              )}
            </button>
            {!loading && (
              <svg className="auth-arrow" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            )}
          </div>

          <div className="auth-divider">or</div>
          <GoogleSignInButton
            label={isSignup ? "Sign up with Google" : "Continue with Google"}
            disabled={loading}
            onError={(text) => setMessage({ kind: "error", text })}
          />

          <div className="auth-links">
            {isSignup ? (
              <span className="muted small">Already a member?</span>
            ) : (
              <button type="button" onClick={onForgotPassword}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9 9a3 3 0 1 1 4 2.83 1.5 1.5 0 0 0-1 1.42v1" />
                  <path d="M12 17.25h.01" />
                </svg>
                Forgot Password?
              </button>
            )}
            <button type="button" className="auth-switch" onClick={switchMode}>
              {isSignup ? "Log In" : "Sign Up"}
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          <div className="deco auth-decoration" aria-hidden="true">
            <div className="deco-line" />
            <div className="deco-dots">
              <span />
              <span />
              <span />
            </div>
            <div className="deco-line" />
          </div>
        </form>
      </div>
    </div>
  );
}
