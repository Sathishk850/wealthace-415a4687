import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  LineChart,
  Plus,
  Upload,
  Download,
  Wallet,
  PiggyBank,
  Info,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Area,
  AreaChart,
  PieChart,
  Pie,
  Cell,
  Legend,
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

const tabs = [
  { id: "cashflow", label: "Cashflow", icon: LineChart },
  { id: "income", label: "Income", icon: TrendingUp },
  { id: "expenses", label: "Expenses", icon: TrendingDown },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
];

const monthly = [
  { m: "Jan", income: 245000, expense: 132000 },
  { m: "Feb", income: 252000, expense: 128000 },
  { m: "Mar", income: 260000, expense: 140000 },
  { m: "Apr", income: 268000, expense: 135000 },
  { m: "May", income: 275000, expense: 145000 },
  { m: "Jun", income: 280000, expense: 138000 },
  { m: "Jul", income: 285000, expense: 142500 },
];

const savingsTrend = monthly.map((d) => ({
  m: d.m,
  rate: Math.round(((d.income - d.expense) / d.income) * 100),
}));

const incomeSources = [
  { name: "Salary", value: 240000, color: "#14D8CF" },
  { name: "Business", value: 35000, color: "#22C55E" },
  { name: "Dividends", value: 4250, color: "#A78BFA" },
  { name: "Other", value: 5750, color: "#F59E0B" },
];

const expenseCats = [
  { name: "Rent / EMI", value: 45000, color: "#EF4444" },
  { name: "Food & Dining", value: 18500, color: "#F59E0B" },
  { name: "Bills", value: 12400, color: "#A78BFA" },
  { name: "Travel", value: 8200, color: "#14D8CF" },
  { name: "Shopping", value: 14600, color: "#22C55E" },
  { name: "Other", value: 43800, color: "#6E8294" },
];

