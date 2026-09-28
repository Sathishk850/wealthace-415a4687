import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, Check, Clock, TrendingUp, TrendingDown, Plus, Trash2, History, X, Loader2 } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as RTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PageHeader, StatCard } from "@/components/page-header";
import { inr, inrCompact, inrSigned } from "@/lib/wealth-api";
import {
  snapshotTrend,
  useCreateSnapshot,
  useDeleteSnapshot,
  useNetWorth,
  useSnapshots,
  useUpdateSnapshotAnnotation,
} from "@/lib/networth";
import { formatDateShort } from "@/lib/date-format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_app/dashboard/networth")({
  head: () => ({
    meta: [
      { title: "Net Worth · Wealth Ace" },
      {
        name: "description",
        content:
          "Track net worth over time — assets versus liabilities, composition and month-on-month trend.",
      },
      { property: "og:title", content: "Net Worth · Wealth Ace" },
      {
        property: "og:description",
        content: "Net worth history, composition and trend analysis in Wealth Ace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: NetWorth,
});

const MONTH_OPTIONS = [
  { label: "6M", months: 6 },
  { label: "12M", months: 12 },
  { label: "24M", months: 24 },
  { label: "All", months: 0 },
] as const;

type SnapCadence = "off" | "weekly" | "biweekly" | "monthly";
const CADENCE_DAYS: Record<SnapCadence, number> = {
  off: 0, weekly: 7, biweekly: 14, monthly: 30,
};
const CADENCE_LABELS: Record<SnapCadence, string> = {
  off: "Off", weekly: "Weekly", biweekly: "Every 2 weeks", monthly: "Monthly",
};
const PREF_KEY = "wa-snapshot-cadence";

const COMPOSITION_COLORS = ["#14d8cf", "#3b82f6", "#d9b800", "#ff4d4d"];

function NetWorth() {
  const nw = useNetWorth();
  const snapsQ = useSnapshots();
  const createSnap = useCreateSnapshot();
  const deleteSnap = useDeleteSnapshot();
  const [showPastForm, setShowPastForm] = useState(false);
  const [pastDate, setPastDate] = useState(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 10);
  });
  const [pastAssets, setPastAssets] = useState("");
  const [pastLiabilities, setPastLiabilities] = useState("0");
  const [showHistory, setShowHistory] = useState(false);
  const [months, setMonths] = useState<number>(12);

  const snaps = snapsQ.data ?? [];

  const [cadence, setCadenceState] = useState<SnapCadence>(
    () => (typeof window !== "undefined"
      ? (localStorage.getItem(PREF_KEY) as SnapCadence) ?? "off"
      : "off")
  );
  const [autoFired, setAutoFired] = useState(false);
  const [showCadencePicker, setShowCadencePicker] = useState(false);

  const setCadence = (c: SnapCadence) => {
    localStorage.setItem(PREF_KEY, c);
    setCadenceState(c);
  };

  // Auto-snapshot: fires once per page load when cadence is due
  useEffect(() => {
    if (cadence === "off") return;
    if (autoFired) return;
    if (createSnap.isPending) return;
    if (snapsQ.isLoading || nw.isLoading) return;
    if (nw.totalAssets === 0 && nw.liabilitiesTotal === 0) return;

    const days = CADENCE_DAYS[cadence];
    const lastSnap = snaps[snaps.length - 1];

    if (lastSnap) {
      const lastDate = new Date(lastSnap.snapshot_date).getTime();
      const daysSince = (Date.now() - lastDate) / 86_400_000;
      if (daysSince < days) return; // not due yet
    }
    // Due — fire auto-snapshot
    setAutoFired(true);
    createSnap.mutate({
      net_worth: nw.netWorth,
      assets_total: nw.totalAssets,
      liabilities_total: nw.liabilitiesTotal,
      investments_total: nw.investmentsTotal,
      savings_total: nw.cashTotal,
    });
  }, [cadence, autoFired, snapsQ.isLoading, nw.isLoading, snaps.length, nw.totalAssets, nw.liabilitiesTotal, nw.netWorth, nw.investmentsTotal, nw.cashTotal, createSnap]);

  // Close cadence picker on outside click
  useEffect(() => {
    if (!showCadencePicker) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-cadence-picker]")) setShowCadencePicker(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCadencePicker]);

  const series = useMemo(() => {
    const cutoff =
      months > 0 ? new Date(Date.now() - months * 30 * 86400000).toISOString().slice(0, 10) : "";
    return snaps
      .filter((s) => (cutoff ? s.snapshot_date >= cutoff : true))
      .map((s) => ({
        id: s.id,
        annotation: s.annotation ?? null,
        date: s.snapshot_date,
        t: new Date(s.snapshot_date).getTime(),
        net: s.net_worth,
        assets: s.assets_total,
        liabilities: s.liabilities_total,
      }));
  }, [snaps, months]);

  const trend = useMemo(() => snapshotTrend(snaps), [snaps]);
  const saveAnnotation = useUpdateSnapshotAnnotation();
  const [annotTarget, setAnnotTarget] = useState<{ id: string; date: string } | null>(null);
  const [annotText, setAnnotText] = useState("");
  const pickAnnotTarget = (id: string | undefined) => {
    const p = series.find((x) => x.id === id);
    if (!p) return;
    setAnnotTarget({ id: p.id, date: p.date });
    setAnnotText(p.annotation ?? "");
  };

  const composition = useMemo(
    () =>
      [
        { name: "Investments", value: nw.investmentsTotal },
        { name: "Cash & bank", value: nw.cashTotal },
        { name: "Other assets", value: nw.assetsTotal },
        { name: "Liabilities", value: nw.liabilitiesTotal },
      ].filter((d) => d.value > 0),
    [nw.investmentsTotal, nw.cashTotal, nw.assetsTotal, nw.liabilitiesTotal],
  );

  const empty = !nw.isLoading && nw.totalAssets === 0 && nw.liabilitiesTotal === 0;

  const todayIso = new Date().toISOString().slice(0, 10);
  const pastAssetsNum = parseFloat(pastAssets || "0") || 0;
  const pastLiabNum = parseFloat(pastLiabilities || "0") || 0;
  const pastNetWorth = pastAssetsNum - pastLiabNum;
  const pastValid = pastAssetsNum > 0 && !!pastDate && pastDate <= todayIso;

  async function submitPastEntry() {
    if (!pastValid) return;
    await createSnap.mutateAsync({
      snapshot_date: pastDate,
      net_worth: pastNetWorth,
      assets_total: pastAssetsNum,
      liabilities_total: pastLiabNum,
      investments_total: 0,
      savings_total: 0,
    });
    setShowPastForm(false);
    setPastAssets("");
    setPastLiabilities("0");
  }

  return (
    <>
      <PageHeader
        title="Net Worth"
        description="A live view of what you own minus what you owe, captured daily."
        actions={
          <div className="flex items-center gap-2">
            {/* Auto-snapshot cadence button */}
            <div className="relative" data-cadence-picker>
              <button
                type="button"
                onClick={() => setShowCadencePicker((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                  cadence !== "off"
                    ? "border-mint/40 bg-mint/10 text-mint"
                    : "border-border bg-surface text-muted-foreground hover:border-mint/40 hover:text-foreground"
                )}
              >
                <Clock className="h-3.5 w-3.5" />
                {cadence === "off" ? "Auto: Off" : CADENCE_LABELS[cadence]}
                {cadence !== "off" && autoFired && (
                  <span className="ml-1 rounded-full bg-mint/20 px-1.5 py-0.5 text-[9px] font-bold text-mint">SAVED</span>
                )}
              </button>

              {showCadencePicker && (
                <div className="absolute right-0 top-full z-20 mt-1.5 w-48 overflow-hidden rounded-2xl border border-border bg-popover shadow-lg">
                  <div className="border-b border-border px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Auto-snapshot cadence
                  </div>
                  {(Object.keys(CADENCE_LABELS) as SnapCadence[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => { setCadence(c); setShowCadencePicker(false); }}
                      className={cn(
                        "flex w-full items-center justify-between px-3 py-2.5 text-sm transition-colors hover:bg-surface",
                        cadence === c ? "text-mint font-semibold" : "text-foreground"
                      )}
                    >
                      {CADENCE_LABELS[c]}
                      {cadence === c && <Check className="h-3.5 w-3.5 text-mint" />}
                    </button>
                  ))}
                  <div className="border-t border-border px-3 py-2 text-[10px] text-muted-foreground">
                    Snapshot fires automatically on page load when due.
                  </div>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => setShowHistory((v) => !v)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-colors",
                showHistory
                  ? "border-mint/40 bg-mint/10 text-mint"
                  : "border-border bg-surface text-muted-foreground hover:border-mint/40",
              )}
            >
              <History className="h-3.5 w-3.5" />
              {snaps.length} {snaps.length === 1 ? "entry" : "entries"}
            </button>
            <button
              type="button"
              onClick={() => setShowPastForm(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:border-mint/40"
            >
              <Plus className="h-3.5 w-3.5 text-mint" />
              Add past entry
            </button>

            {/* Manual snap */}
            <button
              type="button"
              disabled={createSnap.isPending || empty}
              onClick={() =>
                createSnap.mutate({
                  net_worth: nw.netWorth,
                  assets_total: nw.totalAssets,
                  liabilities_total: nw.liabilitiesTotal,
                  investments_total: nw.investmentsTotal,
                  savings_total: nw.cashTotal,
                })
              }
              className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-mint-foreground disabled:opacity-50"
            >
              <Camera className="h-3.5 w-3.5" />
              {createSnap.isPending ? "Saving…" : "Snap now"}
            </button>
          </div>
        }
      />

      {showPastForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 backdrop-blur-sm sm:items-center">
          <div className="w-full max-w-sm space-y-4 rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Add Past Entry</h3>
              <button type="button" onClick={() => setShowPastForm(false)} className="text-muted-foreground hover:text-foreground" aria-label="Close">
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground">
              Enter values from your old records or spreadsheet. This backfills your net worth chart.
            </p>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Date</label>
              <input
                type="date"
                max={todayIso}
                value={pastDate}
                onChange={(e) => setPastDate(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-mint/40"
              />
              <p className="mt-0.5 text-[10px] text-muted-foreground">Past dates only. Existing entry for same date will be overwritten.</p>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Total Assets (₹)</label>
              <input
                type="number" min="0" step="1000" placeholder="e.g. 500000"
                value={pastAssets}
                onChange={(e) => setPastAssets(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-mint/40"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Total Liabilities (₹)</label>
              <input
                type="number" min="0" step="1000" placeholder="0"
                value={pastLiabilities}
                onChange={(e) => setPastLiabilities(e.target.value)}
                className="w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-mint/40"
              />
            </div>
            {pastAssets && (
              <div className={cn(
                "flex items-center justify-between rounded-xl border px-3 py-2 text-sm font-semibold",
                pastNetWorth >= 0 ? "border-success/30 bg-success/5 text-success" : "border-destructive/30 bg-destructive/5 text-destructive",
              )}>
                <span className="text-xs font-medium text-muted-foreground">Net Worth</span>
                {inr(pastNetWorth)}
              </div>
            )}
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowPastForm(false)} className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-foreground">
                Cancel
              </button>
              <button
                type="button"
                onClick={submitPastEntry}
                disabled={!pastValid || createSnap.isPending}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-mint py-2.5 text-sm font-semibold text-mint-foreground disabled:opacity-50"
              >
                {createSnap.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                Save entry
              </button>
            </div>
          </div>
        </div>
      )}

      {showHistory && (
        <div className="mb-4 rounded-2xl border border-border bg-card p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Snapshot History ({snaps.length})</h3>
            <button type="button" onClick={() => setShowHistory(false)} aria-label="Close history">
              <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
            </button>
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {snaps.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">No snapshots yet.</p>
            ) : (
              [...snaps].reverse().map((s) => (
                <div key={s.id} className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface">
                  <div>
                    <div className="text-xs font-medium text-foreground">{formatDateShort(s.snapshot_date)}</div>
                    <div className="text-[10px] text-muted-foreground">
                      Assets {inrCompact(s.assets_total)} · Liabilities {inrCompact(s.liabilities_total)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={cn("text-sm font-semibold", s.net_worth >= 0 ? "text-success" : "text-destructive")}>
                      {inrCompact(s.net_worth)}
                    </span>
                    <button
                      type="button"
                      aria-label="Delete snapshot"
                      onClick={() => { if (window.confirm("Delete this snapshot?")) deleteSnap.mutate(s.id); }}
                      className="text-muted-foreground transition hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            {snaps.length} snapshot{snaps.length !== 1 ? "s" : ""} · Deleting removes it from the chart permanently.
          </p>
        </div>
      )}


      {/* Headline + history */}
      <div className="mb-6 rounded-3xl border border-border bg-card p-5 sm:p-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="text-xs uppercase tracking-widest text-mint">Today</div>
            <div className="mt-1 font-display text-3xl font-extrabold sm:text-4xl">
              {nw.isLoading ? "—" : inr(nw.netWorth)}
            </div>
            {trend.hasHistory ? (
              <div
                className={`mt-1 inline-flex items-center gap-1 text-xs font-semibold ${
                  trend.changeMonth >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {trend.changeMonth >= 0 ? (
                  <TrendingUp className="h-3.5 w-3.5" />
                ) : (
                  <TrendingDown className="h-3.5 w-3.5" />
                )}
                {inrSigned(trend.changeMonth)} ({trend.changeMonthPct.toFixed(1)}%) vs last month
              </div>
            ) : (
              <div className="mt-1 text-xs text-muted-foreground">
                History builds up each time you take a snapshot.
              </div>
            )}
            {cadence !== "off" && (
              <div className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                Auto-snapshot {CADENCE_LABELS[cadence].toLowerCase()} ·{" "}
                {snaps.length > 0
                  ? `last saved ${formatDateShort(snaps[snaps.length - 1].snapshot_date)}`
                  : "no snapshots yet"}
                {autoFired && (
                  <span className="ml-1 rounded-full bg-mint/15 px-1.5 py-0.5 text-mint">
                    ✓ Saved just now
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-1 rounded-xl border border-border p-1">
            {MONTH_OPTIONS.map((o) => (
              <button
                key={o.label}
                type="button"
                onClick={() => setMonths(o.months)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition ${
                  months === o.months
                    ? "bg-mint text-mint-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 h-56">
          {empty ? (
            <div className="grid h-full place-items-center rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              <div>
                <TrendingUp className="mx-auto mb-2 h-5 w-5 text-mint" />
                Add your first asset or liability in Wealth to start building your net-worth history.
              </div>
            </div>
          ) : series.length < 2 ? (
            <div className="grid h-full place-items-center rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              Only one snapshot so far — take another to see the trend line.
            </div>
          ) : (
            <ResponsiveContainer>
              <AreaChart
                data={series}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                onClick={(e) => {
                  const idx = Number((e as { activeTooltipIndex?: number | string } | null)?.activeTooltipIndex);
                  if (Number.isFinite(idx)) pickAnnotTarget(series[idx]?.id);
                }}
              >
                <defs>
                  <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14d8cf" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="#14d8cf" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="t"
                  type="number"
                  scale="time"
                  domain={["dataMin", "dataMax"]}
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickFormatter={(v: number) => formatDateShort(v)}
                />
                <YAxis
                  orientation="right"
                  axisLine={false}
                  tickLine={false}
                  width={52}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
                  tickFormatter={(v: number) => inrCompact(v)}
                />
                <RTooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                    color: "var(--popover-foreground)",
                  }}
                  labelFormatter={(v: number) => formatDateShort(v)}
                  formatter={(v: number, name) => [inr(v), String(name)]}
                />
                <Area
                  type="monotone"
                  dataKey="net"
                  name="Net worth"
                  stroke="var(--primary)"
                  strokeWidth={2}
                  fill="url(#nwGrad)"
                />
                {series.filter((p) => p.annotation).map((p) => (
                  <ReferenceLine
                    key={p.id}
                    x={p.t}
                    stroke="#22d3ee"
                    strokeDasharray="4 2"
                    strokeWidth={1.5}
                    label={{ value: p.annotation!, position: "insideTopLeft", fontSize: 10, fill: "#22d3ee" }}
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          )}
          {series.length >= 2 && (
            annotTarget ? (
              <form
                className="mt-2 flex flex-wrap items-center gap-2 text-xs"
                onSubmit={async (e) => {
                  e.preventDefault();
                  await saveAnnotation.mutateAsync({ id: annotTarget.id, annotation: annotText.trim() || null });
                  setAnnotTarget(null);
                }}
              >
                <span className="text-muted-foreground">Note for {formatDateShort(annotTarget.date)}:</span>
                <input
                  autoFocus
                  value={annotText}
                  onChange={(e) => setAnnotText(e.target.value)}
                  maxLength={60}
                  placeholder="e.g. Bought house"
                  className="h-7 min-w-[160px] flex-1 rounded-md border border-border bg-background px-2 text-xs text-foreground"
                />
                <button type="submit" disabled={saveAnnotation.isPending} className="rounded-md bg-primary px-2.5 py-1 font-semibold text-primary-foreground">Save</button>
                <button type="button" onClick={() => setAnnotTarget(null)} className="rounded-md border border-border px-2.5 py-1 font-semibold">Cancel</button>
              </form>
            ) : (
              <p className="mt-2 text-[11px] text-muted-foreground">Tap a point on the chart to add or edit a note.</p>
            )
          )}
        </div>
      </div>

      {/* Breakdown */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total assets" value={nw.isLoading ? "—" : inr(nw.totalAssets)} tone="mint" />
        <StatCard label="Total liabilities" value={nw.isLoading ? "—" : inr(nw.liabilitiesTotal)} />
        <StatCard label="Investments" value={nw.isLoading ? "—" : inr(nw.investmentsTotal)} />
        <StatCard label="Cash & bank" value={nw.isLoading ? "—" : inr(nw.cashTotal)} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Composition */}
        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Composition</h2>
          <p className="text-xs text-muted-foreground">Where your net worth sits today.</p>
          <div className="mt-3 h-52">
            {composition.length === 0 ? (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">
                Nothing to show yet
              </div>
            ) : (
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={composition}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="55%"
                    outerRadius="85%"
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {composition.map((entry, i) => (
                      <Cell key={entry.name} fill={COMPOSITION_COLORS[i % COMPOSITION_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--popover-foreground)",
                    }}
                    formatter={(v: number, name) => [inr(v), String(name)]}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <ul className="mt-2 space-y-1">
            {composition.map((c, i) => (
              <li key={c.name} className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: COMPOSITION_COLORS[i % COMPOSITION_COLORS.length] }}
                  />
                  {c.name}
                </span>
                <span className="font-semibold text-foreground">{inr(c.value)}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* Trend analysis */}
        <section className="rounded-3xl border border-border bg-card p-5">
          <h2 className="text-sm font-semibold text-foreground">Trend analysis</h2>
          <p className="text-xs text-muted-foreground">
            Based on {snaps.length} snapshot{snaps.length === 1 ? "" : "s"}.
          </p>
          <dl className="mt-4 space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Change vs last month</dt>
              <dd
                className={`font-semibold ${
                  trend.changeMonth >= 0 ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {trend.hasHistory ? inrSigned(trend.changeMonth) : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Best day</dt>
              <dd className="font-semibold text-foreground">
                {trend.best
                  ? `${inrSigned(trend.best.delta)} · ${formatDateShort(trend.best.date)}`
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Worst day</dt>
              <dd className="font-semibold text-foreground">
                {trend.worst
                  ? `${inrSigned(trend.worst.delta)} · ${formatDateShort(trend.worst.date)}`
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">Debt-to-asset ratio</dt>
              <dd className="font-semibold text-foreground">
                {nw.totalAssets > 0
                  ? `${((nw.liabilitiesTotal / nw.totalAssets) * 100).toFixed(1)}%`
                  : "—"}
              </dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-muted-foreground">First snapshot</dt>
              <dd className="font-semibold text-foreground">
                {snaps[0] ? formatDateShort(snaps[0].snapshot_date) : "—"}
              </dd>
            </div>
          </dl>
        </section>
      </div>
    </>
  );
}
