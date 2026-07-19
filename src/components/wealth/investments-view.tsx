import { useMemo, useState } from "react";
import { smartXAxisProps } from "@/lib/chart-axis";
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
} from "recharts";
import {
  Wallet,
  TrendingUp,
  PieChart as PieIcon,
  BarChart3,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  ChevronDown,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  Pencil,
  Trash2,
  Link2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TextTabs } from "@/components/text-tabs";
import { InvestmentDialog } from "@/components/wealth/investment-dialog";
import { IoMenu } from "@/components/wealth/io-menu";
import { LinkInvestmentDialog, isLinkable } from "@/components/wealth/link-investment-dialog";
import {
  type Investment,
  type InvestmentInput,
  INVESTMENT_CATEGORIES,
  cagrPct,
  formatDate,
  groupByCategory,
  inr,
  inrCompact,
  portfolioXirr,
  singleXirr,
  useBulkInsertInvestments,
  useDeleteInvestment,
  useInvestments,
} from "@/lib/wealth-api";
import { exportCsv, exportJson, exportPdf, exportXlsx, pickAndParse } from "@/lib/wealth-io";
import { toast } from "sonner";

const PIE = ["#3B82F6", "#14D8CF", "#F59E0B", "#8B5CF6", "#10B981", "#F97316", "#EF4444", "#94A3B8"];
const SUB = ["Overview", "Holdings", "Portfolio", "SIP Tracker", "Performance", "P&L Analysis"] as const;
const PAGE = 8;

