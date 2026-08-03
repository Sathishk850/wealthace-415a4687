import { useEffect, useMemo, useRef, useState } from "react";
import { X, Pencil, Trash2, Plus, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { TextTabs } from "@/components/text-tabs";
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
import { SelectCheckbox } from "@/components/bulk/select-checkbox";
import { formatDate } from "@/lib/date-format";
import {
  type Investment,
  amountIn,
  priceIn,
  cagrPct,
  singleXirr,
  portfolioXirr,
  useInvestmentTxnsMulti,
  useUpsertInvestmentTxn,
  useDeleteInvestmentTxn,
  useUpdateInvestmentNotes,
  type InvestmentTxn,
} from "@/lib/wealth-api";
import { deriveHolding } from "@/lib/market/derive";
import { useCorporateActions, useInstrumentFundamentals } from "@/lib/market/use-market-data";
import type { IdentifierType, InstrumentFundamentals, MarketQuote } from "@/lib/market/types";
import { HoldingSummaryRow } from "@/components/wealth/holding-summary-row";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  investment: Investment | null;
  /** All duplicate entries (lots) merged into this row; defaults to [investment]. */
  lots?: Investment[] | null;
  quote?: MarketQuote | null;
  platformLabel?: string;
  /** Tab to auto-select when the modal opens. */
  initialTab?: DetailTab;
};


type DetailTab = "fundamental" | "classification" | "history" | "corporate" | "notes";

const CORPORATE_CATEGORIES = new Set(["Stocks", "ETFs"]);

