import { useMemo, useState } from "react";
import { Calendar, Download, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

type Snap = { date: string; iso: string; net: number; change: number };

const SNAPSHOTS: Snap[] = [
  { date: "7 Jun 2026", iso: "2026-06-07", net: 7314850, change: -5164828 },
  { date: "31 May 2026", iso: "2026-05-31", net: 12479678, change: 160352 },
  { date: "30 Apr 2026", iso: "2026-04-30", net: 12319326, change: 214639 },
  { date: "31 Mar 2026", iso: "2026-03-31", net: 12104687, change: 184149 },
  { date: "28 Feb 2026", iso: "2026-02-28", net: 11920538, change: 141652 },
  { date: "31 Jan 2026", iso: "2026-01-31", net: 11778886, change: 310934 },
  { date: "31 Dec 2025", iso: "2025-12-31", net: 11467952, change: 284159 },
  { date: "30 Nov 2025", iso: "2025-11-30", net: 11183793, change: 334972 },
  { date: "31 Oct 2025", iso: "2025-10-31", net: 10848821, change: 179924 },
  { date: "30 Sept 2025", iso: "2025-09-30", net: 10668897, change: 113444 },
  { date: "31 Aug 2025", iso: "2025-08-31", net: 10555453, change: 162954 },
];

const RANGES = ["All", "YTD", "1Y", "6M", "3M", "1M", "Custom"] as const;
type Range = (typeof RANGES)[number];

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN").format(Math.abs(n));
}

export function SnapshotHistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [range, setRange] = useState<Range>("All");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [applied, setApplied] = useState<{ s: string; e: string } | null>(null);

  const rows = useMemo(() => {
    if (range === "Custom" && applied?.s && applied?.e) {
      return SNAPSHOTS.filter((s) => s.iso >= applied.s && s.iso <= applied.e);
    }
    const now = new Date("2026-06-07");
    const cutoff = new Date(now);
    if (range === "1M") cutoff.setMonth(now.getMonth() - 1);
    else if (range === "3M") cutoff.setMonth(now.getMonth() - 3);
    else if (range === "6M") cutoff.setMonth(now.getMonth() - 6);
    else if (range === "1Y") cutoff.setFullYear(now.getFullYear() - 1);
    else if (range === "YTD") cutoff.setMonth(0, 1);
    else return SNAPSHOTS;
    const iso = cutoff.toISOString().slice(0, 10);
    return SNAPSHOTS.filter((s) => s.iso >= iso);
  }, [range, applied]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl border-border bg-[#02101c] p-0">
        <div className="p-7">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              Snapshot history
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Track your net worth over time based on your snapshots.
            </DialogDescription>
          </DialogHeader>

          {/* Filter row */}
          <div className="mt-6 flex flex-wrap items-end gap-4">
            <div className="flex flex-wrap items-center gap-1.5 rounded-xl border border-border bg-surface/60 p-1">
              {RANGES.slice(0, 6).map((r) => (
                <button
                  key={r}
                  onClick={() => setRange(r)}
                  className={cn(
                    "rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                    range === r
                      ? "border border-mint/60 bg-mint/10 text-mint"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {r}
                </button>
              ))}
              <button
                onClick={() => setRange("Custom")}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  range === "Custom"
                    ? "border border-mint/60 bg-mint/10 text-mint"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Calendar className="h-3.5 w-3.5" /> Custom
              </button>
            </div>

            <div className="flex flex-1 flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">
                  Custom range
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="date"
                      value={start}
                      onChange={(e) => setStart(e.target.value)}
                      placeholder="Select start date"
                      className="bg-transparent text-xs text-foreground outline-none [color-scheme:dark]"
                    />
                  </div>
                  <span className="text-muted-foreground">–</span>
                  <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-3 py-2">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    <input
                      type="date"
                      value={end}
                      onChange={(e) => setEnd(e.target.value)}
                      placeholder="Select end date"
                      className="bg-transparent text-xs text-foreground outline-none [color-scheme:dark]"
                    />
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (start && end) {
                    setRange("Custom");
                    setApplied({ s: start, e: end });
                  }
                }}
                className="rounded-lg bg-mint px-5 py-2 text-sm font-semibold text-mint-foreground transition hover:bg-[var(--primary-hover)]"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="mt-6 overflow-hidden rounded-xl border border-border/60">
            <div className="grid grid-cols-[2fr_2fr_1.2fr] border-b border-border/60 px-4 py-3 text-xs font-semibold text-muted-foreground">
              <button className="flex items-center gap-1 text-left">
                Date <ArrowUpDown className="h-3 w-3" />
              </button>
              <button className="flex items-center gap-1">
                Net worth <ArrowUpDown className="h-3 w-3" />
              </button>
              <button className="flex items-center justify-end gap-1">
                Change <ArrowUpDown className="h-3 w-3" />
              </button>
            </div>
            <div className="max-h-[420px] overflow-y-auto">
              {rows.map((r) => (
                <div
                  key={r.iso}
                  className="grid grid-cols-[2fr_2fr_1.2fr] items-center border-b border-border/30 px-4 py-3.5 text-sm last:border-b-0 hover:bg-surface/40"
                >
                  <div className="flex items-center gap-3 text-foreground">
                    <span className="grid h-7 w-7 place-items-center rounded-md border border-border/60 bg-surface/60 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                    </span>
                    {r.date}
                  </div>
                  <div className="font-medium text-foreground">₹{fmt(r.net)}</div>
                  <div
                    className={cn(
                      "text-right font-semibold",
                      r.change >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {r.change >= 0 ? "+" : "-"}₹{fmt(r.change)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              Showing 1 to {rows.length} of {SNAPSHOTS.length} snapshots
            </p>
            <div className="flex items-center gap-2">
              <button className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {[1, 2, 3].map((p) => (
                <button
                  key={p}
                  className={cn(
                    "grid h-8 w-8 place-items-center rounded-md text-xs font-semibold",
                    p === 1
                      ? "bg-mint text-mint-foreground"
                      : "border border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  {p}
                </button>
              ))}
              <span className="px-1 text-muted-foreground">…</span>
              <button className="grid h-8 w-8 place-items-center rounded-md border border-border text-xs font-semibold text-muted-foreground hover:text-foreground">
                3
              </button>
              <button className="grid h-8 w-8 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
              <button className="ml-3 inline-flex items-center gap-2 rounded-lg border border-mint/40 bg-mint/5 px-4 py-2 text-xs font-semibold text-mint hover:bg-mint/10">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}