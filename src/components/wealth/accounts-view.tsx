import { useMemo, useState } from "react";
import { openImport } from "@/components/import/import-host";
import { useBulkSelection } from "@/lib/bulk/use-bulk-selection";
import { useBulkDeleteRows, useBulkUpdateRows } from "@/lib/bulk/use-bulk-mutations";
import { BulkActionBar } from "@/components/bulk/bulk-action-bar";
import { SelectCheckbox } from "@/components/bulk/select-checkbox";

const getRowId = (r: { id: string }) => r.id;

import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import {
  Wallet, CreditCard, Landmark, Banknote, HandCoins, Info, Search, ChevronDown, ArrowUpDown,
  ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AccountDialog } from "@/components/wealth/account-dialog";
import { IoMenu } from "@/components/wealth/io-menu";
import {
  ACCOUNT_TYPES, type Account, type AccountInput,
  groupByCategory, inr, inrCompact, normalizeAccountType,
  useAccounts, useBulkInsertAccounts, useDeleteAccount, useFamily,
} from "@/lib/wealth-api";
import { exportCsv, exportJson, exportPdf, exportXlsx, pickAndParse } from "@/lib/wealth-io";
import { toast } from "sonner";

const ICONS: Record<string, { Icon: any; tint: string }> = {
  "Bank Account": { Icon: Landmark, tint: "bg-blue-500/10 text-blue-400" },
  "Credit Card":  { Icon: CreditCard, tint: "bg-violet-500/10 text-violet-400" },
  "Cash":         { Icon: Banknote, tint: "bg-amber-500/10 text-amber-400" },
  "Wallet":       { Icon: Wallet, tint: "bg-emerald-500/10 text-emerald-400" },
  "Broker":       { Icon: HandCoins, tint: "bg-mint/10 text-mint" },
  "Other":        { Icon: Wallet, tint: "bg-slate-500/10 text-slate-300" },
};
const PIE = ["#3B82F6", "#14D8CF", "#F59E0B", "#8B5CF6", "#10B981", "#F97316", "#EF4444"];
const PAGE = 8;

type Sort = "balance_desc" | "name_asc" | "type" | "recent";

