import { useEffect, useMemo, useState } from "react";
import { useBulkSelection } from "@/lib/bulk/use-bulk-selection";
import { useBulkDeleteRows, useBulkUpdateRows } from "@/lib/bulk/use-bulk-mutations";
import { BulkActionBar } from "@/components/bulk/bulk-action-bar";
import { SelectCheckbox } from "@/components/bulk/select-checkbox";
import { TextTabs } from "@/components/text-tabs";
import { useCollapsibleGroups } from "@/lib/use-collapsible-groups";
import { AUTO_REFRESH_MS } from "@/components/refresh-icon-button";
import {
  CreditCard,
  Banknote,
  Search,
  ChevronDown,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Home,
  Car,
  GraduationCap,
  ShoppingBag,
  Briefcase,
  Coins,
  Pencil,
  Trash2,
  Eye,
  MoreHorizontal,
  Plus,
  RefreshCw,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LIABILITY_CATEGORIES,
  type Liability,
  type LiabilityInput,
  dueSoon,
  inr,
  useBulkInsertLiabilities,
  useDeleteLiability,
  useLiabilities,
  weightedAvgRate,
} from "@/lib/wealth-api";
import { formatDate } from "@/lib/date-format";
import { LiabilityDialog } from "@/components/wealth/liability-dialog";
import { IoMenu } from "@/components/wealth/io-menu";
import { exportCsv, exportJson, exportPdf, exportXlsx, pickAndParse } from "@/lib/wealth-io";
import { toast } from "sonner";

/* ---------------------------------------------------------
   Category meta (icons/tints) — Gold Loan included
--------------------------------------------------------- */
const ICONS: Record<string, { Icon: any; tint: string }> = {
  "Home Loan": { Icon: Home, tint: "bg-blue-500/10 text-blue-400" },
  "Car Loan": { Icon: Car, tint: "bg-violet-500/10 text-violet-400" },
  "Personal Loan": { Icon: Banknote, tint: "bg-amber-500/10 text-amber-400" },
  "Gold Loan": { Icon: Coins, tint: "bg-yellow-500/10 text-yellow-400" },
  "Credit Card": { Icon: CreditCard, tint: "bg-rose-500/10 text-rose-400" },
  "Education Loan": { Icon: GraduationCap, tint: "bg-emerald-500/10 text-emerald-400" },
  "Business Loan": { Icon: Briefcase, tint: "bg-slate-500/10 text-slate-300" },
  Other: { Icon: ShoppingBag, tint: "bg-emerald-500/10 text-emerald-400" },
};

const TABS = ["All", ...LIABILITY_CATEGORIES] as const;
type Tab = (typeof TABS)[number];
const TAB_STORAGE_KEY = "liabilities:tab";

type SortKey =
  | "name"
  | "category"
  | "lender"
  | "outstanding"
  | "emi"
  | "rate"
  | "due"
  | "status";

const getRowId = (r: { id: string }) => r.id;

