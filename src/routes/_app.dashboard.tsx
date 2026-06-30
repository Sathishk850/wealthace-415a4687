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
  { name: "Equity", value: 48.6, color: "#3b82f6" },
  { name: "Mutual Funds", value: 28.7, color: "#14d8cf" },
  { name: "Debt", value: 12.3, color: "#d9b800" },
  { name: "Gold", value: 6.1, color: "#ff8a3c" },
  { name: "Cash & Others", value: 4.3, color: "#a855f7" },
];

function fmt(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

function Dashboard() {
  const [historyOpen, setHistoryOpen] = useState(false);

  return (
    <TooltipProvider delayDuration={150}>
      <div className="grid grid-cols-12 gap-4">
        {/* Hero — Net Worth */}
        <Card className="col-span-12 p-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <div>
              <CardHeader title="Net Worth" tip="Total of assets minus liabilities across all your accounts." />
              <div className="mt-3 font-display text-4xl font-bold tracking-tight text-foreground md:text-5xl">
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
                <button className="inline-flex items-center gap-2 rounded-lg bg-mint px-4 py-2 text-sm font-semibold text-mint-foreground transition hover:bg-[var(--primary-hover)]">
                  <Camera className="h-4 w-4" /> Snapshot
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
              <RangeChart data={NET_SERIES} height={220} />
            </div>
          </div>
        </Card>

        {/* Financial Snapshot — full width 5 cards */}
        <div className="col-span-12">
          <h2 className="mb-3 text-sm font-semibold text-muted-foreground">Financial Snapshot</h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            <SnapCard label="Assets" value="₹ 1,15,38,850" delta="7.60% vs last month" up icon={Wallet} accent="#14d8cf" series={MICRO_UP} />
            <SnapCard label="Liabilities" value="₹ 42,24,000" delta="2.10% vs last month" up={false} icon={Banknote} accent="#ff4d4d" series={MICRO_DOWN} />
            <SnapCard label="Investments" value="₹ 58,78,450" delta="6.35% vs last month" up icon={TrendingUp} accent="#00c896" series={MICRO_UP} />
            <SnapCard label="Savings" value="₹ 6,89,600" delta="1.25% vs last month" up icon={PiggyBank} accent="#3b82f6" series={MICRO_UP} />
            <SnapCard
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

        {/* Asset Allocation + Portfolio Performance */}
        <Card className="col-span-12 p-6 lg:col-span-6">
          <CardHeader title="Asset Allocation" tip="Breakdown of your investments by asset class." />
          <div className="mt-4 grid grid-cols-1 items-center gap-4 sm:grid-cols-[180px_1fr]">
            <div className="relative mx-auto h-[180px] w-[180px]">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={ALLOCATION}
                    dataKey="value"
                    innerRadius={58}
                    outerRadius={86}
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
                  <div className="text-[11px] text-muted-foreground">Total</div>
                  <div className="font-display text-base font-bold text-foreground">
                    ₹73,14,850
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-2.5 text-sm">
              {ALLOCATION.map((a) => (
                <div key={a.name} className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                    {a.name}
                  </span>
                  <span className="font-semibold text-foreground">{a.value}%</span>
                </div>
              ))}
              <div className="pt-2 text-right">
                <a className="inline-flex items-center gap-1 text-xs font-semibold text-mint" href="#">
                  View Details <ArrowRight className="h-3 w-3" />
                </a>
              </div>
            </div>
          </div>
        </Card>

        <Card className="col-span-12 p-6 lg:col-span-6">
          <div className="flex items-start justify-between gap-3">
            <CardHeader title="Portfolio Performance" tip="Investment portfolio value over time." />
          </div>
          <div className="mt-2 flex items-end justify-between gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Current Value</div>
              <div className="mt-1 font-display text-2xl font-bold text-foreground">
                ₹ 58,78,450
              </div>
              <div className="mt-1 text-xs font-semibold text-success">
                ▲ ₹1,48,850 (2.60%)
              </div>
            </div>
          </div>
          <div className="mt-3 h-[180px]">
            <RangeChart data={PORT_SERIES} height={180} compact />
          </div>
          <div className="mt-2 text-right">
            <a className="inline-flex items-center gap-1 text-xs font-semibold text-mint" href="#">
              View Portfolio <ArrowRight className="h-3 w-3" />
            </a>
          </div>
        </Card>

        {/* Financial Score + Goal Progress */}
        <Card className="col-span-12 p-6 lg:col-span-6">
          <CardHeader title="Financial Score" tip="Composite score of your overall financial health." />
          <div className="mt-4 grid grid-cols-[160px_1fr] items-center gap-6">
            <ScoreRing score={82} />
            <div className="space-y-2.5 text-sm">
              {[
                { k: "Asset Allocation", v: 92 },
                { k: "Debt Management", v: 74 },
                { k: "Savings Rate", v: 81 },
                { k: "Cash Flow", v: 79 },
                { k: "Diversification", v: 88 },
              ].map((row) => (
                <div key={row.k} className="flex items-center gap-3">
                  <span className="w-32 shrink-0 text-muted-foreground">{row.k}</span>
                  <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-surface-2">
                    <div
                      className="absolute inset-y-0 left-0 rounded-full bg-mint"
                      style={{ width: `${row.v}%` }}
                    />
                  </div>
                  <span className="w-8 text-right font-semibold text-foreground">{row.v}</span>
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

        <Card className="col-span-12 p-6 lg:col-span-6">
          <div className="flex items-center justify-between">
            <CardHeader title="Goal Progress" tip="Progress toward your active financial goals." />
            <a className="inline-flex items-center gap-1 text-xs font-semibold text-mint" href="#">
              View All Goals <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <GoalCard icon={Home} color="#14d8cf" name="House Purchase" pct={68} saved="₹34,00,000" target="₹50,00,000" eta="Dec 2028" />
            <GoalCard icon={Car} color="#d9b800" name="Car Purchase" pct={35} saved="₹3,50,000" target="₹10,00,000" eta="Jun 2027" />
            <GoalCard icon={Plane} color="#a855f7" name="Europe Trip" pct={81} saved="₹2,43,000" target="₹3,00,000" eta="Oct 2026" />
          </div>
        </Card>

        {/* Financial Insights — full width */}
        <Card className="col-span-12 p-6">
          <div className="flex items-center justify-between">
            <CardHeader title="Financial Insights" tip="Smart, personalized observations about your finances." />
            <a className="inline-flex items-center gap-1 text-xs font-semibold text-mint" href="#">
              View All Insights <ArrowRight className="h-3 w-3" />
            </a>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Insight icon={TrendingUp} tint="#14d8cf" title="Savings rate increased 8%" body="Great job! You're saving more than 75% of users." />
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
  data: { i: number; v: number }[];
  height: number;
  compact?: boolean;
}) {
  const [range, setRange] = useState<ChartRangeValue>(() => defaultChartRange("1M"));
  const id = `g-${Math.random().toString(36).slice(2, 8)}`;
  return (
    <div className="flex h-full flex-col">
      <div className="mb-2 flex justify-end">
        <ChartRangeSelector value={range} onChange={setRange} />
      </div>
      <div style={{ height: compact ? height : height }} className="flex-1">
        <ResponsiveContainer>
          <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#14d8cf" stopOpacity={0.45} />
                <stop offset="100%" stopColor="#14d8cf" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis
              dataKey="i"
              axisLine={false}
              tickLine={false}
              tick={{ fill: "var(--muted-foreground)", fontSize: 10 }}
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

function ScoreRing({ score }: { score: number }) {
  const r = 58;
  const c = 2 * Math.PI * r;
  const off = c - (c * score) / 100;
  return (
    <div className="relative grid h-[150px] w-[150px] place-items-center">
          <svg width={150} height={150} className="-rotate-90">
            <circle cx={75} cy={75} r={r} stroke="var(--border)" strokeWidth={10} fill="none" />
        <circle
          cx={75}
          cy={75}
          r={r}
              stroke="var(--primary)"
          strokeWidth={10}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <div className="absolute text-center">
        <div className="font-display text-3xl font-bold text-foreground">{score}</div>
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