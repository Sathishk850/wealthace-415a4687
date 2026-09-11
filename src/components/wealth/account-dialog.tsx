import { useEffect, useMemo, useState } from "react";
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
import { Switch } from "@/components/ui/switch";
import { DatePicker } from "@/components/ui/date-picker";
import { ProviderCombobox } from "@/components/wealth/provider-combobox";
import type { ProviderKind } from "@/lib/account-providers";
import {
  Banknote, CreditCard, Landmark, LineChart, PiggyBank, Wallet,
} from "lucide-react";

import { toast } from "sonner";
import {
  ACCOUNT_TYPES, normalizeAccountType, type Account, type AccountInput,
  type AccountType, useFamily, useUpsertAccount,
} from "@/lib/wealth-api";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: Account | null;
  defaultType?: AccountType;
};

const COLORS = [
  "#14D8CF", "#3B82F6", "#8B5CF6", "#10B981",
  "#F59E0B", "#F97316", "#EF4444", "#64748B",
];

const ICON_OPTIONS = [
  { value: "landmark", label: "Bank", Icon: Landmark },
  { value: "credit-card", label: "Card", Icon: CreditCard },
  { value: "banknote", label: "Cash", Icon: Banknote },
  { value: "wallet", label: "Wallet", Icon: Wallet },
  { value: "line-chart", label: "Broker", Icon: LineChart },
  { value: "piggy-bank", label: "Savings", Icon: PiggyBank },
];

/** Per-type field configuration — one shared shell, type-specific fields. */
type Spec = {
  providerLabel?: string;
  providerKind?: ProviderKind;
  providerFreeText?: boolean;
  showLast4?: boolean;
  last4Label?: string;
  showIfsc?: boolean;
  showOpeningBalance?: boolean;
  showCreditLimit?: boolean;
  balanceLabel: string;
  balanceAsOfLabel: string;
  showEmergency?: boolean;
  namePlaceholder: string;
  defaultIcon: string;
};

const SPECS: Record<AccountType, Spec> = {
  "Bank Account": {
    providerLabel: "Bank",
    providerKind: "bank",
    showLast4: true,
    last4Label: "Last 4",
    showIfsc: true,
    showOpeningBalance: true,
    balanceLabel: "Current Balance",
    balanceAsOfLabel: "Balance as of",
    showEmergency: true,
    namePlaceholder: "e.g. HDFC Savings",
    defaultIcon: "landmark",
  },
  "Credit Card": {
    providerLabel: "Issuer",
    providerKind: "card",
    showLast4: true,
    last4Label: "Last 4",
    showCreditLimit: true,
    balanceLabel: "Current Outstanding",
    balanceAsOfLabel: "Statement / Balance as of",
    namePlaceholder: "e.g. Amazon Pay ICICI",
    defaultIcon: "credit-card",
  },
  Cash: {
    balanceLabel: "Amount on hand",
    balanceAsOfLabel: "Balance as of",
    showEmergency: true,
    namePlaceholder: "Cash in Hand",
    defaultIcon: "banknote",
  },
  Wallet: {
    providerLabel: "Wallet / UPI app",
    providerKind: "wallet",
    balanceLabel: "Balance",
    balanceAsOfLabel: "Balance as of",
    namePlaceholder: "e.g. Amazon Pay Wallet",
    defaultIcon: "wallet",
  },
  Broker: {
    providerLabel: "Broker",
    providerKind: "broker",
    showLast4: true,
    last4Label: "Client / Demat ID (masked)",
    balanceLabel: "Uninvested cash balance",
    balanceAsOfLabel: "Balance as of",
    namePlaceholder: "e.g. Zerodha Equity",
    defaultIcon: "line-chart",
  },
  Other: {
    providerLabel: "Provider",
    providerFreeText: true,
    balanceLabel: "Balance",
    balanceAsOfLabel: "Balance as of",
    namePlaceholder: "e.g. Employer PF portal",
    defaultIcon: "piggy-bank",
  },
};

const emptyFor = (t: AccountType = "Bank Account"): AccountInput => ({
  name: t === "Cash" ? "Cash in Hand" : "",
  account_type: t,
  provider: "",
  account_number_masked: "",
  ifsc: "",
  balance: 0,
  currency: "INR",
  owner_member_id: null,
  status: "active",
  notes: "",
  color: COLORS[0],
  icon: SPECS[t].defaultIcon,
  is_default: false,
  is_emergency_fund: false,
  credit_limit: null,
  opening_balance: null,
  balance_as_of: null,
});

