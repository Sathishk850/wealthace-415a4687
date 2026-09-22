import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowUp,
  ArrowDown,
  Minus,

  Camera,
  History,
  Info,
  Wallet,
  Banknote,
  TrendingUp,
  PiggyBank,
  ArrowLeftRight,
  Percent,
  Scale,
  ArrowRight,
  Target,
  Sparkles,
  Calendar,
  BadgeIndianRupee,
  RefreshCw,
} from "lucide-react";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { SnapshotHistoryDialog } from "@/components/snapshot-history-dialog";
import {
  ChartRangeSelector,
  defaultChartRange,
  type ChartRangeValue,
} from "@/components/chart-range-selector";
import {
  smartXAxisProps,
  formatAxisTick,
  filterSeriesByRange,
  computeTimeAxisTicks,
  getPaddedTimeAxisDomain,
  dateToAxisTime,
  timeXAxisPadding,
} from "@/lib/chart-axis";
import { useAssets, useLiabilities, useInvestments, useAccounts, inr as inrW } from "@/lib/wealth-api";
import {
  computeNetWorth,
  useCreateSnapshot,
  useSnapshots,
  type Snapshot,
} from "@/lib/networth";

import { useTransactions } from "@/lib/money-api";
import { useGoals } from "@/lib/planner-api";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import { MarketEventsCard } from "@/components/events/market-events-card";
import { PushPermissionBanner } from "@/components/push/push-permission-banner";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · Wealth Ace" },
      {
        name: "description",
        content:
          "Your complete personal finance dashboard — net worth, cashflow, allocation and goals at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function fmt(n: number) {
  if (!Number.isFinite(n)) return "0";
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

const ALLOC_COLORS = ["#14d8cf", "#3b82f6", "#d9b800", "#ff8a3c", "#a855f7", "#00c896", "#ff4d4d", "#7c3aed"];

function Dashboard() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const assetsQ = useAssets();
  const liabilitiesQ = useLiabilities();
  const investmentsQ = useInvestments();
  const accountsQ = useAccounts();
  const txnsQ = useTransactions();
  const goalsQ = useGoals();
  const snapsQ = useSnapshots();
  const createSnap = useCreateSnapshot();

  const accounts = accountsQ.data ?? [];


  const assets = assetsQ.data ?? [];
  const liabilities = liabilitiesQ.data ?? [];
  const investments = investmentsQ.data ?? [];
  const txns = txnsQ.data ?? [];
  const goals = goalsQ.data ?? [];
  const snaps = snapsQ.data ?? [];

  const totals = useMemo(() => {
    // Net worth always comes from the shared calculator so the dashboard KPI,
    // the Net Worth page and snapshots can never disagree.
    const nw = computeNetWorth({ assets, investments, accounts, liabilities });

    // This month income / expense
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
    const thisMonth = txns.filter((t) => t.occurred_on >= monthStart);
    const lastMonth = txns.filter((t) => t.occurred_on >= lastMonthStart && t.occurred_on < monthStart);
    const income = thisMonth.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
    const expense = thisMonth.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
    const lastIncome = lastMonth.filter((t) => t.kind === "income").reduce((s, t) => s + t.amount, 0);
    const lastExpense = lastMonth.filter((t) => t.kind === "expense").reduce((s, t) => s + t.amount, 0);
    const savings = Math.max(income - expense, 0);
    const netCashFlow = income - expense;
    const lastSavings = Math.max(lastIncome - lastExpense, 0);
    const lastNetCashFlow = lastIncome - lastExpense;

    return {
      breakdown: nw,
      assetsTotal: nw.totalAssets,
      assetsOnlyTotal: nw.assetsTotal,
      investmentsTotal: nw.investmentsTotal,
      cashTotal: nw.cashTotal,
      liabilitiesTotal: nw.liabilitiesTotal,
      netWorth: nw.netWorth,
      savings,
      netCashFlow,
      lastSavings,
      lastNetCashFlow,
      income,
      expense,
      lastIncome,
      lastExpense,
    };
  }, [assets, liabilities, investments, accounts, txns]);



  // Allocation: canonical high-level asset classes (Equity / Debt / Commodity /
  // Real Estate / Crypto / Cash & Savings / Other) across all asset holdings.
  const allocation = useMemo(
    () =>
      allocData.slices.map((s) => ({
        name: s.category,
        value: s.currentValue,
        pct: s.percentage,
        color: s.color,
        holdings: s.holdings,
      })),
    [allocData.slices],
  );

  const netWorthSeries = useMemo(
    () => snaps.map((s, i) => ({ i, v: s.net_worth, label: s.snapshot_date })),
    [snaps],
  );
  const portfolioSeries = useMemo(
    () => snaps.map((s, i) => ({ i, v: s.investments_total, label: s.snapshot_date })),
    [snaps],
  );

  // Portfolio performance series derived from holdings — never depends on
  // net-worth snapshot history. Falls back to a synthesized series built
  // from invested vs. current value when there is no historical data.
  const portfolioPerformanceSeries = useMemo(() => {
    if (!investments.length) return [] as { i: number; v: number; label: string }[];
    if (portfolioSeries.length >= 2) return portfolioSeries;
    const totalInvested = investments.reduce(
      (s, i) => s + (i.invested_value ?? i.current_value ?? 0),
      0,
    );
    const totalCurrent = totals.investmentsTotal;
    const dates = investments.map((i) => i.purchase_date).filter(Boolean) as string[];
    const today = new Date().toISOString().slice(0, 10);
    const fallbackStart = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    let earliest = dates.length ? [...dates].sort()[0] : fallbackStart;
    if (earliest >= today) earliest = fallbackStart;
    return [
      { i: 0, v: totalInvested || totalCurrent, label: earliest },
      { i: 1, v: totalCurrent, label: today },
    ];
  }, [investments, portfolioSeries, totals.investmentsTotal]);

  // Net worth deltas from snapshot history
  const netDelta = useMemo(() => {
    const safe = (n: unknown) => (Number.isFinite(Number(n)) ? Number(n) : 0);
    if (snaps.length < 2) return { day: 0, dayPct: 0, month: 0, monthPct: 0, hasDay: false, hasMonth: false };
    const last = safe(snaps[snaps.length - 1]?.net_worth);
    const prev = safe(snaps[snaps.length - 2]?.net_worth);
    const monthAgoIso = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const monthRefSnap = [...snaps].reverse().find((s) => s.snapshot_date <= monthAgoIso);
    const hasMonth = !!monthRefSnap;
    const monthRef = safe(monthRefSnap?.net_worth ?? snaps[0]?.net_worth);
    const day = last - prev;
    const month = last - monthRef;
    const dayPct = prev !== 0 ? (day / Math.abs(prev)) * 100 : 0;
    const monthPct = monthRef !== 0 ? (month / Math.abs(monthRef)) * 100 : 0;
    return {
      day: Number.isFinite(day) ? day : 0,
      dayPct: Number.isFinite(dayPct) ? dayPct : 0,
      month: Number.isFinite(month) ? month : 0,
      monthPct: Number.isFinite(monthPct) ? monthPct : 0,
      hasDay: true,
      hasMonth,
    };
  }, [snaps]);

  // Financial score — live-calculated; null when insufficient data
  const score = useMemo(() => {
    const hasAssets = totals.assetsTotal > 0;
    const hasInvestments = investments.length > 0;
    const hasIncome = totals.income > 0;
    const monthTxnCount =
      (totals.income > 0 ? 1 : 0) + (totals.expense > 0 ? 1 : 0);
    const hasMonthActivity = monthTxnCount > 0;

    const allocScore = hasAssets
      ? Math.round(Math.min(totals.investmentsTotal / totals.assetsTotal / 0.5, 1) * 100)
      : null;
    const debtScore = hasAssets
      ? Math.round(Math.max(0, 1 - totals.liabilitiesTotal / totals.assetsTotal) * 100)
      : null;
    const savingsScore = hasIncome
      ? Math.round(Math.max(0, Math.min(((totals.income - totals.expense) / totals.income) / 0.3, 1)) * 100)
      : null;
    const cashScore = hasMonthActivity ? (totals.netCashFlow >= 0 ? 100 : 0) : null;
    const divScore = hasInvestments
      ? Math.round(Math.min(allocation.length / 4, 1) * 100)
      : null;

    const rows = [
      { k: "Asset Allocation", v: allocScore },
      { k: "Debt Management", v: debtScore },
      { k: "Savings Rate", v: savingsScore },
      { k: "Cash Flow", v: cashScore },
      { k: "Diversification", v: divScore },
    ];
    const available = rows.map((r) => r.v).filter((v): v is number => v !== null);
    const total = available.length > 0
      ? Math.round(available.reduce((s, v) => s + v, 0) / available.length)
      : null;
    return { total, rows, hasAny: available.length > 0 };
  }, [totals, allocation, investments]);

  const insights = useMemo(() => {
    const list: { icon: any; tint: string; title: string; body: string }[] = [];
    if (totals.lastExpense > 0) {
      const diff = totals.expense - totals.lastExpense;
      const pct = (Math.abs(diff) / totals.lastExpense) * 100;
      list.push({
        icon: BadgeIndianRupee,
        tint: diff <= 0 ? "#00c896" : "#ff8a3c",
        title: diff <= 0 ? `Expenses down ${pct.toFixed(1)}%` : `Expenses up ${pct.toFixed(1)}%`,
        body: `${diff <= 0 ? "Saved" : "Spent"} ₹${fmt(Math.abs(diff))} vs last month.`,
      });
    }
    if (totals.income > 0) {
      const rate = ((totals.income - totals.expense) / totals.income) * 100;
      list.push({
        icon: TrendingUp,
        tint: "#14d8cf",
        title: `Savings rate ${rate.toFixed(0)}%`,
        body: rate >= 20 ? "Strong saver — keep it up." : "Aim for at least 20% to build resilience.",
      });
    }
    const activeSip = investments.find((i) => i.is_sip && i.sip_active && i.sip_next_date);
    if (activeSip?.sip_next_date) {
      list.push({
        icon: Calendar,
        tint: "#3b82f6",
        title: `SIP of ₹${fmt(activeSip.sip_amount ?? 0)} due`,
        body: `${activeSip.name} · ${new Date(activeSip.sip_next_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`,
      });
    }
    const emergency = goals.find((g) => g.goal_type === "emergency_fund");
    if (emergency) {
      const pct = emergency.target_amount > 0 ? (emergency.saved_amount / emergency.target_amount) * 100 : 0;
      list.push({
        icon: Sparkles,
        tint: "#a855f7",
        title: `Emergency fund at ${pct.toFixed(0)}%`,
        body: pct >= 100 ? "Fully funded — well done!" : "Keep saving toward the target.",
      });
    }
    return list.slice(0, 4);
  }, [totals, investments, goals]);

  const [isRefreshingInsights, setIsRefreshingInsights] = useState(false);
  const qcRef = useQueryClient();
  const onRefreshInsights = async () => {
    setIsRefreshingInsights(true);
    try {
      await Promise.all([
        qcRef.invalidateQueries({ queryKey: ["assets"] }),
        qcRef.invalidateQueries({ queryKey: ["liabilities"] }),
        qcRef.invalidateQueries({ queryKey: ["investments"] }),
        qcRef.invalidateQueries({ queryKey: ["transactions"] }),
        qcRef.invalidateQueries({ queryKey: ["goals"] }),
      ]);
      toast.success("Insights refreshed");
    } finally {
      setIsRefreshingInsights(false);
    }
  };

  // Upcoming reminders — SIPs due soon, goal deadlines, and liabilities.
  const reminders = useMemo(() => {
    const list: { icon: any; tint: string; title: string; body: string }[] = [];
    const upcomingSips = investments
      .filter((i) => i.is_sip && i.sip_active && i.sip_next_date)
      .sort((a, b) => (a.sip_next_date! < b.sip_next_date! ? -1 : 1));
    for (const sip of upcomingSips.slice(0, 2)) {
      list.push({
        icon: Calendar,
        tint: "#3b82f6",
        title: `SIP of ₹${fmt(sip.sip_amount ?? 0)} due`,
        body: `${sip.name} · ${new Date(sip.sip_next_date!).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`,
      });
    }
    const upcomingGoals = goals
      .filter((g) => g.target_date)
      .sort((a, b) => (a.target_date! < b.target_date! ? -1 : 1));
    for (const g of upcomingGoals.slice(0, 2)) {
      list.push({
        icon: Target,
        tint: "#a855f7",
        title: `${g.name} target approaching`,
        body: `Due ${new Date(g.target_date!).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}.`,
      });
    }
    if (liabilities.length > 0) {
      list.push({
        icon: Banknote,
        tint: "#ff4d4d",
        title: `${liabilities.length} active liabilit${liabilities.length === 1 ? "y" : "ies"}`,
        body: "Review upcoming EMI payments in Wealth.",
      });
    }
    return list.slice(0, 4);
  }, [investments, goals, liabilities]);

  const onSnapshot = () => {
    createSnap.mutate({
      net_worth: totals.netWorth,
      assets_total: totals.assetsTotal,
      liabilities_total: totals.liabilitiesTotal,
      investments_total: totals.investmentsTotal,
      savings_total: totals.savings,
    });
  };

  const loading = assetsQ.isLoading || liabilitiesQ.isLoading || investmentsQ.isLoading;
  const [portfolioRange, setPortfolioRange] = useState<ChartRangeValue>(() =>
    defaultChartRange("1M"),
  );

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-12 gap-4">
        {/* Hero — Net Worth */}
        <Card className="col-span-12 p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <CardHeader title="Net Worth" tip="Total of assets minus liabilities across all your accounts." />
              <div className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
                {loading ? "—" : `₹ ${fmt(totals.netWorth)}`}
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                {snaps.length >= 2 ? (
                  <>
                    <DeltaPill amount={netDelta.day} pct={netDelta.dayPct} label="Since last snapshot" hasData={netDelta.hasDay} />
                    <DeltaPill amount={netDelta.month} pct={netDelta.monthPct} label="Last 30 days" hasData={netDelta.hasMonth} />
                  </>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    Take snapshots to track changes over time.
                  </span>
                )}
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button
                  onClick={onSnapshot}
                  disabled={createSnap.isPending || loading}
                  className="inline-flex items-center gap-2 rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-mint-foreground transition hover:bg-[var(--primary-hover)] disabled:opacity-60"
                >
                  <Camera className="h-4 w-4" /> {createSnap.isPending ? "Saving…" : "Snapshot"}
                </button>
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
                >
                  <History className="h-4 w-4" /> History
                </button>
              </div>
            </div>
            <div className="min-h-[220px]">
              {netWorthSeries.length >= 2 ? (
                <RangeChart data={netWorthSeries} height={220} />
              ) : (
                <EmptyChart height={220} message="Take your first snapshot to start tracking history." />
              )}
            </div>
          </div>
        </Card>

        {/* Financial Snapshot — full width 5 cards */}
        <div className="col-span-12">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Financial Snapshot</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <LiveSnap label="Assets" value={totals.assetsTotal} snaps={snaps} field="assets_total" icon={Wallet} accent="#14d8cf" />
            <LiveSnap label="Liabilities" value={totals.liabilitiesTotal} snaps={snaps} field="liabilities_total" icon={Banknote} accent="#ff4d4d" goodIsDown />
            <LiveSnap label="Investments" value={totals.investmentsTotal} snaps={snaps} field="investments_total" icon={TrendingUp} accent="#00c896" />
            {(() => {
              // Net Income = Gross - Taxes. Transactions represent net cashflow.
              const savingsRate = totals.income > 0 ? ((totals.income - totals.expense) / totals.income) * 100 : 0;
              const lastSavingsRate = totals.lastIncome > 0 ? ((totals.lastIncome - totals.lastExpense) / totals.lastIncome) * 100 : 0;
              const rateDelta = savingsRate - lastSavingsRate;
              const hasRateHistory = totals.lastIncome > 0;
              const debtRatio = totals.assetsTotal > 0 ? (totals.liabilitiesTotal / totals.assetsTotal) * 100 : 0;
              const debtSeries = snaps.map((s, i) => {
                const a = Number(s.assets_total) || 0;
                const l = Number(s.liabilities_total) || 0;
                return { i, v: a > 0 ? (l / a) * 100 : 0 };
              });
              const hasDebtHistory = debtSeries.length >= 2;
              const lastDebt = hasDebtHistory ? debtSeries[debtSeries.length - 2].v : 0;
              const debtDelta = hasDebtHistory ? debtRatio - lastDebt : 0;
              // Health-zone accents
              const savingsAccent =
                savingsRate > 50 ? "#06b6d4"       // FIRE-track (cyan)
                : savingsRate >= 30 ? "#00c896"     // Healthy (green)
                : savingsRate >= 20 ? "#d9b800"     // Average (yellow)
                : "#ff4d4d";                        // Low (red)
              const debtAccent =
                debtRatio < 30 ? "#00c896"          // Ideal (green)
                : debtRatio <= 50 ? "#d9b800"       // Acceptable (yellow)
                : "#ff4d4d";                        // High Risk (red)
              return (
                <>
                  <SnapCard
                    label="Savings Rate"
                    value={`${savingsRate.toFixed(1)}%`}
                    delta={hasRateHistory ? `${rateDelta >= 0 ? "+" : ""}${rateDelta.toFixed(1)} pts vs prev` : "No history yet"}
                    up={rateDelta >= 0}
                    neutral={Math.abs(rateDelta) < 0.05}
                    icon={Percent}
                    accent={savingsAccent}
                    series={hasRateHistory ? [{ i: 0, v: lastSavingsRate }, { i: 1, v: savingsRate }] : []}
                    muted={!hasRateHistory}
                    tip="Savings Rate = ((Net Income − Expenses) ÷ Net Income) × 100. Target 30%+ for financial security. 50%+ = FIRE track."
                  />
                  <SnapCard
                    label="Debt Ratio"
                    value={`${debtRatio.toFixed(1)}%`}
                    delta={hasDebtHistory ? `${debtDelta >= 0 ? "+" : ""}${debtDelta.toFixed(1)} pts vs prev` : "No history yet"}
                    up={debtDelta <= 0}
                    neutral={Math.abs(debtDelta) < 0.05}
                    icon={Scale}
                    accent={debtAccent}
                    series={debtSeries.length ? debtSeries : [{ i: 0, v: debtRatio }, { i: 1, v: debtRatio }]}
                    muted={!hasDebtHistory}
                    tip="Debt Ratio = (Total Liabilities ÷ Total Assets) × 100. Ideal: < 30%. Acceptable: 30–50%. High Risk: > 50%."
                  />
                </>
              );
            })()}
          </div>
        </div>

        {/* Asset Allocation + Portfolio Performance */}
        <Card className="col-span-12 flex h-auto flex-col p-5 lg:col-span-6 lg:h-[300px]">
          <CardHeader title="Asset Allocation" tip="Breakdown of your investments by asset class." />
          {allocation.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="No investments yet"
              body="Add investments in Wealth to see your allocation breakdown."
            />
          ) : (
            <div className="mt-3 flex flex-1 flex-col overflow-hidden">
              <div className="grid flex-1 grid-cols-1 items-center gap-3 overflow-hidden sm:grid-cols-[130px_1fr]">
                <div className="relative mx-auto h-[130px] w-[130px] shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={allocation} dataKey="value" innerRadius={42} outerRadius={62} paddingAngle={2} stroke="none">
                        {allocation.map((a) => (
                          <Cell key={a.name} fill={a.color} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="text-center">
                      <div className="text-[10px] text-muted-foreground">Total</div>
                      <div className="font-display text-xs font-bold text-foreground">₹{fmt(totals.investmentsTotal)}</div>
                    </div>
                  </div>
                </div>
                <div className="space-y-1.5 overflow-y-auto text-sm">
                  {allocation.map((a) => (
                    <div key={a.name} className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 truncate text-xs text-muted-foreground">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                        <span className="truncate">{a.name}</span>
                      </span>
                      <span className="shrink-0 text-xs font-semibold text-foreground">{a.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2 shrink-0 text-right">
                <Link to="/wealth" className="inline-flex items-center gap-1 text-xs font-semibold text-mint">
                  View Details <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          )}
        </Card>

        <Card className="col-span-12 flex h-auto flex-col p-5 lg:col-span-6 lg:h-[300px]">
          <div className="flex items-start justify-between gap-3">
            <CardHeader title="Portfolio Performance" tip="Investment portfolio value over time, derived from your holdings." />
            <ChartRangeSelector value={portfolioRange} onChange={setPortfolioRange} />
          </div>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Current Value</div>
              <div className="mt-1 font-display text-xl font-bold text-foreground">
                ₹ {fmt(totals.investmentsTotal)}
              </div>
              {portfolioPerformanceSeries.length >= 2 ? (
                <PortfolioDelta series={portfolioPerformanceSeries} />
              ) : (
                <div className="mt-1 text-xs text-muted-foreground">No holdings yet</div>
              )}
            </div>
          </div>
          <div className="mt-2 min-h-0 flex-1">
            {portfolioPerformanceSeries.length >= 2 ? (
              <RangeChart
                data={portfolioPerformanceSeries}
                height={120}
                compact
                range={portfolioRange}
                onRangeChange={setPortfolioRange}
              />
            ) : (
              <EmptyChart height={120} message="Add investments to see portfolio performance." />
            )}
          </div>
          <div className="mt-2 shrink-0 text-right">
            <Link to="/wealth" className="inline-flex items-center gap-1 text-xs font-semibold text-mint">
              View Portfolio <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Financial Score + Goal Progress */}
        <Card className="col-span-12 flex h-auto flex-col p-5 lg:col-span-6 lg:h-[300px]">
          <CardHeader title="Financial Score" tip="Composite score of your overall financial health." />
          <div className="mt-2 flex flex-1 flex-col items-center gap-2 overflow-hidden sm:flex-row sm:items-center">
            <div className="w-full shrink-0 sm:w-[42%]">
              <ScoreGauge score={score.total} size="xs" />
            </div>
            <div className="w-full flex-1 space-y-1.5 overflow-y-auto text-sm">
              {score.rows.map((row) => (
                <div key={row.k} className="flex items-center gap-2 sm:gap-3">
                  <span className="w-20 shrink-0 truncate text-[10px] text-muted-foreground sm:w-28 sm:text-[11px]">{row.k}</span>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    {row.v !== null && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-mint"
                        style={{ width: `${row.v}%` }}
                      />
                    )}
                  </div>
                  <span className="w-7 shrink-0 text-right text-[10px] font-semibold text-foreground sm:text-[11px]">
                    {row.v === null ? "—" : row.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {!score.hasAny && (
            <p className="mt-2 shrink-0 text-center text-[11px] text-muted-foreground">
              Add more financial data to calculate your Financial Score.
            </p>
          )}
        </Card>

        <Card className="col-span-12 flex h-auto flex-col p-5 lg:col-span-6 lg:h-[300px]">
          <div className="flex items-center justify-between">
            <CardHeader title="Goal Progress" tip="Progress toward your active financial goals." />
            <Link to="/planner" className="inline-flex items-center gap-1 text-xs font-semibold text-mint">
              View All Goals <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {goals.length === 0 ? (
            <EmptyState className="mt-4" title="No goals yet" body="Create goals in Planner to track progress here." />
          ) : (
            <div className="mt-3 flex-1 space-y-2.5 overflow-y-auto">
              {goals.slice(0, 3).map((g, idx) => {
                const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100)) : 0;
                const color = ALLOC_COLORS[idx % ALLOC_COLORS.length];
                return (
                  <div key={g.id}>
                    <div className="flex items-center justify-between gap-2 text-xs">
                      <span className="truncate font-medium text-foreground">{g.name}</span>
                      <span className="shrink-0 tabular-nums font-semibold" style={{ color }}>
                        {pct}%
                      </span>
                    </div>
                    {/* target = full track, achieved = coloured line */}
                    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: color }}
                      />
                    </div>
                    <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                      <span className="tabular-nums">
                        ₹{fmt(g.saved_amount)} / ₹{fmt(g.target_amount)}
                      </span>
                      <span>
                        Target:{" "}
                        {g.target_date
                          ? new Date(g.target_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" })
                          : "—"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>


        {/* Push opt-in + Global Market Events */}
        <div className="col-span-12 space-y-4">
          <PushPermissionBanner />
          <MarketEventsCard />
        </div>

        {/* Upcoming Reminders + Financial Insights */}
        <div className="col-span-12 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="p-6">
            <CardHeader title="Upcoming Reminders" tip="SIPs, EMIs and goal deadlines coming up soon." />
            {reminders.length === 0 ? (
              <EmptyState className="mt-4" title="No upcoming reminders" body="SIPs, EMIs and goal deadlines will show up here." />
            ) : (
              <div className="mt-4 space-y-3">
                {reminders.map((r, idx) => (
                  <div key={idx} className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3.5">
                    <span
                      className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                      style={{ background: `${r.tint}1f`, color: r.tint }}
                    >
                      <r.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-foreground">{r.title}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{r.body}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <CardHeader title="Financial Insights" tip="Smart, personalized observations about your finances." />
              <button
                type="button"
                onClick={onRefreshInsights}
                disabled={isRefreshingInsights}
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface/60 px-2.5 py-1 text-xs font-semibold text-foreground transition hover:bg-surface disabled:opacity-60"
              >
                <RefreshCw className={cn("h-3.5 w-3.5", isRefreshingInsights && "animate-spin")} /> Refresh
              </button>
            </div>
            {insights.length === 0 ? (
              <EmptyState className="mt-4" title="No insights yet" body="Add transactions and goals to see personalized insights." />
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-3">
                {insights.map((it, idx) => (
                  <Insight key={idx} icon={it.icon} tint={it.tint} title={it.title} body={it.body} />
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <SnapshotHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </TooltipProvider>
  );
}

function DeltaPill({ amount, pct, label, hasData = true }: { amount: number; pct: number; label: string; hasData?: boolean }) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const safePct = Number.isFinite(pct) ? pct : 0;
  if (!hasData) {
    return (
      <span className="inline-flex items-center gap-1.5 font-semibold text-muted-foreground">
        — <span className="text-muted-foreground font-normal">{label}</span>
      </span>
    );
  }
  const up = safeAmount >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold", up ? "text-success" : "text-danger")}>
      <Icon className="h-3.5 w-3.5" /> ₹{fmt(Math.abs(safeAmount))} ({safePct >= 0 ? "+" : ""}{safePct.toFixed(2)}%)
      <span className="text-muted-foreground font-normal"> {label}</span>
    </span>
  );
}

function PortfolioDelta({ series }: { series: { v: number }[] }) {
  const last = series[series.length - 1]?.v ?? 0;
  const first = series[0]?.v ?? 0;
  const diff = last - first;
  const pct = first ? (diff / Math.abs(first)) * 100 : 0;
  const up = diff >= 0;
  return (
    <div className={cn("mt-1 text-xs font-semibold", up ? "text-success" : "text-danger")}>
      {up ? "▲" : "▼"} ₹{fmt(Math.abs(diff))} ({pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)
    </div>
  );
}

function EmptyChart({ height, message }: { height: number; message: string }) {
  return (
    <div
      className="flex w-full items-center justify-center rounded-xl border border-dashed border-border text-xs text-muted-foreground"
      style={{ height }}
    >
      {message}
    </div>
  );
}

function EmptyState({ title, body, className }: { title: string; body: string; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-dashed border-border p-6 text-center", className)}>
      <div className="text-sm font-semibold text-foreground">{title}</div>
      <div className="mt-1 text-xs text-muted-foreground">{body}</div>
    </div>
  );
}

function LiveSnap({
  label, value, snaps, field, icon, accent, goodIsDown, tip, delta, deltaBase, series,
}: {
  label: string;
  value: number;
  snaps?: Snapshot[];
  field?: "assets_total" | "liabilities_total" | "investments_total" | "savings_total";
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  goodIsDown?: boolean;
  tip?: string;
  delta?: number;
  deltaBase?: number;
  series?: { i: number; v: number }[];
}) {
  let computedDelta = delta ?? 0;
  let computedBase = deltaBase ?? 0;
  let computedSeries = series ?? [];
  if (snaps && field) {
    computedSeries = snaps.map((s, i) => ({ i, v: Number(s[field]) }));
    if (snaps.length >= 2) {
      const last = Number(snaps[snaps.length - 1][field]);
      const prev = Number(snaps[snaps.length - 2][field]);
      computedDelta = last - prev;
      computedBase = Math.abs(prev);
    }
  }
  const hasHistory = computedSeries.length >= 2;
  const pct = computedBase > 0 ? (computedDelta / computedBase) * 100 : 0;
  const isUpVisual = computedDelta >= 0;
  const isGood = goodIsDown ? !isUpVisual : isUpVisual;
  const isFlat = Math.abs(pct) < 0.005;
  return (
    <SnapCard
      label={label}
      value={`₹ ${fmt(value)}`}
      delta={hasHistory ? (isFlat ? "No change vs prev" : `${isUpVisual ? "+" : ""}${pct.toFixed(2)}% vs prev`) : "No history yet"}
      up={isGood}
      neutral={isFlat}
      icon={icon}
      accent={accent}
      series={computedSeries.length ? computedSeries : [{ i: 0, v: value }, { i: 1, v: value }]}
      tip={tip}
      muted={!hasHistory}
    />
  );
}


/* ---------- Building blocks ---------- */

function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-card shadow-[var(--shadow-sm)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

function CardHeader({ title, tip }: { title: string; tip?: string }) {
  return (
    <h3 className="inline-flex items-center gap-1.5 text-sm font-semibold text-foreground">
      {title}
      {tip && (
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label={`About ${title}`} className="text-muted-foreground hover:text-foreground">
              <Info className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-xs border-border bg-popover text-popover-foreground">
            {tip}
          </TooltipContent>
        </Tooltip>
      )}
    </h3>
  );
}

function RangeChart({
  data,
  height,
  compact,
  range: rangeProp,
  onRangeChange,
}: {
  data: { i: number; v: number; label?: string }[];
  height: number;
  compact?: boolean;
  /** When provided, the period dropdown is controlled/rendered by the parent. */
  range?: ChartRangeValue;
  onRangeChange?: (v: ChartRangeValue) => void;
}) {
  const [localRange, setLocalRange] = useState<ChartRangeValue>(() => defaultChartRange("1M"));
  const range = rangeProp ?? localRange;
  const setRange = onRangeChange ?? setLocalRange;
  const id = `g-${Math.random().toString(36).slice(2, 8)}`;
  const labels = useMemo(() => data.map((s) => s.label ?? null), [data]);
  const series = useMemo(
    () => {
      const byDay = new Map<number, { i: number; v: number; label?: string; t: number }>();
      for (const point of filterSeriesByRange(data, range)) {
        const t = dateToAxisTime(point.label);
        if (t == null) continue;
        byDay.set(t, { ...point, t });
      }
      return Array.from(byDay.values()).sort((a, b) => a.t - b.t);
    },
    [data, range],
  );
  const ticks = useMemo(
    () => computeTimeAxisTicks(range, labels),
    [range, labels],
  );
  const domain = useMemo(
    () => getPaddedTimeAxisDomain(range, labels),
    [range, labels],
  );
  return (
    <div className="flex h-full flex-col">
      {rangeProp ? null : (
        <div className="mb-2 flex justify-end">
          <ChartRangeSelector value={range} onChange={setRange} />
        </div>
      )}
      <div style={{ height: compact ? height : height }} className="flex-1">
        {series.length === 0 ? (
          <div className="grid h-full place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
            No data available for this range
          </div>
        ) : (
        <ResponsiveContainer>
          <AreaChart data={series} margin={{ top: 8, right: 12, left: 4, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14d8cf" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#14d8cf" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="t"
              type="number"
              scale="time"
              domain={domain}
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickFormatter={(value: number) => formatAxisTick(value, range)}
              padding={timeXAxisPadding}
              {...smartXAxisProps}
              ticks={ticks.length ? ticks : undefined}
              interval={ticks.length ? 0 : smartXAxisProps.interval}
            />
            <YAxis
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              width={40}
              tickFormatter={(v) => `₹${Math.round(v / 100000)}L`}
              domain={["dataMin - 50000", "dataMax + 50000"]}
            />
            <RTooltip
              cursor={{ stroke: "var(--primary)", strokeOpacity: 0.3 }}
              contentStyle={{
                background: "var(--popover)",
                border: "1px solid var(--border)",
                borderRadius: 8,
                fontSize: 12,
                color: "var(--popover-foreground)",
              }}
              labelStyle={{ color: "var(--muted-foreground)" }}
              formatter={(v: number) => [`₹${fmt(v)}`, "Value"]}
              labelFormatter={(label: string) =>
                label ? new Date(label).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : ""
              }
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke="var(--primary)"
              strokeWidth={2}
              fill={`url(#${id})`}
              activeDot={{ r: 4, fill: "var(--primary)", stroke: "var(--card)", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function SnapCard({
  label,
  value,
  delta,
  up,
  icon: Icon,
  accent,
  series,
  tip,
  muted,
  neutral,
}: {
  label: string;
  value: string;
  delta: string;
  up: boolean;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  series: { i: number; v: number }[];
  tip?: string;
  muted?: boolean;
  neutral?: boolean;
}) {
  // Sparkline polarity — `up` already encodes "is this movement good?"
  // (LiveSnap flips it for inverse metrics like Liabilities / Debt Ratio).
  const hasHistory = !muted && series.length >= 2;
  const first = hasHistory ? series[0].v : 0;
  const last = hasHistory ? series[series.length - 1].v : 0;
  const flat = hasHistory && Math.abs(last - first) < 1e-6;
  const polarity: boolean | null = !hasHistory || flat || neutral ? null : up;
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-1">
        <div className="inline-flex min-w-0 items-center gap-1.5 text-[11px] font-semibold text-muted-foreground sm:text-xs">
          <span
            className="grid h-6 w-6 shrink-0 place-items-center rounded-lg sm:h-7 sm:w-7"
            style={{ background: `${accent}1f`, color: accent }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          <span className="truncate">{label}</span>
        </div>
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={`About ${label}`} className="shrink-0 text-muted-foreground hover:text-foreground">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs border-border bg-popover text-popover-foreground">
              {tip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="mt-2 truncate font-display text-base font-bold tabular-nums tracking-tight text-foreground sm:text-xl">
        {value}
      </div>
      <div
        className={cn(
          "mt-0.5 flex items-center gap-1 truncate text-[10px] font-semibold sm:text-[11px]",
          polarity === null ? "text-muted-foreground" : up ? "text-success" : "text-danger",
        )}
      >
        {polarity === null ? (
          <Minus className="h-3 w-3 shrink-0" />
        ) : up ? (
          <ArrowUp className="h-3 w-3 shrink-0" />
        ) : (
          <ArrowDown className="h-3 w-3 shrink-0" />
        )}
        <span className="truncate">{delta}</span>
      </div>
    </div>
  );
}


function ScoreGauge({ score, size = "md" }: { score: number | null; size?: "sm" | "md" | "xs" }) {
  const band =
    score === null
      ? { label: "Not Available", color: "var(--muted-foreground)", hint: "Add more financial data to calculate your Financial Score." }
      : score >= 90
        ? { label: "Excellent", color: "#00c896", hint: "Your finances are in excellent shape." }
        : score >= 75
          ? { label: "Very Good", color: "#14d8cf", hint: "You're managing your finances well." }
          : score >= 60
            ? { label: "Good", color: "#d9b800", hint: "You're on the right track. Keep it up!" }
            : score >= 40
              ? { label: "Fair", color: "#ff8a3c", hint: "There's room for improvement." }
              : { label: "Needs Improvement", color: "#ff4d4d", hint: "Consider improving your financial health." };

  // Gauge geometry — semi-circle inside a 200x120 viewBox, scales via width:100%.
  const cx = 100;
  const cy = 100;
  const R = 82;
  const SW = 14;
  // 5 color segments across 180°: red, orange, yellow, teal, green
  const segs = [
    { from: 0, to: 20, color: "#ff4d4d" },
    { from: 20, to: 40, color: "#ff8a3c" },
    { from: 40, to: 60, color: "#d9b800" },
    { from: 60, to: 80, color: "#14d8cf" },
    { from: 80, to: 100, color: "#00c896" },
  ];
  const pctToAngle = (p: number) => 180 + (p / 100) * 180; // 180°..360°
  const polar = (a: number, rad = R) => {
    const r = (a * Math.PI) / 180;
    return { x: cx + rad * Math.cos(r), y: cy + rad * Math.sin(r) };
  };
  const arcPath = (from: number, to: number) => {
    const a1 = pctToAngle(from);
    const a2 = pctToAngle(to);
    const p1 = polar(a1);
    const p2 = polar(a2);
    const large = a2 - a1 > 180 ? 1 : 0;
    return `M ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y}`;
  };

  const needleAngle = score === null ? null : pctToAngle(Math.max(0, Math.min(100, score)));
  const needleTip = needleAngle !== null ? polar(needleAngle, R - SW / 2 - 2) : null;
  const needleBase = needleAngle !== null ? polar(needleAngle, 14) : null;

  return (
    <div className={size === "xs" ? "w-full max-w-[160px]" : size === "sm" ? "w-full max-w-[220px]" : "w-full max-w-[320px]"}>
      <svg viewBox="0 0 200 120" className="block w-full" aria-hidden>
        {score === null ? (
          <path
            d={arcPath(0, 100)}
            stroke="var(--border)"
            strokeWidth={SW}
            strokeLinecap="round"
            fill="none"
            strokeDasharray="4 6"
          />
        ) : (
          segs.map((s) => (
            <path
              key={s.from}
              d={arcPath(s.from, s.to)}
              stroke={s.color}
              strokeWidth={SW}
              strokeLinecap="butt"
              fill="none"
              opacity={score >= s.from && score <= s.to ? 1 : 0.35}
            />
          ))
        )}
        {needleTip && needleBase && (
          <>
            <line
              x1={needleBase.x}
              y1={needleBase.y}
              x2={needleTip.x}
              y2={needleTip.y}
              stroke="var(--foreground)"
              strokeWidth={3.5}
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 2px rgba(0,0,0,0.5))" }}
            />
            <circle cx={needleTip.x} cy={needleTip.y} r={3.5} fill="var(--foreground)" />
            <circle cx={cx} cy={cy} r={6} fill="var(--foreground)" stroke="var(--card)" strokeWidth={2} />
          </>
        )}
      </svg>
      <div className="-mt-2 text-center">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          {score === null ? "" : "Your Score"}
        </div>
        <div className="font-display text-4xl font-bold leading-none text-foreground">
          {score === null ? "—" : score}
          <span className="ml-1 align-middle text-sm font-medium text-muted-foreground">/100</span>
        </div>
        <div className="mt-1 text-sm font-semibold" style={{ color: band.color }}>
          {band.label}
        </div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{band.hint}</div>
      </div>
    </div>
  );
}

function GoalCard({
  icon: Icon,
  color,
  name,
  pct,
  saved,
  target,
  eta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  name: string;
  pct: number;
  saved: string;
  target: string;
  eta: string;
}) {
  const r = 28;
  const c = 2 * Math.PI * r;
  return (
    <div className="rounded-xl border border-border bg-surface-2 p-4">
      <div className="flex items-center gap-3">
        <div className="relative grid h-[72px] w-[72px] place-items-center">
          <svg width={72} height={72} className="-rotate-90">
            <circle cx={36} cy={36} r={r} stroke="var(--border)" strokeWidth={6} fill="none" />
            <circle
              cx={36}
              cy={36}
              r={r}
              stroke={color}
              strokeWidth={6}
              fill="none"
              strokeLinecap="round"
              strokeDasharray={c}
              strokeDashoffset={c - (c * pct) / 100}
            />
          </svg>
          <span className="absolute" style={{ color }}>
            <Icon className="h-5 w-5" />
          </span>
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">{name}</div>
          <div className="text-xl font-bold text-foreground">{pct}%</div>
        </div>
      </div>
      <div className="mt-3 text-xs text-muted-foreground">
        {saved} / {target}
      </div>
      <div className="text-xs text-muted-foreground">Target: {eta}</div>
    </div>
  );
}

function Insight({
  icon: Icon,
  tint,
  title,
  body,
}: {
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  title: string;
  body: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3.5">
      <span
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
        style={{ background: `${tint}1f`, color: tint }}
      >
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold" style={{ color: tint }}>
          {title}
        </div>
        <div className="mt-0.5 text-xs text-muted-foreground">{body}</div>
      </div>
    </div>
  );
}