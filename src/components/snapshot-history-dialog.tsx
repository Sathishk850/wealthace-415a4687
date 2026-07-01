import { useMemo, useState } from "react";
import { Download, ChevronLeft, ChevronRight, ArrowUpDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
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
      <DialogContent
        className="grid h-[88vh] max-h-[88vh] w-[95vw] max-w-5xl grid-rows-[auto_auto_1fr_auto] gap-0 overflow-hidden border-border bg-[#02101c] p-0 sm:h-auto sm:max-h-[90vh]"
      >
        {/* HEADER */}
        <div className="relative flex flex-col gap-1 border-b border-border/60 p-4 pr-14 sm:p-6 sm:pr-16">
          <DialogPrimitive.Title className="text-[22px] font-bold leading-tight tracking-tight sm:text-2xl">
            Snapshot History
          </DialogPrimitive.Title>
          <DialogPrimitive.Description className="text-[14px] text-muted-foreground">
            Track your net worth over time based on your snapshots.
          </DialogPrimitive.Description>
          <DialogPrimitive.Close
            aria-label="Close"
            className="absolute right-3 top-3 grid h-11 w-11 place-items-center rounded-md text-muted-foreground opacity-80 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <X className="h-5 w-5" />
          </DialogPrimitive.Close>
        </div>

        {/* FILTER */}
        <div className="flex flex-col gap-1.5 border-b border-border/60 px-4 py-3 sm:px-6">
          <ChartRangeSelector value={range} onChange={setRange} className="!items-start" />
          <p className="text-[12px] text-muted-foreground">
            <span className="text-foreground">{formatRangeLabel(range)}</span>
          </p>
        </div>

        {/* TABLE */}
        <div className="flex min-h-0 flex-col overflow-hidden">
          <div className="grid grid-cols-[40%_35%_25%] border-b border-border/60 bg-[#02101c] px-3 py-3 text-[14px] font-semibold text-muted-foreground sm:px-4">
            <button className="flex items-center gap-1 text-left">
              Date <ArrowUpDown className="h-3 w-3" />
            </button>
            <button className="flex items-center justify-end gap-1">
              Net Worth <ArrowUpDown className="h-3 w-3" />
            </button>
            <button className="flex items-center justify-end gap-1">
              Change <ArrowUpDown className="h-3 w-3" />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {rows.map((r) => (
              <div
                key={r.iso}
                className="grid min-h-[56px] grid-cols-[40%_35%_25%] items-center border-b border-border/30 px-3 py-3 text-[16px] last:border-b-0 hover:bg-surface/40 sm:px-4"
              >
                <div className="min-w-0 truncate text-foreground">{r.date}</div>
                <div className="truncate text-right font-medium text-foreground">
                  ₹{fmt(r.net)}
                </div>
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

        {/* FOOTER */}
        <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5 sm:px-6 sm:py-3">
          <div className="flex items-center gap-1">
            <button
              aria-label="Previous page"
              className="grid h-11 w-11 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            {[1, 2, 3].map((p) => (
              <button
                key={p}
                className={cn(
                  "grid h-11 min-w-11 place-items-center rounded-md px-2 text-[13px] font-semibold",
                  p === 1
                    ? "bg-mint text-mint-foreground"
                    : "border border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {p}
              </button>
            ))}
            <button
              aria-label="Next page"
              className="grid h-11 w-11 place-items-center rounded-md border border-border text-muted-foreground hover:text-foreground"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <button className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-mint/40 bg-mint/5 px-3 text-[13px] font-semibold text-mint hover:bg-mint/10">
            <Download className="h-4 w-4" />
            <span className="hidden xs:inline sm:inline">Export CSV</span>
            <span className="xs:hidden sm:hidden">CSV</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}