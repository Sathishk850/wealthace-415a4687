import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Target,
  Wallet,
  Flame,
  Plus,
  TrendingUp,
  PiggyBank,
  Calendar,
  Sparkles,
  GraduationCap,
  Home,
  Car,
  Plane,
  Shield,
  CheckCircle2,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/_app/planner")({
  head: () => ({
    meta: [
      { title: "Planner · FinVista" },
      { name: "description", content: "Set goals, budgets and your FIRE roadmap." },
    ],
  }),
  component: Planner,
});

const inr = (n: number) =>
  n >= 10000000
    ? `₹${(n / 10000000).toFixed(2)}Cr`
    : n >= 100000
    ? `₹${(n / 100000).toFixed(2)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(1)}K`
    : `₹${n}`;

function Planner() {
  return (
    <>
      <PageHeader
        title="Planner"
        description="Goals, retirement and your FIRE roadmap."
        actions={
          <>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Calendar className="h-4 w-4" /> May 2025
            </Button>
            <Button size="sm" className="gap-1.5 bg-mint text-mint-foreground hover:bg-mint/90">
              <Plus className="h-4 w-4" /> Add Goal
            </Button>
          </>
        }
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-2 sm:inline-flex sm:w-auto">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="goals">Goals</TabsTrigger>
          <TabsTrigger value="retirement">Retirement</TabsTrigger>
          <TabsTrigger value="fire">FIRE</TabsTrigger>
        </TabsList>

        <TabsContent value="overview"><OverviewView /></TabsContent>
        <TabsContent value="goals"><GoalsView /></TabsContent>
        <TabsContent value="retirement"><RetirementView /></TabsContent>
        <TabsContent value="fire"><FireView /></TabsContent>
      </Tabs>
    </>
  );
}

/* ---------- KPI ---------- */
function Kpi({
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
  tone?: "mint" | "positive" | "negative" | "warn";
}) {
  const map = {
    mint: "bg-mint/10 text-mint",
    positive: "bg-success/10 text-success",
    negative: "bg-destructive/10 text-destructive",
    warn: "bg-amber-500/10 text-amber-400",
  } as const;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${map[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-2xl font-bold tracking-tight">{value}</div>
      {delta && <div className="mt-1 text-xs text-muted-foreground">{delta}</div>}
    </div>
  );
}

/* ---------- OVERVIEW ---------- */
const projection = [
  { year: "2025", corpus: 48.7 },
  { year: "2027", corpus: 78 },
  { year: "2029", corpus: 118 },
  { year: "2031", corpus: 172 },
  { year: "2033", corpus: 244 },
  { year: "2035", corpus: 332 },
  { year: "2037", corpus: 420 },
];

const goalsList = [
  { name: "Emergency Fund", icon: Shield, current: 480000, target: 600000, eta: "Aug 2025", tone: "positive" as const },
  { name: "Child Education", icon: GraduationCap, current: 850000, target: 2500000, eta: "Mar 2032", tone: "mint" as const },
  { name: "Dream Home", icon: Home, current: 1200000, target: 5000000, eta: "Dec 2029", tone: "warn" as const },
  { name: "New Car", icon: Car, current: 320000, target: 1200000, eta: "Jun 2027", tone: "mint" as const },
  { name: "Europe Vacation", icon: Plane, current: 95000, target: 350000, eta: "Apr 2026", tone: "warn" as const },
];

function OverviewView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Target} label="Active Goals" value="5" delta="2 on track" tone="mint" />
        <Kpi icon={PiggyBank} label="Total Saved" value={inr(2945000)} delta="of ₹96.5L target" tone="positive" />
        <Kpi icon={Flame} label="FIRE Progress" value="11.6%" delta="14.2 yrs to go" tone="warn" />
        <Kpi icon={Wallet} label="Monthly Budget" value={inr(85000)} delta="₹62.4K spent" tone="negative" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-display text-base font-semibold">Wealth Projection</div>
              <div className="text-xs text-muted-foreground">Corpus growth at 12% CAGR · in ₹ Lakhs</div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">FIRE Number</div>
              <div className="font-display text-lg font-bold text-mint">₹4.2 Cr</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={projection}>
              <defs>
                <linearGradient id="proj" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14D8CF" stopOpacity={0.4} />
                  <stop offset="100%" stopColor="#14D8CF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1B3249" />
              <XAxis dataKey="year" stroke="#6E8294" fontSize={11} />
              <YAxis stroke="#6E8294" fontSize={11} tickFormatter={(v) => `${v}L`} />
              <Tooltip contentStyle={{ background: "#102634", border: "1px solid #1B3249", borderRadius: 8 }} />
              <Area type="monotone" dataKey="corpus" stroke="#14D8CF" strokeWidth={2.5} fill="url(#proj)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-mint" />
            <div className="font-display text-base font-semibold">AI Insights</div>
          </div>
          <div className="space-y-3 text-sm">
            <InsightRow tone="positive" text="Increase SIP by ₹8K to reach FIRE 2 yrs earlier." />
            <InsightRow tone="warn" text="Dream Home goal is 6 months behind schedule." />
            <InsightRow tone="mint" text="You're saving 31.7% — top 10% in your bracket." />
            <InsightRow tone="positive" text="Emergency fund 80% complete — great work!" />
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-display text-base font-semibold">Goals Snapshot</div>
          <Button variant="ghost" size="sm" className="text-mint">View all</Button>
        </div>
        <div className="space-y-4">
          {goalsList.map((g) => (
            <GoalRow key={g.name} {...g} />
          ))}
        </div>
      </div>
    </div>
  );
}

