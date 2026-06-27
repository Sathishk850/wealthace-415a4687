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
  Shield,
  ShieldCheck,
  Calendar,
  FileText,
  Heart,
  Bike,
  HeartPulse,
  Wallet2,
  ArrowRight,
  Building2,
  Users,
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
  CartesianGrid,
  BarChart,
  Bar,
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
      ) : tab === "Insurance" ? (
        <InsuranceView />
      ) : tab === "Accounts" ? (
        <AccountsView />
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

      {/* Allocation + Trend — equal width */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Investment Allocation</h3>
          <div className="mt-4 flex items-center gap-3">
            <div className="relative h-[160px] w-[160px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={INV_ALLOC} dataKey="pct" innerRadius={52} outerRadius={76} paddingAngle={2} stroke="none">
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
                <div key={a.name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                    <span className="truncate text-foreground">{a.name}</span>
                  </div>
                  <span className="shrink-0 font-medium text-muted-foreground">{a.pct}%</span>
                  <span className="shrink-0 text-right font-medium text-foreground">{a.amt}</span>
                </div>
              ))}
            </div>
          </div>
          <button className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-mint hover:underline">
            View full allocation →
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
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
      </div>

      {/* Investments table — full-width like reference */}
      <div className="rounded-2xl border border-border bg-card p-4">
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

      {/* Top Holdings + Asset Class Performance — below investments table */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-4">
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

        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-8">
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

const INS_STATS = [
  { label: "Total Coverage", value: "₹1,25,00,000", sub: "Across 6 Policies", icon: Shield, tint: "bg-blue-500/10 text-blue-400" },
  { label: "Active Policies", value: "6", sub: "100% of total policies", icon: ShieldCheck, tint: "bg-emerald-500/10 text-emerald-400", subClass: "text-mint" },
  { label: "Upcoming Premium", value: "₹18,750", sub: "Due in next 30 days", icon: Calendar, tint: "bg-amber-500/10 text-amber-400" },
  { label: "Total Annual Premium", value: "₹1,26,500", sub: "Across all policies", icon: FileText, tint: "bg-violet-500/10 text-violet-400" },
];

const INS_ALLOC = [
  { name: "Term Life Insurance", pct: 60.0, amt: "₹75,00,000", color: "#3B82F6" },
  { name: "Health Insurance", pct: 20.0, amt: "₹25,00,000", color: "#14D8CF" },
  { name: "Vehicle Insurance", pct: 12.0, amt: "₹15,00,000", color: "#F59E0B" },
  { name: "Other Insurance", pct: 8.0, amt: "₹10,00,000", color: "#8B5CF6" },
];

const INS_TIMELINE = [
  { m: "Jun '25", v: 18750, due: true },
  { m: "Jul '25", v: 6250, due: false },
  { m: "Aug '25", v: 12500, due: false },
  { m: "Sep '25", v: 3750, due: false },
  { m: "Oct '25", v: 8000, due: false },
  { m: "Nov '25", v: 2250, due: false },
];

const POLICIES = [
  { name: "Term Life Insurance Plan", type: "Term Life", provider: "HDFC Life", number: "1234 5678 9012", coverage: "₹75,00,000", premium: "₹12,000", due: "19 Jul 2025", inDays: "In 23 days", status: "Active", icon: ShieldCheck, tint: "bg-blue-500/10 text-blue-400" },
  { name: "Health Insurance Plan", type: "Health", provider: "Star Health", number: "9876 5432 1098", coverage: "₹25,00,000", premium: "₹18,500", due: "02 Aug 2025", inDays: "In 41 days", status: "Active", icon: HeartPulse, tint: "bg-emerald-500/10 text-emerald-400" },
  { name: "Car Insurance", type: "Vehicle", provider: "ICICI Lombard", number: "4567 8901 2345", coverage: "₹10,00,000", premium: "₹6,250", due: "10 Jul 2025", inDays: "In 18 days", status: "Active", icon: Car, tint: "bg-amber-500/10 text-amber-400" },
  { name: "Two Wheeler Insurance", type: "Vehicle", provider: "Bajaj Allianz", number: "6789 1234 5678", coverage: "₹5,00,000", premium: "₹2,750", due: "05 Sep 2025", inDays: "In 75 days", status: "Active", icon: Bike, tint: "bg-blue-500/10 text-blue-400" },
  { name: "Personal Accident Cover", type: "Personal Accident", provider: "HDFC Ergo", number: "1357 2468 3690", coverage: "₹10,00,000", premium: "₹1,200", due: "20 Oct 2025", inDays: "In 120 days", status: "Active", icon: Heart, tint: "bg-violet-500/10 text-violet-400" },
  { name: "Home Insurance", type: "Property", provider: "SBI General", number: "2468 1357 9753", coverage: "₹10,00,000", premium: "₹2,800", due: "15 Nov 2025", inDays: "In 146 days", status: "Active", icon: Home, tint: "bg-blue-500/10 text-blue-400" },
];

function InsuranceView() {
  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Insurance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track your insurance policies and stay protected.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {INS_STATS.map((s) => (
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
                <div className={`mt-1 text-xs font-medium ${s.subClass ?? "text-muted-foreground"}`}>{s.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Coverage + Timeline */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Insurance Coverage Overview</h3>
          <div className="mt-4 flex items-center gap-4">
            <div className="relative h-[170px] w-[170px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={INS_ALLOC} dataKey="pct" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="none">
                    {INS_ALLOC.map((a) => (
                      <Cell key={a.name} fill={a.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-display text-sm font-bold text-foreground">₹1,25,00,000</div>
                  <div className="text-[10px] text-muted-foreground">Total Coverage</div>
                </div>
              </div>
            </div>
            <div className="min-w-0 flex-1 space-y-2.5">
              {INS_ALLOC.map((a) => (
                <div key={a.name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                    <span className="truncate text-foreground">{a.name}</span>
                  </div>
                  <span className="shrink-0 text-right font-medium text-foreground">{a.amt}</span>
                  <span className="shrink-0 font-medium text-muted-foreground">{a.pct.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          </div>
          <button className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-mint hover:underline">
            View detailed breakdown →
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Premium Due Timeline</h3>
            <button className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">
              Next 6 Months <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <BarChart data={INS_TIMELINE} margin={{ top: 16, right: 8, left: -10, bottom: 0 }}>
                <CartesianGrid stroke="#1B3249" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="m" tick={{ fill: "#6E8294", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "#6E8294", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v / 1000}K`} />
                <Tooltip cursor={{ fill: "#14D8CF10" }} contentStyle={{ background: "#0D2232", border: "1px solid #1B3249", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [`₹${v.toLocaleString("en-IN")}`, "Premium"]} />
                <Bar dataKey="v" radius={[6, 6, 0, 0]} maxBarSize={42}>
                  {INS_TIMELINE.map((d) => (
                    <Cell key={d.m} fill={d.due ? "#EF4444" : "#10B981"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Policies table */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Your Policies ({POLICIES.length})</h3>
          <div className="relative ml-2 flex-1 min-w-[180px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              placeholder="Search policies..."
              className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
            />
          </div>
          <FilterBtn label="All Types" />
          <FilterBtn label="All Status" />
          <FilterBtn label="Sort: Next Due" icon={ArrowUpDown} />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pl-2 font-medium">Policy Name</th>
                <th className="py-3 font-medium">Type</th>
                <th className="py-3 font-medium">Provider</th>
                <th className="py-3 font-medium">Policy Number</th>
                <th className="py-3 font-medium">Coverage Amount</th>
                <th className="py-3 font-medium">Annual Premium</th>
                <th className="py-3 font-medium">Next Due Date</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 pr-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {POLICIES.map((p) => (
                <tr key={p.name} className="border-b border-border/50 last:border-0 hover:bg-surface-2/40">
                  <td className="py-3 pl-2">
                    <div className="flex items-center gap-3">
                      <div className={`grid h-8 w-8 place-items-center rounded-lg ${p.tint}`}>
                        <p.icon className="h-4 w-4" />
                      </div>
                      <span className="font-medium text-foreground">{p.name}</span>
                    </div>
                  </td>
                  <td className="py-3 text-muted-foreground">{p.type}</td>
                  <td className="py-3 text-muted-foreground">{p.provider}</td>
                  <td className="py-3 text-muted-foreground">{p.number}</td>
                  <td className="py-3 font-medium text-foreground">{p.coverage}</td>
                  <td className="py-3 text-foreground">{p.premium}</td>
                  <td className="py-3">
                    <div className="text-foreground">{p.due}</div>
                    <div className="text-[10px] text-rose-400">{p.inDays}</div>
                  </td>
                  <td className="py-3">
                    <StatusPill status={p.status} />
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

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
          <span>Showing 1 to {POLICIES.length} of {POLICIES.length} policies</span>
          <div className="flex items-center gap-2">
            {["‹", "1", "›"].map((p, idx) => (
              <button key={idx} className={`h-7 min-w-7 rounded-md border border-border px-2 ${p === "1" ? "bg-mint/15 text-mint" : "text-muted-foreground hover:text-foreground"}`}>{p}</button>
            ))}
            <span className="ml-2">Rows per page:</span>
            <button className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2 py-1">10 <ChevronDown className="h-3 w-3" /></button>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 text-mint" />
        Keep your policies and nominees updated to ensure claim smoothness.
      </div>
    </>
  );
}

const ACC_STATS = [
  { label: "Total Balance", value: "₹8,64,250", sub: "In 7 Accounts", icon: Landmark, tint: "bg-sky-400/10 text-sky-300", info: true },
  { label: "Total in Banks", value: "₹7,45,250", sub: "In 4 Accounts", icon: Building2, tint: "bg-emerald-400/10 text-emerald-300" },
  { label: "Total in Cards", value: "-₹1,20,000", sub: "In 2 Cards", icon: CreditCard, tint: "bg-violet-400/10 text-violet-300" },
  { label: "Total in Wallets", value: "₹39,000", sub: "In 2 Wallets", icon: Wallet2, tint: "bg-orange-400/10 text-orange-300" },
  { label: "Total Loans", value: "-₹3,25,000", sub: "In 2 Loans", icon: HeartPulse, tint: "bg-rose-400/10 text-rose-300" },
];

const ACC_ALLOC = [
  { name: "Bank Accounts", amt: "₹7,45,250", pct: 86.2, color: "#14D8CF" },
  { name: "Credit Cards", amt: "-₹1,20,000", pct: -13.9, color: "#8B5CF6" },
  { name: "Wallets", amt: "₹39,000", pct: 4.5, color: "#F59E0B" },
  { name: "Loans", amt: "-₹3,25,000", pct: -37.6, color: "#F43F5E" },
];

const QUICK_ACTIONS = [
  { label: "Add Bank Account", sub: "Connect your bank account", icon: Building2 },
  { label: "Add Credit Card", sub: "Track your card expenses", icon: CreditCard },
  { label: "Add Wallet", sub: "Add your digital wallet", icon: Wallet2 },
  { label: "Add Loan", sub: "Track your loans", icon: HeartPulse },
  { label: "Manage Categories", sub: "Manage account categories", icon: LayoutGrid },
];

const ACCOUNTS = [
  { name: "HDFC Bank - Savings", sub: "Savings Account", type: "Bank Account", num: "XXXX XXXX XXXX 5678", bal: "₹2,45,500", nominees: "Priya Sharma", icon: Building2 },
  { name: "ICICI Bank - Salary", sub: "Savings Account", type: "Bank Account", num: "XXXX XXXX XXXX 1234", bal: "₹1,85,750", nominees: "Priya Sharma", icon: Building2 },
  { name: "State Bank of India", sub: "Savings Account", type: "Bank Account", num: "XXXX XXXX XXXX 9012", bal: "₹1,95,000", nominees: "Rohit Sharma", icon: Building2 },
  { name: "Axis Bank - Savings", sub: "Savings Account", type: "Bank Account", num: "XXXX XXXX XXXX 3456", bal: "₹1,18,000", nominees: "Not Added", icon: Building2 },
  { name: "HDFC Credit Card", sub: "Credit Card", type: "Credit Card", num: "XXXX XXXX XXXX 5678", bal: "-₹75,000", nominees: "Priya Sharma", icon: CreditCard },
  { name: "ICICI Credit Card", sub: "Credit Card", type: "Credit Card", num: "XXXX XXXX XXXX 4321", bal: "-₹45,000", nominees: "Priya Sharma", icon: CreditCard },
  { name: "Paytm Wallet", sub: "Wallet", type: "Wallet", num: "9123 4567 8901", bal: "₹25,000", nominees: "Self", icon: Wallet2 },
  { name: "Amazon Pay Wallet", sub: "Wallet", type: "Wallet", num: "9876 5432 1098", bal: "₹14,000", nominees: "Self", icon: Wallet2 },
  { name: "Home Loan - SBI", sub: "Loan Card", type: "Loan", num: "HLXXXXXX7890", bal: "-₹2,50,000", nominees: "Priya Sharma", icon: Home },
  { name: "Personal Loan - HDFC", sub: "Loan Card", type: "Loan", num: "PLXXX1XXX4567", bal: "-₹75,000", nominees: "Not Added", icon: Banknote },
];

const TOP_SPEND = [
  { name: "HDFC Credit Card", amt: "-₹45,250", color: "#8B5CF6", pct: 100 },
  { name: "ICICI Credit Card", amt: "-₹28,300", color: "#8B5CF6", pct: 65 },
  { name: "Paytm Wallet", amt: "-₹12,600", color: "#F59E0B", pct: 28 },
  { name: "Amazon Pay Wallet", amt: "-₹8,450", color: "#F59E0B", pct: 19 },
];

const UPCOMING = [
  { name: "HDFC Credit Card Bill", date: "Due on 15 Jun 2025", amt: "₹25,000", due: "In 5 days", tint: "bg-rose-500/15 text-rose-300" },
  { name: "Home Loan EMI", date: "Due on 20 Jun 2025", amt: "₹25,000", due: "In 10 days", tint: "bg-orange-500/15 text-orange-300" },
  { name: "ICICI Credit Card Bill", date: "Due on 25 Jun 2025", amt: "₹20,000", due: "In 15 days", tint: "bg-amber-500/15 text-amber-300" },
];

const ACC_SUBTABS = ["All", "Bank Accounts", "Credit Cards", "Wallets", "Loans"] as const;

function AccountsView() {
  const [sub, setSub] = useState<typeof ACC_SUBTABS[number]>("All");
  return (
    <>
      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {ACC_STATS.map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${s.tint}`}>
                <s.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {s.label} {s.info && <Info className="h-3 w-3 opacity-60" />}
                </div>
                <div className="mt-1 font-display text-xl font-bold text-foreground">{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.sub}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Overview row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* Balance Overview */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-5">
          <div className="mb-3 text-sm font-semibold text-foreground">Balance Overview</div>
          <div className="flex items-center gap-5">
            <div className="relative h-[180px] w-[180px] shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={ACC_ALLOC.map(a => ({ ...a, pct: Math.abs(a.pct) }))} dataKey="pct" innerRadius={58} outerRadius={84} paddingAngle={2} stroke="none">
                    {ACC_ALLOC.map((a) => <Cell key={a.name} fill={a.color} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 grid place-items-center text-center">
                <div>
                  <div className="font-display text-lg font-bold text-foreground">₹8,64,250</div>
                  <div className="text-[10px] text-muted-foreground">Total Balance</div>
                </div>
              </div>
            </div>
            <div className="flex-1 space-y-2.5">
              {ACC_ALLOC.map((a) => (
                <div key={a.name} className="grid grid-cols-[auto_minmax(0,1fr)_auto_auto] items-center gap-x-3 text-xs">
                  <span className="h-2.5 w-2.5 rounded-full" style={{ background: a.color }} />
                  <span className="text-muted-foreground">{a.name}</span>
                  <span className="text-foreground tabular-nums">{a.amt}</span>
                  <span className={`tabular-nums ${a.pct < 0 ? "text-rose-400" : "text-emerald-400"}`}>{a.pct}%</span>
                </div>
              ))}
            </div>
          </div>
          <button className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-mint hover:text-mint/80">
            View detailed breakdown <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Cash Flow */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-sm font-semibold text-foreground">Cash Flow (This Month)</div>
              <div className="text-xs text-muted-foreground">Monthly Change vs Last Month</div>
            </div>
            <div className="text-right">
              <div className="font-display text-base font-bold text-foreground">₹23,450</div>
              <div className="text-xs font-medium text-emerald-400">↑ 12.45%</div>
            </div>
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <div className="text-xs text-muted-foreground">Money In</div>
              <div className="mt-1 text-sm font-semibold text-emerald-400">₹1,85,000</div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: "100%" }} />
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Money Out</div>
              <div className="mt-1 text-sm font-semibold text-rose-400">-₹1,61,550</div>
              <div className="mt-2 h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                <div className="h-full rounded-full bg-rose-400" style={{ width: "87%" }} />
              </div>
            </div>
            <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2.5">
              <span className="text-xs text-muted-foreground">Net Cash Flow</span>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-foreground">₹23,450</span>
                <span className="text-xs font-medium text-emerald-400">↑ 12.45%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-3">
          <div className="mb-3 text-sm font-semibold text-foreground">Quick Actions</div>
          <div className="space-y-2">
            {QUICK_ACTIONS.map((q) => (
              <button key={q.label} className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5 text-left hover:border-mint/40">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mint/10 text-mint">
                  <q.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-medium text-foreground">{q.label}</div>
                  <div className="truncate text-[10px] text-muted-foreground">{q.sub}</div>
                </div>
                <ChevronDown className="h-4 w-4 -rotate-90 text-muted-foreground" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Accounts table + side cards */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm font-semibold text-foreground">All Accounts</div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input placeholder="Search accounts..." className="h-8 w-48 rounded-md border border-border bg-surface-2 pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none" />
              </div>
              <button className="inline-flex items-center gap-1 rounded-md border border-border bg-surface-2 px-2.5 py-1.5 text-xs text-foreground">All Accounts <ChevronDown className="h-3 w-3" /></button>
              <button className="grid h-8 w-8 place-items-center rounded-md border border-border bg-surface-2 text-muted-foreground"><ArrowUpDown className="h-3.5 w-3.5" /></button>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 border-b border-border text-xs">
            {ACC_SUBTABS.map((t) => (
              <button key={t} onClick={() => setSub(t)} className={`relative pb-2 ${sub === t ? "text-mint" : "text-muted-foreground hover:text-foreground"}`}>
                {t}
                {sub === t && <span className="absolute -bottom-px left-0 h-0.5 w-full rounded-full bg-mint" />}
              </button>
            ))}
          </div>

          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="text-muted-foreground">
                <tr className="border-b border-border [&>th]:py-2 [&>th]:px-2 [&>th]:text-left [&>th]:font-medium">
                  <th>Account Name</th>
                  <th>Type</th>
                  <th>Account Number</th>
                  <th>Balance</th>
                  <th>Nominees</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ACCOUNTS.map((a) => (
                  <tr key={a.name} className="border-b border-border/60 last:border-0 [&>td]:py-2.5 [&>td]:px-2">
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mint/10 text-mint">
                          <a.icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-foreground font-medium">{a.name}</div>
                          <div className="truncate text-[10px] text-muted-foreground">{a.sub}</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-muted-foreground">{a.type}</td>
                    <td className="text-muted-foreground tabular-nums">{a.num}</td>
                    <td className={`tabular-nums font-medium ${a.bal.startsWith("-") ? "text-rose-400" : "text-foreground"}`}>{a.bal}</td>
                    <td className={a.nominees === "Not Added" ? "text-rose-300" : "text-foreground"}>{a.nominees}</td>
                    <td className="text-right">
                      <button className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-foreground"><MoreVertical className="h-4 w-4" /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <span>Showing 1 to {ACCOUNTS.length} of {ACCOUNTS.length} accounts</span>
            <div className="flex items-center gap-2">
              {["‹", "1", "›"].map((p, idx) => (
                <button key={idx} className={`h-7 min-w-7 rounded-md border border-border px-2 ${p === "1" ? "bg-mint/15 text-mint" : "text-muted-foreground hover:text-foreground"}`}>{p}</button>
              ))}
            </div>
          </div>
        </div>

        {/* Side: Top spending + Upcoming */}
        <div className="space-y-4 lg:col-span-4">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-sm font-semibold text-foreground">Top Spending Accounts (This Month)</div>
              <MoreVertical className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="space-y-3">
              {TOP_SPEND.map((s) => (
                <div key={s.name}>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-foreground">{s.name}</span>
                    <span className="font-medium text-rose-400 tabular-nums">{s.amt}</span>
                  </div>
                  <div className="mt-1.5 h-1.5 w-full rounded-full bg-surface-2 overflow-hidden">
                    <div className="h-full rounded-full" style={{ width: `${s.pct}%`, background: s.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 text-sm font-semibold text-foreground">Upcoming Payments</div>
            <div className="space-y-2.5">
              {UPCOMING.map((u) => (
                <div key={u.name} className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-rose-500/10 text-rose-300">
                      <Calendar className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-foreground">{u.name}</div>
                      <div className="truncate text-[10px] text-muted-foreground">{u.date}</div>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs font-semibold text-foreground tabular-nums">{u.amt}</div>
                    <div className={`mt-0.5 inline-block rounded-md px-1.5 py-0.5 text-[10px] font-medium ${u.tint}`}>{u.due}</div>
                  </div>
                </div>
              ))}
            </div>
            <button className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-mint hover:text-mint/80">
              View all payments <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>
    </>
  );
}