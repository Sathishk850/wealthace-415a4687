import { useMemo, useState } from "react";
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
  List,
  LayoutGrid,
  MoreVertical,
  Home,
  Car,
  Landmark,
  Coins,
  Banknote,
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
  type Asset,
  type AssetInput,
  ASSET_CATEGORIES,
  formatDate,
  groupByCategory,
  inr,
  inrCompact,
  useAssets,
  useBulkInsertAssets,
  useDeleteAsset,
} from "@/lib/wealth-api";
import { AssetDialog } from "@/components/wealth/asset-dialog";
import { IoMenu } from "@/components/wealth/io-menu";
import { exportCsv, exportJson, exportPdf, exportXlsx, pickAndParse } from "@/lib/wealth-io";
import { toast } from "sonner";

const ICONS: Record<string, { Icon: any; tint: string }> = {
  Cash: { Icon: Banknote, tint: "bg-emerald-500/10 text-emerald-400" },
  Property: { Icon: Home, tint: "bg-blue-500/10 text-blue-400" },
  Vehicle: { Icon: Car, tint: "bg-violet-500/10 text-violet-400" },
  EPF: { Icon: Landmark, tint: "bg-emerald-500/10 text-emerald-400" },
  PPF: { Icon: Landmark, tint: "bg-emerald-500/10 text-emerald-400" },
  Gold: { Icon: Coins, tint: "bg-amber-500/10 text-amber-400" },
  Investments: { Icon: TrendingUp, tint: "bg-mint/10 text-mint" },
  Other: { Icon: Briefcase, tint: "bg-slate-500/10 text-slate-300" },
};
const PIE_COLORS = ["#3B82F6", "#14D8CF", "#F59E0B", "#10B981", "#8B5CF6", "#F97316", "#EC4899", "#94A3B8"];
const PAGE = 8;

type SortKey = "latest" | "name_asc" | "name_desc" | "value_desc" | "value_asc";

