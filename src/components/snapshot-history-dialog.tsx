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
import {
  ChartRangeSelector,
  defaultChartRange,
  formatRangeLabel,
  type ChartRangeValue,
} from "@/components/chart-range-selector";

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
  const [range, setRange] = useState<ChartRangeValue>(() => defaultChartRange("1M"));

  const rows = useMemo(() => {
    const startIso = range.start ? range.start.toISOString().slice(0, 10) : null;
    const endIso = range.end.toISOString().slice(0, 10);
    return SNAPSHOTS.filter(
      (s) => (!startIso || s.iso >= startIso) && s.iso <= endIso,
    );
  }, [range]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[calc(100vw-1.5rem)] max-w-5xl overflow-y-auto border-border bg-[#02101c] p-0">
        <div className="p-4 sm:p-7">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold tracking-tight">
              Snapshot history
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Track your net worth over time based on your snapshots.
            </DialogDescription>
          </DialogHeader>

          {/* Filter row */}
          <div className="mt-6 flex flex-wrap items-end justify-between gap-4">
            <p className="text-xs text-muted-foreground">
              Showing snapshots for <span className="text-foreground">{formatRangeLabel(range)}</span>
            </p>
            <ChartRangeSelector value={range} onChange={setRange} />
          </div>

          {/* Table */}
          <div className="mt-6 overflow-x-auto rounded-xl border border-border/60">
            <div className="min-w-[520px]">
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
                  <div className="flex min-w-0 items-center gap-3 text-foreground">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md border border-border/60 bg-surface/60 text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                    </span>
                    <span className="truncate">{r.date}</span>
                  </div>
                  <div className="truncate font-medium text-foreground">₹{fmt(r.net)}</div>
                  <div
                    className={cn(
                      "truncate text-right font-semibold",
                      r.change >= 0 ? "text-success" : "text-danger",
                    )}
                  >
                    {r.change >= 0 ? "+" : "-"}₹{fmt(r.change)}
                  </div>
                </div>
              ))}
            </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Showing 1 to {rows.length} of {SNAPSHOTS.length} snapshots
            </p>
            <div className="flex flex-wrap items-center gap-2">
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
              <button className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-mint/40 bg-mint/5 px-4 py-2 text-xs font-semibold text-mint hover:bg-mint/10 sm:ml-3">
                <Download className="h-3.5 w-3.5" /> Export CSV
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}