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
  CreditCard,
  Banknote,
  ShoppingBag,
  TrendingDown,
  Percent,
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
  LineChart,
  Line,
  CartesianGrid,
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

const LIAB_STATS = [
  { label: "Total Liabilities", value: "₹42,24,000", delta: "-2.10% vs last month", up: false, icon: CreditCard, tint: "bg-rose-500/10 text-rose-400" },
  { label: "Monthly Change", value: "-₹89,200", delta: "-2.05% vs last month", up: false, icon: TrendingDown, tint: "bg-emerald-500/10 text-emerald-400" },
  { label: "Total EMIs (Monthly)", value: "₹83,750", delta: "+1.25% vs last month", up: true, icon: Banknote, tint: "bg-amber-500/10 text-amber-400" },
  { label: "Liability Reduction (YTD)", value: "₹1,92,000", delta: "+4.35% this year", up: true, icon: Percent, tint: "bg-violet-500/10 text-violet-400" },
];

const LIAB_ALLOC = [
  { name: "Home Loan", pct: 61.2, amt: "₹25,85,000", color: "#3B82F6" },
  { name: "Car Loan", pct: 18.5, amt: "₹7,81,000", color: "#F59E0B" },
  { name: "Personal Loan", pct: 12.1, amt: "₹5,11,000", color: "#8B5CF6" },
  { name: "Credit Card", pct: 6.0, amt: "₹2,53,000", color: "#EF4444" },
  { name: "Other Liabilities", pct: 2.2, amt: "₹94,000", color: "#10B981" },
];

const LIAB_TREND = [
  { m: "Jan '25", v: 50 },
  { m: "Feb '25", v: 53 },
  { m: "Mar '25", v: 70 },
  { m: "Apr '25", v: 85 },
  { m: "May '25", v: 105 },
  { m: "Jun '25", v: 125 },
];

const LIABILITIES = [
  { name: "Home Loan", category: "Home Loan", lender: "SBI Bank", outstanding: "₹25,85,000", emi: "₹62,500", rate: "8.50%", due: "05 Jul 2026", status: "Active", icon: Home, tint: "bg-blue-500/10 text-blue-400" },
  { name: "Car Loan (Toyota Innova)", category: "Car Loan", lender: "HDFC Bank", outstanding: "₹7,81,000", emi: "₹14,250", rate: "9.20%", due: "12 Jul 2026", status: "Active", icon: Car, tint: "bg-violet-500/10 text-violet-400" },
  { name: "Personal Loan", category: "Personal Loan", lender: "ICICI Bank", outstanding: "₹5,11,000", emi: "₹9,850", rate: "10.50%", due: "18 Jul 2026", status: "Active", icon: Banknote, tint: "bg-amber-500/10 text-amber-400" },
  { name: "Credit Card Outstanding", category: "Credit Card", lender: "HDFC Bank", outstanding: "₹2,53,000", emi: "—", rate: "36.00%", due: "—", status: "Due Soon", icon: CreditCard, tint: "bg-rose-500/10 text-rose-400" },
  { name: "Buy Now Pay Later", category: "Other Liabilities", lender: "LazyPay", outstanding: "₹94,000", emi: "—", rate: "0.00%", due: "—", status: "Closed", icon: ShoppingBag, tint: "bg-emerald-500/10 text-emerald-400" },
];

function Wealth() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Assets");
  const total = useMemo(() => "₹1,15,38,850", []);
  const liabTotal = "₹42,24,000";

  const addLabel =
    tab === "Liabilities" ? "Add Liability"
    : tab === "Investments" ? "Add Investment"
    : tab === "Insurance" ? "Add Policy"
    : tab === "Accounts" ? "Add Account"
    : tab === "Family" ? "Add Member"
    : "Add Asset";

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
          <Plus className="h-4 w-4" /> {addLabel}
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

      {tab === "Liabilities" ? (
        <LiabilitiesView total={liabTotal} />
      ) : tab === "Investments" ? (
        <InvestmentsView />
      ) : tab !== "Assets" ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">
          {tab} module coming soon.
        </div>
      ) : (
      <>
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
      </>
      )}
    </div>
  );
}

