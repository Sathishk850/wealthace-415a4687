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
import { toast } from "sonner";
import {
  INSURANCE_TYPES,
  type Insurance,
  type InsuranceInput,
  useUpsertInsurance,
} from "@/lib/wealth-api";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: Insurance | null;
};

const empty: InsuranceInput = {
  policy_name: "",
  policy_number: "",
  policy_type: "Term Life",
  provider: "",
  coverage_amount: 0,
  premium_amount: null,
  premium_frequency: "yearly",
  start_date: null,
  renewal_date: null,
  end_date: null,
  status: "active",
  notes: "",
  payment_mode: null,
  payment_account_id: null,
};

export function InsuranceDialog({ open, onOpenChange, existing }: Props) {
  const [form, setForm] = useState<InsuranceInput>(empty);
  const upsert = useUpsertInsurance();

  useEffect(() => {
    if (!open) return;
    setForm(
      existing
        ? {
            id: existing.id,
            policy_name: existing.policy_name,
            policy_number: existing.policy_number ?? "",
            policy_type: existing.policy_type,
            provider: existing.provider ?? "",
            coverage_amount: existing.coverage_amount,
            premium_amount: existing.premium_amount,
            premium_frequency: existing.premium_frequency ?? "yearly",
            start_date: existing.start_date,
            renewal_date: existing.renewal_date,
            end_date: existing.end_date,
            status: existing.status,
            notes: existing.notes ?? "",
            payment_mode: existing.payment_mode,
            payment_account_id: existing.payment_account_id,
          }
        : empty,
    );
  }, [open, existing]);

  const submit = async () => {
    if (!form.policy_name.trim()) return toast.error("Policy name is required");
    if (Number(form.coverage_amount) < 0) return toast.error("Coverage cannot be negative");
    try {
      await upsert.mutateAsync(form);
      onOpenChange(false);
    } catch {
      /* hook toast */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Policy" : "Add Insurance Policy"}</DialogTitle>
          <DialogDescription>
            Track coverage, premiums and renewals. Renewal reminders update automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Policy name *" className="sm:col-span-2">
            <Input
              value={form.policy_name}
              onChange={(e) => setForm({ ...form, policy_name: e.target.value })}
              placeholder="e.g. HDFC Life Click 2 Protect"
              maxLength={160}
            />
          </Field>
          <Field label="Type *">
            <Select value={form.policy_type} onValueChange={(v) => setForm({ ...form, policy_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INSURANCE_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Provider">
            <Input
              value={form.provider ?? ""}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              placeholder="e.g. HDFC Life"
            />
          </Field>
          <Field label="Policy number">
            <Input
              value={form.policy_number ?? ""}
              onChange={(e) => setForm({ ...form, policy_number: e.target.value })}
            />
          </Field>
          <Field label="Coverage amount (₹) *">
            <Input
              type="number" min={0} step="0.01"
              value={form.coverage_amount ?? ""}
              onChange={(e) => setForm({ ...form, coverage_amount: Number(e.target.value) })}
            />
          </Field>
          <Field label="Premium amount (₹)">
            <Input
              type="number" min={0} step="0.01"
              value={form.premium_amount ?? ""}
              onChange={(e) =>
                setForm({ ...form, premium_amount: e.target.value === "" ? null : Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Premium frequency">
            <Select
              value={form.premium_frequency ?? "yearly"}
              onValueChange={(v) => setForm({ ...form, premium_frequency: v })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="monthly">Monthly</SelectItem>
                <SelectItem value="quarterly">Quarterly</SelectItem>
                <SelectItem value="half_yearly">Half-yearly</SelectItem>
                <SelectItem value="yearly">Yearly</SelectItem>
                <SelectItem value="single">Single premium</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Start date">
            <Input
              type="date"
              value={form.start_date ?? ""}
              onChange={(e) => setForm({ ...form, start_date: e.target.value || null })}
            />
          </Field>
          <Field label="Renewal date">
            <Input
              type="date"
              value={form.renewal_date ?? ""}
              onChange={(e) => setForm({ ...form, renewal_date: e.target.value || null })}
            />
          </Field>
          <Field label="End date">
            <Input
              type="date"
              value={form.end_date ?? ""}
              onChange={(e) => setForm({ ...form, end_date: e.target.value || null })}
            />
          </Field>
          <Field label="Status">
            <Select value={form.status ?? "active"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="lapsed">Lapsed</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
                <SelectItem value="surrendered">Surrendered</SelectItem>
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
            {upsert.isPending ? "Saving…" : existing ? "Save changes" : "Add policy"}
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