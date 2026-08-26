import { createFileRoute } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Plus, Upload, Download, Receipt, Pencil, Copy, Trash2, Search } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useTransactions, useCategories, useDeleteTransaction } from "@/lib/money-api";
import type { Transaction } from "@/lib/money-api";
import { inr } from "@/lib/wealth-api";
import { useBulkSelection } from "@/lib/bulk/use-bulk-selection";
import { useBulkDeleteRows, useBulkUpdateRows } from "@/lib/bulk/use-bulk-mutations";
import { BulkActionBar } from "@/components/bulk/bulk-action-bar";
import { SelectCheckbox } from "@/components/bulk/select-checkbox";
import { TransactionSheet } from "@/components/money/TransactionSheet";
import { cn } from "@/lib/utils";
import { openImport } from "@/components/import/import-host";

const getRowId = (r: { id: string }) => r.id;

export const Route = createFileRoute("/_app/money/transactions")({
  head: () => ({ meta: [{ title: "Transactions · Wealth Ace" }] }),
  component: Transactions,
});

function relDate(d: string) {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff <= 30) return `${diff}d ago`;
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function monthLabel(key: string) {
  const [y, m] = key.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleString("en-IN", { month: "long", year: "numeric" });
}

type SheetState = { open: boolean; initial: Partial<Transaction> | null; clone: boolean };

