import { useMemo, useState } from "react";
import { Download, ChevronLeft, ChevronRight, ArrowUpDown, MoreVertical, Trash2, Camera, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { cn } from "@/lib/utils";
import {
  ChartRangeSelector,
  defaultChartRange,
  formatRangeLabel,
  type ChartRangeValue,
} from "@/components/chart-range-selector";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Snap = { id: string; date: string; iso: string; net: number; change: number };

function useSnapshotHistory() {
  return useQuery({
    queryKey: ["wealth", "snapshots"] as const,
    queryFn: async (): Promise<Snap[]> => {
      const { data, error } = await supabase
        .from("wealth_snapshots" as never)
        .select("id, snapshot_date, net_worth")
        .order("snapshot_date", { ascending: true });
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const withChange = rows.map((r, i) => {
        const prev = i > 0 ? Number(rows[i - 1].net_worth ?? 0) : Number(r.net_worth ?? 0);
        const net = Number(r.net_worth ?? 0);
        return {
          id: r.id,
          iso: r.snapshot_date,
          date: new Date(r.snapshot_date).toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          net,
          change: i === 0 ? 0 : net - prev,
        } as Snap;
      });
      return withChange.reverse();
    },
  });
}

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en-IN").format(Math.abs(n));
}
function fmtSigned(n: number) {
  if (!Number.isFinite(n)) return "0";
  const sign = n < 0 ? "-" : "";
  return `${sign}${new Intl.NumberFormat("en-IN").format(Math.abs(n))}`;
}

export function SnapshotHistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [range, setRange] = useState<ChartRangeValue>(() => defaultChartRange("1M"));
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const qc = useQueryClient();
  const { data: snapshots = [], isLoading } = useSnapshotHistory();

  const deleteOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wealth_snapshots" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Snapshot deleted");
      qc.invalidateQueries({ queryKey: ["wealth", "snapshots"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });

  const deleteAll = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("wealth_snapshots" as never)
        .delete()
        .eq("user_id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All snapshots deleted");
      setConfirmAllOpen(false);
      qc.invalidateQueries({ queryKey: ["wealth", "snapshots"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });

  const rows = useMemo(() => {
    const startIso = range.start ? range.start.toISOString().slice(0, 10) : null;
    const endIso = range.end.toISOString().slice(0, 10);
    return snapshots.filter(
      (s) => (!startIso || s.iso >= startIso) && s.iso <= endIso,
    );
  }, [range, snapshots]);

  const hasAny = snapshots.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="grid h-[88vh] max-h-[88vh] w-[95vw] max-w-5xl grid-rows-[auto_auto_1fr_auto] gap-0 overflow-hidden border-border bg-[#02101c] p-0 sm:h-auto sm:max-h-[90vh]"
      >
        {/* HEADER */}
        <div className="relative flex items-start justify-between gap-3 border-b border-border/60 p-4 pr-14 sm:p-6 sm:pr-16">
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="text-[22px] font-bold leading-tight tracking-tight sm:text-2xl">
              Snapshot History
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-[14px] text-muted-foreground">
              Track your net worth over time based on your snapshots.
            </DialogPrimitive.Description>
          </div>
          {hasAny && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="More">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmAllOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete All Snapshots
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* FILTER */}
        {hasAny && (
          <div className="flex flex-col gap-1.5 border-b border-border/60 px-4 py-3 sm:px-6">
            <ChartRangeSelector value={range} onChange={setRange} className="!items-start" />
            <p className="text-[12px] text-muted-foreground">
              <span className="text-foreground">{formatRangeLabel(range)}</span>
            </p>
          </div>
        )}

        {/* TABLE */}
        <div className="flex min-h-0 flex-col overflow-hidden">
          {isLoading ? (
            <div className="grid flex-1 place-items-center p-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin text-mint" />
            </div>
          ) : !hasAny ? (
            <div className="grid flex-1 place-items-center p-10 text-center">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-mint/10 text-mint">
                <Camera className="h-5 w-5" />
              </div>
              <div className="mt-3 font-display text-base font-semibold">No snapshots yet</div>
              <p className="mt-1 max-w-sm text-xs text-muted-foreground">
                Capture a snapshot from the dashboard to start tracking your net worth over time.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[35%_30%_25%_10%] border-b border-border/60 bg-[#02101c] px-3 py-3 text-[14px] font-semibold text-muted-foreground sm:px-4">
                <button className="flex items-center gap-1 text-left">
                  Date <ArrowUpDown className="h-3 w-3" />
                </button>
                <button className="flex items-center justify-end gap-1">
                  Net Worth <ArrowUpDown className="h-3 w-3" />
                </button>
                <button className="flex items-center justify-end gap-1">
                  Change <ArrowUpDown className="h-3 w-3" />
                </button>
                <span />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                {rows.map((r) => (
                  <div
                    key={r.id}
                    className="grid min-h-[56px] grid-cols-[35%_30%_25%_10%] items-center border-b border-border/30 px-3 py-3 text-[16px] last:border-b-0 hover:bg-surface/40 sm:px-4"
                  >
                    <div className="min-w-0 truncate text-foreground">{r.date}</div>
                    <div className="truncate text-right font-medium text-foreground">
                      ₹{fmt(r.net)}
                    </div>
                    <div
                      className={cn(
                        "truncate text-right font-semibold",
                        r.change > 0 ? "text-success" : r.change < 0 ? "text-danger" : "text-muted-foreground",
                      )}
                    >
                      {r.change === 0 ? "—" : `${r.change > 0 ? "+" : "-"}₹${fmt(r.change)}`}
                    </div>
                    <div className="flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        aria-label="Delete snapshot"
                        disabled={deleteOne.isPending}
                        onClick={() => {
                          if (window.confirm("Delete this snapshot?")) deleteOne.mutate(r.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        {/* FOOTER */}
        {hasAny && (
          <div className="flex items-center justify-between gap-2 border-t border-border/60 px-3 py-2.5 sm:px-6 sm:py-3">
            <div className="text-[12px] text-muted-foreground">
              {rows.length} of {snapshots.length} snapshot{snapshots.length === 1 ? "" : "s"}
            </div>
            <button
              onClick={() => {
                const header = "Date,Net Worth,Change\n";
                const csv = header + rows.map((r) => `${r.iso},${r.net},${r.change}`).join("\n");
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = `snapshots-${new Date().toISOString().slice(0, 10)}.csv`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="inline-flex h-11 shrink-0 items-center gap-2 rounded-lg border border-mint/40 bg-mint/5 px-3 text-[13px] font-semibold text-mint hover:bg-mint/10"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          </div>
        )}

        <AlertDialog open={confirmAllOpen} onOpenChange={setConfirmAllOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all snapshots?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes every snapshot in your history. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteAll.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  deleteAll.mutate();
                }}
              >
                {deleteAll.isPending ? "Deleting…" : "Delete All"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}

// silence unused import for pagination icons (kept for future use)
void ChevronLeft;
void ChevronRight;