const inr = (n: number) =>
  "₹ " + n.toLocaleString("en-IN", { maximumFractionDigits: 0 });

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-foreground">{title}</div>
          {subtitle && (
            <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}

function Money() {
  const [active, setActive] = useState("cashflow");

  return (
    <>
      <PageHeader
        title="Money"
        description="Cashflow, income, expenses and transactions."
        actions={
          active === "transactions" ? (
            <>
              <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:border-mint/40">
                <Upload className="h-3.5 w-3.5" /> Import
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:border-mint/40">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-mint-foreground">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </>
          ) : (
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-mint-foreground">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          )
        }
      />

      <Tabs value={active} onValueChange={setActive} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-4 rounded-xl border border-border bg-surface p-1.5 sm:w-auto sm:grid-cols-none sm:justify-start">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground data-[state=active]:bg-mint data-[state=active]:text-mint-foreground sm:text-sm"
            >
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="cashflow" className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <KpiCard
              icon={TrendingUp}
              label="Total Income"
              value={inr(285000)}
              delta="+12% vs last month"
              tone="positive"
            />
            <KpiCard
              icon={TrendingDown}
              label="Total Expenses"
              value={inr(142500)}
              delta="-4% vs last month"
              tone="negative"
            />
            <KpiCard
              icon={Wallet}
              label="Net Cashflow"
              value={inr(142500)}
              delta="₹ 23k vs last month"
              tone="mint"
              tooltip="Income minus expenses for the current month."
            />
            <KpiCard
              icon={PiggyBank}
              label="Savings Rate"
              value="50%"
              delta="On track · target 40%"
              tone="mint"
            />
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <ChartCard
              title="Income vs Expense"
              subtitle="Last 7 months"
              className="lg:col-span-2"
            >
              <div className="h-72">
                <ResponsiveContainer>
                  <BarChart data={monthly} barGap={6}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1C3850" vertical={false} />
                    <XAxis dataKey="m" stroke="#6E8294" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#6E8294"
                      fontSize={12}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                    />
                    <Tooltip
                      cursor={{ fill: "rgba(20,216,207,0.06)" }}
                      contentStyle={{
                        background: "#102634",
                        border: "1px solid #1C3850",
                        borderRadius: 12,
                        fontSize: 12,
                      }}
                      formatter={(v: number) => inr(v)}
                    />
                    <Bar dataKey="income" fill="#14D8CF" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="expense" fill="#EF4444" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>

            <ChartCard title="Savings Rate Trend" subtitle="Net savings %">
              <div className="h-72">
                <ResponsiveContainer>
                  <AreaChart data={savingsTrend}>
                    <defs>
                      <linearGradient id="sav" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#14D8CF" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#14D8CF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1C3850" vertical={false} />
                    <XAxis dataKey="m" stroke="#6E8294" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6E8294" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ background: "#102634", border: "1px solid #1C3850", borderRadius: 12, fontSize: 12 }}
                      formatter={(v: number) => `${v}%`}
                    />
                    <Area type="monotone" dataKey="rate" stroke="#14D8CF" strokeWidth={2} fill="url(#sav)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard title="Top Expense Categories" subtitle="This month">
              <ul className="space-y-3">
                {expenseCats.slice(0, 5).map((c) => {
                  const total = expenseCats.reduce((s, x) => s + x.value, 0);
                  const pct = Math.round((c.value / total) * 100);
                  return (
                    <li key={c.name}>
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <span className="h-2 w-2 rounded-full" style={{ background: c.color }} />
                          <span className="text-foreground">{c.name}</span>
                        </div>
                        <span className="text-muted-foreground">
                          {inr(c.value)} · {pct}%
                        </span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: c.color }} />
                      </div>
                    </li>
                  );
                })}
              </ul>
            </ChartCard>

            <ChartCard title="Recent Transactions" subtitle="Latest 6">
              <ul className="divide-y divide-border">
                {transactions.map((r, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${
                          r.pos ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {r.pos ? <ArrowDownRight className="h-4 w-4" /> : <ArrowUpRight className="h-4 w-4" />}
                      </span>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-foreground">{r.t}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.d} · <span className="text-mint/80">{r.c}</span>
                        </div>
                      </div>
                    </div>
                    <div className={`shrink-0 text-sm font-semibold ${r.pos ? "text-success" : "text-foreground"}`}>
                      {r.a}
                    </div>
                  </li>
                ))}
              </ul>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="income" className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Salary" value={inr(240000)} delta="Monthly" tone="default" />
            <StatCard label="Business" value={inr(35000)} delta="+8%" tone="positive" />
            <StatCard label="Dividends" value={inr(4250)} delta="Quarterly" tone="mint" />
            <StatCard label="Other" value={inr(5750)} delta="Misc." tone="default" />
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard title="Income Sources" subtitle="Split by category">
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={incomeSources} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {incomeSources.map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#102634", border: "1px solid #1C3850", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#9A9DA4" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Income Trend" subtitle="Last 7 months">
              <div className="h-64">
                <ResponsiveContainer>
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="inc" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#22C55E" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#22C55E" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1C3850" vertical={false} />
                    <XAxis dataKey="m" stroke="#6E8294" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6E8294" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip contentStyle={{ background: "#102634", border: "1px solid #1C3850", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                    <Area type="monotone" dataKey="income" stroke="#22C55E" strokeWidth={2} fill="url(#inc)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Rent / EMI" value={inr(45000)} delta="31% of expense" tone="negative" />
            <StatCard label="Food & Dining" value={inr(18500)} delta="13%" tone="default" />
            <StatCard label="Bills & Utilities" value={inr(12400)} delta="9%" tone="default" />
            <StatCard label="Travel" value={inr(8200)} delta="6%" tone="default" />
          </div>
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <ChartCard title="Expense Breakdown" subtitle="By category">
              <div className="h-64">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={expenseCats} dataKey="value" nameKey="name" innerRadius={55} outerRadius={90} paddingAngle={2}>
                      {expenseCats.map((s) => <Cell key={s.name} fill={s.color} />)}
                    </Pie>
                    <Tooltip contentStyle={{ background: "#102634", border: "1px solid #1C3850", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12, color: "#9A9DA4" }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
            <ChartCard title="Expense Trend" subtitle="Last 7 months">
              <div className="h-64">
                <ResponsiveContainer>
                  <AreaChart data={monthly}>
                    <defs>
                      <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1C3850" vertical={false} />
                    <XAxis dataKey="m" stroke="#6E8294" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="#6E8294" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(v) => `${Math.round(v / 1000)}k`} />
                    <Tooltip contentStyle={{ background: "#102634", border: "1px solid #1C3850", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                    <Area type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} fill="url(#exp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {transactions.map((r, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{r.t}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.d} · <span className="text-mint/80">{r.c}</span>
                    </div>
                  </div>
                  <div className={`shrink-0 text-sm font-semibold ${r.pos ? "text-success" : "text-foreground"}`}>
                    {r.a}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

const transactions = [
  { d: "Today", t: "Salary credit", c: "Income", a: "+₹ 2,40,000", pos: true },
  { d: "Today", t: "Zomato", c: "Food", a: "-₹ 482", pos: false },
  { d: "Yesterday", t: "HDFC SIP - Nifty 50", c: "Investment", a: "-₹ 15,000", pos: false },
  { d: "Yesterday", t: "Electricity bill", c: "Bills", a: "-₹ 2,140", pos: false },
  { d: "2d ago", t: "Dividend - INFY", c: "Income", a: "+₹ 1,250", pos: true },
  { d: "3d ago", t: "Uber", c: "Travel", a: "-₹ 318", pos: false },
];