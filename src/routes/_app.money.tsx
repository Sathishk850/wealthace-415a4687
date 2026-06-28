import { createFileRoute } from "@tanstack/react-router";
import {
  TrendingUp,
  Plus,
  Info,
  Calendar,
  Percent,
  Car,
  Zap,
  UtensilsCrossed,
  ShoppingBasket,
  Fuel,
  Wallet,
  ArrowDownRight,
  PiggyBank,
  CalendarDays,
  CalendarRange,
  Activity,
  Layers,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useState } from "react";

export const Route = createFileRoute("/_app/money")({
  head: () => ({
    meta: [
      { title: "Money · FinVista" },
      { name: "description", content: "Track cashflow, income, expenses and every transaction." },
    ],
  }),
  component: Money,
});

const trend = [
  { d: "04 May", income: 110000, expense: 60000 },
  { d: "11 May", income: 118000, expense: 68000 },
  { d: "18 May", income: 121000, expense: 74000 },
  { d: "25 May", income: 123500, expense: 80000 },
  { d: "01 Jun", income: 125000, expense: 85350 },
];

const expenseCats = [
  { name: "Housing", value: 24500, color: "#3B82F6" },
  { name: "Food & Dining", value: 16250, color: "#22C55E" },
  { name: "Transport", value: 10800, color: "#F97316" },
  { name: "Utilities", value: 8900, color: "#A78BFA" },
  { name: "Healthcare", value: 6450, color: "#EF4444" },
  { name: "Entertainment", value: 5200, color: "#EC4899" },
  { name: "Others", value: 13250, color: "#6E8294" },
];

const totalExpense = expenseCats.reduce((s, c) => s + c.value, 0);

const budgets = [
  { name: "Groceries", spent: 7850, limit: 10000, pct: 78, status: "On Track", color: "#22C55E", icon: ShoppingBasket },
  { name: "Transport", spent: 9000, limit: 15000, pct: 60, status: "On Track", color: "#F97316", icon: Car },
  { name: "Entertainment", spent: 4100, limit: 5000, pct: 82, status: "At Risk", color: "#EC4899", icon: Activity },
  { name: "Utilities", spent: 8900, limit: 10000, pct: 89, status: "Exceeded", color: "#A78BFA", icon: Zap },
];

const totalBudget = 40000;
const totalSpent = 29850;

const recent = [
  { t: "Salary", c: "HDFC Bank •••• 5678", a: 100000, pos: true, d: "31 May 2025", icon: Wallet, color: "#22C55E" },
  { t: "Zomato", c: "Food & Dining", a: -850, pos: false, d: "30 May 2025", icon: UtensilsCrossed, color: "#F97316" },
  { t: "Electricity Bill", c: "Utilities", a: -1250, pos: false, d: "28 May 2025", icon: Zap, color: "#FBBF24" },
  { t: "IOCL Petrol", c: "Transport", a: -1150, pos: false, d: "27 May 2025", icon: Fuel, color: "#3B82F6" },
];

const summary = [
  { label: "Highest Expense Day", sub: "18 May 2025", value: "₹5,620", icon: CalendarDays, color: "#EF4444" },
  { label: "Lowest Expense Day", sub: "5 May 2025", value: "₹1,120", icon: CalendarRange, color: "#22C55E" },
  { label: "Average Daily Expense", sub: "", value: "₹2,753", icon: Activity, color: "#A78BFA" },
  { label: "Largest Category", sub: "Housing", value: "₹24,500", icon: Layers, color: "#3B82F6" },
];

const tabs = ["Overview", "Income", "Expenses", "Transactions", "Budgets"] as const;

const inr = (n: number) =>
  "₹ " + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });
const inrShort = (n: number) =>
  (n < 0 ? "-" : "") + "₹" + Math.abs(n).toLocaleString("en-IN");

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {title}
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          {subtitle && (
            <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  tone = "mint",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: string;
  tone?: "positive" | "negative" | "mint" | "violet";
}) {
  const palette: Record<string, { bg: string; fg: string }> = {
    positive: { bg: "bg-success/15", fg: "text-success" },
    negative: { bg: "bg-destructive/15", fg: "text-destructive" },
    mint: { bg: "bg-mint/15", fg: "text-mint" },
    violet: { bg: "bg-[#A78BFA]/15", fg: "text-[#A78BFA]" },
  };
  const p = palette[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${p.bg} ${p.fg}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            {value}
          </div>
        </div>
      </div>
      {delta && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>vs Apr 2025</span>
          <span className="font-semibold text-success">↑ {delta}</span>
        </div>
      )}
    </div>
  );
}

