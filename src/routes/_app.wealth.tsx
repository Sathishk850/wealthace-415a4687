import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Wallet,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Plus,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ChevronDown,
  ArrowUpDown,
  List,
  LayoutGrid,
  MoreVertical,
  Home,
  Car,
  Landmark,
  Coins,
} from "lucide-react";
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
} from "recharts";

export const Route = createFileRoute("/_app/wealth")({
  head: () => ({
    meta: [
      { title: "Wealth · FinVista" },
      { name: "description", content: "Manage assets, liabilities, investments, insurance, accounts and family wealth." },
    ],
  }),
  component: Wealth,
});

const TABS = ["Assets", "Liabilities", "Investments", "Insurance", "Accounts", "Family"] as const;

const STATS = [
  { label: "Total Assets", value: "₹1,15,38,850", delta: "+7.60% vs last month", up: true, icon: Wallet, tint: "bg-mint/10 text-mint" },
  { label: "Monthly Change", value: "₹2,45,000", delta: "+2.18% vs last month", up: true, icon: TrendingUp, tint: "bg-emerald-400/10 text-emerald-300" },
  { label: "Holdings", value: "148", delta: "Across 6 categories", up: null, icon: PieIcon, tint: "bg-violet-400/10 text-violet-300" },
  { label: "Asset Growth (YTD)", value: "₹8,42,150", delta: "+12.40% this year", up: true, icon: BarChart3, tint: "bg-emerald-400/10 text-emerald-300" },
];

const ALLOC = [
  { name: "Real Estate", pct: 42.3, amt: "₹48,74,000", color: "#3B82F6" },
  { name: "Investments", pct: 31.8, amt: "₹36,66,850", color: "#14D8CF" },
  { name: "Gold", pct: 10.7, amt: "₹12,29,000", color: "#F59E0B" },
  { name: "Cash & Bank", pct: 8.2, amt: "₹9,45,000", color: "#10B981" },
  { name: "Vehicle", pct: 5.7, amt: "₹6,55,000", color: "#8B5CF6" },
  { name: "Other Assets", pct: 1.3, amt: "₹1,68,000", color: "#F97316" },
];

const TREND = [
  { m: "Jan '25", v: 92 },
  { m: "Feb '25", v: 95 },
  { m: "Mar '25", v: 98 },
  { m: "Apr '25", v: 104 },
  { m: "May '25", v: 110 },
  { m: "Jun '25", v: 115 },
];

const ASSETS = [
  { name: "Residential House", category: "Real Estate", value: "₹48,00,000", gain: "+₹3,60,000", gainPct: "(8.11%)", ret: "+8.11%", up: true, date: "26 Jun 2026", icon: Home, tint: "bg-blue-500/10 text-blue-400" },
  { name: "Car (Toyota Innova)", category: "Vehicle", value: "₹8,20,000", gain: "-₹40,000", gainPct: "(-4.65%)", ret: "-4.65%", up: false, date: "25 Jun 2026", icon: Car, tint: "bg-violet-500/10 text-violet-400" },
  { name: "EPF Balance", category: "Retirement", value: "₹12,50,000", gain: "+₹1,05,600", gainPct: "(9.22%)", ret: "+9.22%", up: true, date: "26 Jun 2026", icon: Landmark, tint: "bg-emerald-500/10 text-emerald-400" },
  { name: "Gold (Physical)", category: "Gold", value: "₹12,29,000", gain: "+₹85,000", gainPct: "(7.43%)", ret: "+7.43%", up: true, date: "26 Jun 2026", icon: Coins, tint: "bg-amber-500/10 text-amber-400" },
];

