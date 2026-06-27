import { createFileRoute } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
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
  ArrowRight,
  Home,
  Car,
  Plane,
  Sparkles,
  Calendar,
  BadgeIndianRupee,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Cell,
  Line,
  LineChart,
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
import { DashboardHeader } from "@/components/dashboard-header";

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

const RANGES = ["1D", "1W", "1M", "3M", "6M", "1Y", "All"] as const;
type Range = (typeof RANGES)[number];

function genSeries(base: number, points: number, vol: number) {
  let v = base;
  return Array.from({ length: points }, (_, i) => {
    v = v + (Math.sin(i / 3) * vol + (Math.random() - 0.3) * vol);
    return { i, v: Math.max(v, base * 0.85), label: `D${i + 1}` };
  });
}

const NET_SERIES = genSeries(6500000, 30, 28000);
const PORT_SERIES = genSeries(5500000, 30, 22000);
const MICRO_UP = genSeries(100, 24, 4).map((d) => ({ ...d }));
const MICRO_DOWN = genSeries(100, 24, 4).map((d, i) => ({ ...d, v: 110 - i * 0.4 + Math.random() * 4 }));

const ALLOCATION = [
  { name: "Stocks", value: 58.2, amount: 6715430, color: "#20E7E5" },
  { name: "Mutual Funds", value: 22.5, amount: 2594230, color: "#3b82f6" },
  { name: "Gold", value: 8.7, amount: 1002430, color: "#d9b800" },
  { name: "Real Estate", value: 6.2, amount: 722930, color: "#a855f7" },
  { name: "Cash & Bank", value: 4.5, amount: 487830, color: "#34d399" },
];

const PORT_COMPARE = Array.from({ length: 9 }, (_, i) => {
  const invested = 5142 + i * 70 + Math.round(Math.sin(i) * 30);
  const current = invested + 200 + i * 110 + Math.round(Math.cos(i) * 80);
  return { label: ["May", "04 Jun", "", "11 Jun", "", "18 Jun", "", "25 Jun", ""][i], invested: invested * 100, current: current * 100 };
});

