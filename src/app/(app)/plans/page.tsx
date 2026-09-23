"use client";

import { useMemo, useState } from "react";
import { useTable } from "@/lib/hooks/useTable";
import { useViewer } from "@/lib/hooks/ViewerProvider";
import type { Member, TrainingPlan } from "@/lib/supabase/types";
import Modal from "@/components/Modal";

export default function PlansPage() {
  const { rows: members } = useTable<Member>("members");
  const { rows: plans, supabase } = useTable<TrainingPlan>(
    "training_plans",
    "schedule"
  );
  const { canManage } = useViewer();
  const [form, setForm] = useState<Partial<TrainingPlan> | null>(null);
  const [saving, setSaving] = useState(false);
  const [conflictError, setConflictError] = useState<string | null>(null);

  const memberName = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, m.name]));
    return (id: string | null) => (id ? map.get(id) || "—" : "—");
  }, [members]);

  const sorted = [...plans].sort((a, b) =>
    (a.schedule || "").localeCompare(b.schedule || "")
  );
  const now = new Date();
  const upcoming = sorted.filter((p) => !p.schedule || new Date(p.schedule) >= now);
  const past = sorted.filter((p) => p.schedule && new Date(p.schedule) < now);

  function findScheduleConflict(schedule: string | undefined, excludeId?: string) {
    if (!schedule) return null;
    return (
      plans.find((p) => p.id !== excludeId && p.schedule === schedule) || null
    );
  }

  async function save() {
    if (!form) return;
    setConflictError(null);

    const conflict = findScheduleConflict(form.schedule || undefined, form.id);
    if (conflict) {
      setConflictError(
        `That slot is already taken — ${conflict.member_name || "someone"} has "${conflict.topic}" scheduled at the same time. Pick a different time.`
      );
      return;
    }

    setSaving(true);
    const member = members.find((m) => m.id === form.member_id);
    const payload = { ...form, member_name: member?.name || "" };
    if (form.id) {
      await supabase.from("training_plans").update(payload).eq("id", form.id);
    } else {
      await supabase.from("training_plans").insert(payload);
    }
    setSaving(false);
    setForm(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this scheduled training plan?")) return;
    await supabase.from("training_plans").delete().eq("id", id);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Training Plans
          </h1>
          <p className="text-sm text-ink-soft">
            What&apos;s scheduled, and for whom.
          </p>
        </div>
        {canManage && (
          <button
            className="btn btn-primary"
            disabled={members.length === 0}
            onClick={() =>
              setForm({
                member_id: members[0]?.id || "",
                topic: "",
                purpose: "",
                schedule: new Date().toISOString().slice(0, 16),
              })
            }
          >
            + Schedule training
          </button>
        )}
      </div>

      <Section title="Upcoming" items={upcoming} canManage={canManage} memberName={memberName} onEdit={setForm} onDelete={remove} />
      <Section title="Past" items={past} canManage={canManage} memberName={memberName} onEdit={setForm} onDelete={remove} muted />

      {form && (
        <Modal
          title={form.id ? "Edit plan" : "Schedule a training"}
          onClose={() => {
            setForm(null);
            setConflictError(null);
          }}
        >
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">
                Member
              </span>
              <select
                className="input"
                value={form.member_id || ""}
                onChange={(e) => setForm({ ...form, member_id: e.target.value })}
              >
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">
                Topic
              </span>
              <input
                className="input"
                value={form.topic || ""}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">
                Purpose
              </span>
              <input
                className="input"
                value={form.purpose || ""}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">
                Scheduled for
              </span>
              <input
                type="datetime-local"
                className="input"
                value={form.schedule?.slice(0, 16) || ""}
                onChange={(e) => {
                  setConflictError(null);
                  setForm({ ...form, schedule: e.target.value });
                }}
              />
            </label>
            {conflictError && (
              <p className="text-sm text-critical">{conflictError}</p>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              className="btn btn-ghost"
              onClick={() => {
                setForm(null);
                setConflictError(null);
              }}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={saving || !form.topic || !form.member_id}
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

function Section({
  title,
  items,
  canManage,
  memberName,
  onEdit,
  onDelete,
  muted,
}: {
  title: string;
  items: TrainingPlan[];
  canManage: boolean;
  memberName: (id: string | null) => string;
  onEdit: (p: TrainingPlan) => void;
  onDelete: (id: string) => void;
  muted?: boolean;
}) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">
        {title}
      </h2>
      {items.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-soft">
          Nothing here.
        </div>
      ) : (
        <div className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${muted ? "opacity-70" : ""}`}>
          {items.map((p) => (
            <div key={p.id} className="card p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-semibold text-ink">{p.topic}</h3>
                  <p className="text-sm text-ink-soft">{memberName(p.member_id)}</p>
                </div>
                {canManage && (
                  <div className="flex gap-1">
                    <button
                      className="rounded-full px-2 py-1 text-xs text-ink-faint hover:bg-teal-tint hover:text-ink"
                      onClick={() => onEdit(p)}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-full px-2 py-1 text-xs text-ink-faint hover:bg-critical/10 hover:text-critical"
                      onClick={() => onDelete(p.id)}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
              {p.purpose && <p className="mt-2 text-sm text-ink-soft">{p.purpose}</p>}
              {p.schedule && (
                <p className="mt-2 text-xs font-semibold text-teal">
                  {new Date(p.schedule).toLocaleString()}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
