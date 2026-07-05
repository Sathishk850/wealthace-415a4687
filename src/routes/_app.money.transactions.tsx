import { createFileRoute } from "@tanstack/react-router";
import { Plus, Upload, Download, Receipt } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useTransactions, useCategories } from "@/lib/money-api";
import { inr } from "@/lib/wealth-api";

export const Route = createFileRoute("/_app/money/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions · FinVista" },
      { name: "description", content: "All your income and expense transactions in one place." },
    ],
  }),
  component: Transactions,
});

function relDate(d: string) {
  const today = new Date();
  const dt = new Date(d);
  const diff = Math.floor((today.getTime() - dt.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff > 1 && diff <= 30) return `${diff}d ago`;
  return dt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function Transactions() {
  const { data: txns = [], isLoading } = useTransactions();
  const { data: cats = [] } = useCategories();
  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name ?? "Uncategorized";

  return (
    <>
      <PageHeader
        title="Transactions"
        description="Every credit and debit, neatly searchable."
        actions={
          <>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:border-mint/40">
              <Upload className="h-3.5 w-3.5" /> Import
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:border-mint/40">
              <Download className="h-3.5 w-3.5" /> Export
            </button>
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-mint-foreground">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </>
        }
      />
      {isLoading ? (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-sm text-muted-foreground">Loading…</div>
      ) : txns.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <Receipt className="mb-3 h-8 w-8 text-mint" />
          <div className="text-sm font-medium text-foreground">No transactions yet</div>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Head over to Money to record your first income or expense — it will show up here instantly.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-card">
          <ul className="divide-y divide-border">
            {txns.map((r) => {
              const pos = r.kind === "income";
              return (
                <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{r.merchant || catName(r.category_id)}</div>
                    <div className="text-xs text-muted-foreground">
                      {relDate(r.occurred_on)} · <span className="text-mint/80">{catName(r.category_id)}</span>
                    </div>
                  </div>
                  <div className={`shrink-0 text-sm font-semibold ${pos ? "text-success" : "text-foreground"}`}>
                    {pos ? "+" : "-"}{inr(r.amount)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </>
  );
}
