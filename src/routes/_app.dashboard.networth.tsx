import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Camera, TrendingUp, TrendingDown } from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Pie,
  PieChart,
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
  useNetWorth,
  useSnapshots,
} from "@/lib/networth";
import { formatDateShort } from "@/lib/date-format";

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

const COMPOSITION_COLORS = ["#14d8cf", "#3b82f6", "#d9b800", "#ff4d4d"];

function NetWorth() {
  const nw = useNetWorth();
  const snapsQ = useSnapshots();
  const createSnap = useCreateSnapshot();
  const [months, setMonths] = useState<number>(12);

  const snaps = snapsQ.data ?? [];

  const series = useMemo(() => {
    const cutoff =
      months > 0 ? new Date(Date.now() - months * 30 * 86400000).toISOString().slice(0, 10) : "";
    return snaps
      .filter((s) => (cutoff ? s.snapshot_date >= cutoff : true))
      .map((s) => ({
        t: new Date(s.snapshot_date).getTime(),
        net: s.net_worth,
        assets: s.assets_total,
        liabilities: s.liabilities_total,
      }));
  }, [snaps, months]);

  const trend = useMemo(() => snapshotTrend(snaps), [snaps]);

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

  return (
    <>
      <PageHeader
        title="Net Worth"
        description="A live view of what you own minus what you owe, captured daily."
        actions={
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
        }
      />

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
              <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
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
              </AreaChart>
            </ResponsiveContainer>
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
