"use client";

import { useMemo, useState } from "react";
import { useTable } from "@/lib/hooks/useTable";
import { useViewer } from "@/lib/hooks/ViewerProvider";
import type { Member, RequestStatus, TrainingRequest } from "@/lib/supabase/types";
import Modal from "@/components/Modal";

const STATUSES: RequestStatus[] = ["Pending", "Scheduled", "Completed"];
const CHIP_CLASS: Record<RequestStatus, string> = {
  Pending: "chip chip-pending",
  Scheduled: "chip chip-scheduled",
  Completed: "chip chip-completed",
};

export default function RequestsPage() {
  const { rows: members } = useTable<Member>("members");
  const { rows: requests, supabase } = useTable<TrainingRequest>(
    "training_requests"
  );
  const { canManage, id: viewerId, member: viewerMember } = useViewer();
  const [form, setForm] = useState<Partial<TrainingRequest> | null>(null);
  const [saving, setSaving] = useState(false);
  const [filter, setFilter] = useState<RequestStatus | "All">("All");

  const memberName = useMemo(() => {
    const map = new Map(members.map((m) => [m.id, m.name]));
    return (id: string | null) => (id ? map.get(id) || "—" : "—");
  }, [members]);

  const visible = requests
    .filter((r) => filter === "All" || r.status === filter)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));

  function openNew() {
    setForm({
      member_id: viewerMember?.id || members[0]?.id || "",
      topic: "",
      reason: "",
      status: "Pending",
    });
  }

  async function save() {
    if (!form) return;
    setSaving(true);
    const member = members.find((m) => m.id === form.member_id);

    if (form.id) {
      // Editing an existing request — only a manager reaches this path
      // (raised requests are read-only for the requester once submitted).
      await supabase
        .from("training_requests")
        .update({
          topic: form.topic,
          reason: form.reason,
          status: form.status,
        })
        .eq("id", form.id);
    } else {
      await supabase.from("training_requests").insert({
        member_id: form.member_id,
        member_name: member?.name || "",
        topic: form.topic,
        reason: form.reason,
        status: "Pending",
        requested_by: viewerId,
      });
    }
    setSaving(false);
    setForm(null);
  }

  async function remove(id: string) {
    if (!confirm("Delete this training request?")) return;
    await supabase.from("training_requests").delete().eq("id", id);
  }

  async function quickStatus(r: TrainingRequest, status: RequestStatus) {
    await supabase.from("training_requests").update({ status }).eq("id", r.id);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Training Requests
          </h1>
          <p className="text-sm text-ink-soft">
            New requests start as Pending. {canManage ? "Move them to Scheduled once planned, then Completed." : "Your manager will schedule it."}
          </p>
        </div>
        <div className="flex gap-2">
          <select
            className="input w-40"
            value={filter}
            onChange={(e) => setFilter(e.target.value as RequestStatus | "All")}
          >
            <option value="All">All statuses</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            disabled={members.length === 0}
            onClick={openNew}
          >
            + Raise a request
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ink-soft">
          No training requests yet.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-faint">
                <th className="px-4 py-3">Member</th>
                <th className="px-4 py-3">Topic</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0">
                  <td className="px-4 py-2.5">{memberName(r.member_id)}</td>
                  <td className="px-4 py-2.5">{r.topic}</td>
                  <td className="px-4 py-2.5 text-ink-soft">{r.reason}</td>
                  <td className="px-4 py-2.5">
                    {canManage ? (
                      <select
                        className={`${CHIP_CLASS[r.status]} border-0 py-1`}
                        value={r.status}
                        onChange={(e) =>
                          quickStatus(r, e.target.value as RequestStatus)
                        }
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={CHIP_CLASS[r.status]}>{r.status}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {canManage && (
                      <div className="flex justify-end gap-1">
                        <button
                          className="rounded-full px-2 py-1 text-xs text-ink-faint hover:bg-teal-tint hover:text-ink"
                          onClick={() => setForm(r)}
                        >
                          Edit
                        </button>
                        <button
                          className="rounded-full px-2 py-1 text-xs text-ink-faint hover:bg-critical/10 hover:text-critical"
                          onClick={() => remove(r.id)}
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <Modal
          title={form.id ? "Edit request" : "Raise a training request"}
          onClose={() => setForm(null)}
        >
          <div className="space-y-3">
            <label className="block">
              <span className="mb-1 block text-xs font-semibold text-ink-soft">
                Member
              </span>
              <select
                className="input"
                value={form.member_id || ""}
                disabled={!!form.id || (!canManage && !!viewerMember)}
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
                Reason
              </span>
              <textarea
                className="input"
                rows={3}
                value={form.reason || ""}
                onChange={(e) => setForm({ ...form, reason: e.target.value })}
              />
            </label>
            {/* Status is deliberately not shown when creating a new request —
                it always starts Pending. It's only editable here when a
                manager opens an existing request. */}
            {form.id && (
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-ink-soft">
                  Status
                </span>
                <select
                  className="input"
                  value={form.status || "Pending"}
                  onChange={(e) =>
                    setForm({ ...form, status: e.target.value as RequestStatus })
                  }
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <button className="btn btn-ghost" onClick={() => setForm(null)}>
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
