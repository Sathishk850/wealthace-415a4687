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
import { toast } from "sonner";
import { ClearButton, isDirty } from "@/components/clear-button";
import { PaymentFields } from "@/components/payment/payment-fields";
import { commitStagedPaymentPreferences } from "@/lib/user-payment-prefs-api";
import {
  ASSET_CATEGORIES,
  type Asset,
  type AssetInput,
  useUpsertAsset,
} from "@/lib/wealth-api";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: Asset | null;
};

const empty: AssetInput = {
  name: "",
  category: "Cash",
  sub_category: "",
  current_value: 0,
  purchase_value: null,
  purchase_date: null,
  quantity: null,
  unit: "",
  location: "",
  notes: "",
  status: "active",
  payment_mode: null,
  payment_account_id: null,
};

export function AssetDialog({ open, onOpenChange, existing }: Props) {
  const [form, setForm] = useState<AssetInput>(empty);
  const upsert = useUpsertAsset();

  useEffect(() => {
    if (open) {
      setForm(
        existing
          ? {
              id: existing.id,
              name: existing.name,
              category: existing.category,
              sub_category: existing.sub_category ?? "",
              current_value: existing.current_value,
              purchase_value: existing.purchase_value,
              purchase_date: existing.purchase_date,
              quantity: existing.quantity,
              unit: existing.unit ?? "",
              location: existing.location ?? "",
              notes: existing.notes ?? "",
              status: existing.status,
              last_updated: existing.last_updated,
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
    if (Number.isNaN(Number(form.current_value)) || Number(form.current_value) < 0)
      return toast.error("Current value must be a non-negative number");
    try {
      await upsert.mutateAsync({
        ...form,
        current_value: Number(form.current_value),
      });
      void commitStagedPaymentPreferences();
      onOpenChange(false);
    } catch {
      /* toast handled in hook */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Asset" : "Add Asset"}</DialogTitle>
          <DialogDescription>
            Track an asset you own. Total Assets updates automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name *" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Residential House"
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
                {ASSET_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Sub-category">
            <Input
              value={form.sub_category ?? ""}
              onChange={(e) => setForm({ ...form, sub_category: e.target.value })}
              placeholder="e.g. Apartment"
            />
          </Field>
          <Field label="Current value (₹) *">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.current_value || ""}
              onChange={(e) =>
                setForm({ ...form, current_value: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Purchase value (₹)">
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.purchase_value ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  purchase_value: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Purchase date">
            <Input
              type="date"
              value={form.purchase_date ?? ""}
              onChange={(e) =>
                setForm({ ...form, purchase_date: e.target.value || null })
              }
            />
          </Field>
          <Field label="Quantity">
            <Input
              type="number"
              step="0.0001"
              value={form.quantity ?? ""}
              onChange={(e) =>
                setForm({
                  ...form,
                  quantity: e.target.value === "" ? null : Number(e.target.value),
                })
              }
            />
          </Field>
          <Field label="Unit">
            <Input
              value={form.unit ?? ""}
              onChange={(e) => setForm({ ...form, unit: e.target.value })}
              placeholder="e.g. grams, units"
            />
          </Field>
          <Field label="Location">
            <Input
              value={form.location ?? ""}
              onChange={(e) => setForm({ ...form, location: e.target.value })}
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
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
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
            Purchase payment (optional for existing assets)
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
            {upsert.isPending ? "Saving…" : existing ? "Save changes" : "Add asset"}
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