function Wealth() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Assets");
  const total = useMemo(() => "₹1,15,38,850", []);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Wealth</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track, analyze, and grow your overall financial wealth.
          </p>
        </div>
        <button className="inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-[#04121C] transition hover:brightness-110">
          <Plus className="h-4 w-4" /> Add Asset
        </button>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`relative px-4 py-2.5 text-sm font-medium transition ${
              tab === t ? "text-mint" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {tab === t && (
              <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-mint" />
            )}
          </button>
        ))}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STATS.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${s.tint}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {s.label} <Info className="h-3 w-3 opacity-60" />
                </div>
                <div className="mt-1 font-display text-xl font-bold text-foreground">{s.value}</div>
                <div
                  className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
                    s.up === null ? "text-muted-foreground" : s.up ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {s.up !== null && (s.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
                  {s.delta}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Allocation + Trend */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-5">
          <h3 className="text-sm font-semibold text-foreground">Asset Allocation</h3>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={ALLOC} dataKey="pct" innerRadius={58} outerRadius={82} paddingAngle={2} stroke="none">
                    {ALLOC.map((a) => (
                      <Cell key={a.name} fill={a.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-display text-base font-bold text-foreground">{total}</div>
                  <div className="text-[10px] text-muted-foreground">Total Assets</div>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {ALLOC.map((a) => (
                <div key={a.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-xs">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                    <span className="truncate text-foreground">{a.name}</span>
                  </div>
                  <span className="font-medium text-muted-foreground">{a.pct}%</span>
                  <span className="text-right font-medium text-foreground">{a.amt}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-mint hover:underline">
            View full breakdown →
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Asset Growth Trend</h3>
            <button className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">
              6M <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <div className="h-[230px]">
            <ResponsiveContainer>
              <AreaChart data={TREND} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="growth" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14D8CF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#14D8CF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" tick={{ fill: "#6E8294", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: "#6E8294", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `₹${v}L`}
                />
                <Tooltip
                  contentStyle={{ background: "#0D2232", border: "1px solid #1B3249", borderRadius: 8, fontSize: 12 }}
                  formatter={(v: number) => [`₹${v}L`, "Value"]}
                />
                <Area type="monotone" dataKey="v" stroke="#14D8CF" strokeWidth={2.5} fill="url(#growth)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Assets table */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search assets..."
              className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
            />
          </div>
          <FilterBtn label="All Categories" />
          <FilterBtn label="All Status" />
          <FilterBtn label="Sort: Latest" icon={ArrowUpDown} />
          <div className="ml-auto flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1">
            <button className="rounded-lg bg-mint/15 p-1.5 text-mint"><List className="h-4 w-4" /></button>
            <button className="rounded-lg p-1.5 text-muted-foreground"><LayoutGrid className="h-4 w-4" /></button>
          </div>
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pl-2 font-medium">Asset Name</th>
                <th className="py-3 font-medium">Category</th>
                <th className="py-3 font-medium">Current Value</th>
                <th className="py-3 font-medium">Gain / Loss</th>
                <th className="py-3 font-medium">All Time Return</th>
                <th className="py-3 font-medium">Last Updated</th>
                <th className="py-3 pr-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {ASSETS.map((a) => (
                <tr key={a.name} className="border-b border-border/50 last:border-0 hover:bg-surface-2/40">
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-8 w-8 place-items-center rounded-lg ${a.tint}`}>
                        <a.icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-foreground">{a.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground">{a.category}</td>
                  <td className="py-3 font-medium text-foreground">{a.value}</td>
                  <td className={`py-3 font-medium ${a.up ? "text-emerald-400" : "text-rose-400"}`}>
                    <span className="inline-flex items-center gap-1">
                      {a.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {a.gain} <span className="text-xs opacity-80">{a.gainPct}</span>
                    </span>
                  </td>
                  <td className={`py-3 font-medium ${a.up ? "text-emerald-400" : "text-rose-400"}`}>
                    <span className="inline-flex items-center gap-1">
                      {a.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                      {a.ret}
                    </span>
                  </td>
                  <td className="py-3 text-muted-foreground">{a.date}</td>
                  <td className="py-3 pr-2">
                    <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                      <MoreVertical className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterBtn({ label, icon: Icon = ChevronDown }: { label: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
      {label} <Icon className="h-3 w-3" />
    </button>
  );
}