import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  INVESTMENT_CATEGORIES,
  type Investment,
  type InvestmentInput,
  useUpsertInvestment,
} from "@/lib/wealth-api";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: Investment | null;
};

const empty: InvestmentInput = {
  name: "",
  symbol: "",
  category: "Mutual Funds",
  sub_category: "",
  quantity: 0,
  avg_price: 0,
  current_price: 0,
  purchase_date: null,
  is_sip: false,
  sip_amount: null,
  sip_frequency: "monthly",
  sip_start_date: null,
  sip_next_date: null,
  sip_active: true,
  notes: "",
  status: "active",
};

export function InvestmentDialog({ open, onOpenChange, existing }: Props) {
  const [form, setForm] = useState<InvestmentInput>(empty);
  const upsert = useUpsertInvestment();

  useEffect(() => {
    if (!open) return;
    setForm(
      existing
        ? {
            id: existing.id,
            name: existing.name,
            symbol: existing.symbol ?? "",
            category: existing.category,
            sub_category: existing.sub_category ?? "",
            quantity: existing.quantity,
            avg_price: existing.avg_price,
            current_price: existing.current_price,
            purchase_date: existing.purchase_date,
            is_sip: existing.is_sip,
            sip_amount: existing.sip_amount,
            sip_frequency: existing.sip_frequency ?? "monthly",
            sip_start_date: existing.sip_start_date,
            sip_next_date: existing.sip_next_date,
            sip_active: existing.sip_active ?? true,
            notes: existing.notes ?? "",
            status: existing.status,
          }
        : empty,
    );
  }, [open, existing]);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (Number(form.quantity) < 0) return toast.error("Quantity cannot be negative");
    if (Number(form.avg_price) < 0 || Number(form.current_price) < 0)
      return toast.error("Prices cannot be negative");
    try {
      await upsert.mutateAsync(form);
      onOpenChange(false);
    } catch {
      /* hook toast */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Investment" : "Add Investment"}</DialogTitle>
          <DialogDescription>
            Stocks, mutual funds, ETFs and more. P&amp;L and XIRR update automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name *" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Parag Parikh Flexi Cap"
              maxLength={160}
            />
          </Field>
          <Field label="Category *">
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INVESTMENT_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sub-category / Plan">
            <Input
              value={form.sub_category ?? ""}
              onChange={(e) => setForm({ ...form, sub_category: e.target.value })}
              placeholder="e.g. Direct Growth"
            />
          </Field>
          <Field label="Symbol / Ticker">
            <Input
              value={form.symbol ?? ""}
              onChange={(e) => setForm({ ...form, symbol: e.target.value })}
              placeholder="e.g. HDFCBANK"
            />
          </Field>
          <Field label="Purchase date">
            <Input
              type="date"
              value={form.purchase_date ?? ""}
              onChange={(e) => setForm({ ...form, purchase_date: e.target.value || null })}
            />
          </Field>
          <Field label="Quantity *">
            <Input
              type="number" min={0} step="0.0001"
              value={form.quantity ?? ""}
              onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
            />
          </Field>
          <Field label="Avg buy price (₹) *">
            <Input
              type="number" min={0} step="0.01"
              value={form.avg_price ?? ""}
              onChange={(e) => setForm({ ...form, avg_price: Number(e.target.value) })}
            />
          </Field>
          <Field label="Current price (₹) *">
            <Input
              type="number" min={0} step="0.01"
              value={form.current_price ?? ""}
              onChange={(e) => setForm({ ...form, current_price: Number(e.target.value) })}
            />
          </Field>
          <Field label="Status">
            <Select value={form.status ?? "active"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="matured">Matured</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <div className="rounded-xl border border-border bg-surface-2/40 p-3 sm:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-foreground">SIP tracking</div>
                <div className="text-[11px] text-muted-foreground">
                  Track recurring contributions to this investment.
                </div>
              </div>
              <Switch
                checked={!!form.is_sip}
                onCheckedChange={(v) => setForm({ ...form, is_sip: v, sip_active: v ? true : false })}
              />
            </div>
            {form.is_sip && (
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field label="SIP amount (₹)">
                  <Input
                    type="number" min={0} step="0.01"
                    value={form.sip_amount ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, sip_amount: e.target.value === "" ? null : Number(e.target.value) })
                    }
                  />
                </Field>
                <Field label="Frequency">
                  <Select
                    value={form.sip_frequency ?? "monthly"}
                    onValueChange={(v) => setForm({ ...form, sip_frequency: v })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Start date">
                  <Input
                    type="date"
                    value={form.sip_start_date ?? ""}
                    onChange={(e) => setForm({ ...form, sip_start_date: e.target.value || null })}
                  />
                </Field>
                <Field label="Next debit date">
                  <Input
                    type="date"
                    value={form.sip_next_date ?? ""}
                    onChange={(e) => setForm({ ...form, sip_next_date: e.target.value || null })}
                  />
                </Field>
                <Field label="SIP active" className="sm:col-span-2">
                  <Select
                    value={form.sip_active ? "active" : "paused"}
                    onValueChange={(v) => setForm({ ...form, sip_active: v === "active" })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="paused">Paused</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
              </div>
            )}
          </div>

          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upsert.isPending}>
            Cancel
          </Button>
          <Button
            className="bg-mint text-[#04121C] hover:brightness-110"
            onClick={submit}
            disabled={upsert.isPending}
          >
            {upsert.isPending ? "Saving…" : existing ? "Save changes" : "Add investment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {children}
    </div>
  );
}