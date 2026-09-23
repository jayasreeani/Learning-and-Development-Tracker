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
  employment_type: "",
  email: "",
  phone: "",
  location: "",
  availability_status: "",
  skills: [],
  projects: [],
};

export default function RosterPage() {
  const { rows: members, loaded, supabase } = useTable<Member>("members");
  const { canManage } = useViewer();
  const [editing, setEditing] = useState<Partial<Member> | null>(null);
  const [query, setQuery] = useState("");
  const [saving, setSaving] = useState(false);

  const filtered = members.filter((m) =>
    `${m.name} ${m.designation} ${m.skills?.join(" ")}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  async function save() {
    if (!editing) return;
    setSaving(true);
    const payload = { ...editing, updated_at: new Date().toISOString() };
    if (editing.id) {
      await supabase.from("members").update(payload).eq("id", editing.id);
    } else {
      await supabase.from("members").insert(payload);
    }
    setSaving(false);
    setEditing(null);
  }

  async function remove(id: string) {
    if (!confirm("Remove this team member? This cannot be undone.")) return;
    await supabase.from("members").delete().eq("id", id);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Team Roster
          </h1>
          <p className="text-sm text-ink-soft">
            {members.length} member{members.length === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex gap-2">
          <input
            className="input w-56"
            placeholder="Search name, role, skill…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {canManage && (
            <button
              className="btn btn-primary"
              onClick={() => setEditing({ ...BLANK })}
            >
              + Add member
            </button>
          )}
        </div>
      </div>

      {!loaded ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-soft">
          No team members yet.
          {canManage && " Add your first one to get started."}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <div key={m.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-ink">{m.name}</h3>
                  <p className="text-sm text-ink-soft">{m.designation}</p>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button
                      className="rounded-full px-2 py-1 text-xs text-ink-faint hover:bg-teal-tint hover:text-ink"
                      onClick={() => setEditing(m)}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-full px-2 py-1 text-xs text-ink-faint hover:bg-critical/10 hover:text-critical"
                      onClick={() => remove(m.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              <div className="mt-3 space-y-1 text-sm text-ink-soft">
                {m.reporting_manager && <p>Reports to {m.reporting_manager}</p>}
                {m.email && <p className="truncate">{m.email}</p>}
                {m.location && <p>{m.location}</p>}
              </div>
              {m.skills?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.skills.map((s) => (
                    <span key={s} className="chip">
                      {s}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Modal
          title={editing.id ? "Edit member" : "Add team member"}
          onClose={() => setEditing(null)}
          wide
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name">
              <input
                className="input"
                value={editing.name || ""}
                onChange={(e) =>
                  setEditing({ ...editing, name: e.target.value })
                }
              />
            </Field>
            <Field label="Designation">
              <input
                className="input"
                value={editing.designation || ""}
                onChange={(e) =>
                  setEditing({ ...editing, designation: e.target.value })
                }
              />
            </Field>
            <Field label="Role type">
              <input
                className="input"
                value={editing.role_type || ""}
                onChange={(e) =>
                  setEditing({ ...editing, role_type: e.target.value })
                }
              />
            </Field>
            <Field label="Reporting manager">
              <input
                className="input"
                value={editing.reporting_manager || ""}
                onChange={(e) =>
                  setEditing({ ...editing, reporting_manager: e.target.value })
                }
              />
            </Field>
            <Field label="Employment type">
              <input
                className="input"
                value={editing.employment_type || ""}
                onChange={(e) =>
                  setEditing({ ...editing, employment_type: e.target.value })
                }
              />
            </Field>
            <Field label="Availability">
              <input
                className="input"
                value={editing.availability_status || ""}
                onChange={(e) =>
                  setEditing({
                    ...editing,
                    availability_status: e.target.value,
                  })
                }
              />
            </Field>
            <Field label="Email">
              <input
                className="input"
                value={editing.email || ""}
                onChange={(e) =>
                  setEditing({ ...editing, email: e.target.value })
                }
              />
            </Field>
            <Field label="Phone">
              <input
                className="input"
                value={editing.phone || ""}
                onChange={(e) =>
                  setEditing({ ...editing, phone: e.target.value })
                }
              />
            </Field>
            <Field label="Location">
              <input
                className="input"
                value={editing.location || ""}
                onChange={(e) =>
                  setEditing({ ...editing, location: e.target.value })
                }
              />
            </Field>
            <Field label="Skills (comma separated)">
              <input
                className="input"
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
            <Field label="Projects (comma separated)">
              <input
                className="input"
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
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={saving || !editing.name}
              onClick={save}
            >
              {saving ? "Saving…" : "Save"}
            </button>
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