export function LiabilitiesView({
  registerAdd,
}: { registerAdd?: (open: () => void) => void }) {
  const { data: rows = [], isLoading, isError, error, refetch, isFetching } = useLiabilities();
  const bulkInsert = useBulkInsertLiabilities();
  const del = useDeleteLiability();

  const [tab, setTab] = useState<Tab>(() => {
    if (typeof window === "undefined") return "All";
    const saved = sessionStorage.getItem(TAB_STORAGE_KEY) as Tab | null;
    return saved && (TABS as readonly string[]).includes(saved) ? saved : "All";
  });
  useEffect(() => {
    try {
      sessionStorage.setItem(TAB_STORAGE_KEY, tab);
    } catch {
      /* storage unavailable */
    }
  }, [tab]);

  const [search, setSearch] = useState("");
  const [mobileSearch, setMobileSearch] = useState(false);
  const [fLender, setFLender] = useState("all");
  const [fStatus, setFStatus] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Liability | null>(null);
  const [confirm, setConfirm] = useState<Liability | null>(null);
  const [details, setDetails] = useState<Liability | null>(null);

  const openAdd = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  if (registerAdd) registerAdd(openAdd);

  /* 30-minute auto refresh so figures stay current */
  useEffect(() => {
    const t = setInterval(() => {
      refetch();
    }, AUTO_REFRESH_MS);
    return () => clearInterval(t);
  }, [refetch]);

  const lenders = useMemo(
    () => uniqSorted(rows.map((r) => r.lender ?? "").filter(Boolean)),
    [rows],
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (tab !== "All") r = r.filter((x) => x.category === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.name.toLowerCase().includes(q) ||
          x.category.toLowerCase().includes(q) ||
          (x.lender ?? "").toLowerCase().includes(q),
      );
    }
    if (fLender !== "all") r = r.filter((x) => x.lender === fLender);
    if (fStatus !== "all") r = r.filter((x) => x.status === fStatus);
    return r;
  }, [rows, tab, search, fLender, fStatus]);

  const sorted = useMemo(() => {
    const dir = sortDir === "asc" ? 1 : -1;
    const val = (l: Liability): string | number => {
      switch (sortKey) {
        case "category": return l.category;
        case "lender": return l.lender ?? "";
        case "outstanding": return l.outstanding;
        case "emi": return l.emi ?? 0;
        case "rate": return l.interest_rate ?? 0;
        case "due": return l.due_date || "9999-12-31";
        case "status": return l.status;
        default: return l.name.toLowerCase();
      }
    };
    return [...filtered].sort((a, b) => {
      const x = val(a);
      const y = val(b);
      if (typeof x === "number" && typeof y === "number") return (x - y) * dir;
      return String(x).localeCompare(String(y)) * dir;
    });
  }, [filtered, sortKey, sortDir]);

  const toggleSort = (k: SortKey) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir(k === "name" || k === "category" || k === "lender" ? "asc" : "desc");
    }
  };

  const totals = useMemo(() => {
    const outstanding = sorted.reduce((s, r) => s + (r.outstanding || 0), 0);
    const principal = sorted.reduce((s, r) => s + (r.principal ?? 0), 0);
    const emi = sorted.reduce((s, r) => s + (r.emi ?? 0), 0);
    return {
      outstanding,
      principal,
      emi,
      rate: weightedAvgRate(sorted),
      dueSoonCount: sorted.filter((r) => dueSoon(r.due_date)).length,
    };
  }, [sorted]);

  /* Global bulk selection */
  const sel = useBulkSelection(
    sorted,
    getRowId,
    useMemo(() => sorted.map((r) => r.id), [sorted]),
  );
  const bulkDel = useBulkDeleteRows("wealth_liabilities", "liabilities");
  const bulkUpd = useBulkUpdateRows("wealth_liabilities", "liabilities");

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
        >
          Retry
        </button>
      </div>
    );

  return (
    <div className="space-y-4">
      {/* ============ CATEGORY TABS ============ */}
      <div className="-mx-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TextTabs
          items={TABS.map((t) => ({ value: t, label: t }))}
          value={tab}
          onChange={(v) => {
            setTab(v as Tab);
            setSearch("");
            setFLender("all");
            setFStatus("all");
          }}
          className="min-w-max flex-nowrap px-1"
        />
      </div>

      {/* ============ TOOLBAR (mobile) ============ */}
      <div className="space-y-2 md:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileSearch((v) => !v)}
            aria-label="Search liabilities"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-card text-foreground"
          >
            <Search className="h-4 w-4" />
          </button>
          <div className="-mx-1 min-w-0 flex-1 overflow-x-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-2">
              <FilterMenu label="Lender" value={fLender} onChange={setFLender} options={lenders} />
              <FilterMenu
                label="Status"
                value={fStatus}
                onChange={setFStatus}
                options={["active", "due_soon", "overdue", "closed"]}
                formatOption={titleCase}
              />
            </div>
          </div>
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            aria-label="Refresh liabilities"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-mint/40 bg-mint/[0.06] text-mint disabled:opacity-60"
          >
            <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={openAdd}
            aria-label="Add liability"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-mint text-[#04121C]"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {mobileSearch ? (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              autoFocus
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search liabilities…"
              className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
            />
          </div>
        ) : null}
      </div>

      {/* ============ TOOLBAR (desktop) ============ */}
      <div className="hidden flex-wrap items-center gap-2 rounded-2xl border border-border bg-card p-3 md:flex">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search liabilities…"
            className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
          />
        </div>
        <FilterMenu label="Lender" value={fLender} onChange={setFLender} options={lenders} />
        <FilterMenu
          label="Status"
          value={fStatus}
          onChange={setFStatus}
          options={["active", "due_soon", "overdue", "closed"]}
          formatOption={titleCase}
        />
        <IoMenu
          onImport={handleImport}
          onExportCsv={() => exportCsv("liabilities", exportCols as any, sorted)}
          onExportXlsx={() => exportXlsx("liabilities", exportCols as any, sorted)}
          onExportJson={() => exportJson("liabilities", sorted)}
          onExportPdf={() =>
            exportPdf("Liabilities", exportCols as any, sorted, {
              subtitle: `Total ${inr(totals.outstanding)} · ${sorted.length} items · Weighted Avg ${totals.rate.toFixed(2)}%`,
            })
          }
        />
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="inline-flex items-center gap-1.5 rounded-xl border border-mint/40 bg-mint/[0.06] px-3 py-2 text-xs font-medium text-mint hover:bg-mint/10 disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
            Refresh Now
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-[#04121C] transition hover:brightness-110"
          >
            <Plus className="h-3.5 w-3.5" /> Add Liability
          </button>
        </div>
      </div>

      {/* ============ LIST ============ */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {/* Mobile: grouped collapsible cards */}
        <div className="md:hidden">
          {isLoading ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</div>
          ) : sorted.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-muted-foreground">
              No liabilities in {tab}. Tap <span className="text-mint">+</span> to add one.
            </div>
          ) : (
            <MobileLiabilityGroups
              rows={sorted}
              isSelected={(id) => sel.isSelected(id)}
              onSelectChange={(id, v) => sel.toggle(id, v)}
              onView={(l) => setDetails(l)}
              onEdit={(l) => {
                setEditing(l);
                setDialogOpen(true);
              }}
              onDelete={(l) => setConfirm(l)}
            />
          )}
        </div>

        {/* Desktop: table */}
        <div className="hidden md:block">
          <table className="w-full table-fixed text-sm">
            <thead className="sticky top-0 z-10 bg-card">
              <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="w-[40px] px-2 py-3">
                  <SelectCheckbox
                    label="Select all liabilities"
                    checked={sel.allSelected}
                    indeterminate={sel.someSelected && !sel.allSelected}
                    onChange={(v) => sel.toggleAll(v)}
                  />
                </th>
                <SortHeader label={`Liabilities (${sorted.length})`} col="name" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" />
                <SortHeader label="Category" col="category" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" className="hidden w-[130px] xl:table-cell" />
                <SortHeader label="Lender" col="lender" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" className="hidden w-[120px] lg:table-cell" />
                <SortHeader label="Outstanding" col="outstanding" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" className="w-[120px]" />
                <SortHeader label="EMI" col="emi" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" className="w-[100px]" />
                <SortHeader label="Rate" col="rate" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="right" className="w-[72px]" />
                <SortHeader label="Due Date" col="due" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" className="hidden w-[110px] lg:table-cell" />
                <SortHeader label="Status" col="status" sortKey={sortKey} sortDir={sortDir} onClick={toggleSort} align="left" className="w-[92px]" />
                <th className="w-[52px] px-2 py-3"></th>
              </tr>

            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-10 text-center text-sm text-muted-foreground">
                    No liabilities in {tab}. Click <span className="text-mint">Add Liability</span> to add one.
                  </td>
                </tr>
              ) : (
                sorted.map((l) => {
                  const meta = ICONS[l.category] ?? ICONS.Other;
                  return (
                    <tr
                      key={l.id}
                      className={`group border-b border-border/50 last:border-0 hover:bg-surface-2/40 ${
                        sel.isSelected(l.id) ? "bg-mint/[0.06]" : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <SelectCheckbox
                          label={`Select ${l.name}`}
                          checked={sel.isSelected(l.id)}
                          onChange={(v) => sel.toggle(l.id, v)}
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${meta.tint}`}>
                            <meta.Icon className="h-4 w-4" />
                          </div>
                          <button
                            onClick={() => setDetails(l)}
                            className="truncate text-left font-medium text-foreground hover:text-mint"
                          >
                            {l.name}
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{l.category}</td>
                      <td className="px-3 py-3 text-muted-foreground">{l.lender ?? "—"}</td>
                      <td className="px-3 py-3 text-right font-medium tabular-nums text-foreground">
                        {inr(l.outstanding)}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">
                        {l.emi != null ? inr(l.emi) : "—"}
                      </td>
                      <td className="px-3 py-3 text-right tabular-nums text-foreground">
                        {l.interest_rate != null ? `${l.interest_rate.toFixed(2)}%` : "—"}
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">{formatDate(l.due_date) || "—"}</td>
                      <td className="px-3 py-3">
                        <StatusPill status={l.status} />
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                          <IconBtn label={`View ${l.name}`} onClick={() => setDetails(l)} Icon={Eye} />
                          <IconBtn
                            label={`Edit ${l.name}`}
                            onClick={() => {
                              setEditing(l);
                              setDialogOpen(true);
                            }}
                            Icon={Pencil}
                          />
                          <IconBtn
                            label={`Delete ${l.name}`}
                            onClick={() => setConfirm(l)}
                            Icon={Trash2}
                            danger
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {sorted.length > 0 && (
          <div className="border-t border-border px-3 py-3 sm:px-4">
            <div className="mb-2 text-xs text-muted-foreground">
              All {sorted.length} liabilit{sorted.length === 1 ? "y" : "ies"} visible on this page
              {totals.dueSoonCount > 0 ? ` · ${totals.dueSoonCount} due in 7 days` : ""}
            </div>
            <LiabilitySummaryRow
              outstanding={totals.outstanding}
              emi={totals.emi}
              rate={totals.rate}
            />
          </div>
        )}
      </div>

      {/* ============ GLOBAL BULK ACTION BAR ============ */}
      <BulkActionBar
        count={sel.selectedCount}
        entityLabel="liability"
        busy={bulkDel.isPending || bulkUpd.isPending}
        onClear={sel.clear}
        onDelete={async () => {
          await bulkDel.mutateAsync(sel.selectedIds);
          sel.clear();
        }}
        fieldActions={[
          {
            label: "Change Category",
            options: LIABILITY_CATEGORIES.map((c) => ({ value: c, label: c })),
            onSelect: async (value) => {
              await bulkUpd.mutateAsync({ ids: sel.selectedIds, patch: { category: value } });
              sel.clear();
            },
          },
          {
            label: "Change Status",
            options: [
              { value: "active", label: "Active" },
              { value: "closed", label: "Closed" },
            ],
            onSelect: async (value) => {
              await bulkUpd.mutateAsync({ ids: sel.selectedIds, patch: { status: value } });
              sel.clear();
            },
          },
        ]}
      />

      <LiabilityDialog
        open={dialogOpen}
        onOpenChange={(v) => {
          setDialogOpen(v);
          if (!v) setEditing(null);
        }}
        existing={editing}
      />

      <LiabilityDetailsModal
        liability={details}
        onClose={() => setDetails(null)}
        onEdit={(l) => {
          setDetails(null);
          setEditing(l);
          setDialogOpen(true);
        }}
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
    </div>
  );
}

/* =========================================================
   Mobile: grouped, compact liability cards with a "…" menu
========================================================= */
function compactInr(v: number): string {
  const abs = Math.abs(v);
  const f = (n: number, s: string) => `₹${n.toFixed(2)}${s}`;
  if (abs >= 1e7) return f(v / 1e7, "Cr");
  if (abs >= 1e5) return f(v / 1e5, "L");
  if (abs >= 1e3) return f(v / 1e3, "K");
  return `₹${v.toFixed(2)}`;
}

function MobileLiabilityGroups({
  rows,
  isSelected,
  onSelectChange,
  onView,
  onEdit,
  onDelete,
}: {
  rows: Liability[];
  isSelected: (id: string) => boolean;
  onSelectChange: (id: string, v: boolean) => void;
  onView: (l: Liability) => void;
  onEdit: (l: Liability) => void;
  onDelete: (l: Liability) => void;
}) {
  const { isOpen, toggle, setAll } = useCollapsibleGroups("liabilities-mobile-groups-v1", false);

  const groups = useMemo(() => {
    const m = new Map<string, Liability[]>();
    for (const r of rows) {
      const k = r.category || "Other";
      const list = m.get(k);
      if (list) list.push(r);
      else m.set(k, [r]);
    }
    return [...m.entries()].map(([label, items]) => ({
      label,
      items,
      outstanding: items.reduce((s, i) => s + (i.outstanding || 0), 0),
      emi: items.reduce((s, i) => s + (i.emi ?? 0), 0),
    }));
  }, [rows]);

  const allOpen = groups.length > 0 && groups.every((g) => isOpen(g.label));

  return (
    <div className="divide-y divide-border">
      <div className="flex justify-end px-3 py-2">
        <button
          onClick={() => setAll(groups.map((g) => g.label), !allOpen)}
          className="text-[11px] font-semibold text-mint"
        >
          {allOpen ? "Collapse all" : "Expand all"}
        </button>
      </div>
      {groups.map((g) => {
        const open = isOpen(g.label);
        const meta = ICONS[g.label] ?? ICONS.Other;
        return (
          <div key={g.label}>
            <button
              onClick={() => toggle(g.label)}
              className="flex w-full items-center gap-2 px-3 py-3 text-left"
            >
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? "" : "-rotate-90"}`}
              />
              <div className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg ${meta.tint}`}>
                <meta.Icon className="h-3.5 w-3.5" />
              </div>
              <span className="truncate text-sm font-semibold text-foreground">{g.label}</span>
              <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground">
                {g.items.length}
              </span>
              <span className="ml-auto shrink-0 text-sm font-semibold text-foreground">
                {compactInr(g.outstanding)}
              </span>
            </button>

            {open
              ? g.items.map((l) => (
                  <div
                    key={l.id}
                    className={`flex items-center gap-2 border-t border-border/40 px-3 py-3 ${
                      isSelected(l.id) ? "bg-mint/[0.06]" : ""
                    }`}
                  >
                    <SelectCheckbox
                      label={`Select ${l.name}`}
                      checked={isSelected(l.id)}
                      onChange={(v) => onSelectChange(l.id, v)}
                    />
                    <button
                      onClick={() => onView(l)}
                      className="min-w-0 flex-1 text-left"
                      aria-label={`View ${l.name}`}
                    >
                      <div className="truncate text-sm font-medium text-foreground">{l.name}</div>
                      <div className="truncate text-[11px] text-muted-foreground">
                        {[l.lender, l.due_date ? `Due ${formatDate(l.due_date)}` : null]
                          .filter(Boolean)
                          .join(" · ") || titleCase(l.status)}
                      </div>
                    </button>
                    <div className="shrink-0 text-right">
                      <div className="text-sm font-semibold tabular-nums text-foreground">
                        {compactInr(l.outstanding)}
                      </div>
                      <div className="text-[11px] font-medium text-muted-foreground">
                        {l.emi != null ? `EMI ${compactInr(l.emi)}` : "—"}
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          aria-label={`Actions for ${l.name}`}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-muted-foreground"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => onView(l)}>
                          <Eye className="mr-2 h-4 w-4" /> View
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(l)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(l)}
                          className="text-rose-500 focus:text-rose-500"
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))
              : null}
          </div>
        );
      })}
    </div>
  );
}

