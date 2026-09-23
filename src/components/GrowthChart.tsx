"use client";

import { useState } from "react";

interface Series {
  key: string;
  label: string;
  color: string;
  values: number[];
}

export default function GrowthChart({
  periods,
  series,
}: {
  periods: string[];
  series: Series[];
}) {
  const [view, setView] = useState<"chart" | "table">("chart");
  const max = Math.max(1, ...series.flatMap((s) => s.values));

  const width = 640;
  const height = 260;
  const padTop = 16;
  const padBottom = 32;
  const padLeft = 8;
  const padRight = 8;
  const plotH = height - padTop - padBottom;
  const groupW = (width - padLeft - padRight) / Math.max(periods.length, 1);
  const barGap = 2;
  const barW = Math.max(4, (groupW - barGap * (series.length + 1)) / series.length);

  return (
    <div className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          {series.map((s) => (
            <span key={s.key} className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
              <span
                className="inline-block h-2.5 w-2.5 rounded-full"
                style={{ background: s.color }}
              />
              {s.label}
            </span>
          ))}
        </div>
        <div className="flex rounded-full border border-line p-0.5 text-xs">
          <button
            className={`rounded-full px-2.5 py-1 font-medium ${view === "chart" ? "bg-teal text-white" : "text-ink-soft"}`}
            onClick={() => setView("chart")}
          >
            Chart
          </button>
          <button
            className={`rounded-full px-2.5 py-1 font-medium ${view === "table" ? "bg-teal text-white" : "text-ink-soft"}`}
            onClick={() => setView("table")}
          >
            Table
          </button>
        </div>
      </div>

      {periods.length === 0 ? (
        <p className="py-8 text-center text-sm text-ink-soft">
          No activity yet for this member.
        </p>
      ) : view === "chart" ? (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full"
          role="img"
          aria-label="Growth over time by period"
        >
          {/* baseline */}
          <line
            x1={padLeft}
            y1={height - padBottom}
            x2={width - padRight}
            y2={height - padBottom}
            stroke="var(--line)"
            strokeWidth={1}
          />
          {periods.map((p, gi) => {
            const groupX = padLeft + gi * groupW;
            return (
              <g key={p}>
                {series.map((s, si) => {
                  const v = s.values[gi] || 0;
                  const h = (v / max) * plotH;
                  const x = groupX + barGap + si * (barW + barGap);
                  const y = height - padBottom - h;
                  return (
                    <rect
                      key={s.key}
                      x={x}
                      y={h > 0 ? y : height - padBottom - 2}
                      width={barW}
                      height={h > 0 ? h : 2}
                      rx={4}
                      fill={s.color}
                    />
                  );
                })}
                <text
                  x={groupX + groupW / 2}
                  y={height - padBottom + 16}
                  textAnchor="middle"
                  fontSize={10}
                  fill="var(--ink-faint)"
                >
                  {p}
                </text>
              </g>
            );
          })}
        </svg>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs font-semibold uppercase tracking-wide text-ink-faint">
                <th className="px-3 py-2">Period</th>
                {series.map((s) => (
                  <th key={s.key} className="px-3 py-2">
                    {s.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {periods.map((p, gi) => (
                <tr key={p} className="border-b border-line last:border-0">
                  <td className="px-3 py-2 font-medium text-ink">{p}</td>
                  {series.map((s) => (
                    <td key={s.key} className="px-3 py-2 text-ink-soft">
                      {s.values[gi] || 0}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
