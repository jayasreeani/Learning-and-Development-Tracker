"use client";

import { useMemo, useState } from "react";
import { useTable } from "@/lib/hooks/useTable";
import { useViewer } from "@/lib/hooks/ViewerProvider";
import type { Member, TrainingPlan } from "@/lib/supabase/types";
import Modal from "@/components/Modal";

// 1-Hour standard slots for training sessions
const DAILY_SLOTS = [
  { id: "09:00", label: "09:00 AM – 10:00 AM", timeLabel: "09:00 AM" },
  { id: "10:00", label: "10:00 AM – 11:00 AM", timeLabel: "10:00 AM" },
  { id: "11:00", label: "11:00 AM – 12:00 PM", timeLabel: "11:00 AM" },
  { id: "12:00", label: "12:00 PM – 01:00 PM", timeLabel: "12:00 PM" },
  { id: "14:00", label: "02:00 PM – 03:00 PM", timeLabel: "02:00 PM" },
  { id: "15:00", label: "03:00 PM – 04:00 PM", timeLabel: "03:00 PM" },
  { id: "16:00", label: "04:00 PM – 05:00 PM", timeLabel: "04:00 PM" },
  { id: "17:00", label: "05:00 PM – 06:00 PM", timeLabel: "05:00 PM" },
];

function getLocalDateString(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSlotDate(dateStr: string, slotId: string): Date {
  const [hours, minutes] = slotId.split(":").map(Number);
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, hours, minutes, 0, 0);
}

