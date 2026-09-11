// Add Asset — one shared form shell driven by an asset-type spec.
// Every asset type renders the same sections (type banner, name + currency,
// held-in-account, current value, secondary value, details, flags, actions);
// only the asset-specific fields described in `asset-form-specs.ts` differ.

import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import * as LucideIcons from "lucide-react";
import { ArrowLeft, ChevronDown, ChevronUp, Search, X } from "lucide-react";
import { toast } from "sonner";

import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { AmountInput } from "@/components/ui/amount-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { InstrumentSearch } from "@/components/market/instrument-search";
import { AccountSelect } from "@/components/wealth/account-select";
import type { MarketQuote, SearchResult } from "@/lib/market/types";
import {
  assetFormSpec,
  assetTypeMeta,
  type AssetFormSpec,
  type FormField,
} from "@/lib/asset-form-specs";
import {
  CURRENCIES,
  CURRENCY_LABEL,
  CURRENCY_SYMBOL,
  useUpsertAsset,
  useUpsertInvestment,
  type Currency,
} from "@/lib/wealth-api";

const GEOGRAPHIES = ["India", "United States", "Europe", "Global", "Emerging Markets", "Other"];
const COMPOUNDING = ["Monthly", "Quarterly", "Half-yearly", "Yearly", "At maturity"];
const PAY_FREQUENCY = ["Monthly", "Quarterly", "Half-yearly", "Yearly"];
const EQUITY_SPLITS = [0, 25, 50, 75, 100];

type FormState = {
  name: string;
  currency: Currency;
  account: string;
  currentValue: string;
  quantity: string;
  price: string;
  secondary: string;
  geography: string;
  subClass: string;
  tags: string[];
  notes: string;
  excludeFromAllocation: boolean;
  emergencyFund: boolean;
  // Interest & maturity
  interestRate: string;
  compounding: string;
  investmentDate: string;
  maturityDate: string;
  autoUpdate: boolean;
  instalment: string;
  payFrequency: string;
  equityAllocation: number | null;
  // live-price link
  symbol: string | null;
  identifier: string | null;
  identifierType: string | null;
  exchange: string | null;
};

const EMPTY: FormState = {
  name: "",
  currency: "INR",
  account: "",
  currentValue: "",
  quantity: "",
  price: "",
  secondary: "",
  geography: "India",
  subClass: "",
  tags: [],
  notes: "",
  excludeFromAllocation: false,
  emergencyFund: false,
  interestRate: "",
  compounding: "Quarterly",
  investmentDate: "",
  maturityDate: "",
  autoUpdate: true,
  instalment: "",
  payFrequency: "Monthly",
  equityAllocation: null,
  symbol: null,
  identifier: null,
  identifierType: null,
  exchange: null,
};

const n = (v: string) => {
  const x = Number(String(v).replace(/,/g, ""));
  return Number.isFinite(x) ? x : 0;
};

function DynIcon({ name, className, color }: { name: string; className?: string; color?: string }) {
  const Icon = (LucideIcons as unknown as Record<string, LucideIcons.LucideIcon>)[name];
  const Fallback = LucideIcons.Boxes;
  const C = Icon ?? Fallback;
  return <C className={className} style={color ? { color } : undefined} />;
}

