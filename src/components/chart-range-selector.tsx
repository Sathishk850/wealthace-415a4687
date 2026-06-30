import { useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type ChartRangeKey = "1D" | "1M" | "3M" | "6M" | "1Y" | "CUSTOM";

export type ChartRangeValue = {
  key: ChartRangeKey;
  start: Date | null; // null means since beginning
  end: Date;
  label: string;
};

const PRESET_BUTTONS: { key: Exclude<ChartRangeKey, "CUSTOM">; label: string }[] = [
  { key: "1M", label: "1M" },
  { key: "3M", label: "3M" },
  { key: "6M", label: "6M" },
  { key: "1Y", label: "1Y" },
];

const QUICK_PRESETS = [
  { id: "30d", label: "Last 30 Days" },
  { id: "90d", label: "Last 90 Days" },
  { id: "6m", label: "Last 6 Months" },
  { id: "1y", label: "Last 1 Year" },
  { id: "ytd", label: "Year to Date (YTD)" },
  { id: "all", label: "Since Beginning" },
] as const;

type PresetId = (typeof QUICK_PRESETS)[number]["id"];

function computeRange(key: Exclude<ChartRangeKey, "CUSTOM">): ChartRangeValue {
  const end = new Date();
  const start = new Date(end);
  switch (key) {
    case "1M":
      start.setMonth(end.getMonth() - 1);
      break;
    case "3M":
      start.setMonth(end.getMonth() - 3);
      break;
    case "6M":
      start.setMonth(end.getMonth() - 6);
      break;
    case "1Y":
      start.setFullYear(end.getFullYear() - 1);
      break;
  }
  return { key, start, end, label: key };
}

function fromQuickPreset(id: PresetId): { start: Date | null; end: Date; label: string } {
  const end = new Date();
  const start = new Date(end);
  switch (id) {
    case "30d":
      start.setDate(end.getDate() - 30);
      return { start, end, label: "Last 30 Days" };
    case "90d":
      start.setDate(end.getDate() - 90);
      return { start, end, label: "Last 90 Days" };
    case "6m":
      start.setMonth(end.getMonth() - 6);
      return { start, end, label: "Last 6 Months" };
    case "1y":
      start.setFullYear(end.getFullYear() - 1);
      return { start, end, label: "Last 1 Year" };
    case "ytd":
      return { start: new Date(end.getFullYear(), 0, 1), end, label: "Year to Date" };
    case "all":
      return { start: null, end, label: "Since Beginning" };
  }
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function toInput(d: Date) {
  return d.toISOString().slice(0, 10);
}

export function defaultChartRange(key: Exclude<ChartRangeKey, "CUSTOM"> = "1M"): ChartRangeValue {
  return computeRange(key);
}

export function formatRangeLabel(v: ChartRangeValue): string {
  if (v.key !== "CUSTOM") {
    if (!v.start) return `Since beginning · until ${fmtDate(v.end)}`;
    return `${fmtDate(v.start)} – ${fmtDate(v.end)}`;
  }
  if (!v.start) return `${v.label} · until ${fmtDate(v.end)}`;
  return `${v.label} · ${fmtDate(v.start)} – ${fmtDate(v.end)}`;
}

export function ChartRangeSelector({
  value,
  onChange,
  className,
}: {
  value: ChartRangeValue;
  onChange: (v: ChartRangeValue) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [startStr, setStartStr] = useState<string>(value.start ? toInput(value.start) : "");
  const [endStr, setEndStr] = useState<string>(toInput(value.end));

  const activeRangeLabel = useMemo(() => formatRangeLabel(value), [value]);

  const applyPreset = (id: PresetId) => {
    const r = fromQuickPreset(id);
    onChange({ key: "CUSTOM", ...r });
    setStartStr(r.start ? toInput(r.start) : "");
    setEndStr(toInput(r.end));
    setOpen(false);
  };

  const applyCustom = () => {
    if (!startStr || !endStr) return;
    const s = new Date(startStr);
    const e = new Date(endStr);
    if (isNaN(s.getTime()) || isNaN(e.getTime()) || s > e) return;
    onChange({
      key: "CUSTOM",
      start: s,
      end: e,
      label: `${fmtDate(s)} – ${fmtDate(e)}`,
    });
    setOpen(false);
  };

  return (
    <div className={cn("inline-flex flex-col items-end gap-1", className)} title={activeRangeLabel}>
      <div className="inline-flex items-center gap-0.5 rounded-lg border border-border bg-surface-2 p-0.5">
        {PRESET_BUTTONS.map((b) => (
          <button
            key={b.key}
            type="button"
            onClick={() => onChange(computeRange(b.key))}
            className={cn(
              "rounded-md px-2 py-0.5 text-[11px] font-semibold transition",
              value.key === b.key
                ? "border border-mint/50 bg-mint/10 text-mint"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {b.label}
          </button>
        ))}
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label="Custom date range"
              title={activeRangeLabel}
              className={cn(
                "ml-0.5 grid h-6 w-7 place-items-center rounded-md transition",
                value.key === "CUSTOM"
                  ? "border border-mint/50 bg-mint/10 text-mint"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarIcon className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[320px] border-border bg-popover p-3">
            <div className="space-y-3">
              <div>
                <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Quick presets
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_PRESETS.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => applyPreset(p.id)}
                      className="rounded-md border border-border bg-surface-2 px-2 py-1 text-[11px] font-medium text-foreground hover:border-mint/50 hover:text-mint"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Custom range
                </div>
                <div className="flex flex-col gap-2">
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    Start date
                    <input
                      type="date"
                      value={startStr}
                      onChange={(e) => setStartStr(e.target.value)}
                      className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs text-foreground outline-none [color-scheme:dark]"
                    />
                  </label>
                  <label className="flex flex-col gap-1 text-[11px] text-muted-foreground">
                    End date
                    <input
                      type="date"
                      value={endStr}
                      onChange={(e) => setEndStr(e.target.value)}
                      className="rounded-md border border-border bg-surface-2 px-2 py-1.5 text-xs text-foreground outline-none [color-scheme:dark]"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={applyCustom}
                  className="mt-1 w-full rounded-md bg-mint px-3 py-1.5 text-xs font-semibold text-mint-foreground hover:bg-[var(--primary-hover)]"
                >
                  Apply
                </button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
      <span className="text-[10px] font-medium text-muted-foreground">{activeRangeLabel}</span>
    </div>
  );
}