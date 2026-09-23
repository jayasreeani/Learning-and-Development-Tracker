"use client";

import { useMemo, useState } from "react";
import { useTable } from "@/lib/hooks/useTable";
import { useViewer } from "@/lib/hooks/ViewerProvider";
import type { Member, SkillEvent, Training } from "@/lib/supabase/types";
import Modal from "@/components/Modal";

export default function LearningPage() {
  const { rows: members } = useTable<Member>("members");
  const { rows: trainings, supabase } = useTable<Training>("trainings");
  const { rows: skillEvents, supabase: supabase2 } =
    useTable<SkillEvent>("skill_events");
  const { canManage } = useViewer();

  const [tab, setTab] = useState<"trainings" | "skills">("trainings");
  const [trainingForm, setTrainingForm] = useState<Partial<Training> | null>(
    null
  );
  const [skillForm, setSkillForm] = useState<Partial<SkillEvent> | null>(null);
  const [saving, setSaving] = useState(false);

  const memberName = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, m.name]));
    return (id: string | null) => (id ? map.get(id) || "—" : "—");
  }, [members]);

  async function saveTraining() {
    if (!trainingForm) return;
    setSaving(true);
    const member = members.find((m) => m.id === trainingForm.member_id);
    const payload = { ...trainingForm, member_name: member?.name || "" };
    if (trainingForm.id) {
      await supabase.from("trainings").update(payload).eq("id", trainingForm.id);
    } else {
      await supabase.from("trainings").insert(payload);
    }
    setSaving(false);
    setTrainingForm(null);
  }

  async function saveSkill() {
    if (!skillForm) return;
    setSaving(true);
    const member = members.find((m) => m.id === skillForm.member_id);
    const payload = { ...skillForm, member_name: member?.name || "" };
    if (skillForm.id) {
      await supabase2.from("skill_events").update(payload).eq("id", skillForm.id);
    } else {
      await supabase2.from("skill_events").insert(payload);
    }
    setSaving(false);
    setSkillForm(null);
  }

  async function removeTraining(id: string) {
    if (!confirm("Delete this training record?")) return;
    await supabase.from("trainings").delete().eq("id", id);
  }

  async function removeSkill(id: string) {
    if (!confirm("Delete this skill entry?")) return;
    await supabase2.from("skill_events").delete().eq("id", id);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Learning &amp; Development
          </h1>
          <p className="text-sm text-ink-soft">
            Trainings attended and skills upgraded, per team member.
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-full border border-line p-1">
            <button
              className={`rounded-full px-3 py-1 text-sm font-medium ${tab === "trainings" ? "bg-teal text-white" : "text-ink-soft"}`}
              onClick={() => setTab("trainings")}
            >
              Trainings
            </button>
            <button
              className={`rounded-full px-3 py-1 text-sm font-medium ${tab === "skills" ? "bg-teal text-white" : "text-ink-soft"}`}
              onClick={() => setTab("skills")}
            >
              Skills upgraded
            </button>
          </div>
          {canManage && tab === "trainings" && (
            <button
              className="btn btn-primary"
              onClick={() =>
                setTrainingForm({
                  member_id: members[0]?.id || "",
                  title: "",
                  type: "",
                  platform: "",
                  date_completed: new Date().toISOString().slice(0, 10),
                  notes: "",
                })
              }
              disabled={members.length === 0}
            >
              + Log training
            </button>
          )}
          {canManage && tab === "skills" && (
            <button
              className="btn btn-primary"
              onClick={() =>
                setSkillForm({
                  member_id: members[0]?.id || "",
                  skill: "",
                  event_date: new Date().toISOString().slice(0, 10),
                })
              }
              disabled={members.length === 0}
            >
              + Log skill
            </button>
          )}
        </div>
      </div>

      {tab === "trainings" ? (
        <Table
          rows={trainings}
          empty="No trainings logged yet."
          columns={["Member", "Title", "Type", "Platform", "Completed", ""]}
          render={(t) => [
            memberName(t.member_id),
            t.title,
            t.type,
            t.platform,
            t.date_completed || "—",
            canManage ? (
              <RowActions
                onEdit={() => setTrainingForm(t)}
                onDelete={() => removeTraining(t.id)}
              />
            ) : null,
          ]}
        />
      ) : (
        <Table
          rows={skillEvents}
          empty="No skills logged yet."
          columns={["Member", "Skill", "Date", ""]}
          render={(s) => [
            memberName(s.member_id),
            s.skill,
            s.event_date,
            canManage ? (
              <RowActions
                onEdit={() => setSkillForm(s)}
                onDelete={() => removeSkill(s.id)}
              />
            ) : null,
          ]}
        />
      )}

      {trainingForm && (
        <Modal
          title={trainingForm.id ? "Edit training" : "Log a training"}
          onClose={() => setTrainingForm(null)}
        >
          <div className="space-y-3">
            <Select
              label="Member"
              value={trainingForm.member_id || ""}
              onChange={(v) =>
                setTrainingForm({ ...trainingForm, member_id: v })
              }
              options={members.map((m) => ({ value: m.id, label: m.name }))}
            />
            <TextInput
              label="Title"
              value={trainingForm.title || ""}
              onChange={(v) => setTrainingForm({ ...trainingForm, title: v })}
            />
            <TextInput
              label="Type (e.g. Workshop, Course)"
              value={trainingForm.type || ""}
              onChange={(v) => setTrainingForm({ ...trainingForm, type: v })}
            />
            <TextInput
              label="Platform"
              value={trainingForm.platform || ""}
              onChange={(v) =>
                setTrainingForm({ ...trainingForm, platform: v })
              }
            />
            <TextInput
              label="Date completed"
              type="date"
              value={trainingForm.date_completed || ""}
              onChange={(v) =>
                setTrainingForm({ ...trainingForm, date_completed: v })
              }
            />
            <TextInput
              label="Notes"
              value={trainingForm.notes || ""}
              onChange={(v) => setTrainingForm({ ...trainingForm, notes: v })}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button
              className="btn btn-ghost"
              onClick={() => setTrainingForm(null)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={saving || !trainingForm.title || !trainingForm.member_id}
              onClick={saveTraining}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}

      {skillForm && (
        <Modal
          title={skillForm.id ? "Edit skill entry" : "Log a skill upgrade"}
          onClose={() => setSkillForm(null)}
        >
          <div className="space-y-3">
            <Select
              label="Member"
              value={skillForm.member_id || ""}
              onChange={(v) => setSkillForm({ ...skillForm, member_id: v })}
              options={members.map((m) => ({ value: m.id, label: m.name }))}
            />
            <TextInput
              label="Skill"
              value={skillForm.skill || ""}
              onChange={(v) => setSkillForm({ ...skillForm, skill: v })}
            />
            <TextInput
              label="Date"
              type="date"
              value={skillForm.event_date || ""}
              onChange={(v) => setSkillForm({ ...skillForm, event_date: v })}
            />
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setSkillForm(null)}>
              Cancel
            </button>
            <button
              className="btn btn-primary"
              disabled={saving || !skillForm.skill || !skillForm.member_id}
              onClick={saveSkill}
            >
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Table<T extends { id: string }>({
  rows,
  columns,
  render,
  empty,
}: {
  rows: T[];
  columns: string[];
  render: (row: T) => React.ReactNode[];
  empty: string;
}) {
  if (rows.length === 0) {
    return (
      <div className="card p-8 text-center text-sm text-ink-soft">{empty}</div>
    );
  }
  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[560px] text-left text-sm">
        <thead>
          <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-faint">
            {columns.map((c) => (
              <th key={c} className="px-4 py-3">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-line last:border-0">
              {render(r).map((cell, i) => (
                <td key={i} className="px-4 py-2.5 text-ink">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function RowActions({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="flex justify-end gap-1">
      <button
        className="rounded-full px-2 py-1 text-xs text-ink-faint hover:bg-teal-tint hover:text-ink"
        onClick={onEdit}
      >
        Edit
      </button>
      <button
        className="rounded-full px-2 py-1 text-xs text-ink-faint hover:bg-critical/10 hover:text-critical"
        onClick={onDelete}
      >
        Delete
      </button>
    </div>
  );
}

function TextInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-soft">
        {label}
      </span>
      <input
        type={type}
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-semibold text-ink-soft">
        {label}
      </span>
      <select
        className="input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