function LiabilitiesView({ total }: { total: string }) {
  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {LIAB_STATS.map((s) => (
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
                <div className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${s.up ? "text-emerald-400" : "text-rose-400"}`}>
                  {s.up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {s.delta}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-5">
          <h3 className="text-sm font-semibold text-foreground">Liability Breakdown</h3>
          <div className="mt-4 flex items-center gap-5">
            <div className="relative h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={LIAB_ALLOC} dataKey="pct" innerRadius={58} outerRadius={82} paddingAngle={2} stroke="none">
                    {LIAB_ALLOC.map((a) => (
                      <Cell key={a.name} fill={a.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-display text-base font-bold text-foreground">{total}</div>
                  <div className="text-[10px] text-muted-foreground">Total Liabilities</div>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {LIAB_ALLOC.map((a) => (
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
            <h3 className="text-sm font-semibold text-foreground">Liability Trend</h3>
            <button className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">
              6M <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <div className="h-[230px]">
            <ResponsiveContainer>
              <AreaChart data={LIAB_TREND} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="liabGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#EF4444" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
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
                <Area type="monotone" dataKey="v" stroke="#EF4444" strokeWidth={2.5} fill="url(#liabGrad)" dot={{ r: 2.5, fill: "#EF4444" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search liabilities..."
              className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
            />
          </div>
          <FilterBtn label="All Categories" />
          <FilterBtn label="All Lenders" />
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
                <th className="py-3 pl-2 font-medium">Liability Name</th>
                <th className="py-3 font-medium">Category</th>
                <th className="py-3 font-medium">Lender</th>
                <th className="py-3 font-medium">Outstanding Amount</th>
                <th className="py-3 font-medium">EMI (Monthly)</th>
                <th className="py-3 font-medium">Interest Rate</th>
                <th className="py-3 font-medium">Due Date</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 pr-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {LIABILITIES.map((l) => (
                <tr key={l.name} className="border-b border-border/50 last:border-0 hover:bg-surface-2/40">
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-8 w-8 place-items-center rounded-lg ${l.tint}`}>
                        <l.icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-foreground">{l.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground">{l.category}</td>
                  <td className="py-3 text-muted-foreground">{l.lender}</td>
                  <td className="py-3 font-medium text-foreground">{l.outstanding}</td>
                  <td className="py-3 text-foreground">{l.emi}</td>
                  <td className="py-3 text-foreground">{l.rate}</td>
                  <td className="py-3 text-muted-foreground">{l.due}</td>
                  <td className="py-3">
                    <StatusPill status={l.status} />
                  </td>
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-border pt-4 text-xs">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <span className="text-muted-foreground">Total Liabilities <span className="ml-2 font-semibold text-rose-400">₹42,24,000</span></span>
            <span className="text-muted-foreground">Total EMIs (Monthly) <span className="ml-2 font-semibold text-foreground">₹83,750</span></span>
            <span className="text-muted-foreground">Weighted Avg. Interest Rate <span className="ml-2 font-semibold text-foreground">8.96%</span></span>
          </div>
        </div>
      </div>
    </>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    Active: "bg-emerald-500/15 text-emerald-400",
    "Due Soon": "bg-rose-500/15 text-rose-400",
    Closed: "bg-muted/30 text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? "bg-muted/30 text-muted-foreground"}`}>
      {status}
    </span>
  );
}

function FilterBtn({ label, icon: Icon = ChevronDown }: { label: string; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <button className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">
      {label} <Icon className="h-3 w-3" />
    </button>
  );
}

const INV_SUBTABS = ["Overview", "Mutual Funds", "Stocks", "ETFs", "Bonds", "Gold", "NPS", "Others"] as const;

const INV_STATS = [
  { label: "Total Investment Value", value: "₹18,64,250", delta: "+12.45% vs last month", up: true, icon: Wallet, tint: "bg-mint/10 text-mint" },
  { label: "Monthly Change", value: "₹68,750", delta: "+4.32% vs last month", up: true, icon: PieIcon, tint: "bg-violet-400/10 text-violet-300" },
  { label: "Overall Gain / Loss", value: "₹1,88,950", delta: "+11.28% (Absolute)", up: true, icon: BarChart3, tint: "bg-amber-400/10 text-amber-300" },
  { label: "XIRR (All Investments)", value: "15.62%", delta: "+1.35% vs last month", up: true, icon: TrendingUp, tint: "bg-mint/10 text-mint" },
];

const INV_ALLOC = [
  { name: "Mutual Funds", pct: 58.2, amt: "₹10,83,450", color: "#3B82F6" },
  { name: "Stocks", pct: 23.6, amt: "₹4,39,450", color: "#14D8CF" },
  { name: "ETFs", pct: 8.7, amt: "₹1,62,050", color: "#F59E0B" },
  { name: "Gold", pct: 5.3, amt: "₹98,750", color: "#8B5CF6" },
  { name: "Others", pct: 4.2, amt: "₹80,550", color: "#F97316" },
];

const INV_TREND = [
  { m: "Jan '25", v: 14.2 },
  { m: "Feb '25", v: 14.9 },
  { m: "Mar '25", v: 15.6 },
  { m: "Apr '25", v: 16.4 },
  { m: "May '25", v: 17.5 },
  { m: "Jun '25", v: 18.6 },
];

const TOP_HOLDINGS = [
  { name: "Parag Parikh Flexi Cap Fund", sub: "Direct Growth", pct: "17.42%", val: "₹3,24,850", color: "#3B82F6" },
  { name: "NAVI Nifty 50 Index Fund", sub: "Direct Growth", pct: "11.40%", val: "₹2,12,450", color: "#14D8CF" },
  { name: "HDFC Bank Ltd", sub: "Stock", pct: "7.64%", val: "₹1,42,300", color: "#F59E0B" },
  { name: "ICICI Prudential NASDAQ 100 Index Fund", sub: "Direct Growth", pct: "9.95%", val: "₹1,85,600", color: "#8B5CF6" },
  { name: "Tata Motors Ltd", sub: "Stock", pct: "5.65%", val: "₹1,05,250", color: "#EF4444" },
];

const INVESTMENTS = [
  { name: "Parag Parikh Flexi Cap Fund", sub: "Direct Growth", type: "Mutual Fund", category: "Equity - Flexi Cap", current: "₹3,24,850", invested: "₹2,75,000", gain: "+₹49,850", gainPct: "18.13%", xirr: "16.24%", date: "11 Jun 2025", color: "#3B82F6" },
  { name: "NAVI Nifty 50 Index Fund", sub: "Direct Growth", type: "Mutual Fund", category: "Index Fund", current: "₹2,12,450", invested: "₹1,85,000", gain: "+₹27,450", gainPct: "14.84%", xirr: "13.21%", date: "11 Jun 2025", color: "#14D8CF" },
  { name: "ICICI Prudential NASDAQ 100 Index Fund", sub: "Direct Growth", type: "Mutual Fund", category: "International Fund", current: "₹1,85,600", invested: "₹1,60,000", gain: "+₹25,600", gainPct: "16.00%", xirr: "17.48%", date: "11 Jun 2025", color: "#8B5CF6" },
  { name: "HDFC Bank Ltd", sub: "", type: "Stock", category: "Banking", current: "₹1,42,300", invested: "₹1,20,000", gain: "+₹22,300", gainPct: "18.58%", xirr: "21.34%", date: "11 Jun 2025", color: "#F59E0B" },
  { name: "Tata Motors Ltd", sub: "", type: "Stock", category: "Automobile", current: "₹1,05,250", invested: "₹85,000", gain: "+₹20,250", gainPct: "23.82%", xirr: "28.11%", date: "11 Jun 2025", color: "#EF4444" },
];

const ASSET_PERF = [
  { name: "Mutual Funds", pct: 13.28, bar: 78 },
  { name: "Stocks", pct: 16.75, bar: 88 },
  { name: "ETFs", pct: 11.32, bar: 66 },
  { name: "Gold", pct: 8.45, bar: 52 },
  { name: "Others", pct: 6.21, bar: 40 },
];

function InvestmentsView() {
  const [sub, setSub] = useState<(typeof INV_SUBTABS)[number]>("Overview");
  return (
    <>
      {/* Sub-tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-border">
        {INV_SUBTABS.map((t) => (
          <button
            key={t}
            onClick={() => setSub(t)}
            className={`relative px-4 py-2 text-sm font-medium transition ${
              sub === t ? "text-mint" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t}
            {sub === t && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-mint" />}
          </button>
        ))}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {INV_STATS.map((s) => (
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
                <div className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${s.up ? "text-emerald-400" : "text-rose-400"}`}>
                  <ArrowUpRight className="h-3 w-3" />
                  {s.delta}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Allocation + Trend + Top Holdings */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-4">
          <h3 className="text-sm font-semibold text-foreground">Investment Allocation</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-[160px] w-[160px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={INV_ALLOC} dataKey="pct" innerRadius={50} outerRadius={75} paddingAngle={2} stroke="none">
                    {INV_ALLOC.map((a) => (
                      <Cell key={a.name} fill={a.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-display text-sm font-bold text-foreground">₹18,64,250</div>
                  <div className="text-[10px] text-muted-foreground">Total Value</div>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {INV_ALLOC.map((a) => (
                <div key={a.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-2 text-xs">
                  <div className="flex items-center gap-2">
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
            View full allocation →
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Investment Value Trend</h3>
            <button className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">
              6M <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <div className="h-[210px]">
            <ResponsiveContainer>
              <AreaChart data={INV_TREND} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14D8CF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#14D8CF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1B3249" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="m" tick={{ fill: "#6E8294", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6E8294", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}L`} />
                <Tooltip contentStyle={{ background: "#0D2232", border: "1px solid #1B3249", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`₹${v}L`, "Value"]} />
                <Area type="monotone" dataKey="v" stroke="#14D8CF" strokeWidth={2.5} fill="url(#invGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-3">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Top Holdings</h3>
            <button className="text-xs font-medium text-mint hover:underline">View all</button>
          </div>
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-wider text-muted-foreground">
            <span>Holding</span>
            <span>Value</span>
          </div>
          <div className="space-y-3">
            {TOP_HOLDINGS.map((h) => (
              <div key={h.name} className="flex items-center gap-2">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-bold text-white" style={{ background: h.color }}>
                  {h.name.slice(0, 1)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">{h.name}</div>
                  <div className="text-[10px] text-muted-foreground">{h.sub}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs font-medium text-mint">{h.pct}</div>
                  <div className="text-[10px] text-foreground">{h.val}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Table + Asset Class Performance */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card p-4 lg:col-span-9">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold text-foreground">Investments (18)</h3>
            <div className="relative ml-2 flex-1 min-w-[180px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                placeholder="Search investments..."
                className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
              />
            </div>
            <FilterBtn label="All Types" />
            <FilterBtn label="All Status" />
            <FilterBtn label="Sort: Latest" icon={ArrowUpDown} />
            <div className="flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1">
              <button className="rounded-lg bg-mint/15 p-1.5 text-mint"><List className="h-4 w-4" /></button>
              <button className="rounded-lg p-1.5 text-muted-foreground"><LayoutGrid className="h-4 w-4" /></button>
            </div>
          </div>

          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 pl-2 font-medium">Investment Name</th>
                  <th className="py-3 font-medium">Type</th>
                  <th className="py-3 font-medium">Category</th>
                  <th className="py-3 font-medium">Current Value</th>
                  <th className="py-3 font-medium">Invested Amount</th>
                  <th className="py-3 font-medium">Gain / Loss</th>
                  <th className="py-3 font-medium">Gain %</th>
                  <th className="py-3 font-medium">XIRR</th>
                  <th className="py-3 font-medium">Last Updated</th>
                  <th className="py-3 pr-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {INVESTMENTS.map((i) => (
                  <tr key={i.name} className="border-b border-border/50 last:border-0 hover:bg-surface-2/40">
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold text-white" style={{ background: i.color }}>
                          {i.name.slice(0, 1)}
                        </span>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{i.name}</div>
                          {i.sub && <div className="text-[10px] text-muted-foreground">{i.sub}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground">{i.type}</td>
                    <td className="py-3 text-muted-foreground">{i.category}</td>
                    <td className="py-3 font-medium text-foreground">{i.current}</td>
                    <td className="py-3 text-foreground">{i.invested}</td>
                    <td className="py-3 font-medium text-emerald-400">{i.gain}</td>
                    <td className="py-3 font-medium text-emerald-400">{i.gainPct}</td>
                    <td className="py-3 font-medium text-emerald-400">{i.xirr}</td>
                    <td className="py-3 text-muted-foreground">{i.date}</td>
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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Showing 1 to 5 of 18 investments</span>
            <div className="flex items-center gap-2">
              {["‹", "1", "2", "3", "4", "›"].map((p, idx) => (
                <button key={idx} className={`h-7 min-w-7 rounded-md border border-border px-2 ${p === "1" ? "bg-mint/15 text-mint" : "text-muted-foreground hover:text-foreground"}`}>{p}</button>
              ))}
              <span className="ml-2">Rows per page:</span>
              <button className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1">5 <ChevronDown className="h-3 w-3" /></button>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Asset Class Performance</h3>
            <button className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2 py-0.5 text-[10px] text-muted-foreground">
              6M <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-4">
            {ASSET_PERF.map((a) => (
              <div key={a.name}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-foreground">{a.name}</span>
                  <span className="font-medium text-emerald-400">+ {a.pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-mint" style={{ width: `${a.bar}%` }} />
                </div>
              </div>
            ))}
          </div>
          <p className="mt-5 text-[10px] text-muted-foreground">Based on market value change in 6 months</p>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 text-mint" />
        All values are as of 11 Jun 2025. Market values are updated at the end of each day.
      </div>
    </>
  );
}