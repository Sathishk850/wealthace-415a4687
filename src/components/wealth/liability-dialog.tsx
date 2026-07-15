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
import { ClearButton, isDirty } from "@/components/clear-button";
import { PaymentFields } from "@/components/payment/payment-fields";
import { commitStagedPaymentPreferences } from "@/lib/user-payment-prefs-api";
import { toast } from "sonner";
import {
  LIABILITY_CATEGORIES,
  type Liability,
  type LiabilityInput,
  useUpsertLiability,
} from "@/lib/wealth-api";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: Liability | null;
};

const empty: LiabilityInput = {
  name: "",
  category: "Home Loan",
  lender: "",
  principal: null,
  outstanding: 0,
  emi: null,
  interest_rate: null,
  tenure_months: null,
  start_date: null,
  end_date: null,
  due_date: null,
  status: "active",
  notes: "",
  payment_mode: null,
  payment_account_id: null,
};

export function LiabilityDialog({ open, onOpenChange, existing }: Props) {
  const [form, setForm] = useState<LiabilityInput>(empty);
  const upsert = useUpsertLiability();

  useEffect(() => {
    if (open) {
      setForm(
        existing
          ? {
              id: existing.id,
              name: existing.name,
              category: existing.category,
              lender: existing.lender ?? "",
              principal: existing.principal,
              outstanding: existing.outstanding,
              emi: existing.emi,
              interest_rate: existing.interest_rate,
              tenure_months: existing.tenure_months,
              start_date: existing.start_date,
              end_date: existing.end_date,
              due_date: existing.due_date,
              status: existing.status,
              notes: existing.notes ?? "",
              payment_mode: existing.payment_mode,
              payment_account_id: existing.payment_account_id,
            }
          : empty,
      );
    }
  }, [open, existing]);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Name is required");
    if (!form.category) return toast.error("Category is required");
    if (Number(form.outstanding) < 0)
      return toast.error("Outstanding cannot be negative");
    try {
      await upsert.mutateAsync({
        ...form,
        outstanding: Number(form.outstanding),
      });
      void commitStagedPaymentPreferences();
      onOpenChange(false);
    } catch {
      /* toast handled */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Liability" : "Add Liability"}</DialogTitle>
          <DialogDescription>
            Track loans, EMIs and credit balances. Totals update automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name *" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Home Loan - SBI"
              maxLength={120}
            />
          </Field>
          <Field label="Category *">
            <Select
              value={form.category}
              onValueChange={(v) => setForm({ ...form, category: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LIABILITY_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Lender">
            <Input
              value={form.lender ?? ""}
              onChange={(e) => setForm({ ...form, lender: e.target.value })}
              placeholder="e.g. SBI Bank"
            />
          </Field>
          <Field label="Outstanding (₹) *">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.outstanding || ""}
              onChange={(e) =>
                setForm({ ...form, outstanding: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Principal (₹)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.principal ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  principal: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="EMI (₹ / month)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.emi ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  emi: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Interest rate (%)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.interest_rate ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  interest_rate: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Tenure (months)">
            <Input
              type="number"
              min={0}
              step="1"
              value={form.tenure_months ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  tenure_months: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Start date">
            <Input
              type="date"
              value={form.start_date ?? ""}
              onChange={(e) =>
                setForm({ ...form, start_date: e.target.value || null })
              }
            />
          </Field>
          <Field label="Next due date">
            <Input
              type="date"
              value={form.due_date ?? ""}
              onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
            />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              value={form.end_date ?? ""}
              onChange={(e) =>
                setForm({ ...form, end_date: e.target.value || null })
              }
            />
          </Field>
          <Field label="Status">
            <Select
              value={form.status ?? "active"}
              onValueChange={(v) => setForm({ ...form, status: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="due_soon">Due Soon</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>

        <div className="mt-3 border-t border-border pt-3">
          <div className="mb-2 text-xs font-medium text-muted-foreground">
            EMI / Payment source
          </div>
          <PaymentFields
            compact
            required={false}
            value={{
              payment_mode: form.payment_mode ?? null,
              payment_account_id: form.payment_account_id ?? null,
            }}
            onChange={(v) =>
              setForm({
                ...form,
                payment_mode: v.payment_mode,
                payment_account_id: v.payment_account_id,
              })
            }
          />
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upsert.isPending}>
            Cancel
          </Button>
          <ClearButton
            dirty={isDirty(form as unknown as Record<string, unknown>, empty as unknown as Record<string, unknown>)}
            disabled={upsert.isPending}
            onClear={() => setForm(empty)}
          />
          <Button
            className="bg-mint text-[#04121C] hover:brightness-110"
            onClick={submit}
            disabled={upsert.isPending}
          >
            {upsert.isPending ? "Saving…" : existing ? "Save changes" : "Add liability"}
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