/* =========================================================
   Details modal
========================================================= */
function LiabilityDetailsModal({
  liability,
  onClose,
  onEdit,
}: {
  liability: Liability | null;
  onClose: () => void;
  onEdit: (l: Liability) => void;
}) {
  const l = liability;
  return (
    <Dialog open={!!l} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">{l?.name}</DialogTitle>
        </DialogHeader>
        {l ? (
          <div className="space-y-4">
            <LiabilitySummaryRow
              outstanding={l.outstanding}
              emi={l.emi ?? 0}
              rate={l.interest_rate ?? 0}
            />
            <div className="grid grid-cols-2 gap-3">
              <MiniStat label="Category" value={l.category} />
              <MiniStat label="Lender" value={l.lender ?? "—"} />
              <MiniStat label="Principal" value={l.principal != null ? inr(l.principal) : "—"} />
              <MiniStat
                label="Tenure"
                value={l.tenure_months != null ? `${l.tenure_months} mo` : "—"}
              />
              <MiniStat label="Start Date" value={formatDate(l.start_date) || "—"} />
              <MiniStat label="Due Date" value={formatDate(l.due_date) || "—"} />
              <MiniStat label="End Date" value={formatDate(l.end_date) || "—"} />
              <MiniStat label="Status" value={titleCase(l.status)} />
            </div>
            {l.notes ? (
              <div className="rounded-xl border border-border bg-surface-2/40 p-3 text-xs text-muted-foreground whitespace-pre-wrap">
                {l.notes}
              </div>
            ) : null}
            <div className="flex justify-end gap-2">
              <button
                onClick={onClose}
                className="rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Close
              </button>
              <button
                onClick={() => onEdit(l)}
                className="rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-[#04121C] hover:brightness-110"
              >
                Edit
              </button>
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

/* =========================================================
   Shared bits
========================================================= */
function LiabilitySummaryRow({
  outstanding,
  emi,
  rate,
}: { outstanding: number; emi: number; rate: number }) {
  return (
    <div className="grid grid-cols-3 items-end gap-2 rounded-xl border border-border bg-surface-2/40 px-3 py-3 sm:gap-4 sm:px-4">
      <div className="min-w-0">
        <div className="truncate text-[9px] font-medium uppercase leading-tight tracking-wide text-muted-foreground sm:text-[11px] sm:tracking-wider">
          Total Outstanding
        </div>
        <div className="mt-0.5 font-display text-[15px] font-bold tabular-nums text-rose-400 sm:text-2xl">
          {inr(outstanding)}
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[9px] font-medium uppercase leading-tight tracking-wide text-muted-foreground sm:text-[11px] sm:tracking-wider">
          Monthly EMI
        </div>
        <div className="mt-0.5 font-display text-[15px] font-bold tabular-nums text-foreground sm:text-2xl">
          {inr(emi)}
        </div>
      </div>
      <div className="min-w-0 text-right sm:text-left">
        <div className="truncate text-[9px] font-medium uppercase leading-tight tracking-wide text-muted-foreground sm:text-[11px] sm:tracking-wider">
          Avg Interest
        </div>
        <div className="mt-0.5 font-display text-[15px] font-bold tabular-nums text-foreground sm:text-2xl">
          {rate.toFixed(2)}%
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
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
    <span
      className={`inline-block rounded-md border px-1.5 py-0.5 text-[10px] font-medium ${map[status] ?? map.active}`}
    >
      {titleCase(status)}
    </span>
  );
}

function IconBtn({
  label,
  onClick,
  Icon,
  danger,
}: { label: string; onClick: () => void; Icon: any; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className={`grid h-8 w-8 place-items-center rounded-lg border border-border bg-surface-2 transition hover:bg-surface-2/70 ${
        danger ? "text-rose-400" : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

function SortHeader({
  label,
  col,
  sortKey,
  sortDir,
  onClick,
  align,
  className,
}: {
  label: string;
  col: SortKey;
  sortKey: SortKey;
  sortDir: "asc" | "desc";
  onClick: (c: SortKey) => void;
  align: "left" | "right";
  className?: string;
}) {
  const active = sortKey === col;
  const Arrow = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th
      className={`px-2 py-3 font-medium ${align === "right" ? "text-right" : "text-left"} ${className ?? ""}`}
    >

      <button
        onClick={() => onClick(col)}
        className={`inline-flex items-center gap-1 transition-colors ${
          active ? "text-mint" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
        <Arrow className="h-3 w-3" />
      </button>
    </th>
  );
}

function FilterMenu({
  label,
  value,
  onChange,
  options,
  formatOption,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  formatOption?: (v: string) => string;
}) {
  const fmt = formatOption ?? ((v: string) => v);
  const display = value === "all" ? label : fmt(value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-3 py-2 text-xs text-foreground hover:bg-surface-2/80">
          {display} <ChevronDown className="h-3 w-3" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="max-h-[280px] overflow-y-auto">
        <DropdownMenuItem onSelect={() => onChange("all")}>
          All {label.toLowerCase()}s
        </DropdownMenuItem>
        {options.map((o) => (
          <DropdownMenuItem key={o} onSelect={() => onChange(o)}>
            {fmt(o)}
          </DropdownMenuItem>
        ))}
        {options.length === 0 && <DropdownMenuItem disabled>No options</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function titleCase(s: string) {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function uniqSorted(arr: string[]): string[] {
  return [...new Set(arr)].sort((a, b) => a.localeCompare(b));
}
