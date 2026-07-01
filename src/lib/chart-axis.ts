import type { ChartRangeKey, ChartRangeValue } from "@/components/chart-range-selector";

/**
 * Common Recharts <XAxis /> props to prevent label overlap on every screen size.
 * Recharts natively skips ticks that would collide once `minTickGap` is set
 * together with `interval="preserveStartEnd"`, so mobile automatically gets
 * sparser labels than desktop without any extra measuring on our side.
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