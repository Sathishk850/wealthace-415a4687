import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  Wallet,
  CreditCard,
  TrendingUp,
  Percent,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Sparkles,
  ShieldCheck,
  PieChart as PieIcon,
  AlertTriangle,
  Info,
  CalendarClock,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AUTO_REFRESH_MS, RefreshIconButton } from "@/components/refresh-icon-button";
import {
  AllocationDetailsDialog,
  type AllocationSlice,
} from "@/components/wealth/allocation-details-dialog";
import { marketCapBand, sectorFromNotes } from "@/lib/holding-meta";
import { smartXAxisProps } from "@/lib/chart-axis";
import {
  cagrPct,
  groupByCategory,
  inr,
  inrCompact,
  portfolioXirr,
  useAssets,
  useLiabilities,
  useInvestments,
} from "@/lib/wealth-api";
import type { Investment } from "@/lib/wealth-api";
import { useInvestmentQuotes } from "@/lib/market/use-market-data";
import { deriveHolding, investmentQuoteKey } from "@/lib/market/derive";
import type { MarketQuote } from "@/lib/market/types";

const PIE = [
  "#14D8CF",
  "#3B82F6",
  "#F59E0B",
  "#8B5CF6",
  "#10B981",
  "#F97316",
  "#EF4444",
  "#94A3B8",
];

/** Rough classification of investment category into a portfolio segment. */
function segmentOf(cat: string): string {
  const c = (cat || "").toLowerCase();
  if (c.includes("mutual") || c.includes("etf") || c.includes("stock")) return "Equity";
  if (c.includes("bond") || c.includes("fd") || c.includes("debt")) return "Debt";
  if (c.includes("gold")) return "Gold";
  if (c.includes("real")) return "Real Estate";
  if (c.includes("crypto")) return "Crypto";
  if (c.includes("hybrid")) return "Hybrid";
  return "Others";
}

/** Market-cap bucket taken from the classification captured on the Add form. */
function marketCapOf(inv: Investment): string | null {
  return marketCapBand({ sub_category: inv.sub_category, notes: inv.notes });
}

const TREND_PERIODS = ["1M", "3M", "6M", "1Y", "3Y", "5Y", "ALL"] as const;
type TrendPeriod = (typeof TREND_PERIODS)[number];

const PERIOD_MONTHS: Record<TrendPeriod, number | null> = {
  "1M": 1,
  "3M": 3,
  "6M": 6,
  "1Y": 12,
  "3Y": 36,
  "5Y": 60,
  ALL: null,
};

