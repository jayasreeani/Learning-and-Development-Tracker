"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useViewer } from "@/lib/hooks/ViewerProvider";
import { createClient } from "@/lib/supabase/client";

const LINKS = [
  { href: "/roster", label: "Roster" },
  { href: "/learning", label: "Learning & Development" },
  { href: "/plans", label: "Training Plans" },
  { href: "/requests", label: "Training Requests" },
  { href: "/reports", label: "Reports" },
];

export default function NavBar() {
  const pathname = usePathname();
  const router = useRouter();
  const { profile, isOwner } = useViewer();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="border-b border-line bg-paper">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div className="flex items-center justify-between gap-4">
          <span className="font-display text-lg font-semibold text-ink">
            L&amp;D Tracker
          </span>
          <button
            onClick={signOut}
            className="text-xs font-semibold text-ink-soft hover:text-ink sm:hidden"
          >
            Sign out
          </button>
        </div>
        <nav className="flex flex-wrap gap-1">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname?.startsWith(l.href)
                  ? "bg-teal text-white"
                  : "text-ink-soft hover:bg-teal-tint hover:text-ink"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {isOwner && (
            <Link
              href="/permissions"
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                pathname?.startsWith("/permissions")
                  ? "bg-teal text-white"
                  : "text-ink-soft hover:bg-teal-tint hover:text-ink"
              }`}
            >
              Permissions
            </Link>
          )}
        </nav>
        <div className="hidden items-center gap-3 sm:flex">
          <span className="text-sm text-ink-soft">
            {profile?.name || profile?.email} ·{" "}
            <span className="capitalize">{profile?.role}</span>
          </span>
          <button onClick={signOut} className="btn btn-ghost">
            Sign out
          </button>
        </div>
      </div>
    </header>
  );
}
