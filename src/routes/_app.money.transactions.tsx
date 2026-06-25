import { createFileRoute } from "@tanstack/react-router";
import { Plus, Upload, Download } from "lucide-react";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/money/transactions")({
  head: () => ({
    meta: [
      { title: "Transactions · FinVista" },
      { name: "description", content: "All your income and expense transactions in one place." },
    ],
  }),
  component: Transactions,
});

const rows = [
  { d: "Today", t: "Salary credit", c: "Income", a: "+₹ 2,40,000", pos: true },
  { d: "Today", t: "Zomato", c: "Food", a: "-₹ 482", pos: false },
  { d: "Yesterday", t: "HDFC SIP - Nifty 50", c: "Investment", a: "-₹ 15,000", pos: false },
  { d: "Yesterday", t: "Electricity bill", c: "Bills", a: "-₹ 2,140", pos: false },
  { d: "2d ago", t: "Dividend - INFY", c: "Income", a: "+₹ 1,250", pos: true },
  { d: "3d ago", t: "Uber", c: "Travel", a: "-₹ 318", pos: false },
];

function Transactions() {
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
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <ul className="divide-y divide-border">
          {rows.map((r, i) => (
            <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{r.t}</div>
                <div className="text-xs text-muted-foreground">
                  {r.d} · <span className="text-mint/80">{r.c}</span>
                </div>
              </div>
              <div className={`shrink-0 text-sm font-semibold ${r.pos ? "text-success" : "text-foreground"}`}>
                {r.a}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}