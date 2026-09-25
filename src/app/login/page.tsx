"use client";

import { useState, useTransition, Suspense, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/roster";
  const token = params.get("token");

  // If visitor arrives at /login with ?token=..., forward them directly to /join
  useEffect(() => {
    if (token) {
      router.replace(`/join?token=${encodeURIComponent(token)}`);
    }
  }, [token, router]);

  const modeParam = params.get("mode");
  const emailParam = params.get("email");

  const [mode, setMode] = useState<"signin" | "manager_setup" | "forgot_password">(() => {
    if (modeParam === "reset" || modeParam === "forgot") return "forgot_password";
    if (modeParam === "manager") return "manager_setup";
    return "signin";
  });
  const [email, setEmail] = useState(emailParam || "");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Invite code lookup helper
  const [inviteTokenInput, setInviteTokenInput] = useState("");
  const [showInviteInput, setShowInviteInput] = useState(false);

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    const supabase = createClient();

    startTransition(async () => {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (signInErr) {
        if (signInErr.message.toLowerCase().includes("invalid login credentials")) {
          setError(
            "Invalid email or password. If you have not created your password yet, please use the 'First-Time Delivery Manager Setup' below or request an invite link."
          );
        } else {
          setError(signInErr.message);
        }
        return;
      }

      router.push(next);
      router.refresh();
    });
  }

  function handleManagerSetup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    const emailTrimmed = email.trim().toLowerCase();
    if (!emailTrimmed.includes("jayasree")) {
      setError(
        "First-Time Delivery Manager Setup is reserved for Jayasree Kuniyil (jayasreeani@gmail.com). Team members must use their invite link."
      );
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    const supabase = createClient();

    startTransition(async () => {
      const { data, error: signUpErr } = await supabase.auth.signUp({
        email: emailTrimmed,
        password,
        options: {
          data: {
            name: "Jayasree Kuniyil",
            role: "owner",
            project_role: "Manager",
          },
        },
      });

      if (signUpErr) {
        if (signUpErr.message.toLowerCase().includes("already registered")) {
          setError(
            "An account for jayasreeani@gmail.com is already registered. If you forgot your password, click 'Forgot Password' below to reset it."
          );
        } else {
          setError(signUpErr.message);
        }
        return;
      }

      if (data.user) {
        // Link to profiles and members table as owner
        try {
          await supabase.from("profiles").upsert({
            id: data.user.id,
            name: "Jayasree Kuniyil",
            email: emailTrimmed,
            role: "owner",
            created_at: new Date().toISOString(),
          });

          await supabase
            .from("members")
            .update({
              user_id: data.user.id,
              email: emailTrimmed,
              project_role: "Manager",
              updated_at: new Date().toISOString(),
            })
            .ilike("name", "%jayasree%");
        } catch (dbErr) {
          console.warn("Roster binding note during manager setup:", dbErr);
        }
      }

      if (!data.session) {
        setNotice(
          "Manager account created! A confirmation email was sent to your inbox. Please click the link to confirm, then sign in."
        );
        setMode("signin");
      } else {
        router.push(next);
        router.refresh();
      }
    });
  }

  function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError("Please enter your email address to receive a password reset link.");
      return;
    }

    const supabase = createClient();

    startTransition(async () => {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim());
      if (resetErr) {
        setError(resetErr.message);
        return;
      }
      setNotice("Password reset email sent! Check your inbox for the reset link.");
    });
  }

  function handleRedeemToken(e: React.FormEvent) {
    e.preventDefault();
    if (!inviteTokenInput.trim()) return;
    router.push(`/join?token=${encodeURIComponent(inviteTokenInput.trim())}`);
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">
            Learning &amp; Development Tracker
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {mode === "signin"
              ? "Sign in to access your team's tracker."
              : mode === "manager_setup"
              ? "Delivery Manager Account Activation"
              : "Reset Your Password"}
          </p>
        </div>

        {/* MODE: Sign In */}
        {mode === "signin" && (
          <form onSubmit={handleSignIn} className="card p-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-soft">
                Email Address
              </label>
              <input
                type="email"
                required
                className="input text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-ink-soft">
                  Password
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs font-semibold text-teal hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                required
                className="input text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
              />
            </div>

            {error && (
              <div className="rounded bg-red-50 p-2.5 text-xs text-critical leading-relaxed space-y-1">
                <p>{error}</p>
                <div className="pt-1 flex gap-3 text-[11px] font-semibold">
                  <Link href="/reset-password" className="underline text-red-700">
                    🔑 Reset Password
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setNotice(null);
                      setEmail("jayasreeani@gmail.com");
                      setMode("manager_setup");
                    }}
                    className="underline text-red-700"
                  >
                    👑 First-Time Manager Setup
                  </button>
                </div>
              </div>
            )}
            {notice && <p className="rounded bg-emerald-50 p-2 text-xs text-good">{notice}</p>}

            <button
              type="submit"
              disabled={pending}
              className="btn btn-primary w-full text-sm font-semibold"
            >
              {pending ? "Signing in…" : "Sign In"}
            </button>

            <div className="flex items-center justify-between pt-2 text-xs border-t border-line text-ink-soft">
              <Link
                href="/reset-password"
                className="font-medium text-teal hover:underline"
              >
                🔑 Forgot password?
              </Link>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setEmail("jayasreeani@gmail.com");
                  setMode("manager_setup");
                }}
                className="font-semibold text-teal hover:underline"
              >
                👑 Manager Setup
              </button>
            </div>
          </form>
        )}

        {/* MODE: Manager Setup */}
        {mode === "manager_setup" && (
          <form onSubmit={handleManagerSetup} className="card p-6 space-y-4">
            <div className="rounded border border-teal/30 bg-teal/5 p-3 text-xs text-ink leading-relaxed">
              <strong>👑 Delivery Manager Setup</strong>
              <p className="mt-1 text-ink-soft">
                Create the administrator account for <strong>Jayasree Kuniyil</strong>. You will have full management oversight across GoGym, Slavic, and all team permissions.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-soft">
                Delivery Manager Email
              </label>
              <input
                type="email"
                required
                className="input text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jayasreeani@gmail.com"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-soft">
                Choose Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="input text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-soft">
                Confirm Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                className="input text-sm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter password"
              />
            </div>

            {error && <p className="rounded bg-red-50 p-2 text-xs text-critical">{error}</p>}
            {notice && <p className="rounded bg-emerald-50 p-2 text-xs text-good">{notice}</p>}

            <button
              type="submit"
              disabled={pending}
              className="btn btn-primary w-full text-sm font-semibold"
            >
              {pending ? "Activating Account…" : "Activate Delivery Manager Account"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setNotice(null);
                setMode("signin");
              }}
              className="text-center w-full text-xs text-ink-soft hover:underline pt-1"
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* MODE: Forgot Password */}
        {mode === "forgot_password" && (
          <form onSubmit={handleForgotPassword} className="card p-6 space-y-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-soft">
                Email Address
              </label>
              <input
                type="email"
                required
                className="input text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
              />
              <p className="mt-1 text-[11px] text-ink-faint">
                We will send you a secure link to reset your password.
              </p>
            </div>

            {error && <p className="rounded bg-red-50 p-2 text-xs text-critical">{error}</p>}
            {notice && <p className="rounded bg-emerald-50 p-2 text-xs text-good">{notice}</p>}

            <button
              type="submit"
              disabled={pending}
              className="btn btn-primary w-full text-sm font-semibold"
            >
              {pending ? "Sending Link…" : "Send Password Reset Link"}
            </button>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setNotice(null);
                setMode("signin");
              }}
              className="text-center w-full text-xs text-ink-soft hover:underline pt-1"
            >
              ← Back to Sign In
            </button>
          </form>
        )}

        {/* Invite-Only Registration Notice & Quick Links */}
        <div className="mt-6 rounded-lg border border-line bg-paper/60 p-4 text-center space-y-2">
          <div className="text-xs font-semibold text-ink">
            🔒 Team Registration is by Invite Only
          </div>
          <p className="text-[11px] text-ink-soft leading-relaxed">
            Team member accounts are bound to pre-assigned roster profiles. Team members must use the invite link provided by their Delivery Manager.
          </p>

          {/* Delivery Manager Setup Action Button */}
          {mode !== "manager_setup" && (
            <div className="pt-2 border-t border-line/60">
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setNotice(null);
                  setEmail("jayasreeani@gmail.com");
                  setMode("manager_setup");
                }}
                className="w-full rounded border border-teal/30 bg-teal/10 px-3 py-1.5 text-xs font-semibold text-teal hover:bg-teal/20 transition-colors"
              >
                👑 Jayasree Kuniyil: First-Time Manager Setup →
              </button>
            </div>
          )}

          {/* Enter Token Option */}
          <div className="pt-1">
            {!showInviteInput ? (
              <button
                onClick={() => setShowInviteInput(true)}
                className="text-xs font-medium text-ink-soft hover:text-teal underline"
              >
                Have an invite code? Enter it here
              </button>
            ) : (
              <form onSubmit={handleRedeemToken} className="mt-2 space-y-2">
                <input
                  type="text"
                  placeholder="Paste your invite token…"
                  value={inviteTokenInput}
                  onChange={(e) => setInviteTokenInput(e.target.value)}
                  className="input text-xs"
                />
                <div className="flex gap-2">
                  <button type="submit" className="btn btn-primary flex-1 text-xs py-1.5">
                    Go to Join Form
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowInviteInput(false)}
                    className="btn btn-secondary text-xs py-1.5"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4 py-16">
          <p className="text-sm text-ink-soft">Loading sign-in…</p>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