export function WealthOverview({
  onGoSip,
  onGoAssets,
}: {
  onGoSip: () => void;
  onGoAssets?: () => void;
}) {
  const navigate = useNavigate();
  const { data: assets = [], refetch: refetchAssets } = useAssets();
  const { data: liabilities = [], refetch: refetchLiabilities } = useLiabilities();
  const { data: rows = [], refetch: refetchInvestments } = useInvestments();
  const { quoteMap, isFetching: quotesFetching, refetch: refetchQuotes } =
    useInvestmentQuotes(rows);

  const [period, setPeriod] = useState<TrendPeriod>("1Y");
  const [allocDetail, setAllocDetail] = useState<{
    title: string;
    data: AllocationSlice[];
    total: number;
  } | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const refreshAll = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        refetchInvestments(),
        refetchAssets(),
        refetchLiabilities(),
        refetchQuotes(),
      ]);
    } finally {
      setRefreshing(false);
    }
  };

  // Auto refresh every 30 minutes so insights stay reliable.
  useEffect(() => {
    const t = setInterval(() => {
      if (typeof document !== "undefined" && document.hidden) return;
      void refreshAll();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ===== Derived per-holding values (uses existing derive logic) ===== */
  const rich = useMemo(() => {
    return rows.map((r) => {
      const key = investmentQuoteKey(r);
      const quote: MarketQuote | null = key ? quoteMap.get(key) ?? null : null;
      const d = deriveHolding(r, quote);
      const inv = d.invested;
      const cur = d.current_value > 0 ? d.current_value : inv;
      const pnl = cur - inv;
      const ret = inv > 0 ? (pnl / inv) * 100 : 0;
      return { ...r, inv, cur, pnl, ret };
    });
  }, [rows, quoteMap]);


  const investmentsCurrent = rich.reduce((s, r) => s + r.cur, 0);
  const investmentsInvested = rich.reduce((s, r) => s + r.inv, 0);
  const totalAssets =
    assets.reduce((s, a) => s + (Number(a.current_value) || 0), 0) + investmentsCurrent;
  const totalLiabilities = liabilities.reduce((s, l) => s + (Number(l.outstanding) || 0), 0);
  const overallPnl = investmentsCurrent - investmentsInvested;
  const overallPct = investmentsInvested > 0 ? (overallPnl / investmentsInvested) * 100 : 0;
  const portXirr = useMemo(() => portfolioXirr(rows), [rows]);

  /* ===== Portfolio trend for the selected period ===== */
  const trend = useMemo(() => {
    if (!rich.length) return [] as { m: string; v: number }[];
    const now = new Date();

    // Window start: fixed months for presets, first purchase for ALL.
    const months = PERIOD_MONTHS[period];
    let startYear: number;
    let startMonth: number;
    if (months == null) {
      const dates = rich
        .map((r) => (r.purchase_date ? new Date(r.purchase_date) : null))
        .filter((d): d is Date => !!d && !isNaN(d.getTime()))
        .sort((a, b) => a.getTime() - b.getTime());
      const first = dates[0] ?? new Date(now.getFullYear() - 1, now.getMonth(), 1);
      startYear = first.getFullYear();
      startMonth = first.getMonth();
    } else {
      const d = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1);
      startYear = d.getFullYear();
      startMonth = d.getMonth();
    }

    const totalBuckets =
      (now.getFullYear() - startYear) * 12 + (now.getMonth() - startMonth) + 1;
    const count = Math.max(2, totalBuckets);
    // Long windows get quarterly / yearly sampling so the axis stays readable.
    const step = count > 60 ? 12 : count > 24 ? 3 : 1;

    const points: { key: string; m: string; v: number }[] = [];
    for (let i = count - 1; i >= 0; i -= step) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      points.push({
        key: `${d.getFullYear()}-${d.getMonth()}`,
        m:
          step >= 12
            ? String(d.getFullYear())
            : d.toLocaleString("en-IN", { month: "short" }) +
              " '" +
              String(d.getFullYear()).slice(2),
        v: 0,
      });
    }
    for (const r of rich) {
      const pd = r.purchase_date ? new Date(r.purchase_date) : null;
      for (const mo of points) {
        const [y, m] = mo.key.split("-").map(Number);
        const moEnd = new Date(y, m + 1, 0);
        if (!pd || pd <= moEnd) mo.v += r.cur;
      }
    }
    return points;
  }, [rich, period]);

  const periodStartValue = trend.length >= 1 ? trend[0].v : 0;
  const prevMonth = trend.length >= 2 ? trend[trend.length - 2].v : 0;
  const currMonth = trend.length >= 1 ? trend[trend.length - 1].v : investmentsCurrent;
  const assetDelta = prevMonth > 0 ? currMonth - prevMonth : 0;
  const assetDeltaPct = prevMonth > 0 ? (assetDelta / prevMonth) * 100 : 0;
  const periodDelta = periodStartValue > 0 ? currMonth - periodStartValue : 0;
  const periodDeltaPct = periodStartValue > 0 ? (periodDelta / periodStartValue) * 100 : 0;

  /* ===== Allocations ===== */
  const assetAlloc = useMemo(() => {
    // Combine investment segments + manual assets (as "Real Estate/Gold/Cash & Others").
    const buckets = new Map<string, number>();
    for (const r of rich) {
      const seg = segmentOf(r.category);
      buckets.set(seg, (buckets.get(seg) || 0) + r.cur);
    }
    for (const a of assets) {
      const c = (a.category || "Others").toString();
      const key =
        /real/i.test(c) ? "Real Estate"
        : /gold/i.test(c) ? "Gold"
        : /cash|bank|saving/i.test(c) ? "Cash & Others"
        : c;
      buckets.set(key, (buckets.get(key) || 0) + (Number(a.current_value) || 0));
    }
    const total = Array.from(buckets.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(buckets.entries())
      .map(([name, amt], i) => ({
        name,
        amt,
        pct: (amt / total) * 100,
        color: PIE[i % PIE.length],
      }))
      .sort((a, b) => b.amt - a.amt);
  }, [rich, assets]);

  const sectorAlloc = useMemo(() => {
    // Sector comes from the "Sector" label captured on the Add Investment form.
    const map = new Map<string, number>();
    for (const r of rich) {
      const sector = sectorFromNotes(r.notes) ?? "Unclassified";
      map.set(sector, (map.get(sector) || 0) + r.cur);
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(map.entries())
      .map(([name, amt], i) => ({
        name,
        amt,
        pct: (amt / total) * 100,
        color: PIE[i % PIE.length],
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [rich]);

  const marketCapAlloc = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rich) {
      const bucket = marketCapOf(r);
      if (!bucket) continue;
      map.set(bucket, (map.get(bucket) || 0) + r.cur);
    }
    const total = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;
    const order = ["Large Cap", "Mid Cap", "Small Cap", "Multi Cap", "Flexi Cap"];
    return order
      .filter((k) => map.has(k))
      .map((k, i) => ({
        name: k,
        amt: map.get(k) || 0,
        pct: ((map.get(k) || 0) / total) * 100,
        color: PIE[i % PIE.length],
      }));
  }, [rich]);


  /* ===== Top Holdings ===== */
  const topHoldings = useMemo(
    () => [...rich].sort((a, b) => b.cur - a.cur).slice(0, 5),
    [rich],
  );

  /* ===== Insights ===== */
  const insights = useMemo(() => {
    const arr: {
      icon: React.ElementType;
      title: string;
      body: string;
      tone: "good" | "warn" | "info";
      action?: { label: string; onClick: () => void };
    }[] = [];

    if (overallPnl >= 0 && investmentsInvested > 0) {
      arr.push({
        icon: TrendingUp,
        tone: "good",
        title: "Your portfolio is performing well",
        body: `Overall gain of ${inrCompact(overallPnl)} (${overallPct.toFixed(2)}%) across all assets.`,
      });
    } else if (overallPnl < 0) {
      arr.push({
        icon: AlertTriangle,
        tone: "warn",
        title: "Portfolio is currently in loss",
        body: `Down ${inrCompact(Math.abs(overallPnl))} (${overallPct.toFixed(2)}%). Review allocations.`,
      });
    }

    const equityPct = assetAlloc.find((a) => a.name === "Equity")?.pct ?? 0;
    if (equityPct >= 50 && equityPct <= 75) {
      arr.push({
        icon: PieIcon,
        tone: "good",
        title: "Equity allocation is optimal",
        body: `${equityPct.toFixed(2)}% in equity aligns well with your long-term goals.`,
      });
    } else if (equityPct > 75) {
      arr.push({
        icon: AlertTriangle,
        tone: "warn",
        title: "High equity concentration",
        body: `${equityPct.toFixed(2)}% is in equity. Consider diversifying.`,
      });
    }

    const cc = liabilities.find((l) => /credit\s*card/i.test(l.category));
    if (cc && cc.outstanding > 0) {
      arr.push({
        icon: CreditCard,
        tone: "warn",
        title: "Reduce credit card utilization",
        body: `You have ${inrCompact(cc.outstanding)} due on credit cards. Consider clearing it soon.`,
      });
    }

    const activeSips = rows.filter((r) => r.is_sip && r.sip_active);
    if (activeSips.length > 0) {
      const monthly = activeSips.reduce((s, r) => {
        const amt = Number(r.sip_amount) || 0;
        return s + (r.sip_frequency === "yearly" ? amt / 12
                  : r.sip_frequency === "quarterly" ? amt / 3
                  : r.sip_frequency === "weekly" ? amt * 4.345
                  : amt);
      }, 0);
      arr.push({
        icon: CalendarClock,
        tone: "info",
        title: "Stay on track with SIPs",
        body: `You have ${activeSips.length} active SIPs worth ${inrCompact(monthly)}/month.`,
        action: { label: "SIP Tracker", onClick: onGoSip },
      });
    }

    if (portXirr >= 12) {
      arr.push({
        icon: Sparkles,
        tone: "good",
        title: "XIRR is excellent",
        body: `Money-weighted return of ${portXirr.toFixed(2)}% is above market average.`,
      });
    } else if (portXirr > 0 && portXirr < 6) {
      arr.push({
        icon: Info,
        tone: "info",
        title: "XIRR needs review",
        body: `Current XIRR is ${portXirr.toFixed(2)}%. Consider rebalancing.`,
      });
    }

    return arr;
  }, [overallPnl, overallPct, investmentsInvested, assetAlloc, liabilities, rows, portXirr, onGoSip]);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-foreground">Overview</h2>
          <p className="text-sm text-muted-foreground">Your wealth summary at a glance</p>
        </div>
        <RefreshIconButton
          onClick={() => void refreshAll()}
          busy={refreshing || quotesFetching}
          label="Refresh overview"
        />
      </div>


      {/* ROW 1 — KPI CARDS */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label="Total Assets"
          value={inr(totalAssets)}
          delta={assetDelta}
          deltaPct={assetDeltaPct}
          sub="vs last month"
          icon={Wallet}
          iconTone="bg-mint/10 text-mint"
        />
        <KpiCard
          label="Total Liabilities"
          value={inr(totalLiabilities)}
          delta={0}
          deltaPct={0}
          sub="vs last month"
          icon={CreditCard}
          iconTone="bg-rose-500/10 text-rose-400"
          invertColor
          hideDelta={totalLiabilities === 0}
        />
        <KpiCard
          label="Overall Gain / Loss"
          value={`${overallPnl >= 0 ? "+" : ""}${inr(overallPnl)}`}
          delta={overallPnl}
          deltaPct={overallPct}
          sub="All time"
          icon={TrendingUp}
          iconTone="bg-emerald-500/10 text-emerald-400"
        />
        <KpiCard
          label="XIRR (All Time)"
          value={portXirr === 0 ? "—" : `${portXirr.toFixed(2)}%`}
          delta={portXirr}
          deltaPct={portXirr}
          sub="vs last month"
          icon={Percent}
          iconTone="bg-violet-500/10 text-violet-400"
          hideDelta={portXirr === 0}
        />
      </div>

      {/* ROW 2 — ALLOCATIONS */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <AllocationCard
          title="Asset Allocation"
          centerLabel="Total Assets"
          centerValue={inrCompact(totalAssets)}
          data={assetAlloc}
          onView={() =>
            setAllocDetail({
              title: "Asset Allocation",
              data: assetAlloc,
              total: assetAlloc.reduce((s, d) => s + d.amt, 0),
            })
          }
        />
        <AllocationCard
          title="Sector Allocation"
          data={sectorAlloc}
          onView={() =>
            setAllocDetail({
              title: "Sector Allocation",
              data: sectorAlloc,
              total: sectorAlloc.reduce((s, d) => s + d.amt, 0),
            })
          }
          emptyLabel="Pick a Sector on the Add Investment form to see this split"
        />
        <AllocationCard
          title="Market Cap"
          data={marketCapAlloc}
          onView={() =>
            setAllocDetail({
              title: "Market Cap",
              data: marketCapAlloc,
              total: marketCapAlloc.reduce((s, d) => s + d.amt, 0),
            })
          }
          emptyLabel="Tag holdings as Large / Mid / Small cap on the Add Investment form"
        />
      </div>

      {/* ROW 3 — TREND + TOP HOLDINGS */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Portfolio Trend</h3>
              <div className="mt-2 font-display text-2xl font-bold text-foreground">
                {inr(currMonth)}
              </div>
              <div
                className={`mt-0.5 text-xs font-medium ${periodDelta >= 0 ? "text-emerald-400" : "text-rose-400"}`}
              >
                {periodDelta >= 0 ? "+" : ""}
                {inr(periodDelta)} ({periodDeltaPct >= 0 ? "+" : ""}
                {periodDeltaPct.toFixed(2)}%)
                <span className="ml-1 text-muted-foreground">· {period}</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {TREND_PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  aria-pressed={period === p}
                  onClick={() => setPeriod(p)}
                  className={`rounded-lg border px-2.5 py-1 text-[11px] font-medium transition ${
                    period === p
                      ? "border-mint/50 bg-mint/10 text-mint"
                      : "border-border bg-surface-2/40 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="mt-4 h-[260px]">
            {trend.length < 2 ? (
              <div className="grid h-full place-items-center text-xs text-muted-foreground">
                Add investments with purchase dates to see growth
              </div>
            ) : (

              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="wovTrend" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#14D8CF" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#14D8CF" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="m" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} {...smartXAxisProps} />
                  <YAxis tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => inrCompact(v as number)} />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [inr(v), "Value"]}
                  />
                  <Area type="monotone" dataKey="v" stroke="#14D8CF" strokeWidth={2.5} fill="url(#wovTrend)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Top Holdings</h3>
            <button
              type="button"
              onClick={() => (onGoAssets ? onGoAssets() : navigate({ to: "/wealth" }))}
              className="inline-flex items-center gap-1 text-xs font-medium text-mint hover:brightness-125"
            >
              View All <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
          {topHoldings.length === 0 ? (
            <div className="grid h-40 place-items-center text-xs text-muted-foreground">
              No holdings yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                    <th className="pb-2 font-medium">Holding</th>
                    <th className="pb-2 font-medium">Category</th>
                    <th className="pb-2 text-right font-medium">Value</th>
                    <th className="pb-2 text-right font-medium">Gain / Loss</th>
                  </tr>
                </thead>
                <tbody>
                  {topHoldings.map((h, i) => {
                    const up = h.pnl >= 0;
                    return (
                      <tr key={h.id} className="border-t border-border/60">
                        <td className="py-2.5">
                          <div className="flex items-center gap-2">
                            <span
                              className="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[10px] font-bold text-white"
                              style={{ background: PIE[i % PIE.length] }}
                            >
                              {h.name.slice(0, 1)}
                            </span>
                            <span className="truncate text-xs font-medium text-foreground">
                              {h.name}
                            </span>
                          </div>
                        </td>
                        <td className="py-2.5 text-xs text-muted-foreground">
                          {segmentOf(h.category)}
                        </td>
                        <td className="py-2.5 text-right text-xs text-foreground">
                          {inrCompact(h.cur)}
                        </td>
                        <td className={`py-2.5 text-right text-xs font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>
                          <span className="inline-flex items-center justify-end gap-0.5">
                            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {up ? "+" : ""}
                            {inrCompact(h.pnl)}
                          </span>
                          <div className="text-[10px] text-muted-foreground">
                            ({up ? "+" : ""}
                            {h.ret.toFixed(2)}%)
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ROW 4 — INSIGHTS */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Insights</h3>
            <p className="text-[11px] text-muted-foreground">Smart, dynamic tips from your portfolio</p>
          </div>
          <button
            type="button"
            onClick={() => setInsightsOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-medium text-mint hover:brightness-125"
          >
            View All Insights <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
        {insights.length === 0 ? (
          <div className="grid h-24 place-items-center text-xs text-muted-foreground">
            Add data to see personalized insights.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {insights.map((it, i) => (
              <InsightCard key={i} {...it} />
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM */}
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-mint/30 bg-mint/5 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mint/15 text-mint">
            <ShieldCheck className="h-4 w-4" />
          </span>
          <p className="text-xs text-muted-foreground sm:text-sm">
            Track all your assets, liabilities and SIPs in one place and grow your wealth with confidence.
          </p>
        </div>
        <button
          onClick={onGoSip}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-mint px-4 py-2 text-xs font-semibold text-[#04121C] transition hover:brightness-110 sm:text-sm"
        >
          <TrendingUp className="h-3.5 w-3.5" />
          SIP Tracker
        </button>
      </div>
    </div>
  );
}

/* =============== Small pieces =============== */

function KpiCard({
  label,
  value,
  delta,
  deltaPct,
  sub,
  icon: Icon,
  iconTone,
  invertColor,
  hideDelta,
}: {
  label: string;
  value: string;
  delta: number;
  deltaPct: number;
  sub: string;
  icon: React.ElementType;
  iconTone: string;
  invertColor?: boolean;
  hideDelta?: boolean;
}) {
  const positive = invertColor ? delta < 0 : delta >= 0;
  const tone = positive ? "text-emerald-400" : "text-rose-400";
  const sign = delta >= 0 ? "+" : "";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-sm transition hover:border-mint/40">
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className={`grid h-9 w-9 place-items-center rounded-xl ${iconTone}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <div className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
        {value}
      </div>
      {!hideDelta && (
        <div className={`mt-1 text-xs font-medium ${tone}`}>
          {sign}
          {inrCompact(Math.abs(delta))}{" "}
          <span className="text-muted-foreground">
            ({deltaPct >= 0 ? "+" : ""}
            {deltaPct.toFixed(2)}%)
          </span>
        </div>
      )}
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function AllocationCard({
  title,
  centerLabel,
  centerValue,
  data,
  onView,
  emptyLabel,
}: {
  title: string;
  centerLabel?: string;
  centerValue?: string;
  data: { name: string; amt: number; pct: number; color: string }[];
  onView: () => void;
  emptyLabel?: string;
}) {
  const hasData = data.length > 0 && data.some((d) => d.amt > 0);
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <button
          onClick={onView}
          className="text-xs font-medium text-mint hover:brightness-125"
        >
          View Details
        </button>
      </div>
      {!hasData ? (
        <div className="grid h-40 place-items-center px-4 text-center text-xs text-muted-foreground">
          {emptyLabel ?? "No data yet"}
        </div>
      ) : (
        <div className="flex items-center gap-4">
          <div className="relative h-[150px] w-[150px] shrink-0">
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={data}
                  dataKey="amt"
                  innerRadius={50}
                  outerRadius={72}
                  paddingAngle={2}
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            {centerLabel ? (
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                    {centerLabel}
                  </div>
                  <div className="font-display text-sm font-bold text-foreground">
                    {centerValue}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            {data.slice(0, 7).map((d) => (
              <div key={d.name} className="flex items-center gap-2 text-xs">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                <span className="min-w-0 flex-1 truncate text-foreground">{d.name}</span>
                <span className="shrink-0 font-medium text-muted-foreground">
                  {d.pct.toFixed(2)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function InsightCard({
  icon: Icon,
  title,
  body,
  tone,
  action,
}: {
  icon: React.ElementType;
  title: string;
  body: string;
  tone: "good" | "warn" | "info";
  action?: { label: string; onClick: () => void };
}) {
  const cls =
    tone === "good"
      ? "bg-emerald-500/10 text-emerald-400"
      : tone === "warn"
      ? "bg-amber-500/10 text-amber-400"
      : "bg-mint/10 text-mint";
  const border =
    tone === "good" ? "border-emerald-500/30" : tone === "warn" ? "border-amber-500/30" : "border-mint/30";
  return (
    <div className={`rounded-xl border ${border} bg-surface-2/30 p-4`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${cls}`}>
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <div className="text-xs font-semibold text-foreground">{title}</div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">{body}</p>
          {action ? (
            <button
              onClick={action.onClick}
              className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-mint hover:brightness-125"
            >
              {action.label} <ChevronRight className="h-3 w-3" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
// Silence unused-import warnings for helpers kept for future adjustments.
void cagrPct;
void groupByCategory;