export function HoldingDetailsModal({
  open,
  onOpenChange,
  investment,
  lots,
  quote,
  platformLabel,
  initialTab = "fundamental",
}: Props) {

  const [tab, setTab] = useState<DetailTab>(initialTab);

  // Re-sync the active tab whenever the modal is (re)opened for a holding.
  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab, investment?.id]);


  // Back / Esc / Close must return to the exact page + tab the user came from.
  // Pushing a history entry while open makes the browser/device back button
  // close the modal instead of navigating away from the listing.
  const pushedRef = useRef(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (open && !pushedRef.current) {
      pushedRef.current = true;
      window.history.pushState({ finvistaHoldingDetails: true }, "");
    }
    const onPop = () => {
      if (pushedRef.current) {
        pushedRef.current = false;
        onOpenChange(false);
      }
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [open, onOpenChange]);

  const requestClose = () => {
    if (pushedRef.current) {
      pushedRef.current = false;
      window.history.back();
      return;
    }
    onOpenChange(false);
  };

  if (!investment) return null;
  const inv = investment;
  // Duplicate entries of the same instrument are merged into a single row, so
  // every headline metric aggregates across all lots.
  const members: Investment[] = lots && lots.length > 0 ? lots : [inv];
  const derivedLots = members.map((m) => deriveHolding(m, quote ?? null));
  const d = deriveHolding(inv, quote ?? null);
  const invested = derivedLots.reduce((s, x) => s + x.invested, 0);
  const current = derivedLots.reduce((s, x) => s + x.current_value, 0);
  const netQty = members.reduce((s, m) => s + (Number(m.quantity) || 0), 0);
  const avgBuy = netQty > 0 ? invested / netQty : Number(inv.avg_price) || 0;
  const pnl = current - invested;
  const pnlPct = invested > 0 ? (pnl / invested) * 100 : 0;
  const up = pnl >= 0;
  const ccy = inv.currency || "INR";

  const showCorporate = CORPORATE_CATEGORIES.has(inv.category);
  const tabs: { value: DetailTab; label: string }[] = [
    { value: "fundamental", label: "Fundamental" },
    { value: "classification", label: "Classification" },
    { value: "history", label: "Buy / Sell History" },
    ...(showCorporate ? [{ value: "corporate" as const, label: "Corporate Actions" }] : []),
    { value: "notes", label: "Notes" },
  ];

  const firstBuy = members
    .map((m) => m.purchase_date)
    .filter(Boolean)
    .sort()[0] as string | undefined;
  const years = firstBuy
    ? Math.max(0.01, (Date.now() - new Date(firstBuy).getTime()) / (365.25 * 86400000))
    : 0;
  const cagr = years > 0 ? cagrPct(invested, current, years) : 0;
  const xirrVal =
    members.length > 1
      ? portfolioXirr(
          members.map((m, i) => ({
            ...m,
            current_price: derivedLots[i].current_price,
            current_value: derivedLots[i].current_value,
          })),
        )
      : singleXirr({ ...inv, current_price: d.current_price, current_value: current });
  const annualized = years > 0 ? cagr : 0;


  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : requestClose())}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border bg-card px-6 py-4">

          <div className="flex items-start gap-4">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mint/15 text-base font-bold text-mint">
              {inv.name.slice(0, 1).toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DialogTitle className="truncate text-lg font-bold text-foreground">
                  {inv.name}
                </DialogTitle>
                <span className="rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-mint">
                  {inv.category}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                {inv.symbol && <span className="font-medium text-foreground/80">{inv.symbol}</span>}
                {inv.exchange && <span>· {inv.exchange}</span>}
                {platformLabel && <span>· {platformLabel}</span>}
              </div>
            </div>
            <button
              onClick={requestClose}
              className="grid h-8 w-8 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-4">
            <HoldingSummaryRow
              invested={invested}
              current={current}
              pnl={pnl}
              pnlPct={pnlPct}
              currency={ccy}
            />
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          {/* KPI CARDS */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KpiCard label="Invested Amount" value={amountIn(invested, ccy)} />
            <KpiCard
              label={`Absolute Return (${ccy === "INR" ? "₹" : ccy})`}
              value={`${up ? "+" : ""}${amountIn(pnl, ccy)}`}
              tone={up ? "text-emerald-500" : "text-rose-500"}
            />
            <KpiCard
              label="Absolute Return (%)"
              value={`${up ? "+" : ""}${pnlPct.toFixed(2)}%`}
              tone={up ? "text-emerald-500" : "text-rose-500"}
            />
            <KpiCard
              label="XIRR (All Time)"
              value={xirrVal ? `${xirrVal.toFixed(2)}%` : "—"}
              icon={<TrendingUp className="h-3 w-3" />}
              tone="text-mint"
            />
            <KpiCard
              label="CAGR (All Time)"
              value={years > 0 ? `${cagr.toFixed(2)}%` : "—"}
              icon={<TrendingUp className="h-3 w-3" />}
              tone={cagr >= 0 ? "text-emerald-500" : "text-rose-500"}
            />
            <KpiCard
              label="Annualized Return"
              value={years > 0 ? `${annualized.toFixed(2)}%` : "—"}
            />
            <KpiCard label="Avg. Buy Price" value={priceIn(avgBuy, ccy)} />
            <KpiCard label="Net Quantity" value={String(netQty)} />
          </div>

          <div className="mt-5">
            <TextTabs items={tabs} value={tab} onChange={(v) => setTab(v as DetailTab)} />
          </div>

          <div className="mt-4">
            {tab === "history" && <HistoryTab investment={inv} lots={members} />}
            {tab === "fundamental" && <FundamentalTab investment={inv} derived={d} />}
            {tab === "classification" && (
              <ClassificationTab investment={inv} platformLabel={platformLabel} />
            )}
            {tab === "corporate" && showCorporate && <CorporateTab investment={inv} />}
            {tab === "notes" && <NotesTab investment={inv} />}
          </div>

        </div>

        <div className="shrink-0 border-t border-border bg-card px-6 py-3 flex justify-end">
          <Button variant="outline" onClick={requestClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KpiCard({
  label,
  value,
  tone = "text-foreground",
  icon,
}: {
  label: string;
  value: string;
  tone?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
        {icon ? <span className={tone}>{icon}</span> : null}
      </div>
      <div className={`mt-1 text-sm font-bold ${tone}`}>{value}</div>
    </div>
  );
}

/* -------------------- History Tab -------------------- */
function HistoryTab({ investment, lots }: { investment: Investment; lots?: Investment[] }) {
  const members = lots && lots.length > 0 ? lots : [investment];
  const ids = members.map((m) => m.id);
  const { data: txns = [], isLoading } = useInvestmentTxnsMulti(ids);
  const upsert = useUpsertInvestmentTxn();
  const del = useDeleteInvestmentTxn();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<InvestmentTxn | null>(null);
  const [confirmDel, setConfirmDel] = useState<InvestmentTxn | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [lotId, setLotId] = useState<string>(members[0].id);
  const ccy = investment.currency || "INR";

  const lotLabel = (m: Investment) =>
    `${m.purchase_date ? formatDate(m.purchase_date) : "Entry"} · ${m.quantity} @ ${priceIn(m.avg_price, ccy)}`;

  /** Lots with no recorded transactions are shown as their implicit opening buy. */
  const entries = useMemo(() => {
    const withTxn = new Set(txns.map((t) => t.investment_id));
    const rows: Array<
      | { kind: "txn"; key: string; t: InvestmentTxn }
      | { kind: "lot"; key: string; m: Investment }
    > = txns.map((t) => ({ kind: "txn" as const, key: t.id, t }));
    for (const m of members) {
      if (withTxn.has(m.id)) continue;
      rows.push({ kind: "lot" as const, key: `lot-${m.id}`, m });
    }
    const dateOf = (r: (typeof rows)[number]) =>
      r.kind === "txn" ? r.t.occurred_on : (r.m.purchase_date ?? "");
    rows.sort((a, b) => (dateOf(a) < dateOf(b) ? 1 : -1));
    return rows;
  }, [txns, members]);

  const summary = useMemo(() => {
    let buyQty = 0,
      sellQty = 0,
      buyAmt = 0;
    for (const r of entries) {
      if (r.kind === "lot") {
        buyQty += Number(r.m.quantity) || 0;
        buyAmt += (Number(r.m.quantity) || 0) * (Number(r.m.avg_price) || 0);
        continue;
      }
      const t = r.t;
      if (t.txn_type === "buy") {
        buyQty += t.quantity;
        buyAmt += t.amount;
      } else if (t.txn_type === "sell") {
        sellQty += t.quantity;
      }
    }
    const net = buyQty - sellQty;
    const avg = buyQty > 0 ? buyAmt / buyQty : 0;
    return { buyQty, sellQty, net, avg };
  }, [entries]);

  const target = members.find((m) => m.id === lotId) ?? members[0];

  const txnById = useMemo(() => new Map(txns.map((t) => [t.id, t])), [txns]);
  const validSelected = selected.filter((id) => txnById.has(id));
  const allSelected = txns.length > 0 && validSelected.length === txns.length;
  const toggleAll = (v: boolean) => setSelected(v ? txns.map((t) => t.id) : []);
  const toggleOne = (id: string, v: boolean) =>
    setSelected((prev) => (v ? [...prev, id] : prev.filter((x) => x !== id)));

  const deleteSelected = async () => {
    for (const id of validSelected) {
      const t = txnById.get(id);
      if (t) await del.mutateAsync({ id: t.id, investment_id: t.investment_id });
    }
    setSelected([]);
    setConfirmBulk(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          {isLoading
            ? "Loading…"
            : `${entries.length} transaction${entries.length === 1 ? "" : "s"}` +
              (members.length > 1 ? ` across ${members.length} entries` : "")}
        </div>
        <div className="flex items-center gap-2">
          {validSelected.length > 0 ? (
            <Button
              size="sm"
              variant="outline"
              className="border-rose-500/40 text-rose-500 hover:bg-rose-500/10"
              onClick={() => setConfirmBulk(true)}
              disabled={del.isPending}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete {validSelected.length}
            </Button>
          ) : null}
          <Button
            size="sm"
            onClick={() => setAdding(true)}
            className="bg-mint text-[#04121C] hover:brightness-110"
          >
            <Plus className="mr-1 h-3.5 w-3.5" /> Add Transaction
          </Button>
        </div>
      </div>


      {adding && members.length > 1 ? (
        <div className="rounded-xl border border-border bg-surface-2/30 p-3">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Add to entry
          </label>
          <Select value={lotId} onValueChange={setLotId}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {members.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {lotLabel(m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ) : null}

      {adding || editing ? (
        <TxnForm
          investment={
            editing
              ? (members.find((m) => m.id === editing.investment_id) ?? investment)
              : target
          }
          existing={editing}
          onCancel={() => {
            setAdding(false);
            setEditing(null);
          }}
          onSubmit={async (input) => {
            await upsert.mutateAsync(input);
            setAdding(false);
            setEditing(null);
          }}
        />
      ) : null}

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead className="bg-surface-2/50">
            <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="w-[44px] px-3 py-2">
                <SelectCheckbox
                  label="Select all transactions"
                  checked={allSelected}
                  indeterminate={validSelected.length > 0 && !allSelected}
                  onChange={toggleAll}
                />
              </th>
              <th className="px-3 py-2 font-medium">Date</th>
              <th className="px-3 py-2 font-medium">Type</th>
              <th className="px-3 py-2 text-right font-medium">Qty</th>
              <th className="px-3 py-2 text-right font-medium">Price</th>
              <th className="px-3 py-2 text-right font-medium">Amount</th>
              <th className="px-3 py-2 font-medium">Notes</th>
              <th className="w-24 px-3 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={8} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No transactions recorded yet.
                </td>
              </tr>
            ) : null}

            {entries.map((r) =>
              r.kind === "lot" ? (
                <tr key={r.key} className="border-t border-border/60 hover:bg-surface-2/40">
                  <td className="w-[44px] px-3 py-2" />
                  <td className="px-3 py-2 text-foreground">
                    {r.m.purchase_date ? formatDate(r.m.purchase_date) : "—"}
                  </td>
                  <td className="px-3 py-2">
                    <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-500">
                      buy
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">
                    {r.m.quantity}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">
                    {priceIn(r.m.avg_price, ccy)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">
                    {amountIn((Number(r.m.quantity) || 0) * (Number(r.m.avg_price) || 0), ccy)}
                  </td>
                  <td className="px-3 py-2 max-w-[160px] truncate text-muted-foreground">
                    Opening entry
                  </td>
                  <td className="px-3 py-2" />
                </tr>
              ) : (
                <tr
                  key={r.key}
                  className={`group border-t border-border/60 hover:bg-surface-2/40 ${
                    validSelected.includes(r.t.id) ? "bg-mint/[0.06]" : ""
                  }`}
                >
                  <td className="w-[44px] px-3 py-2">
                    <SelectCheckbox
                      label={`Select transaction ${formatDate(r.t.occurred_on)}`}
                      checked={validSelected.includes(r.t.id)}
                      onChange={(v) => toggleOne(r.t.id, v)}
                    />
                  </td>
                  <td className="px-3 py-2 text-foreground">{formatDate(r.t.occurred_on)}</td>

                  <td className="px-3 py-2">
                    <span
                      className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${r.t.txn_type === "buy" ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}`}
                    >
                      {r.t.txn_type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">
                    {r.t.quantity}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums text-foreground">
                    {priceIn(r.t.price, ccy)}
                  </td>
                  <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">
                    {amountIn(r.t.amount, ccy)}
                  </td>
                  <td className="px-3 py-2 max-w-[160px] truncate text-muted-foreground">
                    {r.t.notes || "—"}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditing(r.t)}
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-mint"
                        aria-label="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => setConfirmDel(r.t)}
                        className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                        aria-label="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ),
            )}
          </tbody>
        </table>
      </div>

      {entries.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <SumCard label="Total Buy Qty" value={String(summary.buyQty)} />
          <SumCard label="Total Sell Qty" value={String(summary.sellQty)} />
          <SumCard label="Net Quantity" value={String(summary.net)} />
          <SumCard label="Avg. Buy Price" value={priceIn(summary.avg, ccy)} />
        </div>
      ) : null}



      <AlertDialog open={!!confirmDel} onOpenChange={(v) => !v && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete transaction?</AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 text-white hover:bg-rose-600"
              disabled={del.isPending}
              onClick={async () => {
                if (!confirmDel) return;
                await del.mutateAsync({
                  id: confirmDel.id,
                  investment_id: confirmDel.investment_id,
                });
                setConfirmDel(null);
              }}
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmBulk} onOpenChange={(v) => !v && setConfirmBulk(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {validSelected.length} transaction{validSelected.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 text-white hover:bg-rose-600"
              disabled={del.isPending}
              onClick={deleteSelected}
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

function SumCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-bold text-foreground">{value}</div>
    </div>
  );
}

function TxnForm({
  investment,
  existing,
  onCancel,
  onSubmit,
}: {
  investment: Investment;
  existing: InvestmentTxn | null;
  onCancel: () => void;
  onSubmit: (
    input: Parameters<ReturnType<typeof useUpsertInvestmentTxn>["mutateAsync"]>[0],
  ) => Promise<void>;
}) {
  const [txnType, setTxnType] = useState<"buy" | "sell">((existing?.txn_type as any) || "buy");
  const [date, setDate] = useState<string>(
    existing?.occurred_on || new Date().toISOString().slice(0, 10),
  );
  const [qty, setQty] = useState<string>(existing ? String(existing.quantity) : "");
  const [price, setPrice] = useState<string>(
    existing ? String(existing.price) : String(investment.avg_price || ""),
  );
  const [notes, setNotes] = useState<string>(existing?.notes ?? "");
  const [saving, setSaving] = useState(false);

  const q = Number(qty) || 0;
  const p = Number(price) || 0;
  const amount = q * p;

  const submit = async () => {
    if (!q || !p) return;
    setSaving(true);
    try {
      await onSubmit({
        id: existing?.id,
        investment_id: investment.id,
        txn_type: txnType,
        quantity: q,
        price: p,
        amount,
        occurred_on: date,
        notes: notes || null,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-mint/30 bg-mint/[0.04] p-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Type</label>
          <Select value={txnType} onValueChange={(v) => setTxnType(v as any)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="buy">Buy</SelectItem>
              <SelectItem value="sell">Sell</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Date</label>
          <DatePicker
            value={date}
            onChange={(v) => setDate(v || new Date().toISOString().slice(0, 10))}
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Quantity
          </label>
          <Input
            type="number"
            step="0.0001"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Price
          </label>
          <Input
            type="number"
            step="0.01"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="mt-1"
          />
        </div>
        <div>
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Amount
          </label>
          <div className="mt-1 flex h-9 items-center rounded-md border border-border bg-surface-2 px-3 text-sm font-medium">
            {amountIn(amount, investment.currency || "INR")}
          </div>
        </div>
      </div>
      <div className="mt-3">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Notes</label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Optional notes"
          className="mt-1"
        />
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={submit}
          disabled={saving || !q || !p}
          className="bg-mint text-[#04121C] hover:brightness-110"
        >
          {saving ? "Saving…" : existing ? "Update" : "Save"}
        </Button>
      </div>
    </div>
  );
}

/* -------------------- Fundamental Tab (auto-fetched) -------------------- */
function identifierTypeFor(inv: Investment): IdentifierType | null {
  if (inv.identifier_type) return inv.identifier_type as IdentifierType;
  return null;
}

function fmtNum(v: number | null | undefined, digits = 2, suffix = ""): string {
  if (v == null || !Number.isFinite(v)) return "N/A";
  return `${v.toFixed(digits)}${suffix}`;
}

function fmtCap(v: number | null | undefined, ccy: string): string {
  if (v == null || !Number.isFinite(v) || v <= 0) return "N/A";
  if (ccy === "INR") {
    const cr = v / 1e7;
    return cr >= 1e5 ? `₹${(cr / 1e5).toFixed(2)} L Cr` : `₹${cr.toFixed(0)} Cr`;
  }
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(2)}B`;
  return `${(v / 1e6).toFixed(2)}M`;
}

function useFundamentals(investment: Investment) {
  const kind = identifierTypeFor(investment);
  return useInstrumentFundamentals(
    kind && investment.identifier
      ? {
          identifier_type: kind,
          identifier: investment.identifier,
          exchange: investment.exchange ?? null,
        }
      : null,
  );
}

function LastUpdated({ at, source }: { at?: string | null; source?: string | null }) {
  if (!at) return null;
  return (
    <div className="mt-2 text-[11px] text-muted-foreground">
      Last updated {new Date(at).toLocaleString("en-GB")}
      {source ? ` · ${source}` : ""}
    </div>
  );
}

function FundamentalTab({
  investment,
  derived,
}: {
  investment: Investment;
  derived: ReturnType<typeof deriveHolding>;
}) {
  const ccy = investment.currency || "INR";
  const { data, isLoading } = useFundamentals(investment);
  const f: InstrumentFundamentals | null = data ?? null;

  if (!investment.identifier) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Link this holding to a market instrument to see live fundamentals.
      </div>
    );
  }

  const isFund =
    investment.identifier_type === "mf_in" ||
    /etf|fund|invit|reit/i.test(`${investment.category} ${investment.sub_category ?? ""}`);

  const rows: [string, string][] = isFund
    ? [
        ["Current NAV / Price", priceIn(f?.price ?? derived.current_price, ccy)],
        ["52-Week High", f?.week52_high != null ? priceIn(f.week52_high, ccy) : "N/A"],
        ["52-Week Low", f?.week52_low != null ? priceIn(f.week52_low, ccy) : "N/A"],
        ["1Y Return", fmtNum(f?.return_1y, 2, "%")],
        ["3Y Return (CAGR)", fmtNum(f?.return_3y, 2, "%")],
        ["5Y Return (CAGR)", fmtNum(f?.return_5y, 2, "%")],
        ["Category Average", fmtNum(f?.category_average, 2, "%")],
        ["Expense Ratio", fmtNum(f?.expense_ratio, 2, "%")],
        ["Exit Load", f?.exit_load ?? "N/A"],
        ["Risk Rating", f?.risk_rating ?? "N/A"],
        ["Fund Manager", f?.fund_manager ?? "N/A"],
        ["Fund House", f?.fund_house ?? f?.industry ?? "N/A"],
      ]
    : [
        ["Current Market Price (CMP)", priceIn(f?.price ?? derived.current_price, ccy)],
        ["52-Week High", f?.week52_high != null ? priceIn(f.week52_high, ccy) : "N/A"],
        ["52-Week Low", f?.week52_low != null ? priceIn(f.week52_low, ccy) : "N/A"],
        ["P/E Ratio", fmtNum(f?.pe)],
        ["P/B Ratio", fmtNum(f?.pb)],
        ["Dividend Yield", fmtNum(f?.dividend_yield, 2, "%")],
        ["EPS", f?.eps != null ? priceIn(f.eps, ccy) : "N/A"],
        ["Market Capitalization", fmtCap(f?.market_cap, ccy)],
        ["Return on Equity (ROE)", fmtNum(f?.roe, 2, "%")],
        ["Debt-to-Equity Ratio", fmtNum(f?.debt_to_equity)],
        ["Face Value", f?.face_value != null ? priceIn(f.face_value, ccy) : "N/A"],
        ["Book Value", f?.book_value != null ? priceIn(f.book_value, ccy) : "N/A"],
      ];

  return (
    <Section title="Fundamental Data (auto-fetched)">
      {isLoading && !f ? (
        <div className="py-4 text-sm text-muted-foreground">Fetching fundamentals…</div>
      ) : (
        <>
          <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
            {rows.map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-3 border-b border-border/60 py-2 text-sm"
              >
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium text-foreground">{v}</dd>
              </div>
            ))}
          </dl>
          <LastUpdated at={f?.fetched_at} source={f?.source} />
        </>
      )}
    </Section>
  );
}

/* -------------------- Classification Tab -------------------- */
function ClassificationTab({
  investment,
  platformLabel,
}: {
  investment: Investment;
  platformLabel?: string;
}) {
  const ccy = investment.currency || "INR";
  const { data: f } = useFundamentals(investment);
  const rows: [string, string][] = [
    ["Market Capitalization Category", f?.market_cap_band ?? "N/A"],
    ["Sector", f?.sector ?? investment.sub_category ?? "N/A"],
    ["Industry", f?.industry ?? "N/A"],
    ["Segment Type", f?.segment_type ?? investment.category ?? "N/A"],
    ["Category", investment.category || "—"],
    ["Exchange", investment.exchange || "—"],
    ["Currency", ccy],
    ["Platform", platformLabel || "—"],
    ["Purchase Date", investment.purchase_date ? formatDate(investment.purchase_date) : "—"],
  ];
  return (
    <Section title="Classification (auto-fetched)">
      <dl className="grid grid-cols-1 gap-x-6 sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div
            key={k}
            className="flex justify-between gap-3 border-b border-border/60 py-2 text-sm"
          >
            <dt className="text-muted-foreground">{k}</dt>
            <dd className="text-right font-medium text-foreground">{v}</dd>
          </div>
        ))}
      </dl>
      <LastUpdated at={f?.fetched_at} source={f?.source} />
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/30 p-4">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/* -------------------- Corporate Actions Tab -------------------- */
function CorporateTab({ investment }: { investment: Investment }) {
  const kind = identifierTypeFor(investment);
  const ccy = investment.currency || "INR";
  const { data: actions = [], isLoading } = useCorporateActions(
    kind && investment.identifier
      ? {
          identifier_type: kind,
          identifier: investment.identifier,
          exchange: investment.exchange ?? null,
        }
      : null,
  );

  if (!investment.identifier) {
    return (
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        Link this holding to a market instrument to see corporate actions.
      </div>
    );
  }

  return (
    <Section title="Corporate Actions (auto-fetched)">
      {isLoading && actions.length === 0 ? (
        <div className="py-4 text-sm text-muted-foreground">Fetching corporate actions…</div>
      ) : actions.length === 0 ? (
        <div className="py-4 text-sm text-muted-foreground">
          No dividends or splits reported for this instrument.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-surface-2/50">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Action</th>
                <th className="px-3 py-2 text-right font-medium">Details</th>
              </tr>
            </thead>
            <tbody>
              {actions.map((a, i) => (
                <tr key={`${a.type}-${a.date}-${i}`} className="border-t border-border/60">
                  <td className="px-3 py-2 text-foreground">{formatDate(a.date.slice(0, 10))}</td>
                  <td className="px-3 py-2">
                    <span className="rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-mint">
                      {a.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-medium text-foreground">
                    {a.type === "dividend" && a.amount != null
                      ? `${priceIn(a.amount, ccy)} / unit`
                      : (a.ratio ?? a.detail)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Section>
  );
}


/* -------------------- Notes Tab -------------------- */
function NotesTab({ investment }: { investment: Investment }) {
  const [notes, setNotes] = useState(investment.notes || "");
  const save = useUpdateInvestmentNotes();
  const dirty = notes !== (investment.notes || "");
  return (
    <div className="space-y-3">
      <Textarea
        rows={8}
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Write notes about this holding — thesis, targets, review dates…"
      />
      <div className="flex justify-end gap-2">
        <Button
          variant="ghost"
          onClick={() => setNotes(investment.notes || "")}
          disabled={!dirty || save.isPending}
        >
          Reset
        </Button>
        <Button
          onClick={() => save.mutate({ id: investment.id, notes: notes || null })}
          disabled={!dirty || save.isPending}
          className="bg-mint text-[#04121C] hover:brightness-110"
        >
          {save.isPending ? "Saving…" : "Save Notes"}
        </Button>
      </div>
    </div>
  );
}
