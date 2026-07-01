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
} from "recharts";
import {
  CreditCard,
  TrendingDown,
  Banknote,
  Percent,
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
  GraduationCap,
  ShoppingBag,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Trash2,
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
import {
  LIABILITY_CATEGORIES,
  type Liability,
  type LiabilityInput,
  dueSoon,
  formatDate,
  groupByCategory,
  inr,
  inrCompact,
  useBulkInsertLiabilities,
  useDeleteLiability,
  useLiabilities,
  weightedAvgRate,
} from "@/lib/wealth-api";
import { LiabilityDialog } from "@/components/wealth/liability-dialog";
import { IoMenu } from "@/components/wealth/io-menu";
import { exportCsv, exportJson, exportPdf, exportXlsx, pickAndParse } from "@/lib/wealth-io";
import { toast } from "sonner";

const ICONS: Record<string, { Icon: any; tint: string }> = {
  "Home Loan": { Icon: Home, tint: "bg-blue-500/10 text-blue-400" },
  "Car Loan": { Icon: Car, tint: "bg-violet-500/10 text-violet-400" },
  "Personal Loan": { Icon: Banknote, tint: "bg-amber-500/10 text-amber-400" },
  "Credit Card": { Icon: CreditCard, tint: "bg-rose-500/10 text-rose-400" },
  "Education Loan": { Icon: GraduationCap, tint: "bg-emerald-500/10 text-emerald-400" },
  "Business Loan": { Icon: Briefcase, tint: "bg-slate-500/10 text-slate-300" },
  Other: { Icon: ShoppingBag, tint: "bg-emerald-500/10 text-emerald-400" },
};
const PIE_COLORS = ["#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444", "#10B981", "#14D8CF", "#F97316"];
const PAGE = 8;

type SortKey = "due_asc" | "name_asc" | "name_desc" | "out_desc" | "out_asc" | "rate_desc";

export function LiabilitiesView({
  registerAdd,
}: { registerAdd?: (open: () => void) => void }) {
  const { data: rows = [], isLoading, isError, error, refetch } = useLiabilities();
  const bulkInsert = useBulkInsertLiabilities();
  const del = useDeleteLiability();

  const [search, setSearch] = useState("");
  const [cat, setCat] = useState("all");
  const [lender, setLender] = useState("all");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState<SortKey>("due_asc");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Liability | null>(null);
  const [confirm, setConfirm] = useState<Liability | null>(null);

  if (registerAdd) {
    registerAdd(() => {
      setEditing(null);
      setDialogOpen(true);
    });
  }

  const total = useMemo(() => rows.reduce((s, r) => s + r.outstanding, 0), [rows]);
  const totalEmi = useMemo(() => rows.reduce((s, r) => s + (r.emi ?? 0), 0), [rows]);
  const avgRate = useMemo(() => weightedAvgRate(rows), [rows]);

  const alloc = useMemo(() => {
    return groupByCategory(rows, (r) => r.outstanding).map((a, i) => ({
      ...a,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [rows]);

  const trend = useMemo(() => buildMonthlyLiabilityTrend(rows), [rows]);
  const lenders = useMemo(
    () => Array.from(new Set(rows.map((r) => r.lender).filter(Boolean) as string[])),
    [rows],
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          x.category.toLowerCase().includes(q) ||
          (x.lender ?? "").toLowerCase().includes(q),
      );
    }
    if (cat !== "all") r = r.filter((x) => x.category === cat);
    if (lender !== "all") r = r.filter((x) => x.lender === lender);
    if (status !== "all") r = r.filter((x) => x.status === status);
    const sorted = [...r];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "out_desc": return b.outstanding - a.outstanding;
        case "out_asc": return a.outstanding - b.outstanding;
        case "rate_desc": return (b.interest_rate ?? 0) - (a.interest_rate ?? 0);
        default:
          return (a.due_date || "9999").localeCompare(b.due_date || "9999");
      }
    });
    return sorted;
  }, [rows, search, cat, lender, status, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice((page - 1) * PAGE, page * PAGE);
  if (page > pageCount) setTimeout(() => setPage(1), 0);

  const exportCols = [
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "lender", label: "Lender" },
    { key: "outstanding", label: "Outstanding" },
    { key: "principal", label: "Principal" },
    { key: "emi", label: "EMI" },
    { key: "interest_rate", label: "Interest %" },
    { key: "tenure_months", label: "Tenure (mo)" },
    { key: "start_date", label: "Start Date" },
    { key: "due_date", label: "Due Date" },
    { key: "end_date", label: "End Date" },
    { key: "status", label: "Status" },
    { key: "notes", label: "Notes" },
  ] as const;

  const handleImport = async () => {
    const parsed = await pickAndParse();
    if (!parsed || !parsed.length) return;
    const mapped: LiabilityInput[] = parsed
      .map((r: any) => ({
        name: String(r.Name ?? r.name ?? "").trim(),
        category: String(r.Category ?? r.category ?? "Other").trim() || "Other",
        lender: r.Lender ?? r.lender ?? null,
        outstanding: Number(r.Outstanding ?? r.outstanding ?? 0) || 0,
        principal: r.Principal === "" || r.principal === "" ? null : r.Principal ?? r.principal ?? null,
        emi: r.EMI === "" || r.emi === "" ? null : r.EMI ?? r.emi ?? null,
        interest_rate:
          r["Interest %"] === "" || r.interest_rate === ""
            ? null
            : r["Interest %"] ?? r.interest_rate ?? null,
        tenure_months:
          r["Tenure (mo)"] === "" || r.tenure_months === ""
            ? null
            : r["Tenure (mo)"] ?? r.tenure_months ?? null,
        start_date: r["Start Date"] ?? r.start_date ?? null,
        due_date: r["Due Date"] ?? r.due_date ?? null,
        end_date: r["End Date"] ?? r.end_date ?? null,
        status: (r.Status ?? r.status ?? "active") || "active",
        notes: r.Notes ?? r.notes ?? null,
      }))
      .filter((r) => r.name);
    if (!mapped.length) return toast.error("No valid rows found");
    await bulkInsert.mutateAsync(mapped);
  };

  if (isError)
    return (
      <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
        <div className="text-sm font-semibold text-rose-300">Couldn't load liabilities</div>
        <div className="mt-1 text-xs text-rose-200/80">{(error as Error)?.message}</div>
        <button
          onClick={() => refetch()}
          className="mt-3 rounded-xl border border-rose-400/40 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/10"
        >Retry</button>
      </div>
    );

  return (
    <>
      {/* ============= STAT CARDS ============= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Liabilities"
          value={isLoading ? "…" : inr(total)}
          delta={`${rows.length} item${rows.length === 1 ? "" : "s"}`}
          icon={CreditCard}
          tint="bg-rose-500/10 text-rose-400"
        />
        <StatCard
          label="Monthly EMIs"
          value={isLoading ? "…" : inr(totalEmi)}
          delta="Across all loans"
          icon={Banknote}
          tint="bg-amber-500/10 text-amber-400"
        />
        <StatCard
          label="Weighted Avg Rate"
          value={isLoading ? "…" : `${avgRate.toFixed(2)}%`}
          delta="By outstanding balance"
          icon={Percent}
          tint="bg-violet-500/10 text-violet-400"
        />
        <StatCard
          label="Due in 7 days"
          value={String(rows.filter((r) => dueSoon(r.due_date)).length)}
          delta="Upcoming payments"
          icon={TrendingDown}
          tint="bg-emerald-500/10 text-emerald-400"
        />
      </div>

      {/* ============= ALLOC + TREND ============= */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-5">
          <h3 className="text-sm font-semibold text-foreground">Liability Breakdown</h3>
          {alloc.length === 0 ? (
            <EmptyMini label="No liabilities yet" />
          ) : (
            <div className="mt-4 flex items-center gap-5">
              <div className="relative h-[180px] w-[180px] shrink-0">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie data={alloc} dataKey="pct" innerRadius={58} outerRadius={82} paddingAngle={2} stroke="none">
                      {alloc.map((a) => <Cell key={a.name} fill={a.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="font-display text-base font-bold text-foreground">{inrCompact(total)}</div>
                    <div className="text-[10px] text-muted-foreground">Total Liabilities</div>
                  </div>
                </div>
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                {alloc.slice(0, 6).map((a) => (
                  <div key={a.name} className="grid grid-cols-[1fr_auto_auto] items-center gap-3 text-xs">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="h-2 w-2 rounded-full" style={{ background: a.color }} />
                      <span className="truncate text-foreground">{a.name}</span>
                    </div>
                    <span className="font-medium text-muted-foreground">{a.pct.toFixed(1)}%</span>
                    <span className="text-right font-medium text-foreground">{inrCompact(a.amt)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-7">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Liability Trend</h3>
            <button className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">
              6M <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <div className="h-[230px]">
            {trend.length < 2 ? (
              <EmptyMini label="Add liabilities to see trend" />
            ) : (
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
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
                    tickFormatter={(v) => inrCompact(v as number)}
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [inr(v), "Outstanding"]}
                  />
                  <Area type="monotone" dataKey="v" stroke="#EF4444" strokeWidth={2.5} fill="url(#liabGrad)" dot={{ r: 2.5, fill: "#EF4444" }} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ============= TABLE ============= */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search liabilities..."
              className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
            />
          </div>
          <FilterDropdown
            label={cat === "all" ? "All Categories" : cat}
            value={cat}
            onChange={(v) => { setCat(v); setPage(1); }}
            options={[{ value: "all", label: "All Categories" }, ...LIABILITY_CATEGORIES.map((c) => ({ value: c, label: c }))]}
          />
          <FilterDropdown
            label={lender === "all" ? "All Lenders" : lender}
            value={lender}
            onChange={(v) => { setLender(v); setPage(1); }}
            options={[{ value: "all", label: "All Lenders" }, ...lenders.map((l) => ({ value: l, label: l }))]}
          />
          <FilterDropdown
            label={status === "all" ? "All Status" : titleCase(status)}
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              { value: "all", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "due_soon", label: "Due Soon" },
              { value: "overdue", label: "Overdue" },
              { value: "closed", label: "Closed" },
            ]}
          />
          <FilterDropdown
            label={`Sort: ${sortLabel(sort)}`}
            value={sort}
            icon={ArrowUpDown}
            onChange={(v) => setSort(v as SortKey)}
            options={[
              { value: "due_asc", label: "Due date (earliest)" },
              { value: "name_asc", label: "Name (A→Z)" },
              { value: "name_desc", label: "Name (Z→A)" },
              { value: "out_desc", label: "Outstanding (high → low)" },
              { value: "out_asc", label: "Outstanding (low → high)" },
              { value: "rate_desc", label: "Interest rate (high → low)" },
            ]}
          />
          <IoMenu
            onImport={handleImport}
            onExportCsv={() => exportCsv("liabilities", exportCols as any, filtered)}
            onExportXlsx={() => exportXlsx("liabilities", exportCols as any, filtered)}
            onExportJson={() => exportJson("liabilities", filtered)}
            onExportPdf={() =>
              exportPdf("Liabilities", exportCols as any, filtered, {
                subtitle: `Total ${inr(total)} · ${filtered.length} items · Weighted Avg ${avgRate.toFixed(2)}%`,
              })
            }
          />
          <div className="ml-auto flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1">
            <button onClick={() => setView("list")} className={`rounded-lg p-1.5 ${view === "list" ? "bg-mint/15 text-mint" : "text-muted-foreground"}`}>
              <List className="h-4 w-4" />
            </button>
            <button onClick={() => setView("grid")} className={`rounded-lg p-1.5 ${view === "grid" ? "bg-mint/15 text-mint" : "text-muted-foreground"}`}>
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <Empty
            primary={rows.length === 0 ? "No liabilities yet" : "No matches"}
            secondary={rows.length === 0 ? "Track your first loan or credit balance." : "Try clearing filters or search."}
            cta={rows.length === 0 ? { label: "Add liability", onClick: () => { setEditing(null); setDialogOpen(true); } } : undefined}
          />
        ) : view === "list" ? (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                  <th className="py-3 pl-2 font-medium">Liability Name</th>
                  <th className="py-3 font-medium">Category</th>
                  <th className="py-3 font-medium">Lender</th>
                  <th className="py-3 font-medium">Outstanding</th>
                  <th className="py-3 font-medium">EMI (Monthly)</th>
                  <th className="py-3 font-medium">Interest Rate</th>
                  <th className="py-3 font-medium">Due Date</th>
                  <th className="py-3 font-medium">Status</th>
                  <th className="py-3 pr-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((l) => {
                  const meta = ICONS[l.category] ?? ICONS.Other;
                  return (
                    <tr key={l.id} className="border-b border-border/50 last:border-0 hover:bg-surface-2/40">
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          <div className={`grid h-8 w-8 place-items-center rounded-lg ${meta.tint}`}>
                            <meta.Icon className="h-4 w-4" />
                          </div>
                          <span className="font-medium text-foreground">{l.name}</span>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{l.category}</td>
                      <td className="py-3 text-muted-foreground">{l.lender ?? "—"}</td>
                      <td className="py-3 font-medium text-foreground">{inr(l.outstanding)}</td>
                      <td className="py-3 text-foreground">{l.emi != null ? inr(l.emi) : "—"}</td>
                      <td className="py-3 text-foreground">{l.interest_rate != null ? `${l.interest_rate.toFixed(2)}%` : "—"}</td>
                      <td className="py-3 text-muted-foreground">{formatDate(l.due_date)}</td>
                      <td className="py-3">
                        <StatusPill status={l.status} />
                      </td>
                      <td className="py-3 pr-2">
                        <RowMenu
                          onEdit={() => { setEditing(l); setDialogOpen(true); }}
                          onDelete={() => setConfirm(l)}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pageRows.map((l) => {
              const meta = ICONS[l.category] ?? ICONS.Other;
              return (
                <div key={l.id} className="rounded-xl border border-border bg-surface-2/40 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.tint}`}>
                        <meta.Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{l.name}</div>
                        <div className="text-[11px] text-muted-foreground">{l.category} · {l.lender ?? "—"}</div>
                      </div>
                    </div>
                    <RowMenu
                      onEdit={() => { setEditing(l); setDialogOpen(true); }}
                      onDelete={() => setConfirm(l)}
                    />
                  </div>
                  <div className="mt-3 font-display text-lg font-bold text-foreground">{inr(l.outstanding)}</div>
                  <div className="text-[11px] text-muted-foreground">
                    EMI {l.emi != null ? inr(l.emi) : "—"} · Due {formatDate(l.due_date)}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {filtered.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs">
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <span className="text-muted-foreground">
                Total Liabilities <span className="ml-2 font-semibold text-rose-400">{inr(total)}</span>
              </span>
              <span className="text-muted-foreground">
                Total EMIs <span className="ml-2 font-semibold text-foreground">{inr(totalEmi)}</span>
              </span>
              <span className="text-muted-foreground">
                Weighted Avg Interest <span className="ml-2 font-semibold text-foreground">{avgRate.toFixed(2)}%</span>
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="grid h-7 w-7 place-items-center rounded-md border border-border text-muted-foreground disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              {Array.from({ length: pageCount }).slice(0, 6).map((_, i) => {
                const p = i + 1;
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`h-7 min-w-7 rounded-md border border-border px-2 ${p === page ? "bg-mint/15 text-mint" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
                disabled={page >= pageCount}
                className="grid h-7 w-7 place-items-center rounded-md border border-border text-muted-foreground disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <LiabilityDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
        existing={editing}
      />

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete liability?</AlertDialogTitle>
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

/* ----- shared sub-components ----- */
function StatCard({
  label, value, delta, icon: Icon, tint,
}: { label: string; value: string; delta: string; icon: any; tint: string }) {
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
          <div className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground">
            {delta}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
    due_soon: "bg-amber-500/10 text-amber-300 border-amber-500/30",
    overdue: "bg-rose-500/10 text-rose-300 border-rose-500/30",
    closed: "bg-slate-500/10 text-slate-300 border-slate-500/30",
  };
  return (
    <span className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${map[status] ?? map.active}`}>
      {titleCase(status)}
    </span>
  );
}

function FilterDropdown({
  label, value, onChange, options, icon: Icon,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  icon?: any;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-2.5 text-xs text-foreground hover:bg-surface-2/80">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label} <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
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

function TableSkeleton() {
  return (
    <div className="mt-4 space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-2/60" />
      ))}
    </div>
  );
}

function Empty({
  primary, secondary, cta,
}: { primary: string; secondary: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-border bg-surface-2/30 px-6 py-12 text-center">
      <div className="text-sm font-medium text-foreground">{primary}</div>
      <div className="mt-1 text-xs text-muted-foreground">{secondary}</div>
      {cta && (
        <button
          onClick={cta.onClick}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-mint px-3.5 py-2 text-xs font-semibold text-[#04121C] hover:brightness-110"
        >
          {cta.label}
        </button>
      )}
    </div>
  );
}

function EmptyMini({ label }: { label: string }) {
  return (
    <div className="mt-4 grid h-[180px] place-items-center text-xs text-muted-foreground">
      {label}
    </div>
  );
}

function sortLabel(s: SortKey) {
  switch (s) {
    case "name_asc": return "Name ↑";
    case "name_desc": return "Name ↓";
    case "out_desc": return "Outstanding ↓";
    case "out_asc": return "Outstanding ↑";
    case "rate_desc": return "Rate ↓";
    default: return "Due date";
  }
}
function titleCase(s: string) {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function buildMonthlyLiabilityTrend(rows: Liability[]) {
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
    const start = r.start_date ? new Date(r.start_date) : null;
    for (const mo of months) {
      const [y, m] = mo.key.split("-").map(Number);
      const moEnd = new Date(y, m + 1, 0);
      if (!start || start <= moEnd) mo.v += r.outstanding;
    }
  }
  return months;
}