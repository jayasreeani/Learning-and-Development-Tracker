"use client";

import { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { useTable } from "@/lib/hooks/useTable";
import type {
  Member,
  SkillEvent,
  Training,
  TrainingPlan,
} from "@/lib/supabase/types";
import {
  bucketByPeriod,
  generatePeriodKeys,
  GRANULARITY_LABEL,
  periodLabel,
  type Granularity,
} from "@/lib/reports";
import GrowthChart from "@/components/GrowthChart";

const GRANULARITIES: Granularity[] = [
  "monthly",
  "quarterly",
  "halfyearly",
  "yearly",
];

export default function ReportsPage() {
  const { rows: members } = useTable<Member>("members");
  const { rows: trainings } = useTable<Training>("trainings");
  const { rows: plans } = useTable<TrainingPlan>("training_plans");
  const { rows: skillEvents } = useTable<SkillEvent>("skill_events");

  const [memberId, setMemberId] = useState<string>("");
  const [granularity, setGranularity] = useState<Granularity>("halfyearly");

  const activeMemberId = memberId || members[0]?.id || "";
  const member = members.find((m) => m.id === activeMemberId);

  const memberTrainings = trainings.filter((t) => t.member_id === activeMemberId);
  const memberPlans = plans.filter((p) => p.member_id === activeMemberId);
  const memberSkills = skillEvents.filter((s) => s.member_id === activeMemberId);

  const periods = useMemo(
    () => generatePeriodKeys(granularity),
    [granularity]
  );

  const trainingBuckets = useMemo(
    () => bucketByPeriod(memberTrainings, (t) => t.date_completed, granularity),
    [memberTrainings, granularity]
  );
  const planBuckets = useMemo(
    () => bucketByPeriod(memberPlans, (p) => p.schedule, granularity),
    [memberPlans, granularity]
  );
  const skillBuckets = useMemo(
    () => bucketByPeriod(memberSkills, (s) => s.event_date, granularity),
    [memberSkills, granularity]
  );

  const series = [
    {
      key: "trainings",
      label: "Trainings attended",
      color: "var(--series-1)",
      values: periods.map((p) => trainingBuckets.get(p)?.length || 0),
    },
    {
      key: "plans",
      label: "Trainings taken (planned)",
      color: "var(--series-2)",
      values: periods.map((p) => planBuckets.get(p)?.length || 0),
    },
    {
      key: "skills",
      label: "Skills upgraded",
      color: "var(--series-3)",
      values: periods.map((p) => skillBuckets.get(p)?.length || 0),
    },
  ];

  const periodLabels = periods.map((p) => periodLabel(p, granularity));

  function downloadExcel() {
    if (!member) return;
    const wb = XLSX.utils.book_new();

    const summaryRows = [
      ["Learning & Development Report"],
      ["Member", member.name],
      ["Designation", member.designation],
      ["Granularity", GRANULARITY_LABEL[granularity]],
      ["Generated", new Date().toLocaleString()],
      [],
      ["Period", "Trainings attended", "Trainings taken (planned)", "Skills upgraded"],
      ...periods.map((p, i) => [
        periodLabel(p, granularity),
        series[0].values[i],
        series[1].values[i],
        series[2].values[i],
      ]),
    ];
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

    const trainingRows = [
      ["Title", "Type", "Platform", "Date completed", "Notes"],
      ...memberTrainings.map((t) => [
        t.title,
        t.type,
        t.platform,
        t.date_completed || "",
        t.notes,
      ]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(trainingRows),
      "Trainings attended"
    );

    const planRows = [
      ["Topic", "Purpose", "Scheduled for"],
      ...memberPlans.map((p) => [
        p.topic,
        p.purpose,
        p.schedule ? new Date(p.schedule).toLocaleString() : "",
      ]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(planRows),
      "Trainings taken"
    );

    const skillRows = [
      ["Skill", "Date"],
      ...memberSkills.map((s) => [s.skill, s.event_date]),
    ];
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.aoa_to_sheet(skillRows),
      "Skills upgraded"
    );

    const filename = `${member.name.replace(/[^\w\- ]+/g, "").trim() || "member"}-ld-report.xlsx`;
    XLSX.writeFile(wb, filename);
  }

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Reports
          </h1>
          <p className="text-sm text-ink-soft">
            Individual growth report — download as Excel any time.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <select
            className="input w-48"
            value={activeMemberId}
            onChange={(e) => setMemberId(e.target.value)}
          >
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <select
            className="input w-40"
            value={granularity}
            onChange={(e) => setGranularity(e.target.value as Granularity)}
          >
            {GRANULARITIES.map((g) => (
              <option key={g} value={g}>
                {GRANULARITY_LABEL[g]}
              </option>
            ))}
          </select>
          <button
            className="btn btn-primary"
            disabled={!member}
            onClick={downloadExcel}
          >
            Download Excel
          </button>
        </div>
      </div>

      {!member ? (
        <div className="card p-8 text-center text-sm text-ink-soft">
          Add a team member on the Roster page to see their report.
        </div>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-3">
            <Stat label="Trainings attended" value={memberTrainings.length} />
            <Stat label="Trainings taken" value={memberPlans.length} />
            <Stat label="Skills upgraded" value={memberSkills.length} />
          </div>

          <GrowthChart periods={periodLabels} series={series} />
        </>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </p>
      <p className="font-display mt-1 text-2xl font-semibold text-ink">
        {value}
      </p>
    </div>
  );
}
