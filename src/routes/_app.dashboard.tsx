import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowUp,
  ArrowDown,
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
import { smartXAxisProps, formatAxisTick, filterSeriesByRange } from "@/lib/chart-axis";
import { useAssets, useLiabilities, useInvestments, inr as inrW } from "@/lib/wealth-api";
import { useTransactions } from "@/lib/money-api";
import { useGoals } from "@/lib/planner-api";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · FinVista" },
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
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

const ALLOC_COLORS = ["#14d8cf", "#3b82f6", "#d9b800", "#ff8a3c", "#a855f7", "#00c896", "#ff4d4d", "#7c3aed"];

type Snapshot = {
  id: string;
  snapshot_date: string;
  net_worth: number;
  assets_total: number;
  liabilities_total: number;
  investments_total: number;
  savings_total: number;
};

function useSnapshots() {
  return useQuery({
    queryKey: ["wealth", "snapshots"] as const,
    queryFn: async (): Promise<Snapshot[]> => {
      const { data, error } = await supabase
        .from("wealth_snapshots" as never)
        .select("*")
        .order("snapshot_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        id: r.id,
        snapshot_date: r.snapshot_date,
        net_worth: Number(r.net_worth ?? 0),
        assets_total: Number(r.assets_total ?? 0),
        liabilities_total: Number(r.liabilities_total ?? 0),
        investments_total: Number(r.investments_total ?? 0),
        savings_total: Number(r.savings_total ?? 0),
      }));
    },
  });
}

function useCreateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Omit<Snapshot, "id" | "snapshot_date"> & { snapshot_date?: string }) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("wealth_snapshots" as never).insert({
        user_id: u.user.id,
        snapshot_date: payload.snapshot_date ?? new Date().toISOString().slice(0, 10),
        net_worth: payload.net_worth,
        assets_total: payload.assets_total,
        liabilities_total: payload.liabilities_total,
        investments_total: payload.investments_total,
        savings_total: payload.savings_total,
      } as never);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Snapshot saved");
      qc.invalidateQueries({ queryKey: ["wealth", "snapshots"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save snapshot"),
  });
}

