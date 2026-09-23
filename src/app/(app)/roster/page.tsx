"use client";

import { useState } from "react";
import { useTable } from "@/lib/hooks/useTable";
import { useViewer } from "@/lib/hooks/ViewerProvider";
import type { Member } from "@/lib/supabase/types";
import Modal from "@/components/Modal";

const BLANK: Partial<Member> = {
  name: "",
  designation: "",
  role_type: "",
  reporting_manager: "",
  employment_type: "FTE",
  experience_level: "",
  allocation_pct: null,
  joining_date: null,
  prior_experience_years: null,
  email: "",
  phone: "",
  location: "",
  timezone: "",
  availability_status: "Available",
  skills: [],
  projects: [],
  certifications: "",
  performance_rating: "",
  attendance_rating: "",
  attendance_note: "",
  attitude_note: "",
  career_note: "",
};

export default function RosterPage() {
  const { rows: members, loaded, supabase } = useTable<Member>("members");
  const { loaded: viewerLoaded } = useViewer();
  const [editing, setEditing] = useState<Partial<Member> | null>(null);
  const [viewing, setViewing] = useState<Member | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"basic" | "experience" | "contact" | "skills" | "notes">("basic");

  const filtered = members.filter((m) => {
    const q = query.toLowerCase();
    return (
      (m.name || "").toLowerCase().includes(q) ||
      (m.designation || "").toLowerCase().includes(q) ||
      (m.role_type || "").toLowerCase().includes(q) ||
      (m.location || "").toLowerCase().includes(q) ||
      (m.email || "").toLowerCase().includes(q) ||
      (m.skills || []).some((s) => s.toLowerCase().includes(q)) ||
      (m.projects || []).some((p) => p.toLowerCase().includes(q))
    );
  });

  function openAddModal() {
    setErrorMsg(null);
    setActiveTab("basic");
    setEditing({ ...BLANK });
  }

  function openEditModal(m: Member) {
    setErrorMsg(null);
    setActiveTab("basic");
    setEditing({ ...m });
  }

  async function save() {
    if (!editing) return;
    if (!editing.name?.trim()) {
      setErrorMsg("Member name is required.");
      return;
    }

    setErrorMsg(null);
    setSaving(true);

    try {
      const payload: Record<string, unknown> = {
        name: editing.name.trim(),
        designation: editing.designation || "",
        role_type: editing.role_type || "",
        reporting_manager: editing.reporting_manager || "",
        employment_type: editing.employment_type || "",
        experience_level: editing.experience_level || "",
        allocation_pct:
          editing.allocation_pct !== null &&
          editing.allocation_pct !== undefined &&
          `${editing.allocation_pct}` !== ""
            ? Number(editing.allocation_pct)
            : null,
        joining_date: editing.joining_date || null,
        prior_experience_years:
          editing.prior_experience_years !== null &&
          editing.prior_experience_years !== undefined &&
          `${editing.prior_experience_years}` !== ""
            ? Number(editing.prior_experience_years)
            : null,
        email: editing.email || "",
        phone: editing.phone || "",
        location: editing.location || "",
        timezone: editing.timezone || "",
        availability_status: editing.availability_status || "",
        skills: Array.isArray(editing.skills) ? editing.skills : [],
        projects: Array.isArray(editing.projects) ? editing.projects : [],
        certifications: editing.certifications || "",
        performance_rating: editing.performance_rating || "",
        attendance_rating: editing.attendance_rating || "",
        attendance_note: editing.attendance_note || "",
        attitude_note: editing.attitude_note || "",
        career_note: editing.career_note || "",
        updated_at: new Date().toISOString(),
      };

      if (editing.id) {
        const { error } = await supabase
          .from("members")
          .update(payload)
          .eq("id", editing.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("members").insert(payload);
        if (error) throw error;
      }

      setEditing(null);
    } catch (err: unknown) {
      console.error("Save member error:", err);
      const msg =
        err instanceof Error ? err.message : "Failed to save team member details.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, name?: string) {
    if (
      !confirm(
        `Remove ${name ? `"${name}"` : "this team member"}? This cannot be undone.`
      )
    ) {
      return;
    }
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) {
      alert(
        `Could not remove member: ${error.message}\n\nPlease check permissions or verify patch_3_roster_permissions.sql is applied.`
      );
    }
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Team Roster
          </h1>
          <p className="text-sm text-ink-soft">
            {members.length} team member{members.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            className="input w-64"
            placeholder="Search name, role, skill, project…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button className="btn btn-primary" onClick={openAddModal}>
            + Add member
          </button>
        </div>
      </div>

      {!loaded && !viewerLoaded ? (
        <p className="text-sm text-ink-soft">Loading roster…</p>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-soft">
          {query ? (
            <p>No team members matching &ldquo;{query}&rdquo;.</p>
          ) : (
            <div>
              <p>No team members yet.</p>
              <button
                className="btn btn-primary mt-3"
                onClick={openAddModal}
              >
                + Add your first team member
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <div
              key={m.id}
              className="card flex flex-col justify-between p-4 transition-shadow hover:shadow-md"
            >
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-ink">{m.name}</h3>
                    <p className="text-sm text-ink-soft">{m.designation || "—"}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      className="rounded-full px-2 py-1 text-xs text-ink-faint hover:bg-teal-tint hover:text-ink"
                      title="Edit member"
                      onClick={() => openEditModal(m)}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-full px-2 py-1 text-xs text-ink-faint hover:bg-critical/10 hover:text-critical"
                      title="Delete member"
                      onClick={() => remove(m.id, m.name)}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.role_type && (
                    <span className="chip bg-paper border border-line text-xs font-medium text-ink">
                      {m.role_type}
                    </span>
                  )}
                  {m.availability_status && (
                    <span className="chip text-xs">
                      {m.availability_status}
                    </span>
                  )}
                  {m.allocation_pct !== null && m.allocation_pct !== undefined && (
                    <span className="chip text-xs">
                      {m.allocation_pct}% allocated
                    </span>
                  )}
                </div>

                <div className="mt-3 space-y-1 text-xs text-ink-soft">
                  {m.reporting_manager && (
                    <p>
                      <span className="font-medium text-ink">Reports to:</span>{" "}
                      {m.reporting_manager}
                    </p>
                  )}
                  {m.email && (
                    <p className="truncate">
                      <span className="font-medium text-ink">Email:</span> {m.email}
                    </p>
                  )}
                  {m.location && (
                    <p>
                      <span className="font-medium text-ink">Location:</span>{" "}
                      {m.location}
                    </p>
                  )}
                  {m.experience_level && (
                    <p>
                      <span className="font-medium text-ink">Exp:</span>{" "}
                      {m.experience_level}
                    </p>
                  )}
                </div>

                {m.skills?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {m.skills.slice(0, 4).map((s) => (
                      <span key={s} className="chip text-xs">
                        {s}
                      </span>
                    ))}
                    {m.skills.length > 4 && (
                      <span className="chip text-xs text-ink-faint">
                        +{m.skills.length - 4} more
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-line pt-2 text-right">
                <button
                  className="text-xs font-semibold text-teal hover:underline"
                  onClick={() => setViewing(m)}
                >
                  View full details →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* View Full Details Modal */}
      {viewing && (
        <Modal
          title={viewing.name}
          onClose={() => setViewing(null)}
          wide
        >
          <div className="space-y-4 text-sm">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <span className="text-xs font-semibold text-ink-soft">Designation</span>
                <p className="text-ink">{viewing.designation || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Role Type</span>
                <p className="text-ink">{viewing.role_type || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Reporting Manager</span>
                <p className="text-ink">{viewing.reporting_manager || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Employment Type</span>
                <p className="text-ink">{viewing.employment_type || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Availability Status</span>
                <p className="text-ink">{viewing.availability_status || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Allocation</span>
                <p className="text-ink">
                  {viewing.allocation_pct !== null && viewing.allocation_pct !== undefined
                    ? `${viewing.allocation_pct}%`
                    : "—"}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Email</span>
                <p className="text-ink">{viewing.email || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Phone</span>
                <p className="text-ink">{viewing.phone || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Location</span>
                <p className="text-ink">{viewing.location || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Timezone</span>
                <p className="text-ink">{viewing.timezone || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Experience Level</span>
                <p className="text-ink">{viewing.experience_level || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Prior Experience</span>
                <p className="text-ink">
                  {viewing.prior_experience_years !== null && viewing.prior_experience_years !== undefined
                    ? `${viewing.prior_experience_years} years`
                    : "—"}
                </p>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Joining Date</span>
                <p className="text-ink">{viewing.joining_date || "—"}</p>
              </div>
              <div>
                <span className="text-xs font-semibold text-ink-soft">Performance Rating</span>
                <p className="text-ink">{viewing.performance_rating || "—"}</p>
              </div>
            </div>

            {viewing.skills?.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-ink-soft">Skills</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {viewing.skills.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {viewing.projects?.length > 0 && (
              <div>
                <span className="text-xs font-semibold text-ink-soft">Projects</span>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {viewing.projects.map((p) => (
                    <span key={p} className="chip bg-paper border border-line">
                      {p}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {viewing.certifications && (
              <div>
                <span className="text-xs font-semibold text-ink-soft">Certifications</span>
                <p className="text-ink">{viewing.certifications}</p>
              </div>
            )}

            {viewing.career_note && (
              <div>
                <span className="text-xs font-semibold text-ink-soft">Career Note</span>
                <p className="text-ink">{viewing.career_note}</p>
              </div>
            )}

            {(viewing.attendance_note || viewing.attitude_note) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {viewing.attendance_note && (
                  <div>
                    <span className="text-xs font-semibold text-ink-soft">Attendance Note</span>
                    <p className="text-ink">{viewing.attendance_note}</p>
                  </div>
                )}
                {viewing.attitude_note && (
                  <div>
                    <span className="text-xs font-semibold text-ink-soft">Attitude Note</span>
                    <p className="text-ink">{viewing.attitude_note}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-line pt-3">
            <button
              className="btn btn-primary"
              onClick={() => {
                const target = viewing;
                setViewing(null);
                openEditModal(target);
              }}
            >
              Edit member details
            </button>
            <button className="btn btn-ghost" onClick={() => setViewing(null)}>
              Close
            </button>
          </div>
        </Modal>
      )}

      {/* Add / Edit Member Modal */}
      {editing && (
        <Modal
          title={editing.id ? `Edit ${editing.name || "Member"}` : "Add Team Member"}
          onClose={() => setEditing(null)}
          wide
        >
          {errorMsg && (
            <div className="mb-4 rounded-md border border-critical/30 bg-critical/10 p-3 text-sm text-critical">
              <p className="font-semibold">Unable to save member</p>
              <p className="mt-0.5">{errorMsg}</p>
              {errorMsg.toLowerCase().includes("policy") && (
                <p className="mt-1 text-xs opacity-90">
                  Tip: Execute <code>supabase/patch_3_roster_permissions.sql</code> in your Supabase SQL editor to allow roster updates.
                </p>
              )}
            </div>
          )}

          {/* Form Tabs */}
          <div className="mb-4 flex flex-wrap gap-1 border-b border-line pb-2">
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                activeTab === "basic"
                  ? "bg-teal text-white"
                  : "text-ink-soft hover:bg-teal-tint hover:text-ink"
              }`}
              onClick={() => setActiveTab("basic")}
            >
              Basic Info
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                activeTab === "experience"
                  ? "bg-teal text-white"
                  : "text-ink-soft hover:bg-teal-tint hover:text-ink"
              }`}
              onClick={() => setActiveTab("experience")}
            >
              Experience &amp; Allocation
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                activeTab === "contact"
                  ? "bg-teal text-white"
                  : "text-ink-soft hover:bg-teal-tint hover:text-ink"
              }`}
              onClick={() => setActiveTab("contact")}
            >
              Contact &amp; Location
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                activeTab === "skills"
                  ? "bg-teal text-white"
                  : "text-ink-soft hover:bg-teal-tint hover:text-ink"
              }`}
              onClick={() => setActiveTab("skills")}
            >
              Skills &amp; Projects
            </button>
            <button
              type="button"
              className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                activeTab === "notes"
                  ? "bg-teal text-white"
                  : "text-ink-soft hover:bg-teal-tint hover:text-ink"
              }`}
              onClick={() => setActiveTab("notes")}
            >
              Ratings &amp; Notes
            </button>
          </div>

          {/* Tab 1: Basic Info */}
          {activeTab === "basic" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Full Name *">
                <input
                  className="input"
                  placeholder="e.g. Jane Doe"
                  value={editing.name || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Designation">
                <input
                  className="input"
                  placeholder="e.g. Senior Software Engineer"
                  value={editing.designation || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, designation: e.target.value })
                  }
                />
              </Field>
              <Field label="Role Type">
                <input
                  className="input"
                  placeholder="e.g. Developer, QA, BA, Designer, Management"
                  value={editing.role_type || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, role_type: e.target.value })
                  }
                />
              </Field>
              <Field label="Reporting Manager">
                <input
                  className="input"
                  placeholder="e.g. Alex Smith"
                  value={editing.reporting_manager || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, reporting_manager: e.target.value })
                  }
                />
              </Field>
              <Field label="Employment Type">
                <select
                  className="input"
                  value={editing.employment_type || "FTE"}
                  onChange={(e) =>
                    setEditing({ ...editing, employment_type: e.target.value })
                  }
                >
                  <option value="FTE">FTE (Full Time)</option>
                  <option value="Contractor">Contractor</option>
                  <option value="Part Time">Part Time</option>
                  <option value="Intern">Intern</option>
                </select>
              </Field>
              <Field label="Availability Status">
                <select
                  className="input"
                  value={editing.availability_status || "Available"}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      availability_status: e.target.value,
                    })
                  }
                >
                  <option value="Available">Available</option>
                  <option value="Partially Allocated">Partially Allocated</option>
                  <option value="Allocated">Allocated</option>
                  <option value="On Leave">On Leave</option>
                </select>
              </Field>
            </div>
          )}

          {/* Tab 2: Experience & Allocation */}
          {activeTab === "experience" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Experience Level">
                <select
                  className="input"
                  value={editing.experience_level || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, experience_level: e.target.value })
                  }
                >
                  <option value="">Select level…</option>
                  <option value="Junior (0–2 yrs)">Junior (0–2 yrs)</option>
                  <option value="Mid (2–5 yrs)">Mid (2–5 yrs)</option>
                  <option value="Senior (5–8 yrs)">Senior (5–8 yrs)</option>
                  <option value="Lead / Principal (8+ yrs)">
                    Lead / Principal (8+ yrs)
                  </option>
                </select>
              </Field>
              <Field label="Prior Experience (Years)">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  className="input"
                  placeholder="e.g. 4.5"
                  value={
                    editing.prior_experience_years !== null &&
                    editing.prior_experience_years !== undefined
                      ? editing.prior_experience_years
                      : ""
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      prior_experience_years:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
              <Field label="Joining Date">
                <input
                  type="date"
                  className="input"
                  value={editing.joining_date || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, joining_date: e.target.value || null })
                  }
                />
              </Field>
              <Field label="Allocation % (0–100)">
                <input
                  type="number"
                  min="0"
                  max="100"
                  className="input"
                  placeholder="e.g. 100"
                  value={
                    editing.allocation_pct !== null &&
                    editing.allocation_pct !== undefined
                      ? editing.allocation_pct
                      : ""
                  }
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      allocation_pct:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                />
              </Field>
            </div>
          )}

          {/* Tab 3: Contact & Location */}
          {activeTab === "contact" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Email Address">
                <input
                  type="email"
                  className="input"
                  placeholder="e.g. member@company.com"
                  value={editing.email || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, email: e.target.value })
                  }
                />
              </Field>
              <Field label="Phone Number">
                <input
                  className="input"
                  placeholder="e.g. +1 555-0199"
                  value={editing.phone || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, phone: e.target.value })
                  }
                />
              </Field>
              <Field label="Location">
                <input
                  className="input"
                  placeholder="e.g. Kochi, Bangalore, Remote"
                  value={editing.location || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, location: e.target.value })
                  }
                />
              </Field>
              <Field label="Timezone">
                <input
                  className="input"
                  placeholder="e.g. IST, UTC, EST"
                  value={editing.timezone || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, timezone: e.target.value })
                  }
                />
              </Field>
            </div>
          )}

          {/* Tab 4: Skills & Projects */}
          {activeTab === "skills" && (
            <div className="space-y-3">
              <Field label="Skills (comma separated)">
                <input
                  className="input"
                  placeholder="e.g. React, TypeScript, Node.js, Next.js"
                  value={(editing.skills || []).join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      skills: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field label="Current / Recent Projects (comma separated)">
                <input
                  className="input"
                  placeholder="e.g. Mobile App, Internal Portal, Slavic"
                  value={(editing.projects || []).join(", ")}
                  onChange={(e) =>
                    setEditing({
                      ...editing,
                      projects: e.target.value
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </Field>
              <Field label="Certifications">
                <input
                  className="input"
                  placeholder="e.g. AWS Certified Solutions Architect, PMP"
                  value={editing.certifications || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, certifications: e.target.value })
                  }
                />
              </Field>
            </div>
          )}

          {/* Tab 5: Ratings & Notes */}
          {activeTab === "notes" && (
            <div className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Performance Rating">
                  <input
                    className="input"
                    placeholder="e.g. Exceeds Expectations, Good"
                    value={editing.performance_rating || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        performance_rating: e.target.value,
                      })
                    }
                  />
                </Field>
                <Field label="Attendance Rating">
                  <input
                    className="input"
                    placeholder="e.g. Excellent, Good"
                    value={editing.attendance_rating || ""}
                    onChange={(e) =>
                      setEditing({
                        ...editing,
                        attendance_rating: e.target.value,
                      })
                    }
                  />
                </Field>
              </div>
              <Field label="Career Note">
                <textarea
                  className="input min-h-[60px]"
                  placeholder="Goals, target promotions, aspirations…"
                  value={editing.career_note || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, career_note: e.target.value })
                  }
                />
              </Field>
              <Field label="Attendance Note">
                <input
                  className="input"
                  placeholder="Leave history, working patterns…"
                  value={editing.attendance_note || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, attendance_note: e.target.value })
                  }
                />
              </Field>
              <Field label="Attitude Note">
                <input
                  className="input"
                  placeholder="Collaboration, leadership, peer feedback…"
                  value={editing.attitude_note || ""}
                  onChange={(e) =>
                    setEditing({ ...editing, attitude_note: e.target.value })
                  }
                />
              </Field>
            </div>
          )}

          {/* Form Actions */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <div className="text-xs text-ink-faint">
              * Required field
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setEditing(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || !editing.name?.trim()}
                onClick={save}
              >
                {saving ? "Saving…" : editing.id ? "Update member" : "Save member"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-soft">
        {label}
      </span>
      {children}
    </label>
  );
}
