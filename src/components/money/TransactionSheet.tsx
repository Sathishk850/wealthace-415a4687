import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AmountInput } from "@/components/ui/amount-input";
import { useUpsertTransaction, useCategories, todayIso } from "@/lib/money-api";
import type { Transaction } from "@/lib/money-api";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<Transaction> | null;
  clone?: boolean;
}

export function TransactionSheet({ open, onOpenChange, initial, clone = false }: Props) {
  const { data: cats = [] } = useCategories();
  const upsert = useUpsertTransaction();

  const [kind, setKind] = useState<"income" | "expense">("expense");
  const [date, setDate] = useState(todayIso());
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [account, setAccount] = useState("");

  useEffect(() => {
    if (!open) return;
    if (initial) {
      setKind((initial.kind as "income" | "expense") ?? "expense");
      setDate(initial.occurred_on ?? todayIso());
      setAmount(initial.amount != null ? String(initial.amount) : "");
      setMerchant(initial.merchant ?? "");
      setCategoryId(initial.category_id ?? null);
      setNote(initial.note ?? "");
      setAccount(initial.account ?? "");
    } else {
      setKind("expense"); setDate(todayIso()); setAmount("");
      setMerchant(""); setCategoryId(null); setNote(""); setAccount("");
    }
  }, [open, initial]);

  const isEditing = !clone && !!initial?.id;
  const filteredCats = cats.filter((c) => c.kind === kind);

  async function save() {
    const amt = parseFloat(amount);
    if (!amt || amt <= 0 || !merchant.trim() || !categoryId) return;
    await upsert.mutateAsync({
      id: isEditing ? initial!.id : undefined,
      kind, amount: amt, occurred_on: date, category_id: categoryId,
      merchant: merchant.trim(), note: note.trim() || null, account: account.trim() || null,
    });
    onOpenChange(false);
  }

  const inp = "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint/40";
  const lbl = "block text-xs font-medium text-muted-foreground mb-1";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="flex w-full flex-col sm:max-w-md">
        <SheetHeader className="border-b border-border pb-4">
          <SheetTitle>{isEditing ? "Edit Transaction" : clone ? "Clone Transaction" : "Add Transaction"}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto py-4 space-y-4">
          <div>
            <span className={lbl}>Type</span>
            <div className="flex gap-2">
              {(["expense","income"] as const).map((k) => (
                <button key={k} type="button" onClick={() => { setKind(k); setCategoryId(null); }}
                  className={cn("flex-1 rounded-xl py-2 text-sm font-semibold capitalize",
                    kind === k ? k === "income" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                      : "bg-red-500/20 text-red-400 border border-red-500/40"
                    : "border border-border bg-surface text-muted-foreground hover:border-mint/40")}>
                  {k === "income" ? "Income" : "Expense"}
                </button>
              ))}
            </div>
          </div>
          <div><label className={lbl}>Date</label><input type="date" className={inp} value={date} onChange={(e) => setDate(e.target.value)} /></div>
<div>
  <label className={lbl}>Amount</label>
  <AmountInput value={amount} onChange={setAmount} className={inp} placeholder="0.00" />
</div>
          <div><label className={lbl}>Description</label><input type="text" className={inp} placeholder="e.g. Swiggy, Salary, SIP" value={merchant} onChange={(e) => setMerchant(e.target.value)} /></div>
          <div>
            <label className={lbl}>Category</label>
            <select className={inp} value={categoryId ?? ""} onChange={(e) => setCategoryId(e.target.value || null)}>
              <option value="">— Select category —</option>
              {filteredCats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className={lbl}>Note (optional)</label><textarea rows={2} className={cn(inp,"resize-none")} placeholder="Who you split with, what it was for…" value={note} onChange={(e) => setNote(e.target.value)} /></div>
          <div><label className={lbl}>Account (optional)</label><input type="text" className={inp} placeholder="e.g. HDFC Savings" value={account} onChange={(e) => setAccount(e.target.value)} /></div>
        </div>
        <div className="border-t border-border pt-4 flex gap-3">
          <button type="button" onClick={() => onOpenChange(false)} className="flex-1 rounded-xl border border-border bg-surface py-2.5 text-sm font-semibold text-foreground">Cancel</button>
          <button type="button" onClick={save} disabled={upsert.isPending} className="flex-1 rounded-xl bg-mint py-2.5 text-sm font-semibold text-mint-foreground disabled:opacity-60 flex items-center justify-center gap-2">
            {upsert.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Save
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