function Transactions() {
  const { data: txns = [], isLoading } = useTransactions();
  const { data: cats = [] } = useCategories();
  const deleteTxn = useDeleteTransaction();
  const sel = useBulkSelection(txns, getRowId);
  const bulkDel = useBulkDeleteRows("money_transactions", "transactions");
  const bulkUpd = useBulkUpdateRows("money_transactions", "transactions");

  const catMap = useMemo(() => new Map(cats.map((c) => [c.id, c])), [cats]);
  const catName = (id: string | null) => catMap.get(id ?? "")?.name ?? "Uncategorized";
  const catColor = (id: string | null) => catMap.get(id ?? "")?.color ?? "#6B7280";

  const [sheet, setSheet] = useState<SheetState>({ open: false, initial: null, clone: false });
  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState<"all" | "income" | "expense">("all");

  const filtered = useMemo(() => txns.filter((r) => {
    if (kindFilter !== "all" && r.kind !== kindFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return r.merchant.toLowerCase().includes(q) || catName(r.category_id).toLowerCase().includes(q) || (r.note ?? "").toLowerCase().includes(q);
  }), [txns, kindFilter, search, catMap]);

  const grouped = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const r of filtered) {
      const key = r.occurred_on.slice(0, 7);
      const arr = map.get(key) ?? []; arr.push(r); map.set(key, arr);
    }
    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const selectedTotal = useMemo(
    () => txns.filter((r) => sel.isSelected(r.id)).reduce((s, r) => s + (r.kind === "income" ? r.amount : -r.amount), 0),
    [txns, sel]
  );

  const openSheet = (initial: Partial<Transaction> | null, clone = false) =>
    setSheet({ open: true, initial, clone });

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every credit and debit, neatly searchable."
        actions={
          <>
            <button onClick={() => openImport("transactions")} className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:border-mint/40"><Upload className="h-3.5 w-3.5" /> Import</button>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:border-mint/40"><Download className="h-3.5 w-3.5" /> Export</button>
            <button onClick={() => openSheet(null)} className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-mint-foreground"><Plus className="h-3.5 w-3.5" /> Add</button>
          </>
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 pb-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input className="w-full rounded-xl border border-border bg-surface pl-8 pr-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint/40"
            placeholder="Search description, category, note…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        {(["all","income","expense"] as const).map((k) => (
          <button key={k} onClick={() => setKindFilter(k)}
            className={cn("rounded-xl px-3 py-2 text-xs font-semibold capitalize",
              kindFilter === k ? "bg-mint text-mint-foreground" : "border border-border bg-surface text-muted-foreground hover:border-mint/40")}>
            {k === "all" ? "All" : k === "income" ? "Income" : "Expenses"}
          </button>
        ))}
      </div>

      {/* Running total for selection */}
      {sel.selectedCount > 0 && (
        <div className="flex items-center gap-2 rounded-xl border border-mint/30 bg-mint/5 px-3 py-1.5 text-xs mb-1">
          <span className="font-semibold text-mint">{sel.selectedCount} selected</span>
          <span className="text-muted-foreground">·</span>
          <span>Net: <span className={cn("font-semibold", selectedTotal >= 0 ? "text-success" : "text-foreground")}>{inr(Math.abs(selectedTotal))}</span></span>
        </div>
      )}

      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : txns.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Receipt className="mb-3 h-8 w-8 text-mint" />
          <p className="text-sm font-medium text-foreground">No transactions yet</p>
          <button onClick={() => openSheet(null)} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-mint px-4 py-2 text-xs font-semibold text-mint-foreground"><Plus className="h-3.5 w-3.5" /> Add Transaction</button>
        </div>
      ) : grouped.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">No results match your filters.</div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([monthKey, rows]) => {
            const income = rows.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0);
            const expense = rows.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);
            const allSel = rows.every((r) => sel.isSelected(r.id));
            const someSel = rows.some((r) => sel.isSelected(r.id));
            return (
              <div key={monthKey} className="overflow-hidden rounded-2xl border border-border bg-card">
                {/* Month header */}
                <div className="flex items-center justify-between border-b border-border px-4 py-2.5 sm:px-5">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{monthLabel(monthKey)}</span>
                  <div className="flex items-center gap-3 text-xs">
                    {income > 0 && <span className="text-success font-medium">+{inr(income)}</span>}
                    {expense > 0 && <span className="font-medium">−{inr(expense)}</span>}
                  </div>
                </div>
                {/* Month select-all */}
                <div className="flex items-center gap-3 border-b border-border/40 px-4 py-2 sm:px-5">
                  <SelectCheckbox label="Select month" checked={allSel} indeterminate={someSel && !allSel}
                    onChange={(v) => rows.forEach((r) => sel.toggle(r.id, v))} />
                  <span className="text-xs text-muted-foreground">{rows.length} transactions</span>
                </div>
                {/* Rows */}
                <ul className="divide-y divide-border">
                  {rows.map((r) => {
                    const pos = r.kind === "income";
                    return (
                      <li key={r.id} className={cn("group grid grid-cols-[auto_auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5",
                        sel.isSelected(r.id) ? "bg-mint/[0.06]" : "hover:bg-white/[0.02]")}>
                        <SelectCheckbox label={`Select ${r.merchant}`} checked={sel.isSelected(r.id)} onChange={(v) => sel.toggle(r.id, v)} />
                        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: catColor(r.category_id) }} />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-medium text-foreground">{r.merchant || catName(r.category_id)}</div>
                          <div className="text-xs text-muted-foreground">{relDate(r.occurred_on)} · <span className="text-mint/80">{catName(r.category_id)}</span></div>
                          {r.note && <div className="truncate text-xs italic text-muted-foreground/70">{r.note}</div>}
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <span className={cn("text-sm font-semibold", pos ? "text-success" : "text-foreground")}>
                            {pos ? "+" : "−"}{inr(r.amount)}
                          </span>
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button title="Edit" onClick={() => openSheet(r, false)} className="rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"><Pencil className="h-3 w-3" /></button>
                            <button title="Clone" onClick={() => openSheet(r, true)} className="rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"><Copy className="h-3 w-3" /></button>
                            <button title="Delete" onClick={() => { if (window.confirm(`Delete "${r.merchant || catName(r.category_id)}"?`)) deleteTxn.mutate(r.id); }}
                              className="rounded-lg p-1 text-muted-foreground hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-3 w-3" /></button>
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      <BulkActionBar count={sel.selectedCount} entityLabel="transaction" busy={bulkDel.isPending || bulkUpd.isPending} onClear={sel.clear}
        onDelete={async () => { await bulkDel.mutateAsync(sel.selectedIds); sel.clear(); }}
        fieldActions={cats.length ? [{
          label: "Change Category",
          options: cats.map((c) => ({ value: c.id, label: `${c.name} (${c.kind})` })),
          onSelect: async (value) => { await bulkUpd.mutateAsync({ ids: sel.selectedIds, patch: { category_id: value } }); sel.clear(); },
        }] : []} />

      <TransactionSheet open={sheet.open} onOpenChange={(open) => setSheet((s) => ({ ...s, open }))}
        initial={sheet.initial} clone={sheet.clone} />
    </>
  );
}
