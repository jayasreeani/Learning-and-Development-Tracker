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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Invite code lookup helper
  const [inviteTokenInput, setInviteTokenInput] = useState("");
  const [showInviteInput, setShowInviteInput] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const supabase = createClient();

    startTransition(async () => {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        return setError(error.message);
      }
      router.push(next);
      router.refresh();
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
        <div className="mb-8 text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">
            Learning &amp; Development Tracker
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Sign in to access your team&apos;s tracker.
          </p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
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
            <label className="mb-1 block text-xs font-semibold text-ink-soft">
              Password
            </label>
            <input
              type="password"
              required
              className="input text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
            />
          </div>

          {error && <p className="rounded bg-red-50 p-2 text-xs text-critical">{error}</p>}

          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary w-full text-sm font-semibold"
          >
            {pending ? "Signing in…" : "Sign In"}
          </button>
        </form>

        {/* Invite-Only Registration Notice */}
        <div className="mt-6 rounded-lg border border-line bg-paper/60 p-4 text-center">
          <div className="text-xs font-semibold text-ink">
            🔒 Registration is by Invitation Only
          </div>
          <p className="mt-1 text-[11px] text-ink-soft leading-relaxed">
            Accounts are bound to pre-assigned roster profiles. If you do not have an account, request an invite link from your Delivery Manager (Jayasree Kuniyil).
          </p>

          {!showInviteInput ? (
            <button
              onClick={() => setShowInviteInput(true)}
              className="mt-3 text-xs font-medium text-teal hover:underline"
            >
              Have an invite code? Enter it here →
            </button>
          ) : (
            <form onSubmit={handleRedeemToken} className="mt-3 space-y-2">
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
