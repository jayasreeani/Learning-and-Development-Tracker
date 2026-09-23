"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTable } from "@/lib/hooks/useTable";
import { useViewer } from "@/lib/hooks/ViewerProvider";
import type { Profile, Role } from "@/lib/supabase/types";

const ROLES: Role[] = ["owner", "manager", "member"];

export default function PermissionsPage() {
  const router = useRouter();
  const { isOwner, id: viewerId, loaded: viewerLoaded } = useViewer();
  const { rows: profiles, supabase } = useTable<Profile>("profiles", "created_at");

  useEffect(() => {
    if (viewerLoaded && !isOwner) router.replace("/roster");
  }, [viewerLoaded, isOwner, router]);

  async function changeRole(profileId: string, role: Role) {
    await supabase.from("profiles").update({ role }).eq("id", profileId);
  }

  if (!isOwner) return null;

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-semibold text-ink">
          Permissions
        </h1>
        <p className="text-sm text-ink-soft">
          Owners and managers can add, edit and delete roster, training and
          plan records. Members can view everything and raise training
          requests. Roles are enforced by the database, not just this page.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-faint">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="px-4 py-2.5 text-ink">
                  {p.name}
                  {p.id === viewerId && (
                    <span className="ml-2 text-xs text-ink-faint">(you)</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-ink-soft">{p.email}</td>
                <td className="px-4 py-2.5">
                  {p.role === "owner" ? (
                    <span className="chip">Owner</span>
                  ) : (
                    <select
                      className="input w-36"
                      value={p.role}
                      onChange={(e) =>
                        changeRole(p.id, e.target.value as Role)
                      }
                    >
                      {ROLES.filter((r) => r !== "owner").map((r) => (
                        <option key={r} value={r}>
                          {r === "manager" ? "Manager" : "Team member"}
                        </option>
                      ))}
                    </select>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-sm text-ink-soft">
        To add someone new, share this app&apos;s URL and ask them to create
        an account — they&apos;ll appear here as a Team member automatically,
        and you can promote them to Manager.
      </p>
    </div>
  );
}