function Dashboard() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const assetsQ = useAssets();
  const liabilitiesQ = useLiabilities();
  const investmentsQ = useInvestments();
  const txnsQ = useTransactions();
  const goalsQ = useGoals();
  const snapsQ = useSnapshots();
  const createSnap = useCreateSnapshot();

  const assets = assetsQ.data ?? [];
  const liabilities = liabilitiesQ.data ?? [];
  const investments = investmentsQ.data ?? [];
  const txns = txnsQ.data ?? [];
  const goals = goalsQ.data ?? [];
  const snaps = snapsQ.data ?? [];

  const totals = useMemo(() => {
    const assetsTotal = assets.reduce((s, a) => s + (a.current_value || 0), 0);
    const investmentsTotal = investments.reduce((s, i) => s + (i.current_value ?? 0), 0);
    const liabilitiesTotal = liabilities.reduce((s, l) => s + (l.outstanding || 0), 0);
    const totalAssets = assetsTotal + investmentsTotal;
    const netWorth = totalAssets - liabilitiesTotal;

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
      assetsTotal: totalAssets,
      assetsOnlyTotal: assetsTotal,
      investmentsTotal,
      liabilitiesTotal,
      netWorth,
      savings,
      netCashFlow,
      lastSavings,
      lastNetCashFlow,
      income,
      expense,
      lastIncome,
      lastExpense,
    };
  }, [assets, liabilities, investments, txns]);

  // Allocation: group investments by category
  const allocation = useMemo(() => {
    if (!investments.length) return [] as { name: string; value: number; pct: number; color: string }[];
    const map = new Map<string, number>();
    for (const i of investments) {
      const v = i.current_value ?? 0;
      if (!v) continue;
      map.set(i.category, (map.get(i.category) ?? 0) + v);
    }
    const total = Array.from(map.values()).reduce((s, v) => s + v, 0);
    return Array.from(map.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], idx) => ({
        name,
        value,
        pct: total > 0 ? (value / total) * 100 : 0,
        color: ALLOC_COLORS[idx % ALLOC_COLORS.length],
      }));
  }, [investments]);

  const netWorthSeries = useMemo(
    () => snaps.map((s, i) => ({ i, v: s.net_worth, label: s.snapshot_date })),
    [snaps],
  );
  const portfolioSeries = useMemo(
    () => snaps.map((s, i) => ({ i, v: s.investments_total, label: s.snapshot_date })),
    [snaps],
  );

  // Net worth deltas from snapshot history
  const netDelta = useMemo(() => {
    if (snaps.length === 0) return { day: 0, dayPct: 0, month: 0, monthPct: 0 };
    const last = snaps[snaps.length - 1].net_worth;
    const prev = snaps[snaps.length - 2]?.net_worth ?? last;
    const monthAgoIso = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    const monthRef = [...snaps].reverse().find((s) => s.snapshot_date <= monthAgoIso)?.net_worth ?? snaps[0].net_worth;
    return {
      day: last - prev,
      dayPct: prev ? ((last - prev) / Math.abs(prev)) * 100 : 0,
      month: last - monthRef,
      monthPct: monthRef ? ((last - monthRef) / Math.abs(monthRef)) * 100 : 0,
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
                    <DeltaPill amount={netDelta.day} pct={netDelta.dayPct} label="Since last snapshot" />
                    <DeltaPill amount={netDelta.month} pct={netDelta.monthPct} label="Last 30 days" />
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
              return (
                <>
                  <SnapCard
                    label="Savings Rate"
                    value={`${savingsRate.toFixed(1)}%`}
                    delta={hasRateHistory ? `${rateDelta >= 0 ? "+" : ""}${rateDelta.toFixed(1)} pts vs last month` : "No history yet"}
                    up={rateDelta >= 0}
                    icon={Percent}
                    accent="#3b82f6"
                    series={[
                      { i: 0, v: lastSavingsRate },
                      { i: 1, v: savingsRate },
                    ]}
                    tip="Savings Rate = (Income − Expenses) ÷ Income × 100. Higher is better; aim for 20%+."
                  />
                  <SnapCard
                    label="Debt Ratio"
                    value={`${debtRatio.toFixed(1)}%`}
                    delta={hasDebtHistory ? `${debtDelta >= 0 ? "+" : ""}${debtDelta.toFixed(1)} pts vs last snapshot` : "No history yet"}
                    up={debtDelta <= 0}
                    icon={Scale}
                    accent="#a855f7"
                    series={debtSeries.length ? debtSeries : [{ i: 0, v: debtRatio }, { i: 1, v: debtRatio }]}
                    tip="Debt Ratio = Total Liabilities ÷ Total Assets × 100. Lower is better; under 40% is healthy."
                  />
                </>
              );
            })()}
          </div>
        </div>

        {/* Asset Allocation + Portfolio Performance */}
        <Card className="col-span-12 p-6 lg:col-span-6">
          <CardHeader title="Asset Allocation" tip="Breakdown of your investments by asset class." />
          {allocation.length === 0 ? (
            <EmptyState
              className="mt-4"
              title="No investments yet"
              body="Add investments in Wealth to see your allocation breakdown."
            />
          ) : (
            <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-[180px_1fr]">
              <div className="relative mx-auto h-[180px] w-[180px]">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={allocation} dataKey="value" innerRadius={58} outerRadius={86} paddingAngle={2} stroke="none">
                      {allocation.map((a) => (
                        <Cell key={a.name} fill={a.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-[11px] text-muted-foreground">Total</div>
                    <div className="font-display text-base font-bold text-foreground">₹{fmt(totals.investmentsTotal)}</div>
                  </div>
                </div>
              </div>
              <div className="space-y-2.5 text-sm">
                {allocation.map((a) => (
                  <div key={a.name} className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                      {a.name}
                    </span>
                    <span className="font-semibold text-foreground">{a.pct.toFixed(1)}%</span>
                  </div>
                ))}
                <div className="pt-2 text-right">
                  <Link to="/wealth" className="inline-flex items-center gap-1 text-xs font-semibold text-mint">
                    View Details <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="col-span-12 p-6 lg:col-span-6">
          <div className="flex items-start justify-between gap-3">
            <CardHeader title="Portfolio Performance" tip="Investment portfolio value over time." />
          </div>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Current Value</div>
              <div className="mt-1 font-display text-2xl font-bold text-foreground">
                ₹ {fmt(totals.investmentsTotal)}
              </div>
              {portfolioSeries.length >= 2 ? (
                <PortfolioDelta series={portfolioSeries} />
              ) : (
                <div className="mt-1 text-xs text-muted-foreground">No history yet</div>
              )}
            </div>
          </div>
          <div className="mt-3 h-[180px]">
            {portfolioSeries.length >= 2 ? (
              <RangeChart data={portfolioSeries} height={180} compact />
            ) : (
              <EmptyChart height={180} message="No portfolio snapshots yet." />
            )}
          </div>
          <div className="mt-2 text-right">
            <Link to="/wealth" className="inline-flex items-center gap-1 text-xs font-semibold text-mint">
              View Portfolio <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
        </Card>

        {/* Financial Score + Goal Progress */}
        <Card className="col-span-12 p-6 lg:col-span-6">
          <CardHeader title="Financial Score" tip="Composite score of your overall financial health." />
          <div className="mt-4 flex flex-col items-center gap-6">
            <ScoreGauge score={score.total} />
            <div className="w-full space-y-2.5 text-sm">
              {score.rows.map((row) => (
                <div key={row.k} className="flex items-center gap-2 sm:gap-3">
                  <span className="w-24 shrink-0 truncate text-xs text-muted-foreground sm:w-32 sm:text-sm">{row.k}</span>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    {row.v !== null && (
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-mint"
                        style={{ width: `${row.v}%` }}
                      />
                    )}
                  </div>
                  <span className="w-8 shrink-0 text-right text-xs font-semibold text-foreground sm:text-sm">
                    {row.v === null ? "—" : row.v}
                  </span>
                </div>
              ))}
            </div>
          </div>
          {!score.hasAny && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Add more financial data to calculate your Financial Score.
            </p>
          )}
        </Card>

        <Card className="col-span-12 p-6 lg:col-span-6">
          <div className="flex items-center justify-between">
            <CardHeader title="Goal Progress" tip="Progress toward your active financial goals." />
            <Link to="/planner" className="inline-flex items-center gap-1 text-xs font-semibold text-mint">
              View All Goals <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {goals.length === 0 ? (
            <EmptyState className="mt-4" title="No goals yet" body="Create goals in Planner to track progress here." />
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              {goals.slice(0, 3).map((g, idx) => {
                const pct = g.target_amount > 0 ? Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100)) : 0;
                const color = ALLOC_COLORS[idx % ALLOC_COLORS.length];
                return (
                  <GoalCard
                    key={g.id}
                    icon={Target}
                    color={color}
                    name={g.name}
                    pct={pct}
                    saved={`₹${fmt(g.saved_amount)}`}
                    target={`₹${fmt(g.target_amount)}`}
                    eta={g.target_date ? new Date(g.target_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}
                  />
                );
              })}
            </div>
          )}
        </Card>

        {/* Financial Insights — full width */}
        <Card className="col-span-12 p-6">
          <div className="flex items-center justify-between">
            <CardHeader title="Financial Insights" tip="Smart, personalized observations about your finances." />
          </div>
          {insights.length === 0 ? (
            <EmptyState className="mt-4" title="No insights yet" body="Add transactions and goals to see personalized insights." />
          ) : (
            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
              {insights.map((it, idx) => (
                <Insight key={idx} icon={it.icon} tint={it.tint} title={it.title} body={it.body} />
              ))}
            </div>
          )}
        </Card>
      </div>

      <SnapshotHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </TooltipProvider>
  );
}

function DeltaPill({ amount, pct, label }: { amount: number; pct: number; label: string }) {
  const up = amount >= 0;
  const Icon = up ? ArrowUp : ArrowDown;
  return (
    <span className={cn("inline-flex items-center gap-1.5 font-semibold", up ? "text-success" : "text-danger")}>
      <Icon className="h-3.5 w-3.5" /> ₹{fmt(Math.abs(amount))} ({pct >= 0 ? "+" : ""}{pct.toFixed(2)}%)
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
  return (
    <SnapCard
      label={label}
      value={`₹ ${fmt(value)}`}
      delta={hasHistory ? `${isUpVisual ? "+" : ""}${pct.toFixed(2)}% vs last snapshot` : "No history yet"}
      up={isGood}
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
}: {
  data: { i: number; v: number; label?: string }[];
  height: number;
  compact?: boolean;
}) {
  const [range, setRange] = useState<ChartRangeValue>(() => defaultChartRange("1M"));
  const id = `g-${Math.random().toString(36).slice(2, 8)}`;
  const filtered = useMemo(() => filterSeriesByRange(data, range), [data, range]);
  const series = filtered.length > 0 ? filtered : data;
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex justify-end">
        <ChartRangeSelector value={range} onChange={setRange} />
      </div>
      <div style={{ height: compact ? height : height }} className="flex-1">
        <ResponsiveContainer>
          <AreaChart data={series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14d8cf" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#14d8cf" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="label"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
              tickFormatter={(label: string) => formatAxisTick(label, range)}
              {...smartXAxisProps}
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
              labelFormatter={() => ""}
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
}) {
  const id = `s-${label.replace(/\s/g, "")}`;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start justify-between">
        <div className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <span
            className="grid h-7 w-7 place-items-center rounded-lg"
            style={{ background: `${accent}1f`, color: accent }}
          >
            <Icon className="h-3.5 w-3.5" />
          </span>
          {label}
        </div>
        {tip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" aria-label={`About ${label}`} className="text-muted-foreground hover:text-foreground">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="max-w-xs border-border bg-popover text-popover-foreground">
              {tip}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
      <div className="mt-3 font-display text-xl font-bold tracking-tight text-foreground">
        {value}
      </div>
      <div className={cn("mt-1 inline-flex items-center gap-1 text-[11px] font-semibold", up ? "text-success" : "text-danger")}>
        {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {delta}
      </div>
      <div className="mt-2 h-10">
        <ResponsiveContainer>
          <AreaChart data={series} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accent} stopOpacity={0.4} />
                <stop offset="100%" stopColor={accent} stopOpacity={0} />
              </linearGradient>
            </defs>
            <Area type="monotone" dataKey="v" stroke={accent} strokeWidth={1.5} fill={`url(#${id})`} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function ScoreGauge({ score }: { score: number | null }) {
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
  const needleTip = needleAngle !== null ? polar(needleAngle, R + 6) : null;
  const needleBase = needleAngle !== null ? polar(needleAngle, R - SW / 2 - 4) : null;

  return (
    <div className="w-full max-w-[320px]">
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
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx={cx} cy={cy} r={4} fill="var(--foreground)" />
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