import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  ACCOUNT_TYPES, type Account, type AccountInput, useFamily, useUpsertAccount,
} from "@/lib/wealth-api";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: Account | null;
};

const empty: AccountInput = {
  name: "",
  account_type: "Bank Account",
  provider: "",
  account_number_masked: "",
  ifsc: "",
  balance: 0,
  currency: "INR",
  owner_member_id: null,
  status: "active",
  notes: "",
};

export function AccountDialog({ open, onOpenChange, existing }: Props) {
  const [form, setForm] = useState<AccountInput>(empty);
  const upsert = useUpsertAccount();
  const { data: members = [] } = useFamily();

  useEffect(() => {
    if (!open) return;
    setForm(
      existing
        ? {
            id: existing.id,
            name: existing.name,
            account_type: existing.account_type,
            provider: existing.provider ?? "",
            account_number_masked: existing.account_number_masked ?? "",
            ifsc: existing.ifsc ?? "",
            balance: existing.balance,
            currency: existing.currency ?? "INR",
            owner_member_id: existing.owner_member_id,
            status: existing.status,
            notes: existing.notes ?? "",
          }
        : empty,
    );
  }, [open, existing]);

  const submit = async () => {
    if (!form.name.trim()) return toast.error("Account name is required");
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
          <DialogTitle>{existing ? "Edit Account" : "Add Account"}</DialogTitle>
          <DialogDescription>
            Track bank accounts, cards, wallets and loans in one place.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Account name *" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. HDFC Savings"
              maxLength={160}
            />
          </Field>
          <Field label="Type *">
            <Select value={form.account_type} onValueChange={(v) => setForm({ ...form, account_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Provider / Bank">
            <Input
              value={form.provider ?? ""}
              onChange={(e) => setForm({ ...form, provider: e.target.value })}
              placeholder="e.g. HDFC Bank"
            />
          </Field>
          <Field label="Account number (masked)">
            <Input
              value={form.account_number_masked ?? ""}
              onChange={(e) => setForm({ ...form, account_number_masked: e.target.value })}
              placeholder="**** 1234"
            />
          </Field>
          <Field label="IFSC / Branch code">
            <Input
              value={form.ifsc ?? ""}
              onChange={(e) => setForm({ ...form, ifsc: e.target.value.toUpperCase() })}
            />
          </Field>
          <Field label="Balance (₹) *">
            <Input
              type="number" step="0.01"
              value={form.balance ?? ""}
              onChange={(e) => setForm({ ...form, balance: Number(e.target.value) })}
            />
          </Field>
          <Field label="Currency">
            <Input
              value={form.currency ?? "INR"}
              onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })}
              maxLength={3}
            />
          </Field>
          <Field label="Owner">
            <Select
              value={form.owner_member_id ?? "self"}
              onValueChange={(v) => setForm({ ...form, owner_member_id: v === "self" ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Self" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="self">Self</SelectItem>
                {members.map((m) => (
                  <SelectItem key={m.id} value={m.id}>{m.name} ({m.relationship})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={form.status ?? "active"} onValueChange={(v) => setForm({ ...form, status: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
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

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upsert.isPending}>Cancel</Button>
          <Button
            className="bg-mint text-[#04121C] hover:brightness-110"
            onClick={submit}
            disabled={upsert.isPending}
          >
            {upsert.isPending ? "Saving…" : existing ? "Save changes" : "Add account"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {children}
    </div>
  );
}