function Money() {
  const [tab, setTab] = useState<(typeof tabs)[number]>("Overview");
  return (
    <>
      <PageHeader
        title="Money"
        description="Track your income, expenses, transactions and cash flow."
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:border-mint/40">
              <Calendar className="h-3.5 w-3.5" /> May 2025
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-mint-foreground">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </>
        }
      />

      {/* Sub tabs */}
      <div className="mb-5 flex items-center gap-6 border-b border-border">
        {tabs.map((t) => {
          const active = tab === t;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`relative -mb-px py-2.5 text-sm font-medium transition ${
                active ? "text-mint" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t}
              {active && <span className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-mint" />}
            </button>
          );
        })}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={TrendingUp} label="Total Income" value="₹1,25,000" delta="12.5%" tone="positive" />
        <KpiCard icon={ArrowDownRight} label="Total Expenses" value="₹85,350" delta="8.2%" tone="negative" />
        <KpiCard icon={PiggyBank} label="Net Savings" value="₹39,650" delta="21.4%" tone="mint" />
        <KpiCard icon={Percent} label="Savings Rate" value="31.72%" delta="5.3%" tone="violet" />
      </div>

      {/* Trend + Breakdown */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-5">
        <ChartCard
          title="Income vs Expense Trend"
          className="lg:col-span-3"
          action={
            <div className="flex items-center gap-3 text-xs">
              <select className="rounded-md border border-border bg-card px-2 py-1 text-muted-foreground">
                <option>This Month</option>
                <option>Last 3 Months</option>
                <option>This Year</option>
              </select>
              <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-mint" />Income</span>
              <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[#3B82F6]" />Expenses</span>
            </div>
          }
        >
          <div className="h-64">
            <ResponsiveContainer>
              <LineChart data={trend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1C3850" vertical={false} />
                <XAxis dataKey="d" stroke="#6E8294" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6E8294" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${Math.round(v / 100000)}L`} />
                <Tooltip contentStyle={{ background: "#102634", border: "1px solid #1C3850", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                <Line type="monotone" dataKey="income" stroke="#14D8CF" strokeWidth={2.5} dot={{ r: 4, fill: "#14D8CF" }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="expense" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: "#3B82F6" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard
          title="Expense Breakdown"
          className="lg:col-span-2"
          action={<button className="text-xs font-semibold text-mint hover:underline">View All</button>}
        >
          <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-4">
            <div className="relative h-[150px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={expenseCats} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                    {expenseCats.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <ul className="space-y-1.5 text-xs">
              {expenseCats.map((c) => {
                const pct = ((c.value / totalExpense) * 100).toFixed(1);
                return (
                  <li key={c.name} className="flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="truncate text-foreground">{c.name}</span>
                    </div>
                    <div className="shrink-0 text-muted-foreground tabular-nums">
                      <span className="text-foreground">₹{c.value.toLocaleString("en-IN")}</span>
                      <span className="ml-2">{pct}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="mt-3 border-t border-border pt-3">
            <div className="text-[11px] text-muted-foreground">Total Expenses</div>
            <div className="mt-0.5 font-display text-lg font-bold text-foreground">₹{totalExpense.toLocaleString("en-IN")}</div>
          </div>
        </ChartCard>
      </div>

      {/* Bottom row */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard
          title="Recent Transactions"
          action={<button className="text-xs font-semibold text-mint hover:underline">View All</button>}
        >
          <ul className="divide-y divide-border">
            {recent.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${r.color}22`, color: r.color }}>
                    <r.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{r.t}</div>
                    <div className="text-xs text-muted-foreground truncate">{r.c}</div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-sm font-semibold ${r.pos ? "text-success" : "text-destructive"} tabular-nums`}>
                    {r.pos ? "+" : ""}{inrShort(r.a)}
                  </div>
                  <div className="text-[11px] text-muted-foreground">{r.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard
          title="Budget Status (May)"
          action={<button className="text-xs font-semibold text-mint hover:underline">View All</button>}
        >
          <ul className="space-y-3.5">
            {budgets.map((b) => {
              const tone = b.status === "On Track" ? "text-success" : b.status === "At Risk" ? "text-warning" : "text-destructive";
              const barColor = b.status === "Exceeded" ? "#EF4444" : b.status === "At Risk" ? "#F59E0B" : b.color;
              return (
                <li key={b.name}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${b.color}22`, color: b.color }}>
                        <b.icon className="h-4 w-4" />
                      </span>
                      <span className="truncate text-sm font-medium text-foreground">{b.name}</span>
                    </div>
                    <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                      ₹{b.spent.toLocaleString("en-IN")} / ₹{b.limit.toLocaleString("en-IN")}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                      <div className="h-full rounded-full" style={{ width: `${Math.min(b.pct, 100)}%`, background: barColor }} />
                    </div>
                    <span className="w-9 shrink-0 text-right text-xs font-semibold text-foreground tabular-nums">{b.pct}%</span>
                    <span className={`w-16 shrink-0 text-right text-[11px] font-semibold ${tone}`}>{b.status}</span>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
            <div>
              <div className="text-muted-foreground">Total Budget</div>
              <div className="mt-0.5 font-display text-base font-bold text-foreground">₹{totalBudget.toLocaleString("en-IN")}</div>
            </div>
            <div className="text-right">
              <div className="text-muted-foreground">Total Spent</div>
              <div className="mt-0.5 font-display text-base font-bold text-foreground">₹{totalSpent.toLocaleString("en-IN")} <span className="text-xs font-medium text-muted-foreground">({Math.round((totalSpent/totalBudget)*100)}%)</span></div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Monthly Summary">
          <ul className="divide-y divide-border">
            {summary.map((s) => (
              <li key={s.label} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${s.color}22`, color: s.color }}>
                    <s.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{s.label}</div>
                    {s.sub && <div className="text-[11px] text-muted-foreground">{s.sub}</div>}
                  </div>
                </div>
                <div className="shrink-0 font-display text-base font-bold text-foreground tabular-nums">{s.value}</div>
              </li>
            ))}
          </ul>
          <button className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-mint/30 bg-mint/10 px-3 py-2 text-xs font-semibold text-mint hover:bg-mint/15">
            View Detailed Report <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </ChartCard>
      </div>
    </>
  );
}