"use client";

import { useMemo, useState } from "react";
import { useTable } from "@/lib/hooks/useTable";
import { useViewer } from "@/lib/hooks/ViewerProvider";
import type { Invite, Member, Profile, ProjectRole, Role } from "@/lib/supabase/types";
import Modal from "@/components/Modal";

const APP_ROLES: Role[] = ["owner", "manager", "lead", "member"];
const PROJECT_ROLES: ProjectRole[] = ["Manager", "Lead", "Member"];

export default function PermissionsPage() {
  const { isOwner, canManage, id: viewerId } = useViewer();
  const { rows: profiles, supabase } = useTable<Profile>("profiles", "created_at");
  const { rows: members, supabase: supabaseMembers } = useTable<Member>("members", "name");
  const { rows: invites, supabase: supabaseInvites } = useTable<Invite>("invites", "created_at");

  const [projectFilter, setProjectFilter] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [savingMemberId, setSavingMemberId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"projects" | "accounts" | "invites">("projects");

  // Invite modal state
  const [inviteModal, setInviteModal] = useState<{
    member: Member;
    url: string;
    token: string;
    isExisting?: boolean;
  } | null>(null);
  const [copied, setCopied] = useState(false);
  const [generatingInvite, setGeneratingInvite] = useState<string | null>(null);

  // Derived project leads & managers
  const gogymLead = useMemo(
    () =>
      members.find(
        (m) =>
          m.name.toLowerCase().includes("gopika") ||
          (m.project_role === "Lead" &&
            m.projects.some((p) => p.toLowerCase().includes("gogym")))
      ) || null,
    [members]
  );

  const slavicLead = useMemo(
    () =>
      members.find(
        (m) =>
          m.name.toLowerCase().includes("anuvindha") ||
          (m.project_role === "Lead" &&
            m.projects.some((p) => p.toLowerCase().includes("slavic")))
      ) || null,
    [members]
  );

  const overallManager = useMemo(
    () =>
      members.find(
        (m) =>
          m.name.toLowerCase().includes("jayasree") ||
          m.project_role === "Manager" ||
          m.role_type === "Management"
      ) || null,
    [members]
  );

  // Group members by project (excluding Delivery Manager so manager is not counted in project sizes)
  const isManagerMember = (m: Member) =>
    m.name.toLowerCase().includes("jayasree") ||
    m.project_role === "Manager" ||
    m.role_type === "Management";

  const gogymMembers = useMemo(
    () =>
      members.filter(
        (m) =>
          !isManagerMember(m) &&
          m.projects.some((p) => p.toLowerCase().includes("gogym"))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members]
  );

  const slavicMembers = useMemo(
    () =>
      members.filter(
        (m) =>
          !isManagerMember(m) &&
          m.projects.some((p) => p.toLowerCase().includes("slavic"))
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [members]
  );

  const filteredMembers = useMemo(() => {
    const q = query.toLowerCase();
    return members.filter((m) => {
      const matchesSearch =
        m.name.toLowerCase().includes(q) ||
        m.designation.toLowerCase().includes(q) ||
        m.role_type.toLowerCase().includes(q) ||
        m.projects.join(" ").toLowerCase().includes(q);

      if (!matchesSearch) return false;

      if (projectFilter === "GoGym") {
        return (
          !isManagerMember(m) &&
          m.projects.some((p) => p.toLowerCase().includes("gogym"))
        );
      }
      if (projectFilter === "Slavic") {
        return (
          !isManagerMember(m) &&
          m.projects.some((p) => p.toLowerCase().includes("slavic"))
        );
      }
      return true;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [members, query, projectFilter]);

  async function updateMemberProjectRole(memberId: string, role: ProjectRole) {
    setSavingMemberId(memberId);
    try {
      await supabaseMembers
        .from("members")
        .update({ project_role: role, updated_at: new Date().toISOString() })
        .eq("id", memberId);
    } finally {
      setSavingMemberId(null);
    }
  }

  async function setAsProjectLead(member: Member, project: "GoGym" | "Slavic") {
    setSavingMemberId(member.id);
    try {
      const currentProjects = member.projects || [];
      const updatedProjects = currentProjects.includes(project)
        ? currentProjects
        : [...currentProjects, project];

      await supabaseMembers
        .from("members")
        .update({
          project_role: "Lead",
          projects: updatedProjects,
          updated_at: new Date().toISOString(),
        })
        .eq("id", member.id);
    } finally {
      setSavingMemberId(null);
    }
  }

  async function changeProfileRole(profileId: string, role: Role) {
    await supabase.from("profiles").update({ role }).eq("id", profileId);
  }

  // Invite generation & retrieval
  async function generateInviteForMember(member: Member) {
    setGeneratingInvite(member.id);
    try {
      const token = crypto.randomUUID();
      const project = member.projects?.[0] || "General";
      const projectRole = member.project_role || "Member";

      await supabaseInvites.from("invites").insert({
        member_id: member.id,
        member_name: member.name,
        email: member.email || null,
        token,
        project,
        project_role: projectRole,
        created_by: viewerId,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      });

      const origin = typeof window !== "undefined" ? window.location.origin : "";
      const url = `${origin}/join?token=${token}`;

      setCopied(false);
      setInviteModal({
        member,
        url,
        token,
        isExisting: false,
      });
    } finally {
      setGeneratingInvite(null);
    }
  }

  function showExistingInvite(member: Member, invite: Invite) {
    const origin = typeof window !== "undefined" ? window.location.origin : "";
    const url = `${origin}/join?token=${invite.token}`;
    setCopied(false);
    setInviteModal({
      member,
      url,
      token: invite.token,
      isExisting: true,
    });
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  }

  const canEdit = isOwner || canManage;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ink">
          Permissions &amp; Project Hierarchy
        </h1>
        <p className="text-sm text-ink-soft">
          Configure project roles, manage invitation-only account access, and assign project leadership.
        </p>
      </div>

      {/* Project Hierarchy Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {/* Overall Delivery Manager */}
        <div className="card border-l-4 border-l-teal p-5">
          <div className="flex items-center justify-between">
            <span className="chip chip-scheduled text-xs font-semibold">
              Delivery Manager
            </span>
            <span className="text-xs text-ink-faint">All Projects</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-ink">
            {overallManager?.name || "Jayasree Kuniyil"}
          </h3>
          <p className="text-xs text-ink-soft">
            {overallManager?.designation || "Senior Delivery Manager"}
          </p>
          <div className="mt-3 flex flex-wrap gap-1 text-xs">
            <span className="chip">GoGym</span>
            <span className="chip">Slavic</span>
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Full management oversight across all projects, training plans, and rosters.
          </p>
        </div>

        {/* GoGym Lead Card */}
        <div className="card border-l-4 border-l-sky-500 p-5">
          <div className="flex items-center justify-between">
            <span className="chip bg-sky-50 text-sky-700 border border-sky-200 text-xs font-semibold">
              Project Lead
            </span>
            <span className="text-xs font-semibold text-ink">GoGym</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-ink">
            {gogymLead?.name || "Gopika Gopan"}
          </h3>
          <p className="text-xs text-ink-soft">
            {gogymLead?.designation || "Scrum Master / PM"}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-ink-soft">
            <span>Project Team size:</span>
            <div className="text-right">
              <span className="font-semibold text-ink">{gogymMembers.length} members</span>
              <span className="block text-[10px] text-ink-faint">(excl. Delivery Manager)</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Directs GoGym initiatives, tracks training requests, and coordinates team schedules.
          </p>
        </div>

        {/* Slavic Lead Card */}
        <div className="card border-l-4 border-l-indigo-500 p-5">
          <div className="flex items-center justify-between">
            <span className="chip bg-indigo-50 text-indigo-700 border border-indigo-200 text-xs font-semibold">
              Project Lead
            </span>
            <span className="text-xs font-semibold text-ink">Slavic</span>
          </div>
          <h3 className="mt-2 text-lg font-semibold text-ink">
            {slavicLead?.name || "Anuvindha Rajeev"}
          </h3>
          <p className="text-xs text-ink-soft">
            {slavicLead?.designation || "Business Analyst"}
          </p>
          <div className="mt-3 flex items-center justify-between text-xs text-ink-soft">
            <span>Project Team size:</span>
            <div className="text-right">
              <span className="font-semibold text-ink">{slavicMembers.length} members</span>
              <span className="block text-[10px] text-ink-faint">(excl. Delivery Manager)</span>
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-soft">
            Directs Slavic Web &amp; Mobile initiatives, training plans, and requirements.
          </p>
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex border-b border-line">
        <button
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "projects"
              ? "border-teal text-teal"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
          onClick={() => setActiveTab("projects")}
        >
          Project Roles &amp; Allocation ({members.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "accounts"
              ? "border-teal text-teal"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
          onClick={() => setActiveTab("accounts")}
        >
          Sign-in Accounts ({profiles.length})
        </button>
        <button
          className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
            activeTab === "invites"
              ? "border-teal text-teal"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
          onClick={() => setActiveTab("invites")}
        >
          Active Invites ({invites.filter((i) => !i.used_at && new Date(i.expires_at) > new Date()).length})
        </button>
      </div>

      {/* TAB 1: Project Roles & Invites */}
      {activeTab === "projects" && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* Filter buttons */}
            <div className="flex gap-1 rounded-full border border-line p-1 text-xs font-medium">
              {[
                { id: "All", label: `All (${members.length})` },
                { id: "GoGym", label: `GoGym (${gogymMembers.length})` },
                { id: "Slavic", label: `Slavic (${slavicMembers.length})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  className={`rounded-full px-3 py-1 transition-colors ${
                    projectFilter === tab.id
                      ? "bg-teal text-white"
                      : "text-ink-soft hover:text-ink"
                  }`}
                  onClick={() => setProjectFilter(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <input
              className="input w-64 text-xs"
              placeholder="Search member, role, project…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-3">Team Member</th>
                  <th className="px-4 py-3">Designation / Role</th>
                  <th className="px-4 py-3">Assigned Projects</th>
                  <th className="px-4 py-3">Project Role</th>
                  <th className="px-4 py-3">Account / Invite Status</th>
                  <th className="px-4 py-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((m) => {
                  const isManager =
                    m.project_role === "Manager" ||
                    m.name.toLowerCase().includes("jayasree");
                  const isLead =
                    m.project_role === "Lead" ||
                    m.name.toLowerCase().includes("gopika") ||
                    m.name.toLowerCase().includes("anuvindha");

                  const currentRole = isManager
                    ? "Manager"
                    : isLead
                    ? "Lead"
                    : m.project_role || "Member";

                  // Account binding verification
                  const linkedProfile = profiles.find(
                    (p) =>
                      p.id === m.user_id ||
                      (m.email && p.email?.toLowerCase() === m.email.toLowerCase()) ||
                      (m.name && p.name?.toLowerCase() === m.name.toLowerCase())
                  );
                  const isAccountActive = !!m.user_id || !!linkedProfile;

                  // Pending invite lookup
                  const pendingInvite = invites.find(
                    (i) =>
                      i.member_id === m.id &&
                      !i.used_at &&
                      new Date(i.expires_at) > new Date()
                  );

                  return (
                    <tr
                      key={m.id}
                      className={`border-b border-line last:border-0 ${
                        isManager
                          ? "bg-teal/5"
                          : isLead
                          ? "bg-sky-50/40"
                          : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">{m.name}</div>
                        {m.email && (
                          <div className="text-xs text-ink-soft">{m.email}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        <div>{m.designation || "—"}</div>
                        {m.role_type && (
                          <div className="text-xs text-ink-faint">
                            {m.role_type}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {m.projects?.length > 0 ? (
                            m.projects.map((p) => (
                              <span
                                key={p}
                                className={`chip text-xs ${
                                  p.toLowerCase().includes("gogym")
                                    ? "bg-sky-100 text-sky-800"
                                    : p.toLowerCase().includes("slavic")
                                    ? "bg-indigo-100 text-indigo-800"
                                    : ""
                                }`}
                              >
                                {p}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-ink-faint">
                              Unassigned
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {canEdit ? (
                          <select
                            className="input w-36 text-xs"
                            value={currentRole}
                            disabled={savingMemberId === m.id}
                            onChange={(e) =>
                              updateMemberProjectRole(
                                m.id,
                                e.target.value as ProjectRole
                              )
                            }
                          >
                            {PROJECT_ROLES.map((r) => (
                              <option key={r} value={r}>
                                {r === "Manager"
                                  ? "👑 Manager"
                                  : r === "Lead"
                                  ? "⭐ Project Lead"
                                  : "Team Member"}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span
                            className={`chip text-xs ${
                              isManager
                                ? "chip-scheduled font-semibold"
                                : isLead
                                ? "bg-sky-100 text-sky-800 font-semibold"
                                : ""
                            }`}
                          >
                            {currentRole === "Manager"
                              ? "👑 Manager"
                              : currentRole === "Lead"
                              ? "⭐ Project Lead"
                              : "Team Member"}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {isAccountActive ? (
                          <div className="flex items-center gap-1.5">
                            <span className="chip bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-medium">
                              ✓ Active Account
                            </span>
                          </div>
                        ) : pendingInvite ? (
                          <div className="flex items-center gap-2">
                            <span className="chip bg-amber-50 text-amber-700 border border-amber-200 text-xs font-medium">
                              ✉️ Invite Sent
                            </span>
                            <button
                              onClick={() => showExistingInvite(m, pendingInvite)}
                              className="text-xs font-semibold text-teal hover:underline"
                            >
                              Copy Link
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="chip text-xs text-ink-faint">
                              No Account
                            </span>
                            {canEdit && (
                              <button
                                disabled={generatingInvite === m.id}
                                onClick={() => generateInviteForMember(m)}
                                className="text-xs font-semibold text-teal hover:underline"
                              >
                                {generatingInvite === m.id ? "…" : "+ Invite"}
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canEdit && currentRole === "Member" && (
                          <div className="flex justify-end gap-1">
                            <button
                              className="rounded px-2 py-1 text-xs font-medium text-teal hover:bg-teal-tint"
                              onClick={() => setAsProjectLead(m, "GoGym")}
                            >
                              + GoGym Lead
                            </button>
                            <button
                              className="rounded px-2 py-1 text-xs font-medium text-indigo-600 hover:bg-indigo-50"
                              onClick={() => setAsProjectLead(m, "Slavic")}
                            >
                              + Slavic Lead
                            </button>
                          </div>
                        )}
                        {!canEdit && currentRole === "Member" && (
                          <span className="text-xs text-ink-faint">—</span>
                        )}
                        {currentRole === "Lead" && (
                          <span className="text-xs font-semibold text-teal">
                            Active Project Lead
                          </span>
                        )}
                        {currentRole === "Manager" && (
                          <span className="text-xs font-semibold text-ink">
                            All Projects
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: Sign-in Accounts */}
      {activeTab === "accounts" && (
        <div className="space-y-4">
          <p className="text-xs text-ink-soft">
            Teammates who activated their account via an invitation link. Their login is bound to their roster member profile.
          </p>

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[550px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-3">Account Name</th>
                  <th className="px-4 py-3">Email Address</th>
                  <th className="px-4 py-3">Linked Roster Profile</th>
                  <th className="px-4 py-3">System Access Role</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((p) => {
                  const linkedMember = members.find(
                    (m) =>
                      m.user_id === p.id ||
                      (m.email && m.email.toLowerCase() === p.email?.toLowerCase()) ||
                      (m.name && m.name.toLowerCase() === p.name?.toLowerCase())
                  );

                  return (
                    <tr key={p.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-2.5 text-ink">
                        <span className="font-semibold">{p.name || "User"}</span>
                        {p.id === viewerId && (
                          <span className="ml-2 text-xs text-ink-faint font-semibold">
                            (you)
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-ink-soft">{p.email}</td>
                      <td className="px-4 py-2.5">
                        {linkedMember ? (
                          <div className="text-xs">
                            <span className="font-medium text-ink">{linkedMember.name}</span>
                            <span className="ml-1 text-ink-faint">
                              ({linkedMember.projects?.join(", ") || "General"})
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-ink-faint">Direct / Unlinked</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {p.role === "owner" ? (
                          <span className="chip chip-scheduled">Owner</span>
                        ) : (
                          <select
                            className="input w-36 text-xs"
                            value={p.role}
                            onChange={(e) =>
                              changeProfileRole(p.id, e.target.value as Role)
                            }
                          >
                            {APP_ROLES.filter((r) => r !== "owner").map((r) => (
                              <option key={r} value={r}>
                                {r === "manager"
                                  ? "Manager"
                                  : r === "lead"
                                  ? "Project Lead"
                                  : "Team Member"}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Active Invites */}
      {activeTab === "invites" && (
        <div className="space-y-4">
          <p className="text-xs text-ink-soft">
            All generated invitation links and their redemption status. Active links remain valid for 7 days.
          </p>

          <div className="card overflow-x-auto">
            <table className="w-full min-w-[600px] text-left text-sm">
              <thead>
                <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-faint">
                  <th className="px-4 py-3">Member Name</th>
                  <th className="px-4 py-3">Assigned Role &amp; Project</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expires At</th>
                  <th className="px-4 py-3 text-right">Invite Link</th>
                </tr>
              </thead>
              <tbody>
                {invites.map((inv) => {
                  const isUsed = !!inv.used_at;
                  const isExpired = new Date(inv.expires_at) <= new Date();

                  return (
                    <tr key={inv.id} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-semibold text-ink">
                        {inv.member_name}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft">
                        <span className="chip mr-1">{inv.project_role}</span>
                        <span>{inv.project || "General"}</span>
                      </td>
                      <td className="px-4 py-3">
                        {isUsed ? (
                          <span className="chip bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs">
                            ✓ Redeemed
                          </span>
                        ) : isExpired ? (
                          <span className="chip bg-gray-100 text-gray-500 text-xs">
                            Expired
                          </span>
                        ) : (
                          <span className="chip bg-amber-50 text-amber-700 border border-amber-200 text-xs">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-ink-soft">
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {!isUsed && !isExpired && (
                          <button
                            onClick={() => {
                              const origin =
                                typeof window !== "undefined"
                                  ? window.location.origin
                                  : "";
                              copyToClipboard(`${origin}/join?token=${inv.token}`);
                            }}
                            className="btn btn-secondary text-xs py-1"
                          >
                            Copy Link
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {invites.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-xs text-ink-soft">
                      No invites generated yet. You can invite team members from the Project Roles tab.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Generated Invite Modal */}
      {inviteModal && (
        <Modal
          title={`Invite Link for ${inviteModal.member.name}`}
          onClose={() => setInviteModal(null)}
        >
          <div className="space-y-4">
            <div className="rounded-lg border border-teal/20 bg-teal/5 p-3 text-xs text-ink">
              <div className="font-semibold text-teal">
                {inviteModal.isExisting ? "Pending Invite Link" : "✨ New Invite Link Generated"}
              </div>
              <p className="mt-1 text-ink-soft">
                This link allows <strong>{inviteModal.member.name}</strong> to register. Their account will be locked to their pre-assigned role (<strong>{inviteModal.member.project_role || "Member"}</strong>) in <strong>{inviteModal.member.projects?.[0] || "General"}</strong>.
              </p>
            </div>

            <div>
              <label className="mb-1 block text-xs font-semibold text-ink-soft">
                Shareable Link (Valid for 7 Days)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={inviteModal.url}
                  className="input text-xs font-mono select-all flex-1"
                />
                <button
                  type="button"
                  onClick={() => copyToClipboard(inviteModal.url)}
                  className={`btn text-xs px-3 font-semibold transition-colors ${
                    copied
                      ? "bg-emerald-600 text-white"
                      : "btn-primary"
                  }`}
                >
                  {copied ? "✓ Copied!" : "Copy Link"}
                </button>
              </div>
            </div>

            <div className="rounded bg-paper p-3 text-[11px] text-ink-soft">
              <strong>Security Guarantee:</strong> The recipient cannot choose their role or claim another member&apos;s identity. When they open this link, the system will verify this token and attach their login directly to {inviteModal.member.name}&apos;s profile.
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setInviteModal(null)}
                className="btn btn-secondary text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