export function AccountsView({
  registerAdd,
}: {
  registerAdd?: (open: () => void) => void;
}) {
  const { data: rows = [], isLoading, isError, error, refetch } = useAccounts();
  const { data: members = [] } = useFamily();
  const bulkInsert = useBulkInsertAccounts();
  const del = useDeleteAccount();

  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("balance_desc");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [confirm, setConfirm] = useState<Account | null>(null);

  if (registerAdd) {
    registerAdd(() => {
      setEditing(null);
      setDialogOpen(true);
    });
  }

  /* ===== Derived stats ===== */
  const totals = useMemo(() => {
    const t = { all: 0, bank: 0, card: 0, wallet: 0, broker: 0, cash: 0 };
    for (const r of rows) {
      t.all += r.balance;
      const k = normalizeAccountType(r.account_type);
      if (k === "Bank Account") t.bank += r.balance;
      else if (k === "Credit Card") t.card += r.balance;
      else if (k === "Wallet") t.wallet += r.balance;
      else if (k === "Broker") t.broker += r.balance;
      else if (k === "Cash") t.cash += r.balance;
    }
    return t;
  }, [rows]);

  const counts = useMemo(() => {
    const c: Record<string, number> = {};
    for (const r of rows) {
      const k = normalizeAccountType(r.account_type);
      c[k] = (c[k] || 0) + 1;
    }
    return c;
  }, [rows]);

  const alloc = useMemo(() => {
    return groupByCategory(
      rows.map((r) => ({ ...r, category: normalizeAccountType(r.account_type) })),
      (r) => Math.abs(r.balance),
    ).map((a, i) => ({ ...a, color: PIE[i % PIE.length] }));
  }, [rows]);

  const memberById = useMemo(
    () => new Map(members.map((m) => [m.id, m.name])),
    [members],
  );

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((x) =>
        x.name.toLowerCase().includes(q) ||
        (x.provider ?? "").toLowerCase().includes(q) ||
        (x.account_number_masked ?? "").toLowerCase().includes(q),
      );
    }
    if (type !== "all") r = r.filter((x) => normalizeAccountType(x.account_type) === type);
    if (status !== "all") r = r.filter((x) => x.status === status);
    const sorted = [...r];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name_asc": return a.name.localeCompare(b.name);
        case "type": return a.account_type.localeCompare(b.account_type);
        case "recent": return (b.updated_at ?? "").localeCompare(a.updated_at ?? "");
        default: return Math.abs(b.balance) - Math.abs(a.balance);
      }
    });
    return sorted;
  }, [rows, search, type, status, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice((page - 1) * PAGE, page * PAGE);
  if (page > pageCount) setTimeout(() => setPage(1), 0);

  /* Global bulk selection */
  const sel = useBulkSelection(
    pageRows,
    getRowId,
    useMemo(() => filtered.map((r) => r.id), [filtered]),
  );
  const bulkDel = useBulkDeleteRows("wealth_accounts", "accounts");
  const bulkUpd = useBulkUpdateRows("wealth_accounts", "accounts");



  const exportCols = [
    { key: "name", label: "Name" },
    { key: "account_type", label: "Type" },
    { key: "provider", label: "Provider" },
    { key: "account_number_masked", label: "Account Number" },
    { key: "ifsc", label: "IFSC" },
    { key: "balance", label: "Balance" },
    { key: "currency", label: "Currency" },
    { key: "status", label: "Status" },
    { key: "notes", label: "Notes" },
  ] as const;

  // Legacy CSV-only importer, superseded by the Universal Import Engine.
  const _legacyImport = async () => {
    const parsed = await pickAndParse();
    if (!parsed || !parsed.length) return;
    const mapped: AccountInput[] = parsed
      .map((r: any) => ({
        name: String(r.Name ?? r.name ?? "").trim(),
        account_type: String(r.Type ?? r.account_type ?? "Bank Account") || "Bank Account",
        provider: r.Provider ?? r.provider ?? null,
        account_number_masked: r["Account Number"] ?? r.account_number_masked ?? null,
        ifsc: r.IFSC ?? r.ifsc ?? null,
        balance: Number(r.Balance ?? r.balance ?? 0) || 0,
        currency: r.Currency ?? r.currency ?? "INR",
        status: r.Status ?? r.status ?? "active",
        notes: r.Notes ?? r.notes ?? null,
      }))
      .filter((r) => r.name);
    if (!mapped.length) return toast.error("No valid rows found");
    await bulkInsert.mutateAsync(mapped);
  };

  if (isError)
    return <ErrorPanel message={(error as Error)?.message || "Failed to load accounts"} onRetry={() => refetch()} />;

  const empty = !isLoading && rows.length === 0;

  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Accounts</h2>
        <p className="mt-1 text-sm text-muted-foreground">All your bank accounts, cards, wallets and loans in one place.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Stat label="Total Balance" value={isLoading ? "…" : inr(totals.all)} sub={`${rows.length} account${rows.length === 1 ? "" : "s"}`} icon={Wallet} tint="bg-mint/10 text-mint" />
        <Stat label="Bank Accounts" value={isLoading ? "…" : inr(totals.bank)} sub={`${counts["Bank Account"] || 0} account${(counts["Bank Account"] || 0) === 1 ? "" : "s"}`} icon={Landmark} tint="bg-blue-500/10 text-blue-400" />
        <Stat label="Credit Cards" value={isLoading ? "…" : inr(totals.card)} sub={`${counts["Credit Card"] || 0} card${(counts["Credit Card"] || 0) === 1 ? "" : "s"}`} icon={CreditCard} tint="bg-violet-500/10 text-violet-400" />
        <Stat label="Wallets & Cash" value={isLoading ? "…" : inr(totals.wallet + totals.cash)} sub={`${(counts["Wallet"] || 0) + (counts["Cash"] || 0)} account${((counts["Wallet"] || 0) + (counts["Cash"] || 0)) === 1 ? "" : "s"}`} icon={Banknote} tint="bg-emerald-500/10 text-emerald-400" />
        <Stat label="Broker Accounts" value={isLoading ? "…" : inr(totals.broker)} sub={`${counts["Broker"] || 0} account${(counts["Broker"] || 0) === 1 ? "" : "s"}`} icon={HandCoins} tint="bg-mint/10 text-mint" />
      </div>

      {empty ? (
        <Empty primary="No accounts yet" secondary="Add your first account to start tracking balances and cash flow." cta={{ label: "Add account", onClick: () => { setEditing(null); setDialogOpen(true); } }} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Balance Overview</h3>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative h-[170px] w-[170px] shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={alloc} dataKey="amt" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="none">
                        {alloc.map((a) => (<Cell key={a.name} fill={a.color} />))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                      <div className="font-display text-sm font-bold text-foreground">{inrCompact(totals.all)}</div>
                      <div className="text-[10px] text-muted-foreground">Total Balance</div>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2.5">
                  {alloc.map((a) => (
                    <div key={a.name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                        <span className="truncate text-foreground">{a.name}</span>
                      </div>
                      <span className="shrink-0 text-right font-medium text-foreground">{inrCompact(a.amt)}</span>
                      <span className="shrink-0 font-medium text-muted-foreground">{a.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Account Types</h3>
              <div className="mt-4 grid grid-cols-2 gap-3">
                {ACCOUNT_TYPES.map((t) => {
                  const meta = ICONS[t] ?? ICONS.Other;
                  const sum = rows
                    .filter((r) => normalizeAccountType(r.account_type) === t)
                    .reduce((s, r) => s + r.balance, 0);
                  const n = counts[t] || 0;
                  return (
                    <div key={t} className="flex items-center gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
                      <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg ${meta.tint}`}>
                        <meta.Icon className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-xs font-medium text-foreground">{t}</div>
                        <div className="truncate text-[10px] text-muted-foreground">{n} item{n === 1 ? "" : "s"}</div>
                      </div>
                      <div className="text-right text-xs font-semibold text-foreground tabular-nums">
                        {inrCompact(sum)}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">All Accounts ({filtered.length})</h3>
              <div className="relative ml-2 flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search accounts..."
                  className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
                />
              </div>
              <FilterDropdown
                label={type === "all" ? "All Types" : type}
                value={type}
                onChange={(v) => { setType(v); setPage(1); }}
                options={[{ value: "all", label: "All Types" }, ...ACCOUNT_TYPES.map((c) => ({ value: c, label: c }))]}
              />
              <FilterDropdown
                label={status === "all" ? "All Status" : titleCase(status)}
                value={status}
                onChange={(v) => { setStatus(v); setPage(1); }}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                  { value: "closed", label: "Closed" },
                ]}
              />
              <FilterDropdown
                label={`Sort: ${sortLabel(sort)}`}
                value={sort}
                onChange={(v) => setSort(v as Sort)}
                icon={ArrowUpDown}
                options={[
                  { value: "balance_desc", label: "Balance ↓" },
                  { value: "name_asc", label: "Name (A→Z)" },
                  { value: "type", label: "Type" },
                  { value: "recent", label: "Recently updated" },
                ]}
              />
              <IoMenu
                onImport={() => openImport("accounts")}
                onExportCsv={() => exportCsv("accounts", exportCols as any, filtered)}
                onExportXlsx={() => exportXlsx("accounts", exportCols as any, filtered)}
                onExportJson={() => exportJson("accounts", filtered)}
                onExportPdf={() =>
                  exportPdf("Accounts", exportCols as any, filtered, {
                    subtitle: `Total balance ${inr(totals.all)} · ${filtered.length} account${filtered.length === 1 ? "" : "s"}`,
                  })
                }
              />
            </div>

            {isLoading ? (
              <TableSkeleton />
            ) : filtered.length === 0 ? (
              <Empty primary="No matches" secondary="Try clearing filters or search." />
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="w-[40px] py-3 pl-2">
                          <SelectCheckbox
                            label="Select all accounts"
                            checked={sel.allSelected}
                            indeterminate={sel.someSelected && !sel.allSelected}
                            onChange={(v) => sel.toggleAll(v)}
                          />
                        </th>
                        <th className="py-3 pl-2 font-medium">Account</th>

                        <th className="py-3 font-medium">Type</th>
                        <th className="py-3 font-medium">Provider</th>
                        <th className="py-3 font-medium">Account #</th>
                        <th className="py-3 font-medium">Owner</th>
                        <th className="py-3 font-medium text-right">Balance</th>
                        <th className="py-3 font-medium">Status</th>
                        <th className="py-3 pr-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((a) => {
                        const meta = ICONS[normalizeAccountType(a.account_type)] ?? ICONS.Other;
                        const negative = a.balance < 0;
                        return (
                          <tr key={a.id} className={`border-b border-border/50 last:border-0 hover:bg-surface-2/40 ${sel.isSelected(a.id) ? "bg-mint/[0.06]" : ""}`}>
                            <td className="w-[40px] py-3 pl-2">
                              <SelectCheckbox
                                label={`Select ${a.name}`}
                                checked={sel.isSelected(a.id)}
                                onChange={(v) => sel.toggle(a.id, v)}
                              />
                            </td>
                            <td className="py-3 pl-2">

                              <div className="flex items-center gap-3">
                                <div className={`grid h-8 w-8 place-items-center rounded-lg ${meta.tint}`}>
                                  <meta.Icon className="h-4 w-4" />
                                </div>
                                <span className="font-medium text-foreground">{a.name}</span>
                              </div>
                            </td>
                            <td className="py-3 text-muted-foreground">{normalizeAccountType(a.account_type)}</td>
                            <td className="py-3 text-muted-foreground">{a.provider ?? "—"}</td>
                            <td className="py-3 text-muted-foreground tabular-nums">{a.account_number_masked ?? "—"}</td>
                            <td className="py-3 text-muted-foreground">
                              {a.owner_member_id ? (memberById.get(a.owner_member_id) ?? "—") : "Self"}
                            </td>
                            <td className={`py-3 text-right font-medium tabular-nums ${negative ? "text-rose-400" : "text-foreground"}`}>
                              {(negative ? "-" : "") + inr(Math.abs(a.balance))}
                            </td>
                            <td className="py-3"><StatusPill status={a.status} /></td>
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

                <Pagination page={page} pageCount={pageCount} total={filtered.length} onPage={setPage} />
              </>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-mint" />
            Keep balances and nominee details current for a true Net Worth picture.
          </div>
        </>
      )}

      <BulkActionBar
        count={sel.selectedCount}
        entityLabel="account"
        busy={bulkDel.isPending || bulkUpd.isPending}
        onClear={sel.clear}
        onDelete={async () => {
          await bulkDel.mutateAsync(sel.selectedIds);
          sel.clear();
        }}
        fieldActions={[
          {
            label: "Change Status",
            options: ["Active", "Dormant", "Closed"].map((s) => ({ value: s, label: s })),
            onSelect: async (value) => {
              await bulkUpd.mutateAsync({ ids: sel.selectedIds, patch: { status: value } });
              sel.clear();
            },
          },
        ]}
      />

      <AccountDialog

        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
        existing={editing}
      />

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
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

/* =============== shared bits =============== */
function Stat({ label, value, sub, icon: Icon, tint }: { label: string; value: string; sub: string; icon: any; tint: string }) {
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
          <div className="mt-1 text-xs font-medium text-muted-foreground">{sub}</div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400",
    inactive: "bg-amber-500/15 text-amber-400",
    closed: "bg-muted/30 text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? "bg-muted/30 text-muted-foreground"}`}>
      {titleCase(status)}
    </span>
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
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onEdit} className="gap-2 text-sm">
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
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

function sortLabel(s: Sort) {
  switch (s) {
    case "name_asc": return "Name ↑";
    case "type": return "Type";
    case "recent": return "Recent";
    default: return "Balance ↓";
  }
}

function titleCase(s: string) {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}