function InsightRow({ tone, text }: { tone: "positive" | "warn" | "mint"; text: string }) {
  const dot =
    tone === "positive" ? "bg-success" : tone === "warn" ? "bg-amber-400" : "bg-mint";
  return (
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface-2/40 p-3">
      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${dot}`} />
      <p className="text-xs leading-relaxed text-muted-foreground">{text}</p>
    </div>
  );
}

function GoalRow({
  name,
  icon: Icon,
  current,
  target,
  eta,
  tone,
}: {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  current: number;
  target: number;
  eta: string;
  tone: "mint" | "positive" | "warn";
}) {
  const pct = Math.round((current / target) * 100);
  const barColor =
    tone === "positive" ? "bg-success" : tone === "warn" ? "bg-amber-400" : "bg-mint";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint/10 text-mint">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{name}</div>
            <div className="text-xs text-muted-foreground">Target: {eta}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">{inr(current)}</div>
          <div className="text-xs text-muted-foreground">of {inr(target)}</div>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-right text-[11px] text-muted-foreground">{pct}%</div>
    </div>
  );
}

/* ---------- GOALS ---------- */
function GoalsView() {
  const totalCurrent = goalsList.reduce((s, g) => s + g.current, 0);
  const totalTarget = goalsList.reduce((s, g) => s + g.target, 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Target} label="Total Goals" value="5" tone="mint" />
        <Kpi icon={CheckCircle2} label="On Track" value="3" tone="positive" />
        <Kpi icon={PiggyBank} label="Saved" value={inr(totalCurrent)} tone="mint" />
        <Kpi icon={TrendingUp} label="Overall Progress" value={`${Math.round((totalCurrent / totalTarget) * 100)}%`} tone="positive" />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {goalsList.map((g) => (
          <GoalCard key={g.name} {...g} />
        ))}
        <button className="grid min-h-[180px] place-items-center rounded-2xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition hover:border-mint/40 hover:text-mint">
          <div className="flex flex-col items-center gap-2">
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">Add New Goal</span>
          </div>
        </button>
      </div>
    </div>
  );
}

function GoalCard({
  name,
  icon: Icon,
  current,
  target,
  eta,
  tone,
}: {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  current: number;
  target: number;
  eta: string;
  tone: "mint" | "positive" | "warn";
}) {
  const pct = Math.round((current / target) * 100);
  const barColor =
    tone === "positive" ? "bg-success" : tone === "warn" ? "bg-amber-400" : "bg-mint";
  return (
    <div className="rounded-2xl border border-border bg-card p-5 transition hover:border-mint/40">
      <div className="flex items-start justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-mint/10 text-mint">
          <Icon className="h-5 w-5" />
        </div>
        <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          {eta}
        </span>
      </div>
      <div className="mt-4 font-display text-base font-semibold">{name}</div>
      <div className="mt-1 text-xs text-muted-foreground">
        {inr(current)} of {inr(target)}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{pct}% complete</span>
        <span className="font-medium text-mint">{inr(target - current)} left</span>
      </div>
    </div>
  );
}

/* ---------- RETIREMENT ---------- */
const retirementData = [
  { age: 35, corpus: 49, target: 49 },
  { age: 40, corpus: 95, target: 110 },
  { age: 45, corpus: 180, target: 210 },
  { age: 50, corpus: 305, target: 360 },
  { age: 55, corpus: 480, target: 560 },
  { age: 60, corpus: 720, target: 820 },
];

function RetirementView() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Calendar} label="Retirement Age" value="60" delta="25 yrs to go" tone="mint" />
        <Kpi icon={Target} label="Target Corpus" value="₹8.2 Cr" delta="Monthly need ₹2.5L" tone="warn" />
        <Kpi icon={PiggyBank} label="Current Corpus" value="₹48.7 L" delta="5.9% of target" tone="positive" />
        <Kpi icon={TrendingUp} label="Monthly SIP" value="₹65,000" delta="Recommended ₹78K" tone="negative" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 font-display text-base font-semibold">Retirement Projection</div>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={retirementData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1B3249" />
              <XAxis dataKey="age" stroke="#6E8294" fontSize={11} tickFormatter={(v) => `Age ${v}`} />
              <YAxis stroke="#6E8294" fontSize={11} tickFormatter={(v) => `${v}L`} />
              <Tooltip contentStyle={{ background: "#102634", border: "1px solid #1B3249", borderRadius: 8 }} />
              <Legend />
              <Line type="monotone" dataKey="corpus" stroke="#14D8CF" strokeWidth={2.5} name="Projected" />
              <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 5" name="Target" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 font-display text-base font-semibold">Assumptions</div>
          <div className="space-y-3 text-sm">
            <AssumptionRow label="Current Age" value="35" />
            <AssumptionRow label="Retirement Age" value="60" />
            <AssumptionRow label="Life Expectancy" value="85" />
            <AssumptionRow label="Inflation" value="6.5%" />
            <AssumptionRow label="Pre-retirement Returns" value="12%" />
            <AssumptionRow label="Post-retirement Returns" value="7%" />
            <AssumptionRow label="Monthly Expense (today)" value="₹65,000" />
          </div>
          <Button className="mt-4 w-full bg-mint text-mint-foreground hover:bg-mint/90">
            Adjust Plan
          </Button>
        </div>
      </div>
    </div>
  );
}

function AssumptionRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 pb-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}

/* ---------- FIRE ---------- */
function FireView() {
  const [sip, setSip] = useState(65000);
  const fireNumber = 42000000;
  const current = 4870000;
  const pct = (current / fireNumber) * 100;

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-mint/30 bg-gradient-to-br from-card via-card to-mint/10 p-6">
        <div className="flex items-center gap-2 text-mint">
          <Flame className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">FIRE Number</span>
        </div>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">₹4.2 Cr</div>
            <p className="mt-1 text-sm text-muted-foreground">25× annual expense at 4% safe withdrawal · projected age 47</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Progress</div>
            <div className="font-display text-2xl font-bold text-mint">{pct.toFixed(1)}%</div>
          </div>
        </div>
        <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full bg-gradient-to-r from-mint to-emerald-400" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={PiggyBank} label="Current Corpus" value={inr(current)} tone="mint" />
        <Kpi icon={Calendar} label="Years to FIRE" value="14.2" tone="warn" />
        <Kpi icon={TrendingUp} label="Monthly SIP" value={inr(sip)} tone="positive" />
        <Kpi icon={Target} label="Annual Expense" value="₹16.8L" tone="mint" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 font-display text-base font-semibold">FIRE Trajectory</div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={projection}>
              <defs>
                <linearGradient id="fireg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#14D8CF" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#14D8CF" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1B3249" />
              <XAxis dataKey="year" stroke="#6E8294" fontSize={11} />
              <YAxis stroke="#6E8294" fontSize={11} tickFormatter={(v) => `${v}L`} />
              <Tooltip contentStyle={{ background: "#102634", border: "1px solid #1B3249", borderRadius: 8 }} />
              <Area type="monotone" dataKey="corpus" stroke="#14D8CF" strokeWidth={2.5} fill="url(#fireg)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 font-display text-base font-semibold">FIRE Calculator</div>
          <div className="space-y-4">
            <div>
              <div className="mb-2 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Monthly SIP</span>
                <span className="font-medium text-mint">{inr(sip)}</span>
              </div>
              <input
                type="range"
                min={10000}
                max={200000}
                step={5000}
                value={sip}
                onChange={(e) => setSip(Number(e.target.value))}
                className="w-full accent-mint"
              />
            </div>
            <div className="rounded-xl border border-border/60 bg-surface-2/40 p-3">
              <div className="text-xs text-muted-foreground">Estimated FIRE Age</div>
              <div className="mt-1 font-display text-2xl font-bold text-mint">
                {Math.max(40, Math.round(60 - (sip - 30000) / 8000))}
              </div>
            </div>
            <Button className="w-full bg-mint text-mint-foreground hover:bg-mint/90">
              Apply Plan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------- BUDGET ---------- */
const budgetData = [
  { name: "Food", spent: 12400, limit: 15000, color: "#14D8CF" },
  { name: "Rent", spent: 28000, limit: 28000, color: "#60a5fa" },
  { name: "Transport", spent: 6200, limit: 8000, color: "#a78bfa" },
  { name: "Shopping", spent: 8950, limit: 7000, color: "#f59e0b" },
  { name: "Bills", spent: 4800, limit: 6000, color: "#34d399" },
  { name: "Entertainment", spent: 2050, limit: 4000, color: "#f472b6" },
];

function BudgetView() {
  const totalSpent = budgetData.reduce((s, b) => s + b.spent, 0);
  const totalLimit = budgetData.reduce((s, b) => s + b.limit, 0);
  const remaining = totalLimit - totalSpent;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Wallet} label="Monthly Budget" value={inr(totalLimit)} tone="mint" />
        <Kpi icon={TrendingUp} label="Spent" value={inr(totalSpent)} delta={`${Math.round((totalSpent / totalLimit) * 100)}% used`} tone="negative" />
        <Kpi icon={PiggyBank} label="Remaining" value={inr(remaining)} tone="positive" />
        <Kpi icon={Target} label="On Track" value={`${budgetData.filter((b) => b.spent <= b.limit).length}/${budgetData.length}`} tone="mint" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 font-display text-base font-semibold">Category Budgets</div>
          <div className="space-y-4">
            {budgetData.map((b) => {
              const pct = Math.round((b.spent / b.limit) * 100);
              const over = b.spent > b.limit;
              return (
                <div key={b.name}>
                  <div className="mb-1.5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                      <span className="text-sm font-medium">{b.name}</span>
                    </div>
                    <div className="text-xs">
                      <span className={over ? "font-semibold text-destructive" : "font-semibold"}>
                        {inr(b.spent)}
                      </span>
                      <span className="text-muted-foreground"> / {inr(b.limit)}</span>
                    </div>
                  </div>
                  <Progress value={Math.min(100, pct)} className="h-2" />
                  {over && (
                    <div className="mt-1 text-[11px] text-destructive">
                      Over budget by {inr(b.spent - b.limit)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 font-display text-base font-semibold">Allocation</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={budgetData} dataKey="limit" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={2}>
                {budgetData.map((b) => (
                  <Cell key={b.name} fill={b.color} stroke="none" />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#102634", border: "1px solid #1B3249", borderRadius: 8 }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1.5">
            {budgetData.map((b) => (
              <div key={b.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ background: b.color }} />
                  <span className="text-muted-foreground">{b.name}</span>
                </div>
                <span className="font-medium">{Math.round((b.limit / totalLimit) * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 font-display text-base font-semibold">Spent vs Limit</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={budgetData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1B3249" />
            <XAxis dataKey="name" stroke="#6E8294" fontSize={11} />
            <YAxis stroke="#6E8294" fontSize={11} tickFormatter={(v) => `${v / 1000}K`} />
            <Tooltip contentStyle={{ background: "#102634", border: "1px solid #1B3249", borderRadius: 8 }} />
            <Legend />
            <Bar dataKey="limit" fill="#1B3249" name="Limit" radius={[6, 6, 0, 0]} />
            <Bar dataKey="spent" fill="#14D8CF" name="Spent" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}