export function AddAssetForm({ typeKey }: { typeKey: string }) {
  const navigate = useNavigate();
  const spec = useMemo(() => assetFormSpec(typeKey), [typeKey]);
  const meta = assetTypeMeta(typeKey);
  const upsertInvestment = useUpsertInvestment();
  const upsertAsset = useUpsertAsset();
  const [form, setForm] = useState<FormState>(EMPTY);
  const [dyn, setDyn] = useState<Record<string, string | number>>({});
  const [showDetails, setShowDetails] = useState(false);
  const [tagDraft, setTagDraft] = useState("");

  const dynamicFields = spec?.fields ?? null;

  // Seed defaults (e.g. currency = INR) whenever the type changes.
  useEffect(() => {
    if (!dynamicFields) return;
    const seed: Record<string, string | number> = {};
    for (const f of dynamicFields) if (f.defaultValue != null) seed[f.key] = f.defaultValue;
    setDyn(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeKey]);

  const setDynField = (key: string, v: string | number) =>
    setDyn((d) => ({ ...d, [key]: v }));

  // Keep calculated fields in sync with their source fields.
  useEffect(() => {
    if (!dynamicFields) return;
    setDyn((d) => {
      let next: Record<string, string | number> | null = null;
      for (const f of dynamicFields) {
        if (!f.calculated || !f.calcFrom) continue;
        const a = n(String(d[f.calcFrom[0]] ?? ""));
        const b = n(String(d[f.calcFrom[1]] ?? ""));
        const val = f.calcOp === "subtract" ? a - b : a * b;
        const str = a === 0 && b === 0 ? "" : String(Number(val.toFixed(4)));
        if ((d[f.key] ?? "") !== str) {
          next = next ?? { ...d };
          next[f.key] = str;
        }
      }
      return next ?? d;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dyn, dynamicFields]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const qty = n(form.quantity);
  const price = n(form.price);
  const autoSecondary = !!spec?.secondary.auto && qty > 0 && price > 0;
  const secondaryValue = autoSecondary ? qty * price : n(form.secondary);

  // Keep the auto-calculated Total Invested in sync with quantity × price.
  useEffect(() => {
    if (!autoSecondary) return;
    const next = String(qty * price);
    setForm((f) => (f.secondary === next ? f : { ...f, secondary: next }));
  }, [autoSecondary, qty, price]);

  if (!spec) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-sm text-muted-foreground">
        Unknown asset type.
        <div className="mt-4">
          <Button variant="outline" onClick={() => navigate({ to: "/wealth" })}>
            Back to Wealth
          </Button>
        </div>
      </div>
    );
  }

  const sym = CURRENCY_SYMBOL[form.currency] ?? "₹";
  const pending = upsertInvestment.isPending || upsertAsset.isPending;

  const addTag = (raw: string) => {
    const t = raw.trim().replace(/,$/, "");
    if (!t) return;
    setForm((f) => (f.tags.includes(t) ? f : { ...f, tags: [...f.tags, t] }));
    setTagDraft("");
  };

  const onLinked = (r: SearchResult, quote?: MarketQuote | null) => {
    const live = quote?.latest_price ?? null;
    setForm((f) => ({
      ...f,
      name: r.name,
      symbol: r.identifier,
      identifier: r.identifier,
      identifierType: r.identifier_type,
      exchange: r.exchange ?? null,
      currency: ((quote?.currency as Currency) ?? (r.currency as Currency) ?? f.currency) as Currency,
      // Prefill the current value from the live CMP / NAV when we have units.
      currentValue:
        live != null && n(f.quantity) > 0 ? String(live * n(f.quantity)) : f.currentValue,
      price: live != null && !f.price ? String(live) : f.price,
    }));
  };

  const noteLines = () => {
    const lines: string[] = [];
    if (spec.accountField && form.account) lines.push(`Platform: ${form.account}`);
    if (form.geography) lines.push(`Geography: ${form.geography}`);
    if (form.subClass) lines.push(`Sub-class: ${form.subClass}`);
    if (form.tags.length) lines.push(`Tags: ${form.tags.join(", ")}`);
    if (form.excludeFromAllocation) lines.push("Excluded from allocation: yes");
    if (form.emergencyFund) lines.push("Emergency fund: yes");
    if (spec.equityAllocation && form.equityAllocation != null)
      lines.push(`Equity allocation: ${form.equityAllocation}%`);
    if (spec.interestSection) {
      if (form.interestRate) lines.push(`Interest rate: ${form.interestRate}%`);
      if (form.compounding) lines.push(`Compounding: ${form.compounding}`);
      if (form.autoUpdate) lines.push("Auto-update value: yes");
    }
    if (spec.recurring) {
      if (form.instalment) lines.push(`Instalment: ${form.instalment}`);
      if (form.payFrequency) lines.push(`Paid: ${form.payFrequency}`);
    }
    if (form.notes.trim()) lines.push("", form.notes.trim());
    return lines.join("\n");
  };

  const reset = () => {
    setForm(EMPTY);
    setTagDraft("");
    setShowDetails(false);
  };

  const submit = async (keepOpen = false) => {
    if (!form.name.trim()) return toast.error("Name is required");
    const current = n(form.currentValue);
    if (!(current >= 0) || form.currentValue === "")
      return toast.error("Current value is required");

    try {
      if (spec.module === "investment") {
        const quantity = qty > 0 ? qty : 1;
        await upsertInvestment.mutateAsync({
          name: form.name.trim(),
          symbol: form.symbol,
          category: spec.dbCategory,
          sub_category: form.subClass || spec.dbSubCategory || null,
          quantity,
          avg_price: secondaryValue > 0 ? secondaryValue / quantity : price || current / quantity,
          current_price: current / quantity,
          purchase_date: form.investmentDate || null,
          maturity_date: form.maturityDate || null,
          notes: noteLines(),
          status: "active",
          identifier: form.identifier,
          identifier_type: form.identifierType,
          exchange: form.exchange,
          currency: form.currency,
          ...(spec.recurring && form.instalment
            ? {
                is_sip: true,
                sip_amount: n(form.instalment),
                sip_frequency: form.payFrequency.toLowerCase(),
                sip_active: true,
              }
            : {}),
        });
      } else {
        await upsertAsset.mutateAsync({
          name: form.name.trim(),
          category: spec.dbCategory,
          sub_category: form.subClass || spec.dbSubCategory || null,
          current_value: current,
          purchase_value: secondaryValue > 0 ? secondaryValue : null,
          purchase_date: form.investmentDate || null,
          quantity: qty > 0 ? qty : null,
          location: spec.accountField ? form.account || null : null,
          notes: noteLines(),
          status: "active",
        });
      }
      toast.success(`${spec.label} added`);
      if (keepOpen) reset();
      else navigate({ to: "/wealth" });
    } catch {
      /* mutation surfaces its own toast */
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-3 pb-28 sm:px-6">
      <div className="flex items-center gap-3 py-4 sm:py-6">
        <button
          type="button"
          aria-label="Back"
          onClick={() => navigate({ to: "/wealth" })}
          className="rounded-lg border border-border bg-card p-2 text-foreground transition hover:bg-surface-2"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">Add Asset</h1>
      </div>

      {/* Selected type banner */}
      <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 p-3">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: meta?.iconBg ?? "rgba(154,164,174,0.14)" }}
          >
            <DynIcon
              name={meta?.icon ?? "Boxes"}
              className="h-4 w-4"
              color={meta?.iconColor ?? "#9AA4AE"}
            />
          </div>
          <div>
            <div className="text-xs text-muted-foreground">Selected type</div>
            <div className="text-sm font-medium text-foreground">{spec.label}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate({ to: "/wealth", search: { changeType: true } as never })}
          className="text-sm font-medium text-mint hover:underline"
        >
          Change
        </button>
      </div>

      {/* Live price link */}
      {spec.livePrice && (
        <Section className="mt-4">
          <div className="mb-2 flex items-center gap-2">
            <Search className="h-4 w-4 text-mint" />
            <span className="text-sm font-medium text-foreground">Link to Live Price</span>
            <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-mint">
              Beta
            </span>
          </div>
          <InstrumentSearch
            kind={
              spec.livePrice === "fund" ? "mf_in" : spec.livePrice === "crypto" ? "crypto" : "stock_in"
            }
            placeholder={
              spec.livePrice === "fund"
                ? "Search mutual fund..."
                : spec.livePrice === "crypto"
                  ? "Search crypto (e.g. BTC)..."
                  : "Search stock ticker..."
            }
            onSelect={onLinked}
          />
          <p className="mt-2 text-xs text-muted-foreground">
            Auto-fills the name and links live prices to this holding.
          </p>
          {form.identifier && (
            <p className="mt-1 text-xs text-mint">Linked to {form.identifier}</p>
          )}
        </Section>
      )}

      {/* Core fields */}
      <Section className="mt-4 space-y-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_160px]">
          <Field label="Name *">
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder={spec.namePlaceholder}
              maxLength={140}
            />
          </Field>
          <Field label="Currency">
            <Select
              value={form.currency}
              onValueChange={(v) => set("currency", v as Currency)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c} {CURRENCY_SYMBOL[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        {spec.accountField && (
          <Field label="Held in account">
            <AccountSelect
              value={form.account}
              onChange={(v) => set("account", v)}
              kind={spec.accountKind ?? "any"}
              placeholder={spec.accountPlaceholder}
            />
          </Field>
        )}

        {spec.quantity && spec.price && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label={spec.quantity.label}>
              <Input
                type="number"
                step="0.0001"
                value={form.quantity}
                onChange={(e) => set("quantity", e.target.value)}
                placeholder={spec.quantity.placeholder}
              />
            </Field>
            <Field label={spec.price.label}>
              <AmountInput
                value={form.price}
                onChange={(v) => set("price", v)}
                placeholder={spec.price.placeholder}
              />
            </Field>
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label={`Current Value * (${sym})`}>
            <AmountInput
              value={form.currentValue}
              onChange={(v) => set("currentValue", v)}
              placeholder="Current market value"
            />
          </Field>
          <Field label={`${spec.secondary.label} (${sym})`}>
            <AmountInput
              value={autoSecondary ? String(qty * price) : form.secondary}
              onChange={(v) => set("secondary", v)}
              placeholder={spec.secondary.placeholder}
              disabled={autoSecondary}
            />
            {autoSecondary ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {spec.secondary.auto === "shares"
                  ? "Auto-calculated from shares × price"
                  : "Auto-calculated from units × NAV"}
              </p>
            ) : spec.secondary.helper ? (
              <p className="mt-1 text-xs text-muted-foreground">{spec.secondary.helper}</p>
            ) : null}
          </Field>
        </div>

        {spec.allocationSplit && (
          <button
            type="button"
            onClick={() => setShowDetails(true)}
            className="text-sm font-medium text-mint hover:underline"
          >
            Customize asset allocation split
          </button>
        )}

        {spec.equityAllocation && (
          <Field label="Equity Allocation %">
            <div className="flex flex-wrap gap-2">
              {EQUITY_SPLITS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => set("equityAllocation", p)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm transition",
                    form.equityAllocation === p
                      ? "border-mint/30 bg-mint/15 text-mint"
                      : "border-border bg-surface-2 text-muted-foreground hover:bg-surface-2/80",
                  )}
                >
                  {p}%
                </button>
              ))}
            </div>
          </Field>
        )}
      </Section>

      {/* Interest & maturity */}
      {spec.interestSection && (
        <Section className="mt-4">
          <div className="mb-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Interest &amp; maturity
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Interest Rate (%)">
              <Input
                type="number"
                step="0.01"
                value={form.interestRate}
                onChange={(e) => set("interestRate", e.target.value)}
                placeholder="e.g. 7.1"
              />
            </Field>
            <Field label="Compounding">
              <Select value={form.compounding} onValueChange={(v) => set("compounding", v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COMPOUNDING.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Investment Date">
              <DatePicker
                value={form.investmentDate}
                onChange={(v) => set("investmentDate", v || "")}
              />
            </Field>
            <Field label="Maturity Date">
              <DatePicker
                value={form.maturityDate}
                onChange={(v) => set("maturityDate", v || "")}
              />
            </Field>
          </div>
          <CheckRow
            checked={form.autoUpdate}
            onChange={(v) => set("autoUpdate", v)}
            label="Keep the value updated automatically"
            helper="Wealth Ace recalculates the current value from the interest rate and compounding."
            className="mt-3"
          />
          {spec.recurring && (
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label={`Monthly Instalment (${sym})`}>
                <AmountInput
                  value={form.instalment}
                  onChange={(v) => set("instalment", v)}
                  placeholder="e.g. 5000"
                />
              </Field>
              <Field label="Paid">
                <Select value={form.payFrequency} onValueChange={(v) => set("payFrequency", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAY_FREQUENCY.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
          )}
        </Section>
      )}

      {/* Details toggle */}
      <Section className="mt-4">
        <button
          type="button"
          onClick={() => setShowDetails((s) => !s)}
          className="flex w-full items-center justify-between text-sm font-medium text-foreground"
        >
          <span>{showDetails ? "Hide details" : "Show details"}</span>
          {showDetails ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </button>

        {showDetails && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Geography">
                <Select value={form.geography} onValueChange={(v) => set("geography", v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GEOGRAPHIES.map((g) => (
                      <SelectItem key={g} value={g}>
                        {g}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Sub-class">
                <Input
                  value={form.subClass}
                  onChange={(e) => set("subClass", e.target.value)}
                  placeholder="e.g. Large Cap, SGB..."
                />
              </Field>
            </div>
            <Field label="Tags">
              <div className="rounded-lg border border-border bg-surface-2 p-2">
                {form.tags.length > 0 && (
                  <div className="mb-2 flex flex-wrap gap-1.5">
                    {form.tags.map((t) => (
                      <span
                        key={t}
                        className="flex items-center gap-1 rounded-full bg-mint/15 px-2 py-0.5 text-xs text-mint"
                      >
                        {t}
                        <button
                          type="button"
                          aria-label={`Remove ${t}`}
                          onClick={() =>
                            setForm((f) => ({ ...f, tags: f.tags.filter((x) => x !== t) }))
                          }
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
                <input
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                  value={tagDraft}
                  onChange={(e) => setTagDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === ",") {
                      e.preventDefault();
                      addTag(tagDraft);
                    }
                  }}
                  onBlur={() => addTag(tagDraft)}
                  placeholder="e.g. long-term, swing-trade, tech..."
                />
              </div>
            </Field>
            <Field label="Notes">
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => set("notes", e.target.value)}
                placeholder="Optional notes..."
              />
            </Field>
          </div>
        )}
      </Section>

      {/* Flags */}
      <Section className="mt-4 space-y-3">
        <CheckRow
          checked={form.excludeFromAllocation}
          onChange={(v) => set("excludeFromAllocation", v)}
          label="Exclude from allocation"
          helper="Keeps this holding out of asset-allocation charts and targets."
        />
        <CheckRow
          checked={form.emergencyFund}
          onChange={(v) => set("emergencyFund", v)}
          label="Part of emergency fund"
          helper="Counts this holding towards your emergency fund coverage."
        />
      </Section>

      {/* Actions */}
      <div className="mt-5 flex flex-wrap justify-end gap-2">
        <Button variant="ghost" onClick={() => navigate({ to: "/wealth" })} disabled={pending}>
          Cancel
        </Button>
        <Button variant="outline" onClick={() => submit(true)} disabled={pending}>
          {pending ? "Saving…" : "Save & Add"}
        </Button>
        <Button
          className="bg-mint text-mint-foreground hover:brightness-110"
          onClick={() => submit(false)}
          disabled={pending}
        >
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

/* ---------------- small building blocks ---------------- */

function Section({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>{children}</div>
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

function CheckRow({
  checked,
  onChange,
  label,
  helper,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  helper: string;
  className?: string;
}) {
  return (
    <label className={cn("flex cursor-pointer items-start gap-3", className)}>
      <Checkbox checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <span>
        <span className="block text-sm text-foreground">{label}</span>
        <span className="block text-xs text-muted-foreground">{helper}</span>
      </span>
    </label>
  );
}

export type { AssetFormSpec };
