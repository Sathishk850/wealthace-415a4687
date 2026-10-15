import { useState, useEffect } from "react";
import { Loader2, ArrowRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getFxRates } from "@/lib/fx.functions";
import type { FxRate } from "@/lib/fx-types";
import type { PaymentAccount } from "@/lib/payment-accounts-api";

const SYM: Record<string, string> = {
  INR: "₹", USD: "$", EUR: "€", GBP: "£", SGD: "S$", AED: "د.إ", UGX: "USh",
};
function sym(c: string) { return SYM[c] ?? c; }

/** Resolve a rate from available pairs: direct, inverse, or via a common pivot. */
function resolveRate(rates: FxRate[], from: string, to: string): number | null {
  const direct = (a: string, b: string): number | null => {
    if (a === b) return 1;
    const d = rates.find((r) => r.from === a && r.to === b && r.rate > 0);
    if (d) return d.rate;
    const inv = rates.find((r) => r.from === b && r.to === a && r.rate > 0);
    if (inv) return 1 / inv.rate;
    return null;
  };
  const d = direct(from, to);
  if (d) return d;
  for (const pivot of ["INR", "USD", "UGX", "EUR", "GBP"]) {
    const a = direct(from, pivot);
    const b = direct(pivot, to);
    if (a && b) return a * b;
  }
  return null;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  accounts: PaymentAccount[];
  onSuccess: () => void;
  /** Pre-select the destination account, e.g. a credit card for "Pay Bill". */
  defaultToId?: string;
};

const today = () => new Date().toISOString().slice(0, 10);

export function TransferDialog({ open, onOpenChange, accounts, onSuccess, defaultToId }: Props) {
  const [fromId, setFromId] = useState("");
  const [toId, setToId] = useState("");
  const [amount, setAmount] = useState("");
  const [fxRate, setFxRate] = useState<number>(1);
  const [fetchingRate, setFetchingRate] = useState(false);
  const [date, setDate] = useState(today());
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const fromAcc = accounts.find((a) => a.id === fromId);
  const toAcc = accounts.find((a) => a.id === toId);
  const srcCur = fromAcc?.currency ?? "INR";
  const dstCur = toAcc?.currency ?? "INR";
  const isCross = !!fromAcc && !!toAcc && srcCur !== dstCur;
  const dstAmount = isCross ? Number(amount) * fxRate : Number(amount);

  useEffect(() => {
    if (!open) return;
    setFromId(""); setToId(defaultToId ?? ""); setAmount(""); setFxRate(1); setNote("");
    setDate(today());
  }, [open, defaultToId]);

  const fetchRate = async () => {
    if (!isCross) return;
    setFetchingRate(true);
    try {
      const { rates } = await getFxRates();
      const r = resolveRate(rates, srcCur, dstCur);
      if (r) setFxRate(Number(r.toFixed(6)));
      else toast.error(`No live rate for ${srcCur} → ${dstCur} — enter it manually`);
    } catch {
      toast.error("Could not fetch live rate — enter manually");
    }
    setFetchingRate(false);
  };

  useEffect(() => {
    if (isCross) void fetchRate();
    else setFxRate(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromId, toId]);

  const handleSave = async () => {
    if (!fromId || !toId || fromId === toId) { toast.error("Select two different accounts"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Enter an amount"); return; }
    if (isCross && fxRate <= 0) { toast.error("Enter a valid exchange rate"); return; }
    setSaving(true);

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { toast.error("Not signed in"); setSaving(false); return; }

    const transferRef = `xfer-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const srcAmount = Number(amount);
    const noteText = [note.trim(), isCross ? `Rate: 1 ${srcCur} = ${fxRate} ${dstCur}` : ""]
      .filter(Boolean).join(" · ") || "Transfer";

    const { data: cats } = await supabase
      .from("money_categories")
      .select("id")
      .ilike("name", "transfer%")
      .eq("user_id", user.id)
      .limit(1);
    const catId = cats?.[0]?.id ?? null;

    const base = {
      user_id: user.id,
      occurred_on: date,
      category_id: catId,
      note: noteText,
      is_transfer: true,
      transfer_ref: transferRef,
      payment_mode: "bank_transfer",
    };
    const { error } = await supabase.from("money_transactions").insert([
      { ...base, kind: "expense", amount: srcAmount, merchant: `Transfer → ${toAcc?.name ?? ""}`, payment_account_id: fromId },
      { ...base, kind: "income", amount: Number((isCross ? dstAmount : srcAmount).toFixed(2)), merchant: `Transfer ← ${fromAcc?.name ?? ""}`, payment_account_id: toId },
    ]);

    setSaving(false);
    if (error) { toast.error(error.message || "Transfer failed"); return; }
    toast.success(`Transfer recorded${isCross ? ` · 1 ${srcCur} = ${fxRate} ${dstCur}` : ""}`);
    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Transfer Between Accounts</DialogTitle></DialogHeader>
        <div className="space-y-4 py-1">
          <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-2">
            <div className="grid min-w-0 gap-1.5">
              <Label className="text-xs text-muted-foreground">From</Label>
              <Select value={fromId} onValueChange={setFromId}>
                <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter((a) => a.id !== toId).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency ?? "INR"})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="mb-2 h-4 w-4 text-muted-foreground" />
            <div className="grid min-w-0 gap-1.5">
              <Label className="text-xs text-muted-foreground">To</Label>
              <Select value={toId} onValueChange={setToId}>
                <SelectTrigger><SelectValue placeholder="Account" /></SelectTrigger>
                <SelectContent>
                  {accounts.filter((a) => a.id !== fromId).map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name} ({a.currency ?? "INR"})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Amount ({srcCur})</Label>
            <Input type="number" min={0} step="any" value={amount}
              onChange={(e) => setAmount(e.target.value)} placeholder={`${sym(srcCur)} 0.00`} />
          </div>

          {isCross && (
            <div className="grid gap-1.5">
              <Label className="text-xs text-muted-foreground">Exchange rate (1 {srcCur} = ? {dstCur})</Label>
              <div className="flex items-center gap-2">
                <Input type="number" min={0} step="any" value={fxRate || ""}
                  onChange={(e) => setFxRate(Number(e.target.value) || 0)} placeholder="e.g. 106.5" className="flex-1" />
                <Button type="button" variant="outline" size="sm" disabled={fetchingRate} onClick={() => void fetchRate()}>
                  {fetchingRate ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Fetch rate"}
                </Button>
              </div>
              {fxRate > 0 && Number(amount) > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  {sym(dstCur)}{dstAmount.toLocaleString("en-IN", { maximumFractionDigits: 2 })} credited to {toAcc?.name}
                </p>
              )}
            </div>
          )}

          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Date</Label>
            <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Note (optional)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Rent payment" />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => void handleSave()} disabled={saving || !fromId || !toId || !amount}>
            {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {saving ? "Saving…" : "Record Transfer"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
