"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialEmail = searchParams.get("email") || "jayasreeani@gmail.com";

  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isRecoverySession, setIsRecoverySession] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Check if user is arriving from a password recovery link
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.onAuthStateChange(async (event) => {
      if (event === "PASSWORD_RECOVERY") {
        setIsRecoverySession(true);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setIsRecoverySession(true);
      }
    });
  }, []);

  function handleSendReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }

    const supabase = createClient();

    startTransition(async () => {
      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${origin}/reset-password`,
      });

      if (resetErr) {
        setError(resetErr.message);
        return;
      }

      setNotice(
        `Password reset email sent to ${email.trim()}! Please check your inbox and click the recovery link.`
      );
    });
  }

  function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

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
      const { error: updateErr } = await supabase.auth.updateUser({
        password,
      });

      if (updateErr) {
        setError(updateErr.message);
        return;
      }

      setNotice("Password successfully updated! Redirecting to tracker…");
      setTimeout(() => {
        router.push("/roster");
        router.refresh();
      }, 1500);
    });
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">
            Reset Password
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            {isRecoverySession
              ? "Enter your new password below."
              : "We'll send you a secure link to reset your password."}
          </p>
        </div>

        <div className="card p-6 space-y-4">
          {!isRecoverySession ? (
            <form onSubmit={handleSendReset} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-soft">
                  Your Account Email
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

              {error && <p className="rounded bg-red-50 p-2 text-xs text-critical">{error}</p>}
              {notice && <p className="rounded bg-emerald-50 p-2 text-xs text-good leading-relaxed">{notice}</p>}

              <button
                type="submit"
                disabled={pending}
                className="btn btn-primary w-full text-sm font-semibold"
              >
                {pending ? "Sending Link…" : "Send Password Reset Email"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div className="rounded bg-teal/10 p-2.5 text-xs text-teal font-medium">
                ✓ Authenticated via recovery link. Set your new password below.
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold text-ink-soft">
                  New Password
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
                  Confirm New Password
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  className="input text-sm"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                />
              </div>

              {error && <p className="rounded bg-red-50 p-2 text-xs text-critical">{error}</p>}
              {notice && <p className="rounded bg-emerald-50 p-2 text-xs text-good">{notice}</p>}

              <button
                type="submit"
                disabled={pending}
                className="btn btn-primary w-full text-sm font-semibold"
              >
                {pending ? "Updating Password…" : "Save New Password"}
              </button>
            </form>
          )}

          <div className="pt-2 text-center border-t border-line">
            <Link href="/login" className="text-xs font-medium text-teal hover:underline">
              ← Return to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4 py-16">
          <p className="text-sm text-ink-soft">Loading password reset…</p>
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
