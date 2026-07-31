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
import { formatDate } from "@/lib/date-format";
import {
  type Investment,
  amountIn,
  priceIn,
  cagrPct,
  singleXirr,
  useInvestmentTxns,
  useUpsertInvestmentTxn,
  useDeleteInvestmentTxn,
  useUpdateInvestmentNotes,
  type InvestmentTxn,
} from "@/lib/wealth-api";
import { deriveHolding } from "@/lib/market/derive";
import { useInstrumentFundamentals } from "@/lib/market/use-market-data";
import type { IdentifierType, InstrumentFundamentals, MarketQuote } from "@/lib/market/types";
import { HoldingSummaryRow } from "@/components/wealth/holding-summary-row";
import { AreaChart, Area, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  investment: Investment | null;
  quote?: MarketQuote | null;
  platformLabel?: string;
};

type DetailTab =
  | "fundamental"
  | "classification"
  | "history"
  | "corporate"
  | "notes"
  | "performance";

const CORPORATE_CATEGORIES = new Set(["Stocks", "ETFs"]);

export function HoldingDetailsModal({
  open,
  onOpenChange,
  investment,
  quote,
  platformLabel,
}: Props) {
  const [tab, setTab] = useState<DetailTab>("fundamental");

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
  const d = deriveHolding(inv, quote ?? null);
  const invested = d.invested;
  const current = d.current_value;
  const pnl = d.unrealized_pl;
  const pnlPct = d.return_pct;
  const up = pnl >= 0;
  const ccy = inv.currency || "INR";

  const showCorporate = CORPORATE_CATEGORIES.has(inv.category);
  const tabs: { value: DetailTab; label: string }[] = [
    { value: "fundamental", label: "Fundamental" },
    { value: "classification", label: "Classification" },
    { value: "history", label: "Buy / Sell History" },
    ...(showCorporate ? [{ value: "corporate" as const, label: "Corporate Actions" }] : []),
    { value: "notes", label: "Notes" },
    { value: "performance", label: "Performance" },
  ];

  const years = inv.purchase_date
    ? Math.max(0.01, (Date.now() - new Date(inv.purchase_date).getTime()) / (365.25 * 86400000))
    : 0;
  const cagr = years > 0 ? cagrPct(invested, current, years) : 0;
  const xirrVal = singleXirr({ ...inv, current_price: d.current_price, current_value: current });
  const annualized = years > 0 ? cagr : 0;

  return (
    <Dialog open={open} onOpenChange={(v) => (v ? onOpenChange(true) : requestClose())}>
      <DialogContent className="max-w-4xl gap-0 overflow-hidden p-0">
        <DialogHeader className="sticky top-0 z-10 border-b border-border bg-card px-6 py-4">
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

        <div className="max-h-[70vh] overflow-y-auto px-6 py-5">
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
            <KpiCard label="Avg. Buy Price" value={priceIn(inv.avg_price, ccy)} />
            <KpiCard label="Net Quantity" value={String(inv.quantity)} />
          </div>

          <div className="mt-5">
            <TextTabs items={tabs} value={tab} onChange={(v) => setTab(v as DetailTab)} />
          </div>

          <div className="mt-4">
            {tab === "history" && <HistoryTab investment={inv} />}
            {tab === "performance" && (
              <PerformanceTab
                investment={inv}
                invested={invested}
                current={current}
                pnl={pnl}
                pnlPct={pnlPct}
                xirrVal={xirrVal}
                cagr={cagr}
                years={years}
              />
            )}
            {tab === "fundamental" && <FundamentalTab investment={inv} derived={d} />}
            {tab === "classification" && (
              <ClassificationTab investment={inv} derived={d} platformLabel={platformLabel} />
            )}
            {tab === "corporate" && showCorporate && <CorporateTab category={inv.category} />}
            {tab === "notes" && <NotesTab investment={inv} />}
          </div>
        </div>

        <div className="sticky bottom-0 border-t border-border bg-card px-6 py-3 flex justify-end">
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
function HistoryTab({ investment }: { investment: Investment }) {
  const { data: txns = [], isLoading } = useInvestmentTxns(investment.id);
  const upsert = useUpsertInvestmentTxn();
  const del = useDeleteInvestmentTxn();
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<InvestmentTxn | null>(null);
  const [confirmDel, setConfirmDel] = useState<InvestmentTxn | null>(null);
  const ccy = investment.currency || "INR";

  const summary = useMemo(() => {
    let buyQty = 0,
      sellQty = 0,
      buyAmt = 0;
    for (const t of txns) {
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
  }, [txns]);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs text-muted-foreground">
          {isLoading ? "Loading…" : `${txns.length} transaction${txns.length === 1 ? "" : "s"}`}
        </div>
        <Button
          size="sm"
          onClick={() => setAdding(true)}
          className="bg-mint text-[#04121C] hover:brightness-110"
        >
          <Plus className="mr-1 h-3.5 w-3.5" /> Add Transaction
        </Button>
      </div>

      {adding || editing ? (
        <TxnForm
          investment={investment}
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
            {txns.length === 0 && !isLoading ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No transactions recorded yet.
                </td>
              </tr>
            ) : null}
            {txns.map((t) => (
              <tr key={t.id} className="group border-t border-border/60 hover:bg-surface-2/40">
                <td className="px-3 py-2 text-foreground">{formatDate(t.occurred_on)}</td>
                <td className="px-3 py-2">
                  <span
                    className={`rounded px-2 py-0.5 text-[10px] font-semibold uppercase ${t.txn_type === "buy" ? "bg-emerald-500/15 text-emerald-500" : "bg-rose-500/15 text-rose-500"}`}
                  >
                    {t.txn_type}
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">{t.quantity}</td>
                <td className="px-3 py-2 text-right tabular-nums text-foreground">
                  {priceIn(t.price, ccy)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums font-medium text-foreground">
                  {amountIn(t.amount, ccy)}
                </td>
                <td className="px-3 py-2 max-w-[160px] truncate text-muted-foreground">
                  {t.notes || "—"}
                </td>
                <td className="px-3 py-2">
                  <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => setEditing(t)}
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface-2 hover:text-mint"
                      aria-label="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => setConfirmDel(t)}
                      className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500"
                      aria-label="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {txns.length > 0 ? (
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
                await del.mutateAsync({ id: confirmDel.id, investment_id: investment.id });
                setConfirmDel(null);
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

/* -------------------- Performance Tab -------------------- */
function PerformanceTab({
  investment,
  invested,
  current,
  pnl,
  pnlPct,
  xirrVal,
  cagr,
  years,
}: {
  investment: Investment;
  invested: number;
  current: number;
  pnl: number;
  pnlPct: number;
  xirrVal: number;
  cagr: number;
  years: number;
}) {
  const ccy = investment.currency || "INR";
  const up = pnl >= 0;
  // Simple two-point trend from purchase to now.
  const trend = useMemo(() => {
    if (!investment.purchase_date) return [];
    const start = new Date(investment.purchase_date).getTime();
    const end = Date.now();
    const points = 8;
    const arr: { m: string; v: number }[] = [];
    for (let i = 0; i <= points; i++) {
      const t = start + ((end - start) * i) / points;
      const frac = i / points;
      const v = invested + (current - invested) * frac;
      arr.push({
        m: new Date(t).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }),
        v,
      });
    }
    return arr;
  }, [investment.purchase_date, invested, current]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KpiCard label="Invested" value={amountIn(invested, ccy)} />
        <KpiCard label="Current" value={amountIn(current, ccy)} />
        <KpiCard
          label="P&L"
          value={`${up ? "+" : ""}${amountIn(pnl, ccy)}`}
          tone={up ? "text-emerald-500" : "text-rose-500"}
        />
        <KpiCard
          label="Return %"
          value={`${up ? "+" : ""}${pnlPct.toFixed(2)}%`}
          tone={up ? "text-emerald-500" : "text-rose-500"}
        />
        <KpiCard label="XIRR" value={xirrVal ? `${xirrVal.toFixed(2)}%` : "—"} tone="text-mint" />
        <KpiCard label="CAGR" value={years > 0 ? `${cagr.toFixed(2)}%` : "—"} />
        <KpiCard label="Annualized" value={years > 0 ? `${cagr.toFixed(2)}%` : "—"} />
        <KpiCard label="Holding Period" value={years > 0 ? `${years.toFixed(1)} yr` : "—"} />
      </div>

      {trend.length > 1 ? (
        <div className="rounded-xl border border-border bg-surface-2/30 p-4">
          <div className="mb-2 text-xs font-semibold text-foreground">Portfolio Value Trend</div>
          <div className="h-[220px]">
            <ResponsiveContainer>
              <AreaChart data={trend} margin={{ top: 10, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="perfTrend" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#14D8CF" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#14D8CF" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="m"
                  tick={{ fill: "#6E8294", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis tick={{ fill: "#6E8294", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{
                    background: "var(--popover)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="v"
                  stroke="#14D8CF"
                  strokeWidth={2.5}
                  fill="url(#perfTrend)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Add a purchase date to see the performance trend.
        </div>
      )}
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

  const rows: [string, string][] = [
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
  derived,
  platformLabel,
}: {
  investment: Investment;
  derived: ReturnType<typeof deriveHolding>;
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
  const summary: [string, string, string?][] = [
    ["Quantity", String(investment.quantity)],
    ["Average Buy Price", priceIn(investment.avg_price, ccy)],
    ["Current Market Price", priceIn(derived.current_price, ccy)],
    ["Invested Amount", amountIn(derived.invested, ccy)],
    ["Current Value", amountIn(derived.current_value, ccy)],
    [
      "Unrealized P&L",
      `${derived.unrealized_pl >= 0 ? "+" : ""}${amountIn(derived.unrealized_pl, ccy)}`,
      derived.unrealized_pl >= 0 ? "text-emerald-500" : "text-rose-500",
    ],
    [
      "Return %",
      `${derived.return_pct >= 0 ? "+" : ""}${derived.return_pct.toFixed(2)}%`,
      derived.return_pct >= 0 ? "text-emerald-500" : "text-rose-500",
    ],
  ];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <Section title="Classification (auto-fetched)">
        <dl className="divide-y divide-border/60">
          {rows.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-3 py-2 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className="text-right font-medium text-foreground">{v}</dd>
            </div>
          ))}
        </dl>
        <LastUpdated at={f?.fetched_at} source={f?.source} />
      </Section>
      <Section title="Holding Summary">
        <dl className="divide-y divide-border/60">
          {summary.map(([k, v, tone]) => (
            <div key={k} className="flex justify-between gap-3 py-2 text-sm">
              <dt className="text-muted-foreground">{k}</dt>
              <dd className={`text-right font-medium ${tone ?? "text-foreground"}`}>{v}</dd>
            </div>
          ))}
        </dl>
      </Section>
    </div>
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
function CorporateTab({ category }: { category: string }) {
  const items =
    category === "ETFs"
      ? ["Dividend", "Split"]
      : ["Dividend", "Bonus", "Split", "Rights Issue", "Merger"];
  return (
    <div className="space-y-3">
      <div className="text-sm text-muted-foreground">
        Corporate actions history will appear here as it is reported.
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((t) => (
          <span
            key={t}
            className="rounded-full border border-border bg-surface-2/40 px-3 py-1 text-xs text-muted-foreground"
          >
            {t}
          </span>
        ))}
      </div>
      <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
        No corporate actions recorded for this holding.
      </div>
    </div>
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
