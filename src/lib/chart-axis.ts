import type { ChartRangeKey, ChartRangeValue } from "@/components/chart-range-selector";

/**
 * Common Recharts <XAxis /> props to prevent label overlap on every screen size.
 * When `ticks` are supplied (see `computeAxisTicks`), pair these props with
 * `interval={0}` so every chosen tick renders. Without explicit ticks we fall
 * back to Recharts' built-in "preserveStartEnd" thinning.
 */
export const smartXAxisProps = {
  interval: "preserveStartEnd" as const,
  minTickGap: 24,
  tickMargin: 6,
};

/** Guess a sensible tick cadence for a time series given the selected range. */
export function pickTickStride(rangeKey: ChartRangeKey, points: number): number {
  if (points <= 1) return 1;
  switch (rangeKey) {
    case "1D":
      return Math.max(1, Math.ceil(points / 6));
    case "1M":
      return Math.max(1, Math.ceil(points / 5)); // ~weekly
    case "3M":
    case "6M":
      return Math.max(1, Math.ceil(points / 6)); // ~monthly
    case "1Y":
      return Math.max(1, Math.ceil(points / 12)); // ~monthly
    case "CUSTOM":
    default:
      return Math.max(1, Math.ceil(points / 8));
  }
}

/** Format an ISO date (yyyy-mm-dd) or Date as an axis tick for the given range. */
export function formatAxisTick(value: string | number | Date, range: ChartRangeValue): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const spanMs = range.start ? range.end.getTime() - range.start.getTime() : Infinity;
  const days = spanMs / 86400000;
  if (range.key === "1D" || days <= 2) {
    return d.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
  }
  if (range.key === "1M" || days <= 45) {
    return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }
  if (range.key === "3M" || range.key === "6M" || days <= 200) {
    return d.toLocaleDateString("en-IN", { month: "short" });
  }
  if (range.key === "1Y" || days <= 400) {
    return d.toLocaleDateString("en-IN", { month: "short" });
  }
  if (days <= 366 * 5) {
    const q = Math.floor(d.getMonth() / 3) + 1;
    return `Q${q} ${String(d.getFullYear()).slice(-2)}`;
  }
  return d.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
}

/** Filter a time-indexed series down to the selected range. */
export function filterSeriesByRange<T extends { label?: string | null }>(
  series: T[],
  range: ChartRangeValue,
): T[] {
  const endMs = range.end.getTime();
  const startMs = range.start ? range.start.getTime() : -Infinity;
  return series.filter((row) => {
    if (!row.label) return true;
    const t = new Date(row.label).getTime();
    if (isNaN(t)) return true;
    return t >= startMs && t <= endMs;
  });
}

/**
 * Compute the exact set of category-axis tick values (matching entries from
 * `labels`) to render for a given range. Pair with `ticks={...}` and
 * `interval={0}` on <XAxis /> so Recharts renders one label per cadence
 * boundary (weekly for 1M, monthly for 3M/6M/1Y, quarterly for multi-year,
 * etc.), always including the first and last data points, and never
 * duplicating a label.
 */
export function computeAxisTicks(
  labels: (string | null | undefined)[],
  range: ChartRangeValue,
): string[] {
  const clean = labels
    .map((l) => (typeof l === "string" ? l : null))
    .filter((l): l is string => !!l);
  if (clean.length === 0) return [];
  if (clean.length <= 2) return Array.from(new Set(clean));

  const parsed = clean
    .map((l) => ({ label: l, t: new Date(l).getTime() }))
    .filter((p) => !isNaN(p.t))
    .sort((a, b) => a.t - b.t);
  if (parsed.length === 0) return Array.from(new Set(clean));

  const spanMs = parsed[parsed.length - 1].t - parsed[0].t;
  const days = spanMs / 86400000;

  let bucketKey: (d: Date) => string;
  if (range.key === "1D" || days <= 2) {
    bucketKey = (d) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
  } else if (range.key === "1M" || days <= 45) {
    // Weekly buckets — pick roughly one label per calendar week.
    bucketKey = (d) => {
      const ref = new Date(d.getFullYear(), 0, 1).getTime();
      const week = Math.floor((d.getTime() - ref) / (7 * 86400000));
      return `${d.getFullYear()}-w${week}`;
    };
  } else if (range.key === "3M" || range.key === "6M" || range.key === "1Y" || days <= 400) {
    bucketKey = (d) => `${d.getFullYear()}-${d.getMonth()}`;
  } else if (days <= 366 * 5) {
    bucketKey = (d) => `${d.getFullYear()}-q${Math.floor(d.getMonth() / 3)}`;
  } else {
    bucketKey = (d) => `${d.getFullYear()}`;
  }

  const seen = new Set<string>();
  const picks: string[] = [];
  for (const p of parsed) {
    const key = bucketKey(new Date(p.t));
    if (seen.has(key)) continue;
    seen.add(key);
    picks.push(p.label);
  }
  // Always include the final point so the axis anchors the "end".
  const last = parsed[parsed.length - 1].label;
  if (picks[picks.length - 1] !== last) picks.push(last);
  return Array.from(new Set(picks));
}