const REMINDERS = [
  { name: "LIC Premium Payment", date: "30 Jun 2026", amount: "₹12,650" },
  { name: "SIP - Parag Parikh Flexi Cap", date: "01 Jul 2026", amount: "₹10,000" },
  { name: "Credit Card Payment", date: "05 Jul 2026", amount: "₹8,750" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

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
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <DashboardHeader />
        <button
          type="button"
          className="fv-press inline-flex items-center justify-between gap-3 rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 text-sm font-medium text-foreground transition hover:bg-surface"
        >
          <span className="inline-flex items-center gap-2">
            <Calendar className="h-4 w-4 text-mint" />
            {today}
          </span>
          <svg width="12" height="12" viewBox="0 0 12 12" className="text-muted-foreground"><path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
      </div>
      <div className="grid grid-cols-12 gap-4">
        {/* Hero — Net Worth */}
        <Card className="col-span-12 p-6 fv-rise" style={{ animationDelay: "40ms" }}>
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <CardHeader title="Net Worth" tip="Total of assets minus liabilities across all your accounts." />
              <div className="mt-3 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl md:text-5xl">
                ₹ 73,14,850
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm">
                <span className="inline-flex items-center gap-1.5 font-semibold text-success">
                  <ArrowUp className="h-3.5 w-3.5" /> ₹2,45,000 (2.18%)
                  <span className="text-muted-foreground font-normal"> Today</span>
                </span>
                <span className="inline-flex items-center gap-1.5 font-semibold text-danger">
                  <ArrowDown className="h-3.5 w-3.5" /> ₹51,648 (-0.70%)
                  <span className="text-muted-foreground font-normal"> This Month</span>
                </span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <button className="fv-press inline-flex items-center gap-2 rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-mint-foreground shadow-[0_8px_24px_-10px_rgba(20,216,207,0.65)] transition hover:bg-[var(--primary-hover)]">
                  <Camera className="h-4 w-4" /> Snapshot
                </button>
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="fv-press inline-flex items-center gap-2 rounded-lg border border-border bg-surface/60 px-4 py-2 text-sm font-semibold text-foreground transition hover:bg-surface"
                >
                  <History className="h-4 w-4" /> History
                </button>
              </div>
            </div>
            <div className="min-h-[300px]">
              <RangeChart data={NET_SERIES} height={300} />
            </div>
          </div>
        </Card>

        {/* Financial Snapshot — full width 5 cards */}
        <div className="col-span-12 fv-rise" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Financial Snapshot</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <SnapCard i={0} label="Assets" value="₹ 1,15,38,850" delta="7.60% vs last month" up icon={Wallet} accent="#20E7E5" series={MICRO_UP} />
            <SnapCard i={1} label="Liabilities" value="₹ 42,24,000" delta="2.10% vs last month" up={false} icon={Banknote} accent="#ff4d4d" series={MICRO_DOWN} />
            <SnapCard i={2} label="Investments" value="₹ 58,78,450" delta="6.35% vs last month" up icon={TrendingUp} accent="#00c896" series={MICRO_UP} />
            <SnapCard i={3} label="Savings" value="₹ 6,89,600" delta="1.25% vs last month" up icon={PiggyBank} accent="#3b82f6" series={MICRO_UP} />
            <SnapCard
              i={4}
              label="Net Cash Flow"
              value="₹ 1,22,800"
              delta="12.6% vs last month"
              up
              icon={ArrowLeftRight}
              accent="#a855f7"
              series={MICRO_UP}
              tip="Net Cash Flow = Total income received minus total expenses paid during the period. Positive means you're saving; negative means you're spending more than you earn."
            />
          </div>
        </div>

        {/* Investments section */}
        <div className="col-span-12 fv-rise" style={{ animationDelay: "200ms" }}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Investments</h2>
        </div>

        <Card className="col-span-12 p-5 lg:col-span-6 fv-rise" style={{ animationDelay: "240ms" }}>
          <CardHeader title="Asset Allocation" tip="Breakdown of your investments by asset class." />
          <div className="mt-2 grid grid-cols-1 items-center gap-2 sm:grid-cols-[120px_1fr]">
            <div className="relative mx-auto h-[120px] w-[120px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={ALLOCATION}
                    dataKey="value"
                    innerRadius={38}
                    outerRadius={58}
                    paddingAngle={2}
                    stroke="none"
                  >
                    {ALLOCATION.map((a) => (
                      <Cell key={a.name} fill={a.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center">
                <div className="text-center">
                  <div className="text-[10px] text-muted-foreground">Total</div>
                  <div className="font-display text-xs font-bold text-foreground">
                    ₹73,14,850
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-1 text-xs">
              {ALLOCATION.map((a) => (
                <div key={a.name} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                    {a.name}
                  </span>
                  <span className="font-semibold text-foreground">{a.value}%</span>
                </div>
              ))}
              <div className="text-right">
                <a className="inline-flex items-center gap-1 text-xs font-semibold text-mint" href="#">
                  View Details <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </Card>

        <Card className="col-span-12 p-5 lg:col-span-6 fv-rise" style={{ animationDelay: "300ms" }}>
          <CardHeader title="Portfolio Performance" tip="Investment portfolio value over time." />
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Current Value</div>
              <div className="mt-1 font-display text-xl font-bold text-foreground">
                ₹ 58,78,450
              </div>
              <div className="mt-1 text-xs font-semibold text-success">
                ▲ ₹1,48,850 (2.60%)
              </div>
            </div>
          </div>
          <div className="mt-2 h-[110px]">
            <RangeChart data={PORT_SERIES} height={110} compact />
          </div>
          <div className="text-right">
            <a className="inline-flex items-center gap-1 text-xs font-semibold text-mint" href="#">
              View Portfolio <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </Card>

        {/* Financial Health section */}
        <div className="col-span-12 fv-rise" style={{ animationDelay: "360ms" }}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Financial Health</h2>
        </div>

        <Card className="col-span-12 p-6 lg:col-span-6 fv-rise" style={{ animationDelay: "400ms" }}>
          <CardHeader title="Financial Score" tip="Composite score of your overall financial health." />
          <div className="mt-4 grid grid-cols-1 items-center gap-6 sm:grid-cols-[180px_minmax(0,1fr)]">
            <ScoreRing score={82} />
            <div className="min-w-0 space-y-2.5 text-sm">
              {[
                { k: "Asset Allocation", v: 92 },
                { k: "Debt Management", v: 74 },
                { k: "Savings Rate", v: 81 },
                { k: "Cash Flow", v: 79 },
                { k: "Diversification", v: 88 },
              ].map((row) => (
                <div key={row.k} className="flex items-center gap-3">
                  <span className="w-28 shrink-0 truncate text-muted-foreground sm:w-32">{row.k}</span>
                  <div className="relative h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-mint"
                      style={{ width: `${row.v}%` }}
                    />
                  </div>
                  <span className="w-8 shrink-0 text-right font-semibold text-foreground">{row.v}</span>
                </div>
              ))}
              <div className="pt-1 text-right">
                <a className="inline-flex items-center gap-1 text-xs font-semibold text-mint" href="#">
                  View Score Details <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </Card>

        <Card className="col-span-12 p-6 lg:col-span-6 fv-rise" style={{ animationDelay: "460ms" }}>
          <div className="flex items-center justify-between gap-3">
            <CardHeader title="Goal Progress" tip="Progress toward your active financial goals." />
            <a className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-mint" href="#">
              View All Goals <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <GoalCard icon={Home} color="#20E7E5" name="House Purchase" pct={68} saved="₹34,00,000" target="₹50,00,000" eta="Dec 2028" />
            <GoalCard icon={Car} color="#d9b800" name="Car Purchase" pct={35} saved="₹3,50,000" target="₹10,00,000" eta="Jun 2027" />
            <GoalCard icon={Plane} color="#a855f7" name="Europe Trip" pct={81} saved="₹2,43,000" target="₹3,00,000" eta="Oct 2026" />
          </div>
        </Card>

        {/* Financial Insights — compact full width */}
        <Card className="col-span-12 p-4 fv-rise" style={{ animationDelay: "520ms" }}>
          <div className="flex items-center justify-between">
            <CardHeader title="Financial Insights" tip="Smart, personalized observations about your finances." />
            <a className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-mint" href="#">
              View All Insights <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Insight icon={TrendingUp} tint="#20E7E5" title="Savings rate increased 8%" body="Great job! You're saving more than 75% of users." />
            <Insight icon={BadgeIndianRupee} tint="#d9b800" title="Expenses down by 3%" body="Nice! You spent ₹1,900 less than last month." />
            <Insight icon={Calendar} tint="#3b82f6" title="SIP of ₹25,000 is due tomorrow" body="Pn Parag Parikh Flexi Cap Fund · Due on 13 Jun 2026." />
            <Insight icon={Sparkles} tint="#a855f7" title="Emergency fund is at 72%" body="You're on track. Target 6 months of expenses." />
          </div>
        </Card>
      </div>

      <SnapshotHistoryDialog open={historyOpen} onOpenChange={setHistoryOpen} />
    </TooltipProvider>
  );
}

/* ---------- Building blocks ---------- */

function Card({ className, children, style }: { className?: string; children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={style}
      className={cn(
        "card-hover rounded-2xl border border-border/70 bg-[#010E1B]/90 shadow-[0_1px_0_rgba(255,255,255,0.03)_inset,0_8px_24px_-16px_rgba(0,0,0,0.55)]",
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
  data: { i: number; v: number }[];
  height: number;
  compact?: boolean;
}) {
  const [range, setRange] = useState<Range>("1M");
  const id = `g-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex justify-end">
        <div className="inline-flex items-center gap-0.5 rounded-lg border border-border/70 bg-surface/60 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-2 py-0.5 text-[11px] font-semibold transition",
                range === r
                  ? "border border-mint/50 bg-mint/10 text-mint"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>
      <div style={{ height: compact ? height : height }} className="flex-1">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#20E7E5" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#20E7E5" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="i"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#8aa0b3", fontSize: 10 }}
              tickFormatter={(i) => {
                const d = new Date();
                d.setDate(d.getDate() - (data.length - i));
                return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
              }}
              interval={Math.floor(data.length / 5)}
            />
            <YAxis
              orientation="right"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "#8aa0b3", fontSize: 10 }}
              width={40}
              tickFormatter={(v) => `₹${Math.round(v / 100000)}L`}
              domain={["dataMin - 50000", "dataMax + 50000"]}
            />
            <RTooltip
              cursor={{ stroke: "#20E7E5", strokeOpacity: 0.3 }}
              contentStyle={{
                background: "#010E1B",
                border: "1px solid #0c5d65",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelStyle={{ color: "#8aa0b3" }}
              formatter={(v: number) => [`₹${fmt(v)}`, "Value"]}
              labelFormatter={() => ""}
            />
            <Area
              type="monotone"
              dataKey="v"
              stroke="#20E7E5"
              strokeWidth={2}
              fill={`url(#${id})`}
              activeDot={{ r: 4, fill: "#20E7E5", stroke: "#010E1B", strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SnapCard({
  i,
  label,
  value,
  delta,
  up,
  icon: Icon,
  accent,
  series,
  tip,
}: {
  i?: number;
  label: string;
  value: string;
  delta: string;
  up: boolean;
  icon: React.ComponentType<{ className?: string }>;
  accent: string;
  series: { i: number; v: number }[];
  tip?: string;
}) {
  const id = `s-${label.replace(/\s/g, "")}`;
  return (
    <div
      className="card-hover fv-rise rounded-2xl border border-border/70 bg-[#010E1B]/90 p-5 shadow-[0_8px_24px_-16px_rgba(0,0,0,0.55)]"
      style={{ animationDelay: `${140 + (i ?? 0) * 60}ms` }}
    >
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
      <div className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
        {value}
      </div>
      <div className={cn("mt-1 inline-flex items-center gap-1 text-[11px] font-semibold", up ? "text-success" : "text-danger")}>
        {up ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
        {delta}
      </div>
      <div className="mt-3 h-12">
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

function ScoreRing({ score }: { score: number }) {
  const r = 66;
  const c = 2 * Math.PI * r;
  const off = c - (c * score) / 100;
  return (
    <div className="relative grid h-[170px] w-[170px] place-items-center">
      <svg width={170} height={170} className="-rotate-90">
        <circle cx={85} cy={85} r={r} stroke="#0a2535" strokeWidth={10} fill="none" />
        <circle
          cx={85}
          cy={85}
          r={r}
          stroke="#20E7E5"
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-4xl font-bold text-foreground">{score}</div>
        <div className="text-[10px] text-muted-foreground">/100</div>
        <div className="mt-1 text-xs font-semibold text-mint">Excellent</div>
        <div className="text-[10px] text-muted-foreground">You're doing great!</div>
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
  const r = 36;
  const c = 2 * Math.PI * r;
  return (
    <div className="card-hover overflow-hidden rounded-xl border border-border/70 bg-surface/30 p-4">
      <div className="flex items-center gap-3">
        <div className="relative grid h-[84px] w-[84px] shrink-0 place-items-center">
          <svg width={84} height={84} className="-rotate-90">
            <circle cx={42} cy={42} r={r} stroke="#0a2535" strokeWidth={7} fill="none" />
            <circle
              cx={42}
              cy={42}
              r={r}
              stroke={color}
              strokeWidth={7}
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
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold text-foreground">{name}</div>
          <div className="truncate text-xl font-bold text-foreground">{pct}%</div>
        </div>
      </div>
      <div className="mt-3 truncate text-xs text-muted-foreground">
        {saved} / {target}
      </div>
      <div className="truncate text-xs text-muted-foreground">Target: {eta}</div>
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
    <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface/30 p-3">
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