export function InvestmentsView({
  registerAdd,
}: {
  registerAdd?: (open: () => void) => void;
}) {
  const [sub, setSub] = useState<(typeof SUB)[number]>("Overview");
  const { data: rows = [], isLoading, isError, error, refetch } = useInvestments();
  const bulkInsert = useBulkInsertInvestments();
  const del = useDeleteInvestment();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Investment | null>(null);
  const [confirm, setConfirm] = useState<Investment | null>(null);

  if (registerAdd) {
    registerAdd(() => {
      setEditing(null);
      setDialogOpen(true);
    });
  }

  /* ===== Derived metrics ===== */
  const derived = useMemo(() => {
    let invested = 0,
      current = 0;
    const today = new Date();
    const rich = rows.map((r) => {
      const inv = r.invested_value ?? r.quantity * r.avg_price;
      const rawCur = r.current_value ?? r.quantity * r.current_price;
      // Graceful fallback: unpriced holdings show at cost basis, not zero.
      const cur = rawCur > 0 ? rawCur : inv;
      const pnl = cur - inv;
      const ret = inv > 0 ? (pnl / inv) * 100 : 0;
      const years = r.purchase_date
        ? Math.max(
            0.01,
            (today.getTime() - new Date(r.purchase_date).getTime()) / (365.25 * 86400000),
          )
        : 0;
      const cagr = cagrPct(inv, cur, years);
      const xirrPct = singleXirr(r);
      invested += inv;
      current += cur;
      return { ...r, inv, cur, pnl, ret, cagr, xirrPct };
    });
    const pnl = current - invested;
    const overallRet = invested > 0 ? (pnl / invested) * 100 : 0;
    const portXirr = portfolioXirr(rows);
    return { rich, invested, current, pnl, overallRet, portXirr };
  }, [rows]);

  /* ===== Allocation breakdown ===== */
  const alloc = useMemo(
    () =>
      groupByCategory(derived.rich, (r) => r.cur).map((a, i) => ({
        ...a,
        color: PIE[i % PIE.length],
      })),
    [derived.rich],
  );

  /* ===== Trend ===== */
  const trend = useMemo(() => buildMonthlyTrend(derived.rich), [derived.rich]);

  /* ===== Top holdings ===== */
  const topHoldings = useMemo(
    () =>
      [...derived.rich]
        .sort((a, b) => b.cur - a.cur)
        .slice(0, 5)
        .map((h, i) => ({ ...h, color: PIE[i % PIE.length] })),
    [derived.rich],
  );

  /* ===== Asset-class performance ===== */
  const perfByClass = useMemo(() => {
    const byCat = new Map<string, { inv: number; cur: number }>();
    for (const r of derived.rich) {
      const c = byCat.get(r.category) || { inv: 0, cur: 0 };
      c.inv += r.inv;
      c.cur += r.cur;
      byCat.set(r.category, c);
    }
    const arr = Array.from(byCat.entries()).map(([name, v]) => ({
      name,
      pct: v.inv > 0 ? ((v.cur - v.inv) / v.inv) * 100 : 0,
    }));
    const max = Math.max(1, ...arr.map((a) => Math.abs(a.pct)));
    return arr
      .sort((a, b) => b.pct - a.pct)
      .map((a) => ({ ...a, bar: Math.min(100, (Math.abs(a.pct) / max) * 100) }));
  }, [derived.rich]);

  /* ===== Sector breakdown (uses sub_category as sector) ===== */
  const sectorAlloc = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of derived.rich) {
      const k = (r.sub_category || r.category || "Others").toString();
      map.set(k, (map.get(k) || 0) + r.cur);
    }
    const tot = Array.from(map.values()).reduce((a, b) => a + b, 0) || 1;
    return Array.from(map.entries())
      .map(([s, v], i) => ({ s, pct: Math.round((v / tot) * 100), color: PIE[i % PIE.length] }))
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 6);
  }, [derived.rich]);

  /* ===== Import / Export ===== */
  const exportCols = [
    { key: "name", label: "Name" },
    { key: "symbol", label: "Symbol" },
    { key: "category", label: "Category" },
    { key: "sub_category", label: "Sub Category" },
    { key: "quantity", label: "Quantity" },
    { key: "avg_price", label: "Avg Price" },
    { key: "current_price", label: "Current Price" },
    { key: "invested_value", label: "Invested" },
    { key: "current_value", label: "Current Value" },
    { key: "purchase_date", label: "Purchase Date" },
    { key: "is_sip", label: "Is SIP" },
    { key: "sip_amount", label: "SIP Amount" },
    { key: "sip_frequency", label: "SIP Frequency" },
    { key: "sip_next_date", label: "SIP Next Date" },
    { key: "status", label: "Status" },
    { key: "notes", label: "Notes" },
  ] as const;

  const handleImport = async () => {
    const parsed = await pickAndParse();
    if (!parsed || !parsed.length) return;
    const mapped: InvestmentInput[] = parsed
      .map((r: any) => ({
        name: String(r.Name ?? r.name ?? "").trim(),
        symbol: r.Symbol ?? r.symbol ?? null,
        category: String(r.Category ?? r.category ?? "Others").trim() || "Others",
        sub_category: r["Sub Category"] ?? r.sub_category ?? null,
        quantity: Number(r.Quantity ?? r.quantity ?? 0) || 0,
        avg_price: Number(r["Avg Price"] ?? r.avg_price ?? 0) || 0,
        current_price: Number(r["Current Price"] ?? r.current_price ?? 0) || 0,
        purchase_date: r["Purchase Date"] ?? r.purchase_date ?? null,
        is_sip: String(r["Is SIP"] ?? r.is_sip ?? "").toLowerCase() === "true",
        sip_amount:
          r["SIP Amount"] === "" || r.sip_amount === ""
            ? null
            : Number(r["SIP Amount"] ?? r.sip_amount ?? 0) || null,
        sip_frequency: r["SIP Frequency"] ?? r.sip_frequency ?? "monthly",
        sip_next_date: r["SIP Next Date"] ?? r.sip_next_date ?? null,
        status: (r.Status ?? r.status ?? "active") || "active",
        notes: r.Notes ?? r.notes ?? null,
      }))
      .filter((r) => r.name);
    if (!mapped.length) return toast.error("No valid rows found");
    await bulkInsert.mutateAsync(mapped);
  };

  if (isError)
    return (
      <ErrorPanel
        message={(error as Error)?.message || "Failed to load investments"}
        onRetry={() => refetch()}
      />
    );

  const showEmptyOnly = !isLoading && rows.length === 0;
  const ioMenu = (
    <IoMenu
      onImport={handleImport}
      onExportCsv={() => exportCsv("investments", exportCols as any, derived.rich)}
      onExportXlsx={() => exportXlsx("investments", exportCols as any, derived.rich)}
      onExportJson={() => exportJson("investments", derived.rich)}
      onExportPdf={() =>
        exportPdf("Investments", exportCols as any, derived.rich, {
          subtitle: `Current ${inr(derived.current)} · Invested ${inr(derived.invested)}`,
        })
      }
    />
  );

  return (
    <>
      <TextTabs
        items={SUB as unknown as readonly string[]}
        value={sub}
        onChange={(v) => setSub(v as (typeof SUB)[number])}
      />

      <div className="mt-4">
        {sub === "Overview" && (
          <Overview
            isLoading={isLoading}
            empty={showEmptyOnly}
            invested={derived.invested}
            current={derived.current}
            pnl={derived.pnl}
            overallRet={derived.overallRet}
            portXirr={derived.portXirr}
            alloc={alloc}
            trend={trend}
            topHoldings={topHoldings}
            perfByClass={perfByClass}
            count={rows.length}
            categories={alloc.length}
            onAdd={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
          />
        )}
        {sub === "Holdings" && (
          <Holdings
            rows={derived.rich}
            isLoading={isLoading}
            ioMenu={ioMenu}
            onAdd={() => {
              setEditing(null);
              setDialogOpen(true);
            }}
            onEdit={(r) => {
              setEditing(r);
              setDialogOpen(true);
            }}
            onDelete={(r) => setConfirm(r)}
          />
        )}
        {sub === "Portfolio" && (
          <Portfolio
            empty={showEmptyOnly}
            alloc={alloc}
            sectorAlloc={sectorAlloc}
            topHoldings={topHoldings}
            perfByClass={perfByClass}
            invested={derived.invested}
            current={derived.current}
            portXirr={derived.portXirr}
            rows={derived.rich}
          />
        )}
        {sub === "SIP Tracker" && (
          <SipTracker rows={derived.rich} onEdit={(r) => { setEditing(r); setDialogOpen(true); }} />
        )}
        {sub === "Performance" && (
          <Performance rows={derived.rich} portXirr={derived.portXirr} overallRet={derived.overallRet} />
        )}
        {sub === "P&L Analysis" && (
          <PnlAnalysis rows={derived.rich} pnl={derived.pnl} invested={derived.invested} />
        )}
      </div>

      <InvestmentDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        existing={editing}
      />

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete investment?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{confirm?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 text-white hover:bg-rose-600"
              disabled={del.isPending}
              onClick={async () => {
                if (!confirm) return;
                await del.mutateAsync(confirm.id);
                setConfirm(null);
              }}
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* =================== OVERVIEW =================== */
function Overview({
  isLoading,
  empty,
  invested,
  current,
  pnl,
  overallRet,
  portXirr,
  alloc,
  trend,
  topHoldings,
  perfByClass,
  count,
  categories,
  onAdd,
}: {
  isLoading: boolean;
  empty: boolean;
  invested: number;
  current: number;
  pnl: number;
  overallRet: number;
  portXirr: number;
  alloc: { name: string; amt: number; pct: number; color: string }[];
  trend: { m: string; v: number }[];
  topHoldings: any[];
  perfByClass: { name: string; pct: number; bar: number }[];
  count: number;
  categories: number;
  onAdd: () => void;
}) {
  const up = pnl >= 0;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Current Value" value={isLoading ? "…" : inr(current)} delta={`${count} holding${count === 1 ? "" : "s"}`} icon={Wallet} tint="bg-mint/10 text-mint" />
        <Stat label="Total Invested" value={isLoading ? "…" : inr(invested)} delta="Cost basis" icon={PieIcon} tint="bg-violet-400/10 text-violet-300" />
        <Stat label="Overall Gain / Loss" value={isLoading ? "…" : inr(pnl)} delta={`${up ? "+" : ""}${overallRet.toFixed(2)}% (Absolute)`} up={up} icon={BarChart3} tint={up ? "bg-amber-400/10 text-amber-300" : "bg-rose-400/10 text-rose-300"} />
        <Stat label="XIRR (All Investments)" value={isLoading ? "…" : `${portXirr.toFixed(2)}%`} delta="Money-weighted return" icon={TrendingUp} tint="bg-mint/10 text-mint" />
      </div>

      {empty ? (
        <Empty
          primary="No investments yet"
          secondary="Add your first investment to see allocation, P&L and XIRR."
          cta={{ label: "Add investment", onClick: onAdd }}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Investment Allocation</h3>
              <div className="mt-4 flex items-center gap-3">
                <div className="relative h-[160px] w-[160px] shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={alloc} dataKey="pct" innerRadius={52} outerRadius={76} paddingAngle={2} stroke="none">
                        {alloc.map((a) => (<Cell key={a.name} fill={a.color} />))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                      <div className="font-display text-sm font-bold text-foreground">{inrCompact(current)}</div>
                      <div className="text-[10px] text-muted-foreground">Total Value</div>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2">
                  {alloc.map((a) => (
                    <div key={a.name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                        <span className="truncate text-foreground">{a.name}</span>
                      </div>
                      <span className="shrink-0 font-medium text-muted-foreground">{a.pct.toFixed(1)}%</span>
                      <span className="shrink-0 text-right font-medium text-foreground">{inrCompact(a.amt)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Investment Value Trend</h3>
                <button className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">
                  6M <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <div className="h-[210px]">
                {trend.length < 2 ? (
                  <EmptyMini label="Add purchase dates to see growth" />
                ) : (
                  <ResponsiveContainer>
                    <AreaChart data={trend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="invGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#14D8CF" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#14D8CF" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1B3249" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="m" tick={{ fill: "#6E8294", fontSize: 11 }} axisLine={false} tickLine={false}  {...smartXAxisProps} />
                      <YAxis tick={{ fill: "#6E8294", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => inrCompact(v as number)} />
                      <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [inr(v), "Value"]} />
                      <Area type="monotone" dataKey="v" stroke="#14D8CF" strokeWidth={2.5} fill="url(#invGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
            <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Top Holdings</h3>
              </div>
              <div className="space-y-3">
                {topHoldings.map((h) => {
                  const pct = current > 0 ? (h.cur / current) * 100 : 0;
                  return (
                    <div key={h.id} className="flex items-center gap-2">
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-bold text-white" style={{ background: h.color }}>{h.name.slice(0, 1)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-foreground">{h.name}</div>
                        <div className="text-[10px] text-muted-foreground">{h.sub_category || h.category}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-medium text-mint">{pct.toFixed(2)}%</div>
                        <div className="text-[10px] text-foreground">{inr(h.cur)}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Asset Class Performance</h3>
              </div>
              <div className="space-y-4">
                {perfByClass.map((a) => {
                  const positive = a.pct >= 0;
                  return (
                    <div key={a.name}>
                      <div className="mb-1.5 flex items-center justify-between text-xs">
                        <span className="text-foreground">{a.name}</span>
                        <span className={`font-medium ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                          {positive ? "+" : ""}{a.pct.toFixed(2)}%
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${a.bar}%`, background: positive ? "#14D8CF" : "#EF4444" }}
                        />
                      </div>
                    </div>
                  );
                })}
                {perfByClass.length === 0 && (
                  <div className="grid h-24 place-items-center text-xs text-muted-foreground">No data yet</div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-mint" />
            Categories tracked: {categories}. Update current price to refresh P&amp;L and XIRR.
          </div>
        </>
      )}
    </div>
  );
}

/* =================== HOLDINGS =================== */
type HoldRow = Investment & { inv: number; cur: number; pnl: number; ret: number; cagr: number; xirrPct: number };
type HSort = "latest" | "name_asc" | "value_desc" | "pnl_desc" | "ret_desc";

function Holdings({
  rows,
  isLoading,
  ioMenu,
  onAdd,
  onEdit,
  onDelete,
}: {
  rows: HoldRow[];
  isLoading: boolean;
  ioMenu: React.ReactNode;
  onAdd: () => void;
  onEdit: (r: Investment) => void;
  onDelete: (r: Investment) => void;
}) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [sort, setSort] = useState<HSort>("latest");
  const [page, setPage] = useState(1);

  const filtered = useMemo(() => {
    let r = rows;
    if (q.trim()) {
      const s = q.toLowerCase();
      r = r.filter(
        (x) =>
          x.name.toLowerCase().includes(s) ||
          x.category.toLowerCase().includes(s) ||
          (x.symbol ?? "").toLowerCase().includes(s) ||
          (x.sub_category ?? "").toLowerCase().includes(s),
      );
    }
    if (cat !== "all") r = r.filter((x) => x.category === cat);
    const sorted = [...r];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name_asc": return a.name.localeCompare(b.name);
        case "value_desc": return b.cur - a.cur;
        case "pnl_desc": return b.pnl - a.pnl;
        case "ret_desc": return b.ret - a.ret;
        default: return (b.last_updated || "").localeCompare(a.last_updated || "");
      }
    });
    return sorted;
  }, [rows, q, cat, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice((page - 1) * PAGE, page * PAGE);
  if (page > pageCount) setTimeout(() => setPage(1), 0);

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Holdings ({filtered.length})</h3>
          <div className="relative ml-2 flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              placeholder="Search holdings..."
              className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
            />
          </div>
          <FilterDropdown
            label={cat === "all" ? "All Categories" : cat}
            value={cat}
            onChange={(v) => { setCat(v); setPage(1); }}
            options={[{ value: "all", label: "All Categories" }, ...INVESTMENT_CATEGORIES.map((c) => ({ value: c, label: c }))]}
          />
          <FilterDropdown
            label={`Sort: ${sortLabel(sort)}`}
            value={sort}
            onChange={(v) => setSort(v as HSort)}
            icon={ArrowUpDown}
            options={[
              { value: "latest", label: "Latest updated" },
              { value: "name_asc", label: "Name (A→Z)" },
              { value: "value_desc", label: "Current Value" },
              { value: "pnl_desc", label: "P&L" },
              { value: "ret_desc", label: "Returns %" },
            ]}
          />
          {ioMenu}
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <Empty
            primary={rows.length === 0 ? "No investments yet" : "No matches"}
            secondary={rows.length === 0 ? "Add your first investment to get started." : "Try clearing filters or search."}
            cta={rows.length === 0 ? { label: "Add investment", onClick: onAdd } : undefined}
          />
        ) : (
          <>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="py-3 pl-2 font-medium">Name</th>
                    <th className="py-3 font-medium">Type</th>
                    <th className="py-3 text-right font-medium">Quantity</th>
                    <th className="py-3 text-right font-medium">Avg Price</th>
                    <th className="py-3 text-right font-medium">Current Price</th>
                    <th className="py-3 text-right font-medium">Invested</th>
                    <th className="py-3 text-right font-medium">Current</th>
                    <th className="py-3 text-right font-medium">P&L</th>
                    <th className="py-3 text-right font-medium">Returns %</th>
                    <th className="py-3 font-medium">Last Updated</th>
                    <th className="py-3 pr-2 font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((h, i) => {
                    const up = h.pnl >= 0;
                    const color = PIE[i % PIE.length];
                    return (
                      <tr key={h.id} className="border-b border-border/50 last:border-0 hover:bg-surface-2/40">
                        <td className="py-3 pl-2">
                          <div className="flex items-center gap-3">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold text-white" style={{ background: color }}>
                              {h.name.slice(0, 1)}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">{h.name}</div>
                              {(h.sub_category || h.symbol) && (
                                <div className="text-[10px] text-muted-foreground">{h.sub_category || h.symbol}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 text-muted-foreground">{h.category}</td>
                        <td className="py-3 text-right text-foreground">{h.quantity.toLocaleString("en-IN", { maximumFractionDigits: 4 })}</td>
                        <td className="py-3 text-right text-foreground">{inr(h.avg_price)}</td>
                        <td className="py-3 text-right text-foreground">{inr(h.current_price)}</td>
                        <td className="py-3 text-right text-foreground">{inr(h.inv)}</td>
                        <td className="py-3 text-right font-medium text-foreground">{inr(h.cur)}</td>
                        <td className={`py-3 text-right font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>
                          <span className="inline-flex items-center gap-1">
                            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {(up ? "+" : "") + inr(h.pnl)}
                          </span>
                        </td>
                        <td className={`py-3 text-right font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>
                          {(up ? "+" : "") + h.ret.toFixed(2)}%
                        </td>
                        <td className="py-3 text-muted-foreground">{formatDate(h.last_updated)}</td>
                        <td className="py-3 pr-2">
                          <RowMenu onEdit={() => onEdit(h)} onDelete={() => onDelete(h)} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <Pagination page={page} pageCount={pageCount} total={filtered.length} onPage={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

/* =================== PORTFOLIO =================== */
function Portfolio({
  empty,
  alloc,
  sectorAlloc,
  topHoldings,
  perfByClass,
  invested,
  current,
  portXirr,
  rows,
}: {
  empty: boolean;
  alloc: { name: string; pct: number; amt: number; color: string }[];
  sectorAlloc: { s: string; pct: number; color: string }[];
  topHoldings: any[];
  perfByClass: { name: string; pct: number; bar: number }[];
  invested: number;
  current: number;
  portXirr: number;
  rows: HoldRow[];
}) {
  if (empty)
    return <Empty primary="No portfolio yet" secondary="Add investments to see allocation, sector breakdown, XIRR and CAGR." />;

  const years = rows.reduce((s, r) => {
    if (!r.purchase_date) return s;
    const y = (Date.now() - new Date(r.purchase_date).getTime()) / (365.25 * 86400000);
    return s + y * r.inv;
  }, 0);
  const weightedYears = invested > 0 ? years / invested : 0;
  const cagr = cagrPct(invested, current, Math.max(0.01, weightedYears));
  const div = Math.min(10, Math.max(1, new Set(rows.map((r) => r.category)).size + new Set(rows.map((r) => r.sub_category || r.category)).size / 2));
  const health =
    portXirr >= 15 ? "Excellent" : portXirr >= 10 ? "Good" : portXirr >= 5 ? "Fair" : "Needs review";

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Allocation</h3>
          <div className="mt-4 flex items-center gap-3">
            <div className="relative h-[160px] w-[160px] shrink-0">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={alloc} dataKey="pct" innerRadius={52} outerRadius={76} paddingAngle={2} stroke="none">
                    {alloc.map((a) => (<Cell key={a.name} fill={a.color} />))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              {alloc.map((a) => (
                <div key={a.name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 text-xs">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                    <span className="truncate text-foreground">{a.name}</span>
                  </div>
                  <span className="shrink-0 font-medium text-muted-foreground">{a.pct.toFixed(1)}%</span>
                  <span className="shrink-0 text-right font-medium text-foreground">{inrCompact(a.amt)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Sector Analysis</h3>
          <div className="mt-4 space-y-3">
            {sectorAlloc.map((r) => (
              <div key={r.s}>
                <div className="mb-1.5 flex items-center justify-between text-xs">
                  <span className="text-foreground">{r.s}</span>
                  <span className="font-medium text-muted-foreground">{r.pct}%</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                  <div className="h-full rounded-full" style={{ width: `${Math.min(100, r.pct * 2.5)}%`, background: r.color }} />
                </div>
              </div>
            ))}
            {sectorAlloc.length === 0 && (
              <div className="grid h-24 place-items-center text-xs text-muted-foreground">No data yet</div>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "XIRR", v: `${portXirr.toFixed(2)}%`, t: "Money-weighted return" },
          { k: "CAGR", v: `${cagr.toFixed(2)}%`, t: "Annualized" },
          { k: "Diversification", v: `${div.toFixed(0)} / 10`, t: `Across ${alloc.length} asset class${alloc.length === 1 ? "" : "es"}` },
          { k: "Portfolio Health", v: health, t: portXirr < 10 ? "Rebalance suggested" : "On track" },
        ].map((m) => (
          <div key={m.k} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{m.k}</div>
            <div className="mt-1 font-display text-xl font-bold text-foreground">{m.v}</div>
            <div className="mt-1 text-[11px] text-muted-foreground">{m.t}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-4">
          <h3 className="text-sm font-semibold text-foreground">Top Holdings</h3>
          <div className="mt-3 space-y-3">
            {topHoldings.map((h) => {
              const pct = current > 0 ? (h.cur / current) * 100 : 0;
              return (
                <div key={h.id} className="flex items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[10px] font-bold text-white" style={{ background: h.color }}>{h.name.slice(0, 1)}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-foreground">{h.name}</div>
                    <div className="text-[10px] text-muted-foreground">{h.sub_category || h.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs font-medium text-mint">{pct.toFixed(2)}%</div>
                    <div className="text-[10px] text-foreground">{inr(h.cur)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-8">
          <h3 className="text-sm font-semibold text-foreground">Asset Class Performance</h3>
          <div className="mt-4 space-y-4">
            {perfByClass.map((a) => {
              const positive = a.pct >= 0;
              return (
                <div key={a.name}>
                  <div className="mb-1.5 flex items-center justify-between text-xs">
                    <span className="text-foreground">{a.name}</span>
                    <span className={`font-medium ${positive ? "text-emerald-400" : "text-rose-400"}`}>
                      {positive ? "+" : ""}{a.pct.toFixed(2)}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${a.bar}%`, background: positive ? "#14D8CF" : "#EF4444" }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =================== SIP TRACKER =================== */
function SipTracker({ rows, onEdit }: { rows: HoldRow[]; onEdit: (r: Investment) => void }) {
  const sips = rows.filter((r) => r.is_sip);
  const active = sips.filter((s) => s.sip_active);
  const paused = sips.filter((s) => !s.sip_active);
  const monthly = active.reduce((a, b) => a + monthlySipAmount(b), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Monthly SIP", v: inr(monthly) },
          { k: "Active SIPs", v: String(active.length) },
          { k: "Paused", v: String(paused.length) },
          { k: "Yearly Outflow", v: inr(monthly * 12) },
        ].map((m) => (
          <div key={m.k} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{m.k}</div>
            <div className="mt-1 font-display text-xl font-bold text-foreground">{m.v}</div>
          </div>
        ))}
      </div>
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-foreground">SIPs</h3>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pl-2 font-medium">Scheme</th>
                <th className="py-3 font-medium">Frequency</th>
                <th className="py-3 text-right font-medium">Amount</th>
                <th className="py-3 font-medium">Next Date</th>
                <th className="py-3 font-medium">Status</th>
                <th className="py-3 pr-2 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {sips.length === 0 ? (
                <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No SIPs configured. Enable SIP on an investment to track it here.</td></tr>
              ) : sips.map((s, i) => {
                const color = PIE[i % PIE.length];
                return (
                  <tr key={s.id} className="border-b border-border/50 last:border-0 hover:bg-surface-2/40">
                    <td className="py-3 pl-2">
                      <div className="flex items-center gap-3">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[10px] font-bold text-white" style={{ background: color }}>{s.name.slice(0, 1)}</span>
                        <span className="font-medium text-foreground">{s.name}</span>
                      </div>
                    </td>
                    <td className="py-3 text-muted-foreground capitalize">{s.sip_frequency ?? "monthly"}</td>
                    <td className="py-3 text-right font-medium text-foreground">{inr(Number(s.sip_amount) || 0)}</td>
                    <td className="py-3 text-muted-foreground">{s.sip_next_date ? formatDate(s.sip_next_date) : "—"}</td>
                    <td className="py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.sip_active ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                        {s.sip_active ? "Active" : "Paused"}
                      </span>
                    </td>
                    <td className="py-3 pr-2">
                      <button onClick={() => onEdit(s)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function monthlySipAmount(s: HoldRow) {
  const amt = Number(s.sip_amount) || 0;
  switch (s.sip_frequency) {
    case "weekly": return amt * 4.345;
    case "quarterly": return amt / 3;
    case "yearly": return amt / 12;
    default: return amt;
  }
}

/* =================== PERFORMANCE =================== */
function Performance({
  rows,
  portXirr,
  overallRet,
}: {
  rows: HoldRow[];
  portXirr: number;
  overallRet: number;
}) {
  // Build invested vs current cumulative trend across last 12 months.
  const trend = useMemo(() => buildPerformanceTrend(rows), [rows]);
  const empty = rows.length === 0;

  // CAGR weighted by invested
  const weighted = rows.reduce(
    (s, r) => {
      if (!r.purchase_date) return s;
      const y = Math.max(0.01, (Date.now() - new Date(r.purchase_date).getTime()) / (365.25 * 86400000));
      const c = cagrPct(r.inv, r.cur, y);
      return { num: s.num + c * r.inv, den: s.den + r.inv };
    },
    { num: 0, den: 0 },
  );
  const cagr = weighted.den > 0 ? weighted.num / weighted.den : 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { k: "Absolute Return", v: `${overallRet >= 0 ? "+" : ""}${overallRet.toFixed(2)}%`, tone: overallRet >= 0 ? "text-emerald-400" : "text-rose-400" },
          { k: "Weighted CAGR", v: `${cagr >= 0 ? "+" : ""}${cagr.toFixed(2)}%`, tone: cagr >= 0 ? "text-emerald-400" : "text-rose-400" },
          { k: "Portfolio XIRR", v: `${portXirr >= 0 ? "+" : ""}${portXirr.toFixed(2)}%`, tone: portXirr >= 0 ? "text-mint" : "text-rose-400" },
        ].map((m) => (
          <div key={m.k} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{m.k}</div>
            <div className={`mt-1 font-display text-xl font-bold ${m.tone}`}>{m.v}</div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Invested vs Current Value (12M)</h3>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-mint" /> Current Value</span>
            <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-violet-400" /> Invested</span>
          </div>
        </div>
        <div className="h-[260px]">
          {empty || trend.length < 2 ? (
            <EmptyMini label="Add investments with purchase dates to see performance" />
          ) : (
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfCur" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14D8CF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#14D8CF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#1B3249" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="m" tick={{ fill: "#6E8294", fontSize: 11 }} axisLine={false} tickLine={false}  {...smartXAxisProps} />
                <YAxis tick={{ fill: "#6E8294", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => inrCompact(v as number)} />
                <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [inr(v), ""]} />
                <Area type="monotone" dataKey="cur" stroke="#14D8CF" strokeWidth={2.5} fill="url(#perfCur)" />
                <Area type="monotone" dataKey="inv" stroke="#8B5CF6" strokeWidth={2} fill="transparent" />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Per-Holding Returns</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="py-3 pl-2 font-medium">Name</th>
                <th className="py-3 text-right font-medium">Absolute</th>
                <th className="py-3 text-right font-medium">CAGR</th>
                <th className="py-3 text-right font-medium">XIRR</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={4} className="py-10 text-center text-xs text-muted-foreground">No data yet</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="border-b border-border/50 last:border-0 hover:bg-surface-2/40">
                  <td className="py-3 pl-2 text-foreground">{r.name}</td>
                  <td className={`py-3 text-right font-medium ${r.ret >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {(r.ret >= 0 ? "+" : "") + r.ret.toFixed(2)}%
                  </td>
                  <td className={`py-3 text-right ${r.cagr >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    {(r.cagr >= 0 ? "+" : "") + r.cagr.toFixed(2)}%
                  </td>
                  <td className={`py-3 text-right ${r.xirrPct >= 0 ? "text-mint" : "text-rose-400"}`}>
                    {(r.xirrPct >= 0 ? "+" : "") + r.xirrPct.toFixed(2)}%
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

/* =================== P&L ANALYSIS =================== */
function PnlAnalysis({ rows, pnl, invested }: { rows: HoldRow[]; pnl: number; invested: number }) {
  const oneYearMs = 365.25 * 86400000;
  const now = Date.now();
  const stcg = rows.reduce(
    (s, r) =>
      s +
      (r.pnl > 0 && r.purchase_date && now - new Date(r.purchase_date).getTime() < oneYearMs
        ? r.pnl
        : 0),
    0,
  );
  const ltcg = rows.reduce(
    (s, r) =>
      s +
      (r.pnl > 0 && r.purchase_date && now - new Date(r.purchase_date).getTime() >= oneYearMs
        ? r.pnl
        : 0),
    0,
  );
  const losses = rows.reduce((s, r) => s + (r.pnl < 0 ? r.pnl : 0), 0);

  const stcgTax = Math.round(stcg * 0.15);
  const ltcgExempt = 100000;
  const ltcgTaxable = Math.max(0, ltcg - ltcgExempt);
  const ltcgTax = Math.round(ltcgTaxable * 0.1);
  const totalTax = stcgTax + ltcgTax;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { k: "Unrealized Gains", v: inr(Math.max(0, pnl)), tone: "text-emerald-400" },
          { k: "Unrealized Losses", v: inr(Math.abs(Math.min(0, losses))), tone: "text-rose-400" },
          { k: "Cost Basis", v: inr(invested), tone: "text-foreground" },
          { k: "Capital Gains Tax (Est.)", v: inr(totalTax), tone: "text-rose-400" },
        ].map((m) => (
          <div key={m.k} className="rounded-2xl border border-border bg-card p-4">
            <div className="text-xs text-muted-foreground">{m.k}</div>
            <div className={`mt-1 font-display text-xl font-bold ${m.tone}`}>{m.v}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Short-Term Capital Gains</h3>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground"><span>Holding period &lt; 1Y</span><span className="font-medium text-foreground">{inr(stcg)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Tax rate</span><span className="font-medium text-foreground">15%</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Estimated tax</span><span className="font-medium text-rose-400">{inr(stcgTax)}</span></div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Long-Term Capital Gains</h3>
          <div className="mt-3 space-y-2 text-xs">
            <div className="flex justify-between text-muted-foreground"><span>Holding period &ge; 1Y</span><span className="font-medium text-foreground">{inr(ltcg)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Exempt</span><span className="font-medium text-foreground">{inr(ltcgExempt)}</span></div>
            <div className="flex justify-between text-muted-foreground"><span>Estimated tax (10%)</span><span className={`font-medium ${ltcgTax > 0 ? "text-rose-400" : "text-emerald-400"}`}>{inr(ltcgTax)}</span></div>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 text-mint" />
        Tax estimates are indicative and assume Indian equity LTCG/STCG slabs. Realized gains aren&apos;t included until transactions are logged.
      </div>
    </div>
  );
}

/* =================== Helpers =================== */
function buildMonthlyTrend(rows: HoldRow[]) {
  if (!rows.length) return [];
  const now = new Date();
  const months: { key: string; m: string; v: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      m: d.toLocaleString("en-IN", { month: "short" }) + " '" + String(d.getFullYear()).slice(2),
      v: 0,
    });
  }
  for (const r of rows) {
    const pd = r.purchase_date ? new Date(r.purchase_date) : null;
    for (const mo of months) {
      const [y, m] = mo.key.split("-").map(Number);
      const moEnd = new Date(y, m + 1, 0);
      if (!pd || pd <= moEnd) mo.v += r.cur;
    }
  }
  return months;
}

function buildPerformanceTrend(rows: HoldRow[]) {
  if (!rows.length) return [];
  const now = new Date();
  const months: { key: string; m: string; inv: number; cur: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      m: d.toLocaleString("en-IN", { month: "short" }),
      inv: 0,
      cur: 0,
    });
  }
  for (const r of rows) {
    const pd = r.purchase_date ? new Date(r.purchase_date) : null;
    for (const mo of months) {
      const [y, m] = mo.key.split("-").map(Number);
      const moEnd = new Date(y, m + 1, 0);
      if (!pd || pd <= moEnd) {
        mo.inv += r.inv;
        mo.cur += r.cur;
      }
    }
  }
  return months;
}

function Stat({ label, value, delta, icon: Icon, tint, up }: { label: string; value: string; delta: string; icon: any; tint: string; up?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {label} <Info className="h-3 w-3 opacity-60" />
          </div>
          <div className="mt-1 font-display text-xl font-bold text-foreground">{value}</div>
          <div className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${up === undefined ? "text-muted-foreground" : up ? "text-emerald-400" : "text-rose-400"}`}>
            {up !== undefined && (up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
            {delta}
          </div>
        </div>
      </div>
    </div>
  );
}

function FilterDropdown({ label, value, onChange, options, icon: Icon }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; icon?: any }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-2.5 text-xs text-foreground hover:bg-surface-2/80">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label} <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className="text-sm">
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={onEdit} className="gap-2 text-sm">
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onDelete} className="gap-2 text-sm text-rose-400 focus:text-rose-400">
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Pagination({ page, pageCount, total, onPage }: { page: number; pageCount: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs">
      <div className="text-muted-foreground">
        Showing <span className="text-foreground">{(page - 1) * PAGE + 1}</span>–
        <span className="text-foreground">{Math.min(page * PAGE, total)}</span> of{" "}
        <span className="text-foreground">{total}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1} className="grid h-7 w-7 place-items-center rounded-md border border-border text-muted-foreground disabled:opacity-40">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {Array.from({ length: pageCount }).slice(0, 6).map((_, i) => {
          const p = i + 1;
          return (
            <button key={p} onClick={() => onPage(p)} className={`h-7 min-w-7 rounded-md border border-border px-2 ${p === page ? "bg-mint/15 text-mint" : "text-muted-foreground hover:text-foreground"}`}>
              {p}
            </button>
          );
        })}
        <button onClick={() => onPage(Math.min(pageCount, page + 1))} disabled={page >= pageCount} className="grid h-7 w-7 place-items-center rounded-md border border-border text-muted-foreground disabled:opacity-40">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="mt-4 space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-2/60" />
      ))}
    </div>
  );
}

function Empty({ primary, secondary, cta }: { primary: string; secondary: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-border bg-surface-2/30 px-6 py-12 text-center">
      <div className="text-sm font-medium text-foreground">{primary}</div>
      <div className="mt-1 text-xs text-muted-foreground">{secondary}</div>
      {cta && (
        <button onClick={cta.onClick} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-mint px-3.5 py-2 text-xs font-semibold text-[#04121C] hover:brightness-110">
          {cta.label}
        </button>
      )}
    </div>
  );
}

function EmptyMini({ label }: { label: string }) {
  return (
    <div className="grid h-full place-items-center text-xs text-muted-foreground">{label}</div>
  );
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
      <div className="text-sm font-semibold text-rose-300">Couldn't load data</div>
      <div className="mt-1 text-xs text-rose-200/80">{message}</div>
      <button onClick={onRetry} className="mt-3 rounded-xl border border-rose-400/40 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/10">
        Retry
      </button>
    </div>
  );
}

function sortLabel(s: HSort) {
  switch (s) {
    case "name_asc": return "Name ↑";
    case "value_desc": return "Value ↓";
    case "pnl_desc": return "P&L ↓";
    case "ret_desc": return "Return ↓";
    default: return "Latest";
  }
}