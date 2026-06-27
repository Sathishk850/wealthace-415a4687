import { createFileRoute } from "@tanstack/react-router";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  LineChart,
  Plus,
  Wallet,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  Percent,
  Landmark,
  Car,
  Zap,
  UtensilsCrossed,
  Home,
  Heart,
  Film,
  Tag,
  ChevronRight,
  FileBarChart,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Route = createFileRoute("/_app/money")({
  head: () => ({
    meta: [
      { title: "Money · FinVista" },
      { name: "description", content: "Track cashflow, income, expenses and every transaction." },
    ],
  }),
  component: Money,
});

const monthly = [
  { m: "Dec '24", income: 118000, expense: 78000 },
  { m: "Jan '25", income: 121000, expense: 82000 },
  { m: "Feb '25", income: 119500, expense: 81500 },
  { m: "Mar '25", income: 122000, expense: 84200 },
  { m: "Apr '25", income: 124000, expense: 83000 },
  { m: "May '25", income: 125000, expense: 85350 },
];

const expenseCats = [
  { name: "Housing", value: 24500, color: "#3B82F6", icon: Home },
  { name: "Food & Dining", value: 16250, color: "#22C55E", icon: UtensilsCrossed },
  { name: "Transport", value: 10800, color: "#F97316", icon: Car },
  { name: "Utilities", value: 8900, color: "#A78BFA", icon: Zap },
  { name: "Healthcare", value: 6450, color: "#EF4444", icon: Heart },
  { name: "Entertainment", value: 5200, color: "#EC4899", icon: Film },
  { name: "Others", value: 13250, color: "#6E8294", icon: Tag },
];

const totalExpense = expenseCats.reduce((s, c) => s + c.value, 0);

const budgets = [
  { name: "Food & Dining", spent: 16250, limit: 20000, color: "#22C55E", icon: UtensilsCrossed },
  { name: "Transport", spent: 10800, limit: 15000, color: "#F97316", icon: Car },
  { name: "Utilities", spent: 8900, limit: 10000, color: "#A78BFA", icon: Zap },
  { name: "Entertainment", spent: 5200, limit: 8000, color: "#EC4899", icon: Film },
];

const inr = (n: number) =>
  "₹ " + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

const modules = [
  { id: "cashflow", label: "Cashflow", desc: "Income vs expense trends", icon: LineChart },
  { id: "income", label: "Income", desc: "Salary, business, freelance, rental, dividend", icon: TrendingUp },
  { id: "expenses", label: "Expenses", desc: "Rent, EMI, food, bills, travel, more", icon: TrendingDown },
  { id: "transactions", label: "Transactions", desc: "All money in & out, import/export", icon: ArrowLeftRight },
];

const quickActions = [
  { label: "Add Income", desc: "Record your income", icon: Landmark, tone: "positive" },
  { label: "Add Expense", desc: "Record your expense", icon: TrendingDown, tone: "negative" },
  { label: "Add Transaction", desc: "Record money in or out", icon: ArrowLeftRight, tone: "mint" },
  { label: "Transfer Money", desc: "Transfer between accounts", icon: ArrowLeftRight, tone: "mint" },
  { label: "Categories", desc: "Manage income & expense tags", icon: Tag, tone: "mint" },
  { label: "View Reports", desc: "Detailed money reports", icon: FileBarChart, tone: "mint" },
];

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
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-4">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full ${p.bg} ${p.fg}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            {label}
            <Info className="h-3 w-3" />
          </div>
          <div className="mt-0.5 font-display text-2xl font-bold tracking-tight text-foreground">
            {value}
          </div>
        </div>
      </div>
      {delta && (
        <div className="mt-3 text-xs text-muted-foreground">
          vs last month <span className="ml-1 font-medium text-success">↑ {delta}</span>
        </div>
      )}
    </div>
  );
}

function ModuleTile({
  label,
  desc,
  icon: Icon,
}: {
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <button className="group flex w-full items-center gap-4 rounded-2xl border border-border bg-card p-4 text-left transition hover:border-mint/40">
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint/10 text-mint">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{desc}</div>
      </div>
    </button>
  );
}

