import { useEffect, useMemo, useRef, useState, type ElementType } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Pencil,
  Trash2,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { inr, inrCompact, useAccounts, useAssets, useInvestments, useLiabilities } from "@/lib/wealth-api";
import { CASH_TYPES, computeNetWorth, isActive } from "@/lib/networth";
import {
  useDeleteSnapshot,
  useSnapshots,
  useSyncSnapshotTotals,
  useUpdateSnapshotAnnotation,
  type Snapshot,
} from "@/lib/snapshots-api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

function dateFromIso(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00`);
}

function fmtDate(iso: string) {
  return dateFromIso(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function fmtMonth(iso: string) {
  return dateFromIso(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}

type HistoryTab = "items" | "changed";

export function SnapshotsView() {
  const snapshotsQuery = useSnapshots();
  const snapshots = snapshotsQuery.data ?? [];
  const deleteSnapshot = useDeleteSnapshot();
  const updateAnnotation = useUpdateSnapshotAnnotation();
  const assetsQuery = useAssets();
  const investmentsQuery = useInvestments();
  const liabilitiesQuery = useLiabilities();
  const accountsQuery = useAccounts();
  const allAssets = assetsQuery.data;
  const allInvestments = investmentsQuery.data;
  const allLiabilities = liabilitiesQuery.data;
  const allAccounts = accountsQuery.data;
  // Same inclusion rules as the global net-worth calculator (closed/sold excluded).
  const assets = useMemo(() => (allAssets ?? []).filter((a) => isActive(a.status)), [allAssets]);
  const investments = useMemo(() => (allInvestments ?? []).filter((i) => isActive(i.status)), [allInvestments]);
  const liabilities = useMemo(() => (allLiabilities ?? []).filter((l) => isActive(l.status)), [allLiabilities]);
  const cashAccounts = useMemo(
    () => (allAccounts ?? []).filter((a) => isActive(a.status) && CASH_TYPES.includes(String(a.account_type ?? "").toLowerCase())),
    [allAccounts],
  );
  const live = useMemo(
    () => computeNetWorth({ assets: allAssets, investments: allInvestments, accounts: allAccounts, liabilities: allLiabilities }),
    [allAssets, allInvestments, allAccounts, allLiabilities],
  );
  const liveReady = !!allAssets && !!allInvestments && !!allAccounts && !!allLiabilities;
  const syncTotals = useSyncSnapshotTotals();
  const syncedKey = useRef<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTabs, setActiveTabs] = useState<Record<string, HistoryTab>>({});
  const [editAnnotation, setEditAnnotation] = useState<{ id: string; text: string } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  const sorted = useMemo(
    () => [...snapshots].sort((a, b) => a.snapshot_date.localeCompare(b.snapshot_date)),
    [snapshots],
  );
  // Keep today's snapshot in step with edits made today (e.g. a loan closed after capture).
  useEffect(() => {
    if (!liveReady || syncTotals.isPending) return;
    const latest = sorted[sorted.length - 1];
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    if (!latest || latest.snapshot_date.slice(0, 10) !== today) return;
    if (live.totalAssets === 0 && live.liabilitiesTotal === 0) return;
    const round = (n: number) => Math.round(n);
    const same =
      round(latest.net_worth) === round(live.netWorth) &&
      round(latest.assets_total) === round(live.totalAssets) &&
      round(latest.liabilities_total) === round(live.liabilitiesTotal) &&
      round(latest.investments_total) === round(live.investmentsTotal);
    const key = `${latest.id}:${round(live.netWorth)}:${round(live.totalAssets)}:${round(live.liabilitiesTotal)}`;
    if (same || syncedKey.current === key) return;
    syncedKey.current = key;
    syncTotals.mutate({
      id: latest.id,
      net_worth: live.netWorth,
      assets_total: live.totalAssets,
      liabilities_total: live.liabilitiesTotal,
      investments_total: live.investmentsTotal,
    });
  }, [liveReady, live, sorted, syncTotals]);

  const sortedDesc = useMemo(() => [...sorted].reverse(), [sorted]);
  const indexById = useMemo(() => new Map(sorted.map((snapshot, index) => [snapshot.id, index])), [sorted]);
  const chartData = useMemo(
    () => sorted.map((snapshot) => ({
      label: fmtDate(snapshot.snapshot_date),
      value: snapshot.net_worth,
      id: snapshot.id,
      annotation: snapshot.annotation,
    })),
    [sorted],
  );

  const stats = useMemo(() => {
    if (sorted.length < 2) return null;
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    if (!first || !last) return null;
    const growth = last.net_worth - first.net_worth;
    const growthPct = first.net_worth === 0 ? 0 : (growth / Math.abs(first.net_worth)) * 100;
    let bestMonth = { label: "", gain: 0 };
    for (let index = 1; index < sorted.length; index += 1) {
      const current = sorted[index];
      const previous = sorted[index - 1];
      if (!current || !previous) continue;
      const gain = current.net_worth - previous.net_worth;
      if (gain > bestMonth.gain) bestMonth = { label: fmtMonth(current.snapshot_date), gain };
    }
    return {
      growth,
      growthPct,
      bestMonth,
      average: sorted.reduce((sum, row) => sum + row.net_worth, 0) / sorted.length,
      count: sorted.length,
    };
  }, [sorted]);

  const investmentsByCategory = useMemo(() => investments.reduce<Record<string, typeof investments>>(
    (groups, investment) => {
      const category = investment.category || "Other";
      const existing = groups[category] ?? [];
      groups[category] = [...existing, investment];
      return groups;
    },
    {},
  ), [investments]);

  function changedRows(snapshot: Snapshot, index: number) {
    const previous = sorted[index - 1];
    if (!previous) return [];
    return [
      { label: "Net Worth", delta: snapshot.net_worth - previous.net_worth, favorableWhenPositive: true },
      { label: "Assets", delta: snapshot.assets_total - previous.assets_total, favorableWhenPositive: true },
      { label: "Investments", delta: snapshot.investments_total - previous.investments_total, favorableWhenPositive: true },
      { label: "Other assets & cash", delta: (snapshot.assets_total - snapshot.investments_total) - (previous.assets_total - previous.investments_total), favorableWhenPositive: true },
      { label: "Liabilities", delta: snapshot.liabilities_total - previous.liabilities_total, favorableWhenPositive: false },
    ].filter((row) => Math.round(row.delta) !== 0);
  }

  /**
   * Loan events (added / closed / outstanding edited) that happened between the
   * previous snapshot's capture and this one. The latest snapshot's window stays
   * open so edits made after today's capture still show up.
   */
  function loanActivity(snapshot: Snapshot, index: number) {
    const previous = sorted[index - 1];
    if (!previous) return [];
    const bound = (row: Snapshot) => {
      const t = row.updated_at ? Date.parse(row.updated_at) : NaN;
      return Number.isFinite(t) ? t : dateFromIso(row.snapshot_date).getTime() + 86_399_999;
    };
    const start = bound(previous);
    const end = index === sorted.length - 1 ? Number.POSITIVE_INFINITY : bound(snapshot);
    const within = (iso?: string | null) => {
      const t = iso ? Date.parse(iso) : NaN;
      return Number.isFinite(t) && t > start && t <= end;
    };
    return (allLiabilities ?? [])
      .filter((l) => within(l.updated_at) || within(l.created_at))
      .map((l) => {
        const closed = !isActive(l.status);
        const added = within(l.created_at);
        return {
          id: l.id,
          name: l.name,
          category: l.category,
          kind: closed ? ("closed" as const) : added ? ("added" as const) : ("updated" as const),
          outstanding: Number(l.outstanding ?? 0),
        };
      });
  }

  if (snapshotsQuery.isLoading) {
    return (
      <div className="space-y-3 py-8" aria-label="Loading snapshots">
        {[0, 1, 2].map((item) => <div key={item} className="h-16 animate-pulse rounded-lg bg-muted/40" />)}
      </div>
    );
  }

  if (snapshotsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-semibold text-foreground">Snapshot history is unavailable</p>
        <p className="mt-1 text-xs text-muted-foreground">Please try loading it again.</p>
        <Button className="mt-4" size="sm" variant="outline" onClick={() => snapshotsQuery.refetch()}>
          Try again
        </Button>
      </div>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BarChart2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
        <p className="text-sm font-semibold text-foreground">No snapshots yet</p>
        <p className="mt-1 max-w-md text-xs text-muted-foreground">
          Take your first snapshot from the Overview page to start tracking net worth over time.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <section className="rounded-lg border border-border bg-card p-4 shadow-sm sm:p-5">
        <h2 className="text-sm font-semibold text-foreground">Net Worth Over Time</h2>
        <p className="mb-4 mt-1 text-[11px] text-muted-foreground">Based on your {sorted.length} snapshots</p>
        <div className="h-[190px] w-full sm:h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 16, right: 8, left: -10, bottom: 0 }}>
              <defs>
                <linearGradient id="snapshot-area-fill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="label" axisLine={false} tickLine={false} interval="preserveStartEnd" tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              <YAxis axisLine={false} tickLine={false} tickFormatter={(value: number) => inrCompact(value)} tick={{ fill: "var(--muted-foreground)", fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                formatter={(value: number) => [inr(value), "Net Worth"]}
              />
              {chartData.filter((point) => point.annotation).map((point) => (
                <ReferenceLine
                  key={point.id}
                  x={point.label}
                  stroke="var(--chart-2)"
                  strokeDasharray="4 2"
                  label={{ value: point.annotation ?? "", position: "insideTopLeft", fontSize: 9, fill: "var(--chart-2)" }}
                />
              ))}
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--chart-1)"
                strokeWidth={2.5}
                fill="url(#snapshot-area-fill)"
                dot={{ r: 3, fill: "var(--chart-1)", strokeWidth: 0 }}
                activeDot={{ r: 5, fill: "var(--chart-1)", stroke: "var(--card)", strokeWidth: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </section>

      {stats && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Growth" value={inrCompact(stats.growth)} sub={`${stats.growthPct >= 0 ? "+" : ""}${stats.growthPct.toFixed(1)}% total`} icon={TrendingUp} tone={stats.growth >= 0 ? "success" : "danger"} />
          <StatCard label="Best month" value={stats.bestMonth.gain > 0 ? inrCompact(stats.bestMonth.gain) : "—"} sub={stats.bestMonth.label || "No positive change"} icon={Trophy} tone="warning" />
          <StatCard label="Avg / snapshot" value={inrCompact(stats.average)} sub={`${stats.count} snapshots total`} icon={Calendar} tone="primary" />
        </div>
      )}

      <section className="overflow-hidden rounded-lg border border-border bg-card shadow-sm">
        <div className="border-b border-border px-4 py-4 sm:px-5">
          <h2 className="text-sm font-semibold text-foreground">Snapshot History</h2>
          <p className="mt-1 text-[11px] text-muted-foreground">Select a snapshot to view its totals and current holding details.</p>
        </div>
        <div className="divide-y divide-border">
          {sortedDesc.map((snapshot, descendingIndex) => {
            const ascendingIndex = indexById.get(snapshot.id) ?? 0;
            const expanded = expandedId === snapshot.id;
            const activeTab = activeTabs[snapshot.id] ?? "items";
            return (
              <article key={snapshot.id}>
                <div className="flex items-center gap-2 px-3 py-3 transition-colors hover:bg-muted/20 sm:px-5 sm:py-4">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-auto min-w-0 flex-1 justify-start gap-3 whitespace-normal p-1 text-left hover:bg-transparent"
                    aria-expanded={expanded}
                    onClick={() => setExpandedId(expanded ? null : snapshot.id)}
                  >
                    {expanded ? <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="text-sm text-foreground">{fmtDate(snapshot.snapshot_date)}</span>
                        {descendingIndex === 0 && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[10px] font-semibold text-warning">
                            <Trophy className="h-3 w-3" /> Latest
                          </span>
                        )}
                      </span>
                      {snapshot.annotation && <span className="mt-1 block truncate text-[10px] text-primary">“{snapshot.annotation}”</span>}
                    </span>
                    <span className="ml-auto shrink-0 font-ledger-mono text-sm font-semibold text-foreground sm:text-base">{inrCompact(snapshot.net_worth)}</span>
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground" title="Edit note" aria-label={`Edit note for ${fmtDate(snapshot.snapshot_date)}`} onClick={() => setEditAnnotation({ id: snapshot.id, text: snapshot.annotation ?? "" })}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" title="Delete snapshot" aria-label={`Delete snapshot from ${fmtDate(snapshot.snapshot_date)}`} onClick={() => setPendingDeleteId(snapshot.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>

                {expanded && (
                  <div className="border-t border-border/50 bg-muted/10 px-4 pb-5 pt-3 sm:px-12">
                    <div className="mb-4 flex gap-4 border-b border-border">
                      {(["items", "changed"] as const).map((tab) => (
                        <Button
                          key={tab}
                          type="button"
                          variant="ghost"
                          size="sm"
                          className={cn("h-8 rounded-none border-b-2 px-0 hover:bg-transparent", activeTab === tab ? "border-primary text-primary" : "border-transparent text-muted-foreground")}
                          onClick={() => setActiveTabs((current) => ({ ...current, [snapshot.id]: tab }))}
                        >
                          {tab === "items" ? "Line Items" : "What Changed"}
                        </Button>
                      ))}
                    </div>

                    {activeTab === "items" ? (
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">Assets ({investments.length + assets.length + cashAccounts.length})</p>
                          {Object.entries(investmentsByCategory).map(([category, items]) => (
                            <div key={category} className="flex items-center justify-between gap-3 py-1.5">
                              <span className="text-xs font-medium text-foreground">{category} ({items.length})</span>
                              <span className="font-ledger-mono text-xs text-muted-foreground">{inrCompact(items.reduce((sum, item) => sum + Number(item.current_value ?? item.invested_value ?? 0), 0))}</span>
                            </div>
                          ))}
                          {assets.map((asset) => (
                            <div key={asset.id} className="flex items-center justify-between gap-3 py-1.5">
                              <span className="truncate text-xs text-foreground">{asset.name}</span>
                              <span className="shrink-0 font-ledger-mono text-xs text-muted-foreground">{inrCompact(asset.current_value)}</span>
                            </div>
                          ))}
                          {cashAccounts.length > 0 && (
                            <div className="flex items-center justify-between gap-3 py-1.5">
                              <span className="text-xs font-medium text-foreground">Cash &amp; bank ({cashAccounts.length})</span>
                              <span className="font-ledger-mono text-xs text-muted-foreground">{inrCompact(live.cashTotal)}</span>
                            </div>
                          )}
                          {investments.length + assets.length + cashAccounts.length === 0 && <p className="text-xs text-muted-foreground">No current assets found.</p>}
                        </div>
                        {liabilities.length > 0 && (
                          <div>
                            <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">Liabilities ({liabilities.length})</p>
                            {liabilities.map((liability) => (
                              <div key={liability.id} className="flex items-center justify-between gap-3 py-1.5">
                                <span className="truncate text-xs text-foreground">{liability.name}</span>
                                <span className="shrink-0 font-ledger-mono text-xs text-danger">−{inrCompact(liability.outstanding)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        <div className="border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground">
                          Current holdings are shown as a proxy; historical line items were not stored with this snapshot. Live net worth: {inr(live.netWorth)}. Recorded totals: {inr(snapshot.assets_total)} assets and {inr(snapshot.liabilities_total)} liabilities.
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {ascendingIndex === 0 ? (
                          <p className="text-xs text-muted-foreground">This is your first snapshot — there is no previous snapshot to compare.</p>
                        ) : (
                          <>
                            <p className="mb-3 text-[10px] text-muted-foreground">Compared with {fmtDate(sorted[ascendingIndex - 1]?.snapshot_date ?? snapshot.snapshot_date)}</p>
                            {changedRows(snapshot, ascendingIndex).map((row) => {
                              const favorable = row.favorableWhenPositive ? row.delta >= 0 : row.delta <= 0;
                              return (
                                <div key={row.label} className="flex items-center justify-between rounded-md bg-muted/30 px-3 py-2">
                                  <span className="text-xs text-foreground">{row.label}</span>
                                  <span className={cn("font-ledger-mono text-xs font-semibold", favorable ? "text-success" : "text-danger")}>
                                    {row.delta >= 0 ? "+" : "−"}{inrCompact(Math.abs(row.delta))}
                                  </span>
                                </div>
                              );
                            })}
                            {changedRows(snapshot, ascendingIndex).length === 0 && <p className="text-xs text-muted-foreground">No recorded total changed.</p>}
                            {(() => {
                              const activity = loanActivity(snapshot, ascendingIndex);
                              const liabDelta = snapshot.liabilities_total - (sorted[ascendingIndex - 1]?.liabilities_total ?? snapshot.liabilities_total);
                              if (activity.length === 0) {
                                return Math.round(liabDelta) !== 0 ? (
                                  <p className="pt-2 text-[10px] leading-relaxed text-muted-foreground">
                                    Liabilities {liabDelta < 0 ? "fell" : "rose"} by {inrCompact(Math.abs(liabDelta))} — loan-level details weren't recorded for this period.
                                  </p>
                                ) : null;
                              }
                              return (
                                <div className="pt-3">
                                  <p className="mb-2 text-[10px] font-bold uppercase text-muted-foreground">Loan activity</p>
                                  <div className="space-y-1.5">
                                    {activity.map((a) => (
                                      <div key={a.id} className="flex items-start justify-between gap-3 rounded-md border border-border/60 px-3 py-2">
                                        <span className="min-w-0">
                                          <span className="block truncate text-xs font-medium text-foreground">{a.name}</span>
                                          <span className="block text-[10px] text-muted-foreground">
                                            {a.category}
                                            {a.kind === "closed"
                                              ? " · Closed — removed from liabilities and net worth"
                                              : a.kind === "added"
                                                ? " · New loan added"
                                                : " · Outstanding updated"}
                                          </span>
                                        </span>
                                        <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", a.kind === "closed" ? "bg-success/15 text-success" : a.kind === "added" ? "bg-danger/15 text-danger" : "bg-muted text-muted-foreground")}>
                                          {a.kind === "closed" ? "Closed" : `${inrCompact(a.outstanding)} due`}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                  <p className="mt-2 text-[10px] leading-relaxed text-muted-foreground">
                                    {Math.round(liabDelta) === 0
                                      ? !activity.some((a) => a.kind === "closed")
                                        ? "Liabilities total is unchanged versus the previous snapshot."
                                        : "Liabilities total is unchanged versus the previous snapshot — the balance was already paid down before this loan was marked closed."
                                      : `Net effect on liabilities: ${liabDelta < 0 ? "−" : "+"}${inrCompact(Math.abs(liabDelta))}.`}
                                  </p>
                                </div>
                              );
                            })()}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <Dialog open={editAnnotation !== null} onOpenChange={(open) => { if (!open) setEditAnnotation(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Add or edit note</DialogTitle>
            <DialogDescription>Add a short marker to this point on your net-worth chart.</DialogDescription>
          </DialogHeader>
          <Input autoFocus maxLength={120} value={editAnnotation?.text ?? ""} onChange={(event) => setEditAnnotation((current) => current ? { ...current, text: event.target.value } : null)} placeholder="For example: Got a raise" />
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setEditAnnotation(null)}>Cancel</Button>
            <Button
              type="button"
              disabled={updateAnnotation.isPending || !editAnnotation}
              onClick={async () => {
                if (!editAnnotation) return;
                try {
                  await updateAnnotation.mutateAsync({ id: editAnnotation.id, annotation: editAnnotation.text.trim() || null });
                  setEditAnnotation(null);
                  toast.success("Note saved");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not save note");
                }
              }}
            >
              {updateAnnotation.isPending ? "Saving…" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={pendingDeleteId !== null} onOpenChange={(open) => { if (!open) setPendingDeleteId(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete snapshot?</AlertDialogTitle>
            <AlertDialogDescription>This permanently removes this point from your snapshot history and cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteSnapshot.isPending}
              onClick={async (event) => {
                event.preventDefault();
                if (!pendingDeleteId) return;
                try {
                  await deleteSnapshot.mutateAsync(pendingDeleteId);
                  setPendingDeleteId(null);
                  toast.success("Snapshot deleted");
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not delete snapshot");
                }
              }}
            >
              {deleteSnapshot.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, tone }: {
  label: string;
  value: string;
  sub: string;
  icon: ElementType;
  tone: "success" | "danger" | "warning" | "primary";
}) {
  const toneClasses = {
    success: "bg-success/10 text-success",
    danger: "bg-danger/10 text-danger",
    warning: "bg-warning/10 text-warning",
    primary: "bg-primary/10 text-primary",
  };
  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className={cn("mb-3 grid h-8 w-8 place-items-center rounded-md", toneClasses[tone])}><Icon className="h-4 w-4" /></div>
      <p className="text-[10px] font-bold uppercase text-muted-foreground">{label}</p>
      <p className="mt-1 font-ledger-mono text-lg font-bold text-foreground">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  );
}