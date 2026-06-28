import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  ArrowUpRight,
  ArrowDownRight,
  Camera,
  History,
  Info,
  Wallet,
  Banknote,
  TrendingUp,
  PiggyBank,
  ArrowLeftRight,
  ArrowRight,
  Car,
  Sparkles,
  Calendar,
  ChevronDown,
  ShoppingBag,
  Utensils,
  Fuel,
  Briefcase,
  Target,
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
  CartesianGrid,
} from "recharts";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { SnapshotHistoryDialog } from "@/components/snapshot-history-dialog";
import { DashboardHeader } from "@/components/dashboard-header";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · FinTrack" },
      {
        name: "description",
        content:
          "Your complete personal finance dashboard — net worth, cashflow, allocation and goals at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

const NET_TREND = [
  { m: "Jan", v: 58.2 },
  { m: "Feb", v: 60.5 },
  { m: "Mar", v: 63.1 },
  { m: "Apr", v: 65.8 },
  { m: "May", v: 69.4 },
  { m: "Jun", v: 73.1 },
];

const ALLOCATION = [
  { name: "Stocks", pct: 38.2, amt: "₹27,94,430", color: "#21DBD2" },
  { name: "Mutual Funds", pct: 22.5, amt: "₹16,45,230", color: "#3B82F6" },
  { name: "Real Estate", pct: 18.1, amt: "₹13,23,000", color: "#8B5CF6" },
  { name: "Gold", pct: 10.7, amt: "₹7,82,800", color: "#F59E0B" },
  { name: "Cash & Bank", pct: 6.0, amt: "₹4,38,900", color: "#10B981" },
  { name: "Other", pct: 4.5, amt: "₹3,28,490", color: "#F97316" },
];

const REMINDERS = [
  { name: "LIC Premium Payment", date: "30 Jun 2026", amount: "₹12,650" },
  { name: "SIP — Parag Parikh Flexi Cap", date: "01 Jul 2026", amount: "₹10,000" },
  { name: "Credit Card Payment", date: "05 Jul 2026", amount: "₹8,750" },
];

const GOALS = [
  { icon: Car, color: "#21DBD2", name: "Buy New Car", saved: "₹4,50,000", target: "₹8,00,000", pct: 56 },
  { icon: PiggyBank, color: "#8B5CF6", name: "Retirement Corpus", saved: "₹12,50,000", target: "₹25,00,000", pct: 50 },
  { icon: Target, color: "#F59E0B", name: "Emergency Fund", saved: "₹2,80,000", target: "₹4,00,000", pct: 70 },
];

const SCORE_FACTORS = [
  { k: "Asset Allocation", v: 82, c: "#21DBD2" },
  { k: "Debt Management", v: 68, c: "#3B82F6" },
  { k: "Savings Rate", v: 74, c: "#10B981" },
  { k: "Diversification", v: 60, c: "#8B5CF6" },
];

const TRANSACTIONS = [
  { name: "Salary Credit", category: "Income", date: "26 Jun 2026", amount: "+₹1,25,000", up: true, icon: Briefcase, tint: "bg-emerald-500/10 text-emerald-400" },
  { name: "Grocery Mart", category: "Food", date: "25 Jun 2026", amount: "-₹3,240", up: false, icon: ShoppingBag, tint: "bg-amber-500/10 text-amber-400" },
  { name: "Indian Oil", category: "Fuel", date: "24 Jun 2026", amount: "-₹2,150", up: false, icon: Fuel, tint: "bg-rose-500/10 text-rose-400" },
  { name: "Dinner @ Olive", category: "Dining", date: "23 Jun 2026", amount: "-₹1,840", up: false, icon: Utensils, tint: "bg-violet-500/10 text-violet-400" },
];

const INSIGHTS = [
  {
    icon: TrendingUp,
    title: "Net worth up 2.18% this month",
    body: "Steady contribution to equity SIPs is paying off. Keep the cadence.",
    color: "#21DBD2",
  },
  {
    icon: PiggyBank,
    title: "Savings rate at 28%",
    body: "You are saving more than 78% of your peers — close to the 30% target.",
    color: "#10B981",
  },
  {
    icon: Banknote,
    title: "Credit card due in 8 days",
    body: "Pay ₹8,750 by 05 Jul to avoid interest charges.",
    color: "#F59E0B",
  },
];

function Dashboard() {
  const [historyOpen, setHistoryOpen] = useState(false);
  const today = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <DashboardHeader />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm text-foreground transition hover:bg-card-hover"
            >
              <Calendar className="h-4 w-4 text-mint" />
              <span>{today}</span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
            <button
              onClick={() => setHistoryOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-sm font-medium text-foreground transition hover:bg-card-hover"
            >
              <History className="h-4 w-4" /> History
            </button>
            <button className="inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-2 text-sm font-semibold text-mint-foreground transition hover:brightness-110">
              <Camera className="h-4 w-4" /> Snapshot
            </button>
          </div>
        </div>

        {/* Financial Snapshot KPIs */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <KpiCard label="Net Worth" value="₹73,14,850" delta="+2.18% vs last month" up icon={Wallet} tint="bg-mint/10 text-mint" tip="Total assets minus total liabilities across all accounts." />
          <KpiCard label="Assets" value="₹1,15,38,850" delta="+7.60% vs last month" up icon={TrendingUp} tint="bg-emerald-500/10 text-emerald-400" />
          <KpiCard label="Liabilities" value="₹42,24,000" delta="-2.10% vs last month" up={false} positiveWhenDown icon={Banknote} tint="bg-rose-500/10 text-rose-400" />
          <KpiCard label="Investments" value="₹58,78,450" delta="+6.35% vs last month" up icon={Briefcase} tint="bg-violet-500/10 text-violet-400" />
          <KpiCard label="Savings" value="₹6,89,600" delta="+1.25% vs last month" up icon={PiggyBank} tint="bg-blue-500/10 text-blue-400" />
          <KpiCard label="Net Cash Flow" value="₹1,22,800" delta="+12.6% vs last month" up icon={ArrowLeftRight} tint="bg-amber-500/10 text-amber-400" tip="Net Cash Flow = total income minus total expenses for the period. Positive means you're saving." />
        </div>

        {/* Net Worth Trend + Asset Allocation */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-7">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Net Worth Trend</h3>
              <button className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">
                6M <ChevronDown className="h-3 w-3" />
              </button>
            </div>
            <div className="h-[260px]">
              <ResponsiveContainer>
                <AreaChart data={NET_TREND} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="nw-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#21DBD2" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#21DBD2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="m" tick={{ fill: "var(--muted-foreground)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis
                    tick={{ fill: "var(--muted-foreground)", fontSize: 11 }}
                    axisLine={false}
                    tickLine={false}
                    tickFormatter={(v) => `₹${v}L`}
                  />
                  <RTooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 8,
                      fontSize: 12,
                      color: "var(--popover-foreground)",
                    }}
                    formatter={(v: number) => [`₹${v}L`, "Net Worth"]}
                  />
                  <Area type="monotone" dataKey="v" stroke="#21DBD2" strokeWidth={2.5} fill="url(#nw-grad)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-5">
            <h3 className="text-sm font-semibold text-foreground">Asset Allocation</h3>
            <div className="mt-4 flex items-center gap-5">
              <div className="relative h-[180px] w-[180px] shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={ALLOCATION} dataKey="pct" innerRadius={58} outerRadius={82} paddingAngle={2} stroke="none">
                      {ALLOCATION.map((a) => (
                        <Cell key={a.name} fill={a.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="font-display text-base font-bold text-foreground">₹73,12,850</div>
                    <div className="text-[10px] text-muted-foreground">Total</div>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {ALLOCATION.map((a) => (
                  <div key={a.name} className="grid grid-cols-[1fr_auto] items-center gap-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                      <span className="truncate text-foreground">{a.name}</span>
                    </div>
                    <span className="font-medium text-foreground">{a.pct}%</span>
                  </div>
                ))}
              </div>
            </div>
            <button className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-mint hover:underline">
              View full breakdown <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* Reminders + Goals + Score */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Upcoming Reminders</h3>
              <a className="text-xs font-medium text-mint hover:underline" href="#">View all</a>
            </div>
            <div className="mt-4 space-y-3">
              {REMINDERS.map((r) => (
                <div key={r.name} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mint/10 text-mint">
                    <Calendar className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-foreground">{r.name}</div>
                    <div className="text-xs text-muted-foreground">{r.date}</div>
                  </div>
                  <div className="text-sm font-semibold text-foreground tabular-nums">{r.amount}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Goals Overview</h3>
              <a className="text-xs font-medium text-mint hover:underline" href="#">View all</a>
            </div>
            <div className="mt-4 space-y-4">
              {GOALS.map((g) => (
                <div key={g.name}>
                  <div className="flex items-center gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${g.color}1f`, color: g.color }}>
                      <g.icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-foreground">{g.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{g.saved} / {g.target}</div>
                    </div>
                    <div className="text-sm font-semibold text-foreground tabular-nums">{g.pct}%</div>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${g.pct}%`, background: g.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-3">
            <h3 className="text-sm font-semibold text-foreground">Financial Score</h3>
            <div className="mt-4 flex flex-col items-center gap-3">
              <ScoreGauge score={74} label="Good" />
              <div className="w-full space-y-2 text-xs">
                {SCORE_FACTORS.map((r) => (
                  <div key={r.k} className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: r.c }} />
                      {r.k}
                    </span>
                    <span className="font-semibold text-foreground">{r.v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions + AI Insights */}
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-7">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-foreground">Recent Transactions</h3>
              <a className="text-xs font-medium text-mint hover:underline" href="#">View all</a>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pl-2 font-medium">Description</th>
                    <th className="py-3 font-medium">Category</th>
                    <th className="py-3 font-medium">Date</th>
                    <th className="py-3 pr-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {TRANSACTIONS.map((t) => (
                    <tr key={t.name} className="border-b border-border/50 last:border-0 hover:bg-surface-2/40">
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          <div className={`grid h-8 w-8 place-items-center rounded-lg ${t.tint}`}>
                            <t.icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-foreground">{t.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{t.category}</td>
                      <td className="py-3 text-muted-foreground">{t.date}</td>
                      <td className={`py-3 pr-2 text-right font-semibold tabular-nums ${t.up ? "text-emerald-400" : "text-rose-400"}`}>
                        <span className="inline-flex items-center gap-1">
                          {t.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                          {t.amount}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-5">
            <div className="flex items-center justify-between">
              <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-foreground">
                <Sparkles className="h-4 w-4 text-mint" /> AI Insights
              </h3>
              <a className="text-xs font-medium text-mint hover:underline" href="#">View all</a>
            </div>
            <div className="mt-4 space-y-3">
              {INSIGHTS.map((it) => (
                <div key={it.title} className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 p-3">
                  <span
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-lg"
                    style={{ background: `${it.color}1f`, color: it.color }}
                  >
                    <it.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-foreground">{it.title}</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">{it.body}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <SnapshotHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </TooltipProvider>
  );
}

/* ---------- Building blocks ---------- */

function KpiCard({
  label,
  value,
  delta,
  up,
  positiveWhenDown,
  icon: Icon,
  tint,
  tip,
}: {
  label: string;
  value: string;
  delta: string;
  up: boolean;
  positiveWhenDown?: boolean;
  icon: React.ComponentType<{ className?: string }>;
  tint: string;
  tip?: string;
}) {
  const isPositive = positiveWhenDown ? !up : up;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {label}
            {tip ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" aria-label={`About ${label}`} className="text-muted-foreground hover:text-foreground">
                    <Info className="h-3 w-3 opacity-70" />
                  </button>
                </TooltipTrigger>
                <TooltipContent className="max-w-xs border-border bg-popover text-popover-foreground">
                  {tip}
                </TooltipContent>
              </Tooltip>
            ) : (
              <Info className="h-3 w-3 opacity-50" />
            )}
          </div>
          <div className="mt-1 font-display text-xl font-bold tracking-tight text-foreground">
            {value}
          </div>
          <div
            className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
              isPositive ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {delta}
          </div>
        </div>
      </div>
    </div>
  );
}

function ScoreGauge({ score, label }: { score: number; label: string }) {
  const r = 48;
  const c = Math.PI * r;
  const off = c - (c * score) / 100;
  return (
    <div className="relative h-[100px] w-[140px]">
      <svg width={140} height={86} viewBox="0 0 140 86" className="block">
        <path
          d={`M 18 76 A ${r} ${r} 0 0 1 122 76`}
          stroke="var(--border)"
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
        />
        <path
          d={`M 18 76 A ${r} ${r} 0 0 1 122 76`}
          stroke="#21DBD2"
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute inset-x-0 top-5 text-center">
        <div className="font-display text-3xl font-bold leading-none text-foreground">{score}</div>
        <div className="text-[10px] text-muted-foreground">/100</div>
        <div className="mt-1 text-xs font-semibold text-mint">{label}</div>
      </div>
    </div>
  );
}