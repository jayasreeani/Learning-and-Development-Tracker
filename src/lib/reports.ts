export type Granularity = "monthly" | "quarterly" | "halfyearly" | "yearly";

export const GRANULARITY_LABEL: Record<Granularity, string> = {
  monthly: "Monthly",
  quarterly: "Quarterly",
  halfyearly: "Half-yearly",
  yearly: "Yearly",
};

const BUCKET_COUNT: Record<Granularity, number> = {
  monthly: 12,
  quarterly: 8,
  halfyearly: 6,
  yearly: 5,
};

/** Returns a period key like "2026-Q1", "2026-H1", "2026-03", "2026". */
export function periodKey(date: Date, granularity: Granularity): string {
  const y = date.getFullYear();
  const m = date.getMonth(); // 0-11
  switch (granularity) {
    case "monthly":
      return `${y}-${String(m + 1).padStart(2, "0")}`;
    case "quarterly":
      return `${y}-Q${Math.floor(m / 3) + 1}`;
    case "halfyearly":
      return `${y}-H${m < 6 ? 1 : 2}`;
    case "yearly":
      return `${y}`;
  }
}

export function periodLabel(key: string, granularity: Granularity): string {
  if (granularity === "monthly") {
    const [y, m] = key.split("-");
    const d = new Date(Number(y), Number(m) - 1, 1);
    return d.toLocaleDateString(undefined, { month: "short", year: "2-digit" });
  }
  return key;
}

/** Generates the last N period keys up to and including today, oldest first. */
export function generatePeriodKeys(granularity: Granularity, count?: number): string[] {
  const n = count ?? BUCKET_COUNT[granularity];
  const keys: string[] = [];
  const now = new Date();
  const step =
    granularity === "monthly"
      ? 1
      : granularity === "quarterly"
        ? 3
        : granularity === "halfyearly"
          ? 6
          : 12;

  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i * step, 1);
    keys.push(periodKey(d, granularity));
  }
  // de-dupe while preserving order (yearly can repeat with small counts)
  return Array.from(new Set(keys));
}

export function bucketByPeriod<T>(
  items: T[],
  getDate: (item: T) => string | null,
  granularity: Granularity
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const raw = getDate(item);
    if (!raw) continue;
    const key = periodKey(new Date(raw), granularity);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return map;
}
