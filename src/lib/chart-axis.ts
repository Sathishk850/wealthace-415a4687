import type { ChartRangeKey, ChartRangeValue } from "@/components/chart-range-selector";

/**
 * Common Recharts <XAxis /> props to prevent label overlap on every screen size.
 * When `ticks` are supplied (see `computeAxisTicks`), pair these props with
 * `interval={0}` so every chosen tick renders. Without explicit ticks we fall
 * back to Recharts' built-in "preserveStartEnd" thinning.
 */
export const smartXAxisProps = {
  interval: "preserveStartEnd" as const,
  minTickGap: 14,
  tickMargin: 6,
};

/**
 * Gives edge ticks enough room so labels like "Jan" are not clipped and the
 * latest month does not sit directly against a right-side Y-axis.
 */
export const timeXAxisPadding = { left: 8, right: 18 };

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

const DAY_MS = 86400000;

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, days: number): Date {
  const next = new Date(d);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(d: Date, months: number): Date {
  const next = new Date(d);
  const day = next.getDate();
  next.setDate(1);
  next.setMonth(next.getMonth() + months);
  next.setDate(Math.min(day, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
  return next;
}

function uniqSorted(values: number[]): number[] {
  return Array.from(new Set(values.map((v) => Math.round(v)))).sort((a, b) => a - b);
}

function parseDate(value: string | number | Date): Date {
  if (value instanceof Date) return value;
  if (typeof value === "string") {
    const isoDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (isoDate) {
      return new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    }
  }
  return new Date(value);
}

export function dateToAxisTime(value: string | number | Date | null | undefined): number | null {
  if (value == null) return null;
  const d = parseDate(value);
  const t = d.getTime();
  return Number.isFinite(t) ? t : null;
}

export function getTimeAxisDomain(range: ChartRangeValue, labels: (string | null | undefined)[] = []): [number, number] {
  const parsed = labels
    .map((label) => dateToAxisTime(label))
    .filter((time): time is number => time != null)
    .sort((a, b) => a - b);
  const start = range.start ? startOfDay(range.start).getTime() : (parsed[0] ?? startOfDay(range.end).getTime());
  const end = startOfDay(range.end).getTime();
  return start <= end ? [start, end] : [end, start];
}

export function getPaddedTimeAxisDomain(range: ChartRangeValue, labels: (string | null | undefined)[] = []): [number, number] {
  const [start, end] = getTimeAxisDomain(range, labels);
  const span = Math.max(DAY_MS, end - start);
  const pad = Math.max(DAY_MS * 0.75, span * 0.045);
  return [start - pad, end + pad];
}

/** Format an ISO date, timestamp, or Date as an axis tick for the given range. */
export function formatAxisTick(value: string | number | Date, range: ChartRangeValue): string {
  const d = parseDate(value);
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

/**
 * Generate real time-axis ticks from the selected range, not from available
 * data points. This keeps sparse series from collapsing the X-axis to one
 * date and makes every chart show the full selected timeline.
 */
export function computeTimeAxisTicks(range: ChartRangeValue, labels: (string | null | undefined)[] = []): number[] {
  const [startMs, endMs] = getTimeAxisDomain(range, labels);
  if (!Number.isFinite(startMs) || !Number.isFinite(endMs) || startMs === endMs) return [startMs];

  const start = startOfDay(new Date(startMs));
  const end = startOfDay(new Date(endMs));
  const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / DAY_MS));

  if (range.key === "1D" || days <= 2) {
    const step = Math.max(1, Math.ceil(days / 6));
    const ticks: number[] = [];
    for (let d = new Date(start); d <= end; d = addDays(d, step)) ticks.push(d.getTime());
    ticks.push(end.getTime());
    return uniqSorted(ticks);
  }

  if (range.key === "1M" || days <= 45) {
    const ticks = [0, 7, 14, 21, 28].map((offset) => addDays(start, offset).getTime()).filter((t) => t <= end.getTime());
    ticks.push(end.getTime());
    return uniqSorted(ticks);
  }

  if (range.key === "3M" || days <= 120) {
    const ticks: number[] = [];
    for (let d = new Date(start); d <= end; d = addMonths(d, 1)) ticks.push(d.getTime());
    ticks.push(end.getTime());
    return uniqSorted(ticks);
  }

  if (range.key === "6M" || days <= 220) {
    const ticks: number[] = [];
    for (let d = new Date(start); d <= end; d = addMonths(d, 1)) ticks.push(d.getTime());
    ticks.push(end.getTime());
    return uniqSorted(ticks);
  }

  if (range.key === "1Y" || days <= 400) {
    const ticks: number[] = [];
    for (let d = new Date(start); d <= end; d = addMonths(d, 2)) ticks.push(d.getTime());
    ticks.push(end.getTime());
    return uniqSorted(ticks);
  }

  const stepMonths = days <= 366 * 5 ? 3 : 12;
  const ticks: number[] = [];
  for (let d = new Date(start); d <= end; d = addMonths(d, stepMonths)) ticks.push(d.getTime());
  ticks.push(end.getTime());
  return uniqSorted(ticks);
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
    const t = parseDate(row.label).getTime();
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