export function AccountDialog({ open, onOpenChange, existing, defaultType }: Props) {
  const [form, setForm] = useState<AccountInput>(emptyFor(defaultType));
  const upsert = useUpsertAccount();
  const { data: members = [] } = useFamily();

  useEffect(() => {
    if (!open) return;
    setForm(
      existing
        ? {
            id: existing.id,
            name: existing.name,
            account_type: normalizeAccountType(existing.account_type),
            provider: existing.provider ?? "",
            account_number_masked: existing.account_number_masked ?? "",
            ifsc: existing.ifsc ?? "",
            balance: existing.balance,
            currency: existing.currency ?? "INR",
            owner_member_id: existing.owner_member_id,
            status: existing.status,
            notes: existing.notes ?? "",
            color: existing.color ?? COLORS[0],
            icon:
              existing.icon ??
              SPECS[normalizeAccountType(existing.account_type)].defaultIcon,
            is_default: existing.is_default,
            is_emergency_fund: existing.is_emergency_fund,
            credit_limit: existing.credit_limit,
            opening_balance: existing.opening_balance,
            balance_as_of: existing.balance_as_of,
          }
        : emptyFor(defaultType),
    );
  }, [open, existing, defaultType]);

  const type = normalizeAccountType(form.account_type);
  const spec = useMemo(() => SPECS[type], [type]);

  const set = <K extends keyof AccountInput>(k: K, v: AccountInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const submit = async (keepOpen = false) => {
    if (!form.name.trim()) return toast.error("Account name is required");
    try {
      await upsert.mutateAsync({ ...form, account_type: type });
      if (keepOpen && !existing) setForm(emptyFor(type));
      else onOpenChange(false);
    } catch {
      /* hook toast */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Account" : "Add Account"}</DialogTitle>
          <DialogDescription>
            Track bank accounts, cards, cash, wallets and broker accounts in one place.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Type *">
            <Select
              value={type}
              onValueChange={(v) =>
                setForm((f) => ({
                  ...f,
                  account_type: v,
                  name: existing ? f.name : v === "Cash" ? "Cash in Hand" : f.name,
                  provider: existing ? f.provider : "",
                  icon: SPECS[v as AccountType].defaultIcon,
                }))
              }
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>

          <Field label="Name *">
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={spec.namePlaceholder}
              maxLength={160}
            />
          </Field>

          {spec.providerLabel && (
            <Field label={spec.providerLabel} className="sm:col-span-2">
              {spec.providerFreeText ? (
                <Input
                  value={form.provider ?? ""}
                  onChange={(e) => set("provider", e.target.value)}
                  placeholder="Provider name"
                />
              ) : (
                <ProviderCombobox
                  value={form.provider ?? ""}
                  onChange={(v) => set("provider", v)}
                  kind={spec.providerKind}
                  placeholder={`Search ${spec.providerLabel.toLowerCase()}…`}
                />
              )}
            </Field>
          )}

          {spec.showLast4 && (
            <Field label={spec.last4Label ?? "Last 4"}>
              <Input
                value={form.account_number_masked ?? ""}
                onChange={(e) => set("account_number_masked", e.target.value)}
                placeholder="1234"
                maxLength={24}
              />
            </Field>
          )}

          {spec.showIfsc && (
            <Field label="IFSC / Branch code">
              <Input
                value={form.ifsc ?? ""}
                onChange={(e) => set("ifsc", e.target.value.toUpperCase())}
              />
            </Field>
          )}

          {spec.showOpeningBalance && (
            <Field label="Opening Balance">
              <Input
                type="number" step="0.01"
                value={form.opening_balance ?? ""}
                onChange={(e) =>
                  set("opening_balance", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </Field>
          )}

          {spec.showCreditLimit && (
            <Field label="Credit Limit">
              <Input
                type="number" step="0.01"
                value={form.credit_limit ?? ""}
                onChange={(e) =>
                  set("credit_limit", e.target.value === "" ? null : Number(e.target.value))
                }
              />
            </Field>
          )}

          <Field label={`${spec.balanceLabel} *`}>
            <Input
              type="number" step="0.01"
              value={form.balance || ""}
              onChange={(e) => set("balance", Number(e.target.value))}
            />
          </Field>

          <Field label="Currency">
            <Input
              value={form.currency ?? "INR"}
              onChange={(e) => set("currency", e.target.value.toUpperCase())}
              maxLength={3}
            />
          </Field>

          <Field label={spec.balanceAsOfLabel}>
            <DatePicker
              value={form.balance_as_of ?? ""}
              onChange={(v) => set("balance_as_of", v || null)}
            />
          </Field>

          <Field label="Owner">
            <Select
              value={form.owner_member_id ?? "self"}
              onValueChange={(v) => set("owner_member_id", v === "self" ? null : v)}
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
            <Select value={form.status ?? "active"} onValueChange={(v) => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </Field>

          <Field label="Colour">
            <div className="flex flex-wrap items-center gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  aria-label={`Colour ${c}`}
                  onClick={() => set("color", c)}
                  className={`h-7 w-7 rounded-full border-2 transition ${
                    form.color === c ? "border-foreground" : "border-transparent"
                  }`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </Field>

          <Field label="Icon">
            <div className="flex flex-wrap items-center gap-2">
              {ICON_OPTIONS.map(({ value, label, Icon }) => (
                <button
                  key={value}
                  type="button"
                  aria-label={label}
                  title={label}
                  onClick={() => set("icon", value)}
                  className={`grid h-9 w-9 place-items-center rounded-lg border transition ${
                    form.icon === value
                      ? "border-mint bg-mint/10 text-mint"
                      : "border-border bg-surface-2 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </Field>

          {spec.showEmergency && (
            <ToggleRow
              className="sm:col-span-2"
              label="Part of emergency fund"
              helper="Counts this balance towards your emergency fund coverage."
              checked={!!form.is_emergency_fund}
              onChange={(v) => set("is_emergency_fund", v)}
            />
          )}

          <ToggleRow
            className="sm:col-span-2"
            label="Set as default account"
            helper="Pre-selected when recording payments and new holdings."
            checked={!!form.is_default}
            onChange={(v) => set("is_default", v)}
          />

          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upsert.isPending}>Cancel</Button>
          {!existing && (
            <Button variant="outline" onClick={() => submit(true)} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving…" : "Save & Add"}
            </Button>
          )}
          <Button
            className="bg-mint text-[#04121C] hover:brightness-110"
            onClick={() => submit(false)}
            disabled={upsert.isPending}
          >
            {upsert.isPending ? "Saving…" : "Save"}
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

function ToggleRow({
  label, helper, checked, onChange, className,
}: {
  label: string;
  helper?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5 ${className ?? ""}`}>
      <div className="min-w-0">
        <div className="text-sm font-medium text-foreground">{label}</div>
        {helper && <div className="text-[11px] text-muted-foreground">{helper}</div>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
