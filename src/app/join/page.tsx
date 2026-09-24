"use client";

import { useEffect, useState, useTransition, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface InviteInfo {
  id: string;
  member_id: string;
  member_name: string;
  email: string | null;
  token: string;
  project: string | null;
  project_role: string;
  used_at: string | null;
  expires_at: string;
  is_valid: boolean;
}

function JoinForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loadingInvite, setLoadingInvite] = useState(true);
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [inviteError, setInviteError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Validate invite token on load
  useEffect(() => {
    if (!token) {
      setInviteError("No invite token found in link. Please use the exact link sent by your Delivery Manager.");
      setLoadingInvite(false);
      return;
    }

    async function checkToken() {
      const supabase = createClient();
      setLoadingInvite(true);
      setInviteError(null);

      try {
        // Attempt RPC lookup first
        const { data: rpcData, error: rpcError } = await supabase.rpc("get_invite_by_token", {
          p_token: token,
        });

        const record = Array.isArray(rpcData) ? rpcData[0] : rpcData;

        if (!rpcError && record) {
          if (record.used_at) {
            setInviteError("This invite link has already been used. Please sign in to access your account.");
          } else if (new Date(record.expires_at) <= new Date()) {
            setInviteError("This invite link has expired. Please contact your Delivery Manager for a new link.");
          } else {
            setInvite(record as InviteInfo);
            if (record.email) setEmail(record.email);
          }
          setLoadingInvite(false);
          return;
        }

        // Direct table query fallback
        const { data: directData, error: directError } = await supabase
          .from("invites")
          .select("*")
          .eq("token", token)
          .maybeSingle();

        if (directError || !directData) {
          setInviteError("Invalid or expired invite link. Please contact Jayasree Kuniyil for an invitation.");
        } else if (directData.used_at) {
          setInviteError("This invite link has already been used. Please sign in to access your account.");
        } else if (new Date(directData.expires_at) <= new Date()) {
          setInviteError("This invite link has expired. Please contact your Delivery Manager for a new link.");
        } else {
          setInvite({ ...directData, is_valid: true } as InviteInfo);
          if (directData.email) setEmail(directData.email);
        }
      } catch (err: unknown) {
        console.error("Token verification error:", err);
        setInviteError("Failed to verify invite. Please check your connection or contact your manager.");
      } finally {
        setLoadingInvite(false);
      }
    }

    checkToken();
  }, [token]);

  function submit(e: React.FormEvent) {
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

    if (!invite) {
      setError("No valid invite loaded.");
      return;
    }

    const supabase = createClient();

    startTransition(async () => {
      // 1. Create Supabase Auth Account
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            name: invite.member_name,
            project_role: invite.project_role,
            project: invite.project,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        return;
      }

      const user = authData.user;
      if (!user) {
        setError("Account creation failed. Please try again.");
        return;
      }

      // 2. Complete invite registration atomically via RPC
      try {
        await supabase.rpc("complete_invite_signup", {
          p_token: token,
          p_user_id: user.id,
          p_email: email.trim(),
        });
      } catch (rpcErr) {
        console.error("complete_invite_signup error:", rpcErr);
      }

      // Fallback direct updates if RPC is pending DB patch
      try {
        await supabase
          .from("members")
          .update({
            user_id: user.id,
            email: email.trim(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", invite.member_id);

        await supabase
          .from("invites")
          .update({ used_at: new Date().toISOString() })
          .eq("id", invite.id);

        const appRole =
          invite.project_role === "Manager"
            ? "manager"
            : invite.project_role === "Lead"
            ? "lead"
            : "member";

        await supabase.from("profiles").upsert({
          id: user.id,
          name: invite.member_name,
          email: email.trim(),
          role: appRole,
          created_at: new Date().toISOString(),
        });
      } catch (directErr) {
        console.warn("Direct update fallback note:", directErr);
      }

      // 3. Handle session or email confirmation
      if (!authData.session) {
        setNotice(
          `Account created for ${invite.member_name}! If email confirmation is required, please check ${email.trim()} to activate and sign in.`
        );
      } else {
        router.push("/roster");
        router.refresh();
      }
    });
  }

  if (loadingInvite) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="card max-w-md p-8 text-center space-y-3">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-teal border-t-transparent"></div>
          <p className="text-sm font-medium text-ink">Verifying your invitation…</p>
          <p className="text-xs text-ink-soft">Checking secure token credentials</p>
        </div>
      </div>
    );
  }

  if (inviteError || !invite) {
    return (
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="card max-w-md p-8 text-center space-y-4">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600 text-xl font-bold">
            ⚠️
          </div>
          <h2 className="text-lg font-semibold text-ink">Invitation Link Issue</h2>
          <p className="text-sm text-ink-soft">{inviteError || "Invalid invite link."}</p>
          <div className="pt-2">
            <Link href="/login" className="btn btn-primary w-full">
              Go to Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <h1 className="font-display text-2xl font-semibold text-ink">
            Join L&amp;D Tracker
          </h1>
          <p className="mt-1 text-xs text-ink-soft">
            Invitation-only account activation
          </p>
        </div>

        {/* Member Identity Banner */}
        <div className="mb-6 rounded-xl border border-teal/20 bg-teal/5 p-4 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-teal">
              Invited Team Member
            </span>
            <span
              className={`chip text-xs font-semibold ${
                invite.project_role === "Manager"
                  ? "chip-scheduled"
                  : invite.project_role === "Lead"
                  ? "bg-sky-100 text-sky-800"
                  : "bg-ink/10 text-ink"
              }`}
            >
              {invite.project_role === "Lead"
                ? "⭐ Project Lead"
                : invite.project_role === "Manager"
                ? "👑 Manager"
                : "Team Member"}
            </span>
          </div>

          <h2 className="mt-2 text-xl font-bold text-ink">{invite.member_name}</h2>

          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
            <span>Project:</span>
            <span className="chip font-medium text-ink">
              {invite.project || "General Team"}
            </span>
          </div>

          <p className="mt-3 text-xs text-ink-soft leading-relaxed">
            Your login will be permanently linked to this roster profile. Choose your password below to activate your account.
          </p>
        </div>

        <form onSubmit={submit} className="card p-6 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-soft">
              Work Email Address
            </label>
            <input
              type="email"
              required
              className="input text-sm"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
            />
            <p className="mt-1 text-[11px] text-ink-faint">
              This email will be used for your sign-in credentials.
            </p>
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-ink-soft">
              Create Password
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
              placeholder="Re-enter your password"
            />
          </div>

          {error && <p className="rounded bg-red-50 p-2 text-xs text-critical">{error}</p>}
          {notice && <p className="rounded bg-emerald-50 p-2 text-xs text-good">{notice}</p>}

          <button
            type="submit"
            disabled={pending}
            className="btn btn-primary w-full text-sm font-semibold"
          >
            {pending ? "Activating Account…" : `Activate Account as ${invite.member_name}`}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-ink-soft">
          Already activated?{" "}
          <Link href="/login" className="font-semibold text-teal hover:underline">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense
      fallback={
        <div className="flex flex-1 items-center justify-center px-4 py-16">
          <p className="text-sm text-ink-soft">Loading invitation…</p>
        </div>
      }
    >
      <JoinForm />
    </Suspense>
  );
}