function Money() {
  const opening = 102500;
  const moneyIn = 125000;
  const moneyOut = 85350;
  const closing = opening + moneyIn - moneyOut;
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
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:border-mint/40">
              <Tag className="h-3.5 w-3.5" /> Categories
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-success/40 bg-success/10 px-3 py-2 text-xs font-semibold text-success hover:bg-success/15">
              <Plus className="h-3.5 w-3.5" /> Add Income
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-mint-foreground">
              <Plus className="h-3.5 w-3.5" /> Add Expense
            </button>
          </>
        }
      />

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard icon={ArrowDownRight} label="Total Income" value={inr(125000)} delta="12.5%" tone="positive" />
        <KpiCard icon={ArrowUpRight} label="Total Expenses" value={inr(85350)} delta="8.2%" tone="negative" />
        <KpiCard icon={Wallet} label="Net Savings" value={inr(39650)} delta="21.4%" tone="mint" />
        <KpiCard icon={Percent} label="Savings Rate" value="31.72%" delta="5.3%" tone="violet" />
      </div>

      {/* Module tiles */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {modules.map((m) => (
          <ModuleTile key={m.id} {...m} />
        ))}
      </div>

      {/* Charts row */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard title="Income vs Expenses" className="lg:col-span-1" action={
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-mint" />Income</span>
            <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-destructive" />Expenses</span>
          </div>
        }>
          <div className="h-64">
            <ResponsiveContainer>
              <BarChart data={monthly} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1C3850" vertical={false} />
                <XAxis dataKey="m" stroke="#6E8294" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#6E8294" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}K`} />
                <Tooltip cursor={{ fill: "rgba(20,216,207,0.06)" }} contentStyle={{ background: "#102634", border: "1px solid #1C3850", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                <Bar dataKey="income" fill="#14D8CF" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expense" fill="#EF4444" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 rounded-xl border border-border bg-surface/40 p-3">
            <div>
              <div className="text-[11px] text-muted-foreground">This Month (May 2025)</div>
              <div className="mt-1 flex items-baseline gap-3 text-xs">
                <span className="text-muted-foreground">Income</span>
                <span className="font-semibold text-success">{inr(125000)}</span>
              </div>
              <div className="mt-0.5 flex items-baseline gap-3 text-xs">
                <span className="text-muted-foreground">Expenses</span>
                <span className="font-semibold text-destructive">{inr(85350)}</span>
              </div>
            </div>
            <div>
              <div className="text-[11px] text-muted-foreground">Difference</div>
              <div className="mt-1 font-display text-lg font-bold text-mint">{inr(39650)}</div>
              <div className="text-[11px] text-success">↑ 21.4% vs last month</div>
            </div>
          </div>
        </ChartCard>

        <ChartCard title="Expense Breakdown" className="lg:col-span-1">
          <div className="grid grid-cols-[140px_minmax(0,1fr)] items-center gap-4">
            <div className="relative h-[140px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={expenseCats} dataKey="value" nameKey="name" innerRadius={48} outerRadius={68} paddingAngle={2} stroke="none">
                    {expenseCats.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-display text-base font-bold text-foreground">{inr(totalExpense)}</div>
                  <div className="text-[10px] text-muted-foreground">Total Expenses</div>
                </div>
              </div>
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
                    <div className="shrink-0 text-muted-foreground">
                      <span className="text-foreground">{inr(c.value)}</span> · {pct}%
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
          <button className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-mint hover:underline">
            View all expenses <ChevronRight className="h-3 w-3" />
          </button>
        </ChartCard>

        <ChartCard title="Cash Flow (This Month)" className="lg:col-span-1">
          <div className="space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">Opening Balance</div>
              <div className="mt-0.5 font-display text-xl font-bold text-foreground">{inr(opening)}</div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <div className="text-xs text-muted-foreground">Money In</div>
                <div className="text-sm font-semibold text-success">{inr(moneyIn)}</div>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-success" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="flex items-baseline justify-between">
                <div className="text-xs text-muted-foreground">Money Out</div>
                <div className="text-sm font-semibold text-destructive">{inr(moneyOut)}</div>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface">
                <div className="h-full rounded-full bg-destructive" style={{ width: `${(moneyOut / moneyIn) * 100}%` }} />
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-border pt-3">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                Closing Balance <Info className="h-3 w-3" />
              </div>
              <div className="font-display text-lg font-bold text-mint">{inr(closing)}</div>
            </div>
          </div>
        </ChartCard>
      </div>

      {/* Bottom row */}
      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
        <ChartCard title="Recent Transactions" action={
          <button className="text-xs font-semibold text-mint hover:underline">View All</button>
        }>
          <ul className="divide-y divide-border">
            {transactions.map((r, i) => (
              <li key={i} className="flex items-center justify-between gap-3 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${r.pos ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                    <r.icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{r.t}</div>
                    <div className="text-xs text-muted-foreground">{r.c} · {r.acc}</div>
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className={`text-sm font-semibold ${r.pos ? "text-success" : "text-destructive"}`}>{r.a}</div>
                  <div className="text-[11px] text-muted-foreground">{r.d}</div>
                </div>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard title="Budgets" action={
          <button className="text-xs font-semibold text-mint hover:underline">View All</button>
        }>
          <ul className="space-y-3.5">
            {budgets.map((b) => {
              const pct = Math.round((b.spent / b.limit) * 100);
              return (
                <li key={b.name}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${b.color}22`, color: b.color }}>
                        <b.icon className="h-4 w-4" />
                      </span>
                      <span className="truncate text-sm font-medium text-foreground">{b.name}</span>
                    </div>
                    <div className="shrink-0 text-xs">
                      <span className="text-muted-foreground">{inr(b.spent)} / {inr(b.limit)}</span>
                      <span className="ml-2 font-semibold text-foreground">{pct}%</span>
                    </div>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: b.color }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </ChartCard>

        <ChartCard title="Quick Actions">
          <ul className="divide-y divide-border">
            {quickActions.map((a) => {
              const bg = a.tone === "positive" ? "bg-success/10 text-success" : a.tone === "negative" ? "bg-destructive/10 text-destructive" : "bg-mint/10 text-mint";
              return (
                <li key={a.label}>
                  <button className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-surface/40">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${bg}`}>
                        <a.icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{a.label}</div>
                        <div className="text-xs text-muted-foreground">{a.desc}</div>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                </li>
              );
            })}
          </ul>
        </ChartCard>
      </div>
    </>
  );
}

const transactions = [
  { d: "31 May 2025", t: "Salary", c: "HDFC Bank **** 5678", acc: "Income", a: "+₹ 1,00,000", pos: true, icon: Landmark },
  { d: "30 May 2025", t: "Zomato", c: "Food & Dining", acc: "HDFC Card", a: "-₹ 850", pos: false, icon: UtensilsCrossed },
  { d: "28 May 2025", t: "Electricity Bill", c: "Utilities", acc: "SBI Bank", a: "-₹ 1,250", pos: false, icon: Zap },
  { d: "26 May 2025", t: "Uber", c: "Transport", acc: "HDFC Card", a: "-₹ 318", pos: false, icon: Car },
];