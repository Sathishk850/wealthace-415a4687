import { useState } from "react";
import { Plus, Copy, Trash2, Loader2, LayoutList } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { keys as moneyKeys, type Category } from "@/lib/money-api";
import type { PaymentAccount } from "@/lib/payment-accounts-api";

type Kind = "expense" | "income";

type BulkRow = {
  _id: string;
  kind: Kind;
  date: string;
  merchant: string;
  amount: string;
  categoryId: string;
  accountId: string;
  note: string;
};

const rid = () => Math.random().toString(36).slice(2);

function emptyRow(kind: Kind, defaults?: Partial<BulkRow>): BulkRow {
  return {
    _id: rid(),
    kind,
    date: new Date().toISOString().slice(0, 10),
    merchant: "",
    amount: "",
    categoryId: "",
    accountId: "",
    note: "",
    ...defaults,
  };
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultKind?: Kind;
  categories: Category[];
  accounts: PaymentAccount[];
};

const isReady = (r: BulkRow) => r.merchant.trim() !== "" && Number(r.amount) > 0;

export function BulkAddSheet({ open, onOpenChange, defaultKind = "expense", categories, accounts }: Props) {
  const [rows, setRows] = useState<BulkRow[]>([emptyRow(defaultKind)]);
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  const update = (id: string, patch: Partial<BulkRow>) =>
    setRows((prev) =>
      prev.map((r) => {
        if (r._id !== id) return r;
        const next = { ...r, ...patch };
        // Clear category if kind changes and category no longer matches
        if (patch.kind && patch.kind !== r.kind) {
          const cat = categories.find((c) => c.id === r.categoryId);
          if (cat && cat.kind !== patch.kind) next.categoryId = "";
        }
        return next;
      }),
    );

  const duplicate = (row: BulkRow) =>
    setRows((prev) => {
      const idx = prev.findIndex((r) => r._id === row._id);
      const copy = { ...row, _id: rid(), merchant: "", amount: "" };
      const next = [...prev];
      next.splice(idx + 1, 0, copy);
      return next;
    });

  const remove = (id: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r._id !== id) : prev));

  const addRow = () =>
    setRows((prev) => {
      const last = prev[prev.length - 1];
      return [
        ...prev,
        emptyRow(last?.kind ?? defaultKind, {
          categoryId: last?.categoryId ?? "",
          accountId: last?.accountId ?? "",
          date: last?.date ?? new Date().toISOString().slice(0, 10),
        }),
      ];
    });

  const readyCount = rows.filter(isReady).length;

  const saveAll = async () => {
    const valid = rows.filter(isReady);
    if (!valid.length) {
      toast.error("Fill in at least one row with a merchant and amount");
      return;
    }
    setSaving(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      toast.error("Not signed in");
      setSaving(false);
      return;
    }
    const inserts = valid.map((r) => ({
      user_id: user.id,
      kind: r.kind,
      amount: Number(r.amount),
      merchant: r.merchant.trim(),
      occurred_on: r.date,
      category_id: r.categoryId || null,
      payment_account_id: r.accountId || null,
      note: r.note.trim() || null,
    }));
    const { error } = await supabase.from("money_transactions").insert(inserts);
    setSaving(false);
    if (error) {
      toast.error(error.message || "Save failed");
      return;
    }
    qc.invalidateQueries({ queryKey: moneyKeys.transactions });
    toast.success(`Added ${valid.length} transaction${valid.length > 1 ? "s" : ""}`);
    setRows([emptyRow(defaultKind)]);
    onOpenChange(false);
  };


  const KindSel = ({ row }: { row: BulkRow }) => (
    <Select value={row.kind} onValueChange={(v) => update(row._id, { kind: v as Kind })}>
      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="expense">Expense</SelectItem>
        <SelectItem value="income">Income</SelectItem>
      </SelectContent>
    </Select>
  );
  const CatSel = ({ row }: { row: BulkRow }) => (
    <CategorySelect
      value={row.categoryId}
      onChange={(v) => update(row._id, { categoryId: v })}
      kind={row.kind}
      categories={categories}
      allowNone={false}
      placeholder="Category"
      className="h-8 flex-1 text-xs"
    />
  );
  const AccSel = ({ row }: { row: BulkRow }) => (
    <Select value={row.accountId} onValueChange={(v) => update(row._id, { accountId: v })}>
      <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Account" /></SelectTrigger>
      <SelectContent>
        {accounts.map((a) => (
          <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
  const Actions = ({ row }: { row: BulkRow }) => (
    <>
      <button
        type="button"
        onClick={() => duplicate(row)}
        className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-muted hover:text-primary"
        title="Duplicate row"
        aria-label="Duplicate row"
      >
        <Copy className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => remove(row._id)}
        className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        title="Remove row"
        aria-label="Remove row"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </>
  );

  const grid = "sm:grid-cols-[90px_120px_1fr_90px_120px_120px_32px_32px]";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-y-auto">
        <SheetHeader className="mb-4">
          <SheetTitle className="flex items-center gap-2">
            <LayoutList className="h-4 w-4" /> Bulk Add Transactions
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-2">
          <div className={`hidden ${grid} gap-2 px-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground sm:grid`}>
            <span>Type</span><span>Date</span><span>Merchant</span><span>Amount</span>
            <span>Category</span><span>Account</span><span /><span />
          </div>

          {rows.map((row) => (
            <div key={row._id}>
              <div className={`hidden ${grid} items-center gap-2 sm:grid`}>
                <KindSel row={row} />
                <Input className="h-8 text-xs" type="date" value={row.date} onChange={(e) => update(row._id, { date: e.target.value })} />
                <Input className="h-8 text-xs" value={row.merchant} onChange={(e) => update(row._id, { merchant: e.target.value })} placeholder="Merchant / description" />
                <Input className="h-8 text-xs" type="number" min={0} step="any" inputMode="decimal" value={row.amount} onChange={(e) => update(row._id, { amount: e.target.value })} placeholder="0.00" />
                <CatSel row={row} />
                <AccSel row={row} />
                <Actions row={row} />
              </div>

              <div className="space-y-2 rounded-xl border border-border p-3 sm:hidden">
                <div className="grid grid-cols-[100px_1fr] gap-2">
                  <KindSel row={row} />
                  <Input className="h-8 text-xs" value={row.merchant} onChange={(e) => update(row._id, { merchant: e.target.value })} placeholder="Merchant / description" />
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <Input className="h-8 text-xs" type="number" min={0} step="any" inputMode="decimal" value={row.amount} onChange={(e) => update(row._id, { amount: e.target.value })} placeholder="0.00" />
                  <CatSel row={row} />
                  <AccSel row={row} />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <Input className="h-8 w-40 text-xs" type="date" value={row.date} onChange={(e) => update(row._id, { date: e.target.value })} />
                  <div className="flex"><Actions row={row} /></div>
                </div>
              </div>
            </div>
          ))}

          <Button variant="outline" size="sm" onClick={addRow} className="mt-2 w-full gap-1.5">
            <Plus className="h-3.5 w-3.5" /> Add Row
          </Button>
        </div>

        <SheetFooter className="mt-6 flex flex-row items-center justify-between gap-2 sm:justify-between">
          <span className="text-xs text-muted-foreground">{readyCount} of {rows.length} rows ready</span>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
            <Button onClick={() => void saveAll()} disabled={saving || readyCount === 0}>
              {saving && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {saving ? "Saving…" : `Save ${readyCount} Transaction${readyCount === 1 ? "" : "s"}`}
            </Button>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