export default function PlansPage() {
  const { rows: members } = useTable<Member>("members");
  const { rows: plans, supabase } = useTable<TrainingPlan>(
    "training_plans",
    "schedule"
  );
  const { canManage, id: viewerId } = useViewer();

  const [form, setForm] = useState<Partial<TrainingPlan> | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    getLocalDateString(new Date())
  );
  const [overviewDate, setOverviewDate] = useState<string>(() =>
    getLocalDateString(new Date())
  );
  const [useCustomTime, setUseCustomTime] = useState(false);

  const memberName = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, m.name]));
    return (id: string | null) => (id ? map.get(id) || "—" : "—");
  }, [members]);

  const sorted = useMemo(
    () =>
      [...plans].sort((a, b) =>
        (a.schedule || "").localeCompare(b.schedule || "")
      ),
    [plans]
  );

  const now = new Date();
  const upcoming = sorted.filter((p) => !p.schedule || new Date(p.schedule) >= now);
  const past = sorted.filter((p) => p.schedule && new Date(p.schedule) < now);

  // Checks whether a given timestamp collides with an existing plan (within 55 minutes)
  function findConflict(
    targetDate: Date,
    excludeId?: string
  ): { isConflict: boolean; conflictingPlan: TrainingPlan | null } {
    const targetMs = targetDate.getTime();
    for (const p of plans) {
      if (p.id === excludeId || !p.schedule) continue;
      const planDate = new Date(p.schedule);
      const diffMs = Math.abs(planDate.getTime() - targetMs);
      // Within 55 minutes window counts as a conflict for 1-hour sessions
      if (diffMs < 55 * 60 * 1000) {
        return { isConflict: true, conflictingPlan: p };
      }
    }
    return { isConflict: false, conflictingPlan: null };
  }

  // Get status for each slot on a specific date
  function getSlotStatus(dateStr: string, slotId: string, excludeId?: string) {
    const slotDate = getSlotDate(dateStr, slotId);
    const { isConflict, conflictingPlan } = findConflict(slotDate, excludeId);

    const isCurrentPlanSlot =
      form?.schedule &&
      Math.abs(new Date(form.schedule).getTime() - slotDate.getTime()) < 5 * 60 * 1000;

    return {
      slotDate,
      isBlocked: isConflict && !isCurrentPlanSlot,
      isCurrentPlanSlot,
      conflictingPlan,
    };
  }

  function openNewPlan(initialDate?: string, initialSlotId?: string) {
    const dateToUse = initialDate || getLocalDateString(new Date());
    setSelectedDate(dateToUse);
    setUseCustomTime(false);
    setErrorMsg(null);

    const slotId = initialSlotId || "10:00";
    const slotDate = getSlotDate(dateToUse, slotId);

    setForm({
      member_id: members[0]?.id || "",
      topic: "",
      purpose: "",
      schedule: slotDate.toISOString(),
      created_by: viewerId,
    });
  }

  function openEditPlan(p: TrainingPlan) {
    setErrorMsg(null);
    if (p.schedule) {
      const d = new Date(p.schedule);
      setSelectedDate(getLocalDateString(d));
      const hours = String(d.getHours()).padStart(2, "0");
      const mins = String(d.getMinutes()).padStart(2, "0");
      const matchedSlot = DAILY_SLOTS.find(
        (s) => s.id === `${hours}:${mins}` || s.id === `${hours}:00`
      );
      setUseCustomTime(!matchedSlot);
    }
    setForm({ ...p });
  }

  async function save() {
    if (!form || !form.topic?.trim() || !form.member_id) return;
    setErrorMsg(null);

    if (!form.schedule) {
      setErrorMsg("Please select a training date and time slot.");
      return;
    }

    const scheduleDate = new Date(form.schedule);
    const { isConflict, conflictingPlan } = findConflict(
      scheduleDate,
      form.id
    );

    if (isConflict && conflictingPlan) {
      const conflictName =
        conflictingPlan.member_name || memberName(conflictingPlan.member_id);
      setErrorMsg(
        `Slot Conflict: That time is already blocked for "${conflictingPlan.topic}" (${conflictName}). Please choose an open slot.`
      );
      return;
    }

    setSaving(true);
    try {
      const member = members.find((m) => m.id === form.member_id);
      const payload: Partial<TrainingPlan> = {
        member_id: form.member_id,
        member_name: member?.name || "",
        topic: form.topic.trim(),
        purpose: form.purpose?.trim() || "",
        schedule: scheduleDate.toISOString(),
        created_by: form.created_by || viewerId,
      };

      if (form.id) {
        const { error } = await supabase
          .from("training_plans")
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("training_plans")
          .insert(payload);
        if (error) throw error;
      }

      setForm(null);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save training plan.";
      setErrorMsg(msg);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string, topic?: string) {
    if (
      !confirm(
        `Delete scheduled training "${topic || "this training"}"? This cannot be undone.`
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("training_plans")
      .delete()
      .eq("id", id);

    if (error) {
      alert(`Could not delete training plan: ${error.message}`);
    }
  }

  // Permission check: only the creator or a manager can edit/delete
  function canUserModify(plan: TrainingPlan): boolean {
    if (canManage) return true;
    if (plan.created_by && viewerId && plan.created_by === viewerId) return true;
    return false;
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Training Plans
          </h1>
          <p className="text-sm text-ink-soft">
            Schedule sessions without conflicts. Blocked slots are automatically locked.
          </p>
        </div>
        <button
          className="btn btn-primary"
          disabled={members.length === 0}
          onClick={() => openNewPlan()}
        >
          + Schedule training
        </button>
      </div>

      {/* Daily Slot Schedule Overview */}
      <div className="card mb-6 p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <span className="font-display text-sm font-semibold text-ink">
              Daily Slot Overview:
            </span>
            <input
              type="date"
              className="input w-40 text-xs py-1"
              value={overviewDate}
              onChange={(e) => setOverviewDate(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-teal font-medium">
              <span className="h-2 w-2 rounded-full bg-teal" /> Available
            </span>
            <span className="flex items-center gap-1.5 text-critical font-medium">
              <span className="h-2 w-2 rounded-full bg-critical" /> Blocked
            </span>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-4">
          {DAILY_SLOTS.map((slot) => {
            const { isBlocked, conflictingPlan } = getSlotStatus(
              overviewDate,
              slot.id
            );
            return (
              <div
                key={slot.id}
                className={`rounded-lg border p-2.5 transition-all text-xs ${
                  isBlocked
                    ? "border-critical/30 bg-critical/5 text-ink"
                    : "border-line bg-paper hover:border-teal"
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{slot.label}</span>
                  {isBlocked ? (
                    <span className="chip chip-critical text-[10px] py-0.5 px-1.5">
                      🔒 Blocked
                    </span>
                  ) : (
                    <button
                      className="text-[11px] font-semibold text-teal hover:underline"
                      onClick={() => openNewPlan(overviewDate, slot.id)}
                    >
                      + Book
                    </button>
                  )}
                </div>
                {isBlocked && conflictingPlan && (
                  <p className="mt-1 truncate text-ink-soft">
                    <span className="font-medium text-ink">
                      {conflictingPlan.topic}
                    </span>{" "}
                    ({conflictingPlan.member_name || memberName(conflictingPlan.member_id)})
                  </p>
                )}
                {!isBlocked && (
                  <p className="mt-1 text-ink-faint">Open for booking</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Upcoming & Past Sections */}
      <Section
        title="Upcoming Scheduled Trainings"
        items={upcoming}
        canUserModify={canUserModify}
        memberName={memberName}
        onEdit={openEditPlan}
        onDelete={(id) => remove(id)}
      />

      <Section
        title="Past Trainings"
        items={past}
        canUserModify={canUserModify}
        memberName={memberName}
        onEdit={openEditPlan}
        onDelete={(id) => remove(id)}
        muted
      />

      {/* Schedule / Edit Modal with Slot Picker */}
      {form && (
        <Modal
          title={form.id ? "Edit Scheduled Training" : "Schedule a Training"}
          onClose={() => {
            setForm(null);
            setErrorMsg(null);
          }}
          wide
        >
          {errorMsg && (
            <div className="mb-4 rounded-md border border-critical/30 bg-critical/10 p-3 text-sm text-critical">
              <p className="font-semibold">Scheduling Error</p>
              <p className="mt-0.5">{errorMsg}</p>
              {errorMsg.toLowerCase().includes("policy") && (
                <p className="mt-1 text-xs opacity-90">
                  Tip: Execute <code>supabase/patch_4_plans_and_permissions.sql</code> in your Supabase SQL editor.
                </p>
              )}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">
                  Attendee / Member *
                </span>
                <select
                  className="input"
                  value={form.member_id || ""}
                  onChange={(e) =>
                    setForm({ ...form, member_id: e.target.value })
                  }
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} {m.designation ? `(${m.designation})` : ""}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">
                  Training Topic *
                </span>
                <input
                  className="input"
                  placeholder="e.g. Next.js 16 & Server Components"
                  value={form.topic || ""}
                  onChange={(e) => {
                    setErrorMsg(null);
                    setForm({ ...form, topic: e.target.value });
                  }}
                  required
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">
                Purpose / Learning Goals
              </span>
              <input
                className="input"
                placeholder="What skills will be gained or projects supported?"
                value={form.purpose || ""}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
              />
            </label>

            {/* Date & Slot Picker Section */}
            <div className="rounded-lg border border-line p-3">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="block text-xs font-semibold text-ink">
                    Select Training Date &amp; Time Slot *
                  </span>
                  <span className="text-xs text-ink-soft">
                    Slots that are already booked are locked to prevent conflicts.
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-ink-soft">
                    Date:
                  </span>
                  <input
                    type="date"
                    className="input w-36 py-1 text-xs"
                    value={selectedDate}
                    onChange={(e) => {
                      setSelectedDate(e.target.value);
                      setErrorMsg(null);
                      // Update form schedule to same slot on new date
                      if (form.schedule) {
                        const prevD = new Date(form.schedule);
                        const hours = String(prevD.getHours()).padStart(2, "0");
                        const mins = String(prevD.getMinutes()).padStart(2, "0");
                        const newSlotDate = getSlotDate(
                          e.target.value,
                          `${hours}:${mins}`
                        );
                        setForm({
                          ...form,
                          schedule: newSlotDate.toISOString(),
                        });
                      }
                    }}
                  />
                </div>
              </div>

              {!useCustomTime ? (
                <div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {DAILY_SLOTS.map((slot) => {
                      const { isBlocked, isCurrentPlanSlot, conflictingPlan } =
                        getSlotStatus(selectedDate, slot.id, form.id);
                      const isSelected =
                        form.schedule &&
                        Math.abs(
                          new Date(form.schedule).getTime() -
                            getSlotDate(selectedDate, slot.id).getTime()
                        ) < 5 * 60 * 1000;

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          disabled={isBlocked}
                          onClick={() => {
                            setErrorMsg(null);
                            const slotDate = getSlotDate(selectedDate, slot.id);
                            setForm({
                              ...form,
                              schedule: slotDate.toISOString(),
                            });
                          }}
                          className={`flex flex-col rounded-md border p-2.5 text-left text-xs transition-all ${
                            isBlocked
                              ? "cursor-not-allowed border-critical/30 bg-critical/10 opacity-75"
                              : isSelected
                              ? "border-teal bg-teal text-white shadow-sm"
                              : "border-line bg-paper hover:border-teal hover:bg-teal-tint/20 text-ink"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              {slot.label}
                            </span>
                            {isBlocked ? (
                              <span className="rounded bg-critical/20 px-1.5 py-0.5 text-[10px] font-bold text-critical">
                                🔒 Blocked
                              </span>
                            ) : isSelected ? (
                              <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] font-bold">
                                ✓ Selected
                              </span>
                            ) : (
                              <span className="rounded bg-teal-tint px-1.5 py-0.5 text-[10px] text-teal">
                                Available
                              </span>
                            )}
                          </div>

                          {isBlocked && conflictingPlan && (
                            <span className="mt-1 text-[11px] text-critical/90">
                              Booked: {conflictingPlan.topic} (
                              {conflictingPlan.member_name ||
                                memberName(conflictingPlan.member_id)}
                              )
                            </span>
                          )}
                          {isCurrentPlanSlot && !isSelected && (
                            <span className="mt-1 text-[11px] text-teal">
                              Current assigned slot
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 text-right">
                    <button
                      type="button"
                      className="text-xs text-ink-soft hover:text-ink hover:underline"
                      onClick={() => setUseCustomTime(true)}
                    >
                      Need a custom time? Click here →
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <label className="block">
                    <span className="mb-1 block text-xs font-semibold text-ink-soft">
                      Custom Date &amp; Time
                    </span>
                    <input
                      type="datetime-local"
                      className="input"
                      value={form.schedule?.slice(0, 16) || ""}
                      onChange={(e) => {
                        setErrorMsg(null);
                        const d = new Date(e.target.value);
                        setForm({ ...form, schedule: d.toISOString() });
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="text-xs text-teal hover:underline"
                    onClick={() => setUseCustomTime(false)}
                  >
                    ← Back to standard slot picker
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-line pt-3">
            <div className="text-xs text-ink-faint">
              * Required fields. Only you or a manager can edit this training later.
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setForm(null);
                  setErrorMsg(null);
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={saving || !form.topic?.trim() || !form.member_id}
                onClick={save}
              >
                {saving
                  ? "Saving…"
                  : form.id
                  ? "Update Plan"
                  : "Schedule Training"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function Section({
  title,
  items,
  canUserModify,
  memberName,
  onEdit,
  onDelete,
  muted,
}: {
  title: string;
  items: TrainingPlan[];
  canUserModify: (p: TrainingPlan) => boolean;
  memberName: (id: string | null) => string;
  onEdit: (p: TrainingPlan) => void;
  onDelete: (id: string, topic?: string) => void;
  muted?: boolean;
}) {
  return (
    <div className="mb-6">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-ink-faint">
        {title} ({items.length})
      </h2>
      {items.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ink-soft">
          No {title.toLowerCase()} found.
        </div>
      ) : (
        <div
          className={`grid gap-3 sm:grid-cols-2 lg:grid-cols-3 ${
            muted ? "opacity-75" : ""
          }`}
        >
          {items.map((p) => {
            const allowed = canUserModify(p);
            return (
              <div key={p.id} className="card flex flex-col justify-between p-4">
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-semibold text-ink">{p.topic}</h3>
                      <p className="text-sm text-ink-soft">
                        {memberName(p.member_id)}
                      </p>
                    </div>
                    {allowed && (
                      <div className="flex gap-1">
                        <button
                          className="rounded-full px-2 py-1 text-xs text-ink-faint hover:bg-teal-tint hover:text-ink"
                          title="Edit training"
                          onClick={() => onEdit(p)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-full px-2 py-1 text-xs text-ink-faint hover:bg-critical/10 hover:text-critical"
                          title="Delete training"
                          onClick={() => onDelete(p.id, p.topic)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  {p.purpose && (
                    <p className="mt-2 text-xs text-ink-soft">{p.purpose}</p>
                  )}
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-line pt-2 text-xs">
                  {p.schedule ? (
                    <span className="font-semibold text-teal">
                      📅 {new Date(p.schedule).toLocaleString([], {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </span>
                  ) : (
                    <span className="text-ink-faint">No date scheduled</span>
                  )}
                  {allowed && (
                    <span className="text-[10px] text-ink-faint">Editable by you</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
