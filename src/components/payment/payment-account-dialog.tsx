import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import {
  ACCOUNT_PRESETS,
  PAYMENT_ACCOUNT_TYPES,
  paymentAccountKeys,
  useUpsertPaymentAccount,
  type PaymentAccount,
  type PaymentAccountInput,
  type PaymentAccountType,
} from "@/lib/payment-accounts-api";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: PaymentAccount | null;
  defaultType?: PaymentAccountType;
  /** Called with the new account's id once inserted. */
  onCreated?: (id: string) => void;
};

const emptyFor = (t: PaymentAccountType = "bank"): PaymentAccountInput => ({
  name: "",
  account_type: t,
  institution: "",
  last4: "",
  color: "",
  icon: "",
  is_active: true,
  is_default: false,
  notes: "",
});

export function PaymentAccountDialog({
  open,
  onOpenChange,
  existing,
  defaultType,
  onCreated,
}: Props) {
  const [form, setForm] = useState<PaymentAccountInput>(emptyFor(defaultType));
  const upsert = useUpsertPaymentAccount();
  const qc = useQueryClient();

  useEffect(() => {
    if (!open) return;
    if (existing) {
      setForm({
        id: existing.id,
        name: existing.name,
        account_type: existing.account_type,
        institution: existing.institution ?? "",
        last4: existing.last4 ?? "",
        color: existing.color ?? "",
        icon: existing.icon ?? "",
        is_active: existing.is_active,
        is_default: existing.is_default,
        notes: existing.notes ?? "",
      });
    } else {
      setForm(emptyFor(defaultType));
    }
  }, [open, existing, defaultType]);

  const presets = useMemo(
    () =>
      ACCOUNT_PRESETS.find((p) => p.type === form.account_type)?.items ?? [],
    [form.account_type],
  );

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Account name is required");
    try {
      if (form.id) {
        await upsert.mutateAsync(form);
        onOpenChange(false);
        return;
      }
      // Insert directly so we can return the new id to callers.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      if (form.is_default) {
        await supabase
          .from("payment_accounts" as never)
          .update({ is_default: false } as never)
          .eq("user_id", user.id)
          .eq("is_default", true);
      }
      const { data, error } = await supabase
        .from("payment_accounts" as never)
        .insert({
          user_id: user.id,
          name: form.name.trim(),
          account_type: form.account_type,
          institution: form.institution?.trim() || null,
          last4: form.last4?.trim() || null,
          color: form.color || null,
          icon: form.icon || null,
          is_active: form.is_active ?? true,
          is_default: form.is_default ?? false,
          notes: form.notes?.trim() || null,
        } as never)
        .select("id")
        .single();
      if (error) throw error;
      toast.success("Payment account added");
      qc.invalidateQueries({ queryKey: paymentAccountKeys.all });
      onCreated?.((data as { id: string }).id);
      onOpenChange(false);
    } catch (e) {
      toast.error((e as Error).message || "Failed to save account");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {existing ? "Edit Payment Account" : "Add Payment Account"}
          </DialogTitle>
          <DialogDescription>
            Bank, card, wallet or UPI app used to pay bills, EMIs, expenses and
            investments.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs">Account type *</Label>
            <Select
              value={form.account_type}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  account_type: v as PaymentAccountType,
                  name: existing ? f.name : "",
                  institution: existing ? f.institution : "",
                }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!existing && presets.length > 0 && (
            <div className="sm:col-span-2">
              <Label className="mb-1.5 block text-xs">
                Quick-add suggestions
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {presets.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() =>
                      setForm((f) => ({
                        ...f,
                        name: p.name,
                        institution: p.institution ?? f.institution ?? "",
                      }))
                    }
                    className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-foreground hover:border-mint/40 hover:text-mint"
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="sm:col-span-2">
            <Label className="mb-1.5 block text-xs">Account name *</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. HDFC Savings"
              maxLength={80}
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Institution</Label>
            <Input
              value={form.institution ?? ""}
              onChange={(e) =>
                setForm({ ...form, institution: e.target.value })
              }
              placeholder="e.g. HDFC Bank"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Last 4 digits</Label>
            <Input
              value={form.last4 ?? ""}
              onChange={(e) => setForm({ ...form, last4: e.target.value })}
              maxLength={4}
              inputMode="numeric"
              placeholder="1234"
            />
          </div>

          <div>
            <Label className="mb-1.5 block text-xs">Colour</Label>
            <Input
              type="color"
              value={form.color || "#22C55E"}
              onChange={(e) => setForm({ ...form, color: e.target.value })}
              className="h-10"
            />
          </div>
          <div>
            <Label className="mb-1.5 block text-xs">Icon (name)</Label>
            <Input
              value={form.icon ?? ""}
              onChange={(e) => setForm({ ...form, icon: e.target.value })}
              placeholder="Wallet"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Active</div>
              <div className="text-[11px] text-muted-foreground">
                Inactive accounts are hidden from the Paid From picker.
              </div>
            </div>
            <Switch
              checked={form.is_active ?? true}
              onCheckedChange={(v) => setForm({ ...form, is_active: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <div className="text-sm font-medium">Default</div>
              <div className="text-[11px] text-muted-foreground">
                Preselected in outflow forms.
              </div>
            </div>
            <Switch
              checked={form.is_default ?? false}
              onCheckedChange={(v) => setForm({ ...form, is_default: v })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={upsert.isPending}
          >
            Cancel
          </Button>
          <Button
            className="bg-mint text-[#04121C] hover:brightness-110"
            onClick={submit}
            disabled={upsert.isPending}
          >
            {upsert.isPending
              ? "Saving…"
              : existing
                ? "Save changes"
                : "Add account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}