export function AssetsView({
  registerAdd,
}: {
  registerAdd?: (open: () => void) => void;
}) {
  const { data: rows = [], isLoading, isError, error, refetch } = useAssets();
  const bulkInsert = useBulkInsertAssets();
  const del = useDeleteAsset();

  const [search, setSearch] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<SortKey>("latest");
  const [view, setView] = useState<"list" | "grid">("list");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Asset | null>(null);
  const [confirm, setConfirm] = useState<Asset | null>(null);

  // expose Add trigger to parent header
  if (registerAdd) {
    registerAdd(() => {
      setEditing(null);
      setDialogOpen(true);
    });
  }

  const total = useMemo(() => rows.reduce((s, r) => s + r.current_value, 0), [rows]);
  const invested = useMemo(
    () => rows.reduce((s, r) => s + (r.purchase_value ?? r.current_value), 0),
    [rows],
  );
  const change = total - invested;
  const changePct = invested ? (change / invested) * 100 : 0;

  const alloc = useMemo(() => {
    return groupByCategory(rows, (r) => r.current_value).map((a, i) => ({
      ...a,
      color: PIE_COLORS[i % PIE_COLORS.length],
    }));
  }, [rows]);

  // Build trend from purchase_date → current_value cumulative
  const trend = useMemo(() => buildMonthlyTrend(rows), [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          x.category.toLowerCase().includes(q) ||
          (x.sub_category ?? "").toLowerCase().includes(q) ||
          (x.location ?? "").toLowerCase().includes(q),
      );
    }
    if (cat !== "all") r = r.filter((x) => x.category === cat);
    if (status !== "all") r = r.filter((x) => x.status === status);
    const sorted = [...r];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name_asc": return a.name.localeCompare(b.name);
        case "name_desc": return b.name.localeCompare(a.name);
        case "value_desc": return b.current_value - a.current_value;
        case "value_asc": return a.current_value - b.current_value;
        default: return (b.last_updated || "").localeCompare(a.last_updated || "");
      }
    });
    return sorted;
  }, [rows, search, cat, status, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice((page - 1) * PAGE, page * PAGE);
  if (page > pageCount) setTimeout(() => setPage(1), 0);

  /* Import / Export */
  const exportCols = [
    { key: "name", label: "Name" },
    { key: "category", label: "Category" },
    { key: "sub_category", label: "Sub Category" },
    { key: "current_value", label: "Current Value" },
    { key: "purchase_value", label: "Purchase Value" },
    { key: "purchase_date", label: "Purchase Date" },
    { key: "quantity", label: "Quantity" },
    { key: "unit", label: "Unit" },
    { key: "location", label: "Location" },
    { key: "status", label: "Status" },
    { key: "last_updated", label: "Last Updated" },
    { key: "notes", label: "Notes" },
  ] as const;

  const handleImport = async () => {
    const parsed = await pickAndParse();
    if (!parsed || !parsed.length) return;
    const mapped: AssetInput[] = parsed
      .map((r: any) => ({
        name: String(r.Name ?? r.name ?? "").trim(),
        category: String(r.Category ?? r.category ?? "Other").trim() || "Other",
        sub_category: r["Sub Category"] ?? r.sub_category ?? null,
        current_value: Number(r["Current Value"] ?? r.current_value ?? 0) || 0,
        purchase_value:
          r["Purchase Value"] === "" || r.purchase_value === ""
            ? null
            : r["Purchase Value"] ?? r.purchase_value ?? null,
        purchase_date: r["Purchase Date"] ?? r.purchase_date ?? null,
        quantity:
          r.Quantity === "" || r.quantity === "" ? null : r.Quantity ?? r.quantity ?? null,
        unit: r.Unit ?? r.unit ?? null,
        location: r.Location ?? r.location ?? null,
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
        message={(error as Error)?.message || "Failed to load assets"}
        onRetry={() => refetch()}
      />
    );

  return (
    <>
      {/* ============= STAT CARDS ============= */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Assets"
          value={isLoading ? "…" : inr(total)}
          delta={`${rows.length} item${rows.length === 1 ? "" : "s"}`}
          icon={Wallet}
          tint="bg-mint/10 text-mint"
        />
        <StatCard
          label="Total Invested"
          value={isLoading ? "…" : inr(invested)}
          delta="Sum of purchase values"
          icon={TrendingUp}
          tint="bg-blue-400/10 text-blue-300"
        />
        <StatCard
          label="Holdings"
          value={String(rows.length)}
          delta={`Across ${alloc.length} categor${alloc.length === 1 ? "y" : "ies"}`}
          icon={PieIcon}
          tint="bg-violet-400/10 text-violet-300"
        />
        <StatCard
          label="Net Gain / Loss"
          value={isLoading ? "…" : inr(change)}
          delta={`${changePct >= 0 ? "+" : ""}${changePct.toFixed(2)}% overall`}
          icon={BarChart3}
          tint={
            change >= 0
              ? "bg-emerald-400/10 text-emerald-300"
              : "bg-rose-400/10 text-rose-300"
          }
          up={change >= 0}
        />
      </div>

      {/* ============= ALLOC + TREND ============= */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-5">
          <h3 className="text-sm font-semibold text-foreground">Asset Allocation</h3>
          {alloc.length === 0 ? (
            <EmptyMini label="No assets yet" />
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
                    <div className="text-[10px] text-muted-foreground">Total Assets</div>
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
            <h3 className="text-sm font-semibold text-foreground">Asset Growth Trend</h3>
            <button className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">
              6M <ChevronDown className="h-3 w-3" />
            </button>
          </div>
          <div className="h-[230px]">
            {trend.length < 2 ? (
              <EmptyMini label="Add assets with purchase dates to see growth" />
            ) : (
              <ResponsiveContainer>
                <AreaChart data={trend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
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
                    tickFormatter={(v) => inrCompact(v as number)}
                  />
                  <Tooltip
                    contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [inr(v), "Value"]}
                  />
                  <Area type="monotone" dataKey="v" stroke="#14D8CF" strokeWidth={2.5} fill="url(#growth)" />
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
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search assets..."
              className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
            />
          </div>
          <FilterDropdown
            label={cat === "all" ? "All Categories" : cat}
            value={cat}
            onChange={(v) => { setCat(v); setPage(1); }}
            options={[{ value: "all", label: "All Categories" }, ...ASSET_CATEGORIES.map((c) => ({ value: c, label: c }))]}
          />
          <FilterDropdown
            label={status === "all" ? "All Status" : titleCase(status)}
            value={status}
            onChange={(v) => { setStatus(v); setPage(1); }}
            options={[
              { value: "all", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "sold", label: "Sold" },
            ]}
          />
          <FilterDropdown
            label={`Sort: ${sortLabel(sort)}`}
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            icon={ArrowUpDown}
            options={[
              { value: "latest", label: "Latest updated" },
              { value: "name_asc", label: "Name (A→Z)" },
              { value: "name_desc", label: "Name (Z→A)" },
              { value: "value_desc", label: "Value (high → low)" },
              { value: "value_asc", label: "Value (low → high)" },
            ]}
          />
          <IoMenu
            onImport={handleImport}
            onExportCsv={() => exportCsv("assets", exportCols as any, filtered)}
            onExportXlsx={() => exportXlsx("assets", exportCols as any, filtered)}
            onExportJson={() => exportJson("assets", filtered)}
            onExportPdf={() =>
              exportPdf("Assets", exportCols as any, filtered, {
                subtitle: `Total ${inr(total)} · ${filtered.length} items`,
              })
            }
          />
          <div className="ml-auto flex items-center gap-1 rounded-xl border border-border bg-surface-2 p-1">
            <button
              onClick={() => setView("list")}
              className={`rounded-lg p-1.5 ${view === "list" ? "bg-mint/15 text-mint" : "text-muted-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("grid")}
              className={`rounded-lg p-1.5 ${view === "grid" ? "bg-mint/15 text-mint" : "text-muted-foreground"}`}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton />
        ) : filtered.length === 0 ? (
          <Empty
            primary={rows.length === 0 ? "No assets yet" : "No matches"}
            secondary={rows.length === 0 ? "Add your first asset to get started." : "Try clearing filters or search."}
            cta={rows.length === 0 ? { label: "Add asset", onClick: () => { setEditing(null); setDialogOpen(true); } } : undefined}
          />
        ) : view === "list" ? (
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
                {pageRows.map((a) => {
                  const meta = ICONS[a.category] ?? ICONS.Other;
                  const gain = (a.purchase_value ?? a.current_value) === a.current_value
                    ? 0
                    : a.current_value - (a.purchase_value ?? 0);
                  const gainPct = a.purchase_value && a.purchase_value > 0 ? (gain / a.purchase_value) * 100 : 0;
                  const up = gain >= 0;
                  return (
                    <tr key={a.id} className="border-b border-border/50 last:border-0 hover:bg-surface-2/40">
                      <td className="py-3 pl-2">
                        <div className="flex items-center gap-3">
                          <div className={`grid h-8 w-8 place-items-center rounded-lg ${meta.tint}`}>
                            <meta.Icon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="font-medium text-foreground">{a.name}</div>
                            {a.sub_category && (
                              <div className="text-[11px] text-muted-foreground">{a.sub_category}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-muted-foreground">{a.category}</td>
                      <td className="py-3 font-medium text-foreground">{inr(a.current_value)}</td>
                      <td className={`py-3 font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>
                        {a.purchase_value == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {inr(Math.abs(gain))} <span className="text-xs opacity-80">({gainPct.toFixed(2)}%)</span>
                          </span>
                        )}
                      </td>
                      <td className={`py-3 font-medium ${up ? "text-emerald-400" : "text-rose-400"}`}>
                        {a.purchase_value == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1">
                            {up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                            {gainPct.toFixed(2)}%
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-muted-foreground">{formatDate(a.last_updated)}</td>
                      <td className="py-3 pr-2">
                        <RowMenu
                          onEdit={() => { setEditing(a); setDialogOpen(true); }}
                          onDelete={() => setConfirm(a)}
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
            {pageRows.map((a) => {
              const meta = ICONS[a.category] ?? ICONS.Other;
              return (
                <div key={a.id} className="rounded-xl border border-border bg-surface-2/40 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.tint}`}>
                        <meta.Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="truncate font-medium text-foreground">{a.name}</div>
                        <div className="text-[11px] text-muted-foreground">{a.category}</div>
                      </div>
                    </div>
                    <RowMenu
                      onEdit={() => { setEditing(a); setDialogOpen(true); }}
                      onDelete={() => setConfirm(a)}
                    />
                  </div>
                  <div className="mt-3 font-display text-lg font-bold text-foreground">{inr(a.current_value)}</div>
                  <div className="text-[11px] text-muted-foreground">Last updated {formatDate(a.last_updated)}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination + totals */}
        {filtered.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs">
            <div className="text-muted-foreground">
              Showing <span className="text-foreground">{(page - 1) * PAGE + 1}</span>–
              <span className="text-foreground">{Math.min(page * PAGE, filtered.length)}</span> of{" "}
              <span className="text-foreground">{filtered.length}</span>
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

      <AssetDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
        existing={editing}
      />

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete asset?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{confirm?.name}</strong> from your assets.
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

/* =================== small UI helpers =================== */
function StatCard({
  label, value, delta, icon: Icon, tint, up,
}: {
  label: string; value: string; delta: string;
  icon: any; tint: string; up?: boolean;
}) {
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
          <div
            className={`mt-1 inline-flex items-center gap-1 text-xs font-medium ${
              up === undefined ? "text-muted-foreground" : up ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {up !== undefined && (up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />)}
            {delta}
          </div>
        </div>
      </div>
    </div>
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

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
      <div className="text-sm font-semibold text-rose-300">Couldn't load data</div>
      <div className="mt-1 text-xs text-rose-200/80">{message}</div>
      <button
        onClick={onRetry}
        className="mt-3 rounded-xl border border-rose-400/40 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/10"
      >
        Retry
      </button>
    </div>
  );
}

function sortLabel(s: SortKey) {
  switch (s) {
    case "name_asc": return "Name ↑";
    case "name_desc": return "Name ↓";
    case "value_desc": return "Value ↓";
    case "value_asc": return "Value ↑";
    default: return "Latest";
  }
}
function titleCase(s: string) {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
function buildMonthlyTrend(rows: Asset[]) {
  // Build cumulative monthly net asset value using last_updated as the latest checkpoint
  // and purchase_date as the starting point for items that have one.
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
      const owned = !pd || pd <= moEnd;
      if (owned) mo.v += r.current_value;
    }
  }
  return months;
}