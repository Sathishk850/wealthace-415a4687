import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import {
  PAYMENT_MODES,
  accountTypesForMode,
  ensureCashWallet,
  usePaymentAccounts,
  type PaymentAccount,
} from "@/lib/payment-accounts-api";
import { PaymentAccountDialog } from "@/components/payment/payment-account-dialog";

export type PaymentFieldsValue = {
  payment_mode: string | null;
  payment_account_id: string | null;
};

type Props = {
  value: PaymentFieldsValue;
  onChange: (v: PaymentFieldsValue) => void;
  required?: boolean;
  /** Show a compact 2-column layout when true. */
  compact?: boolean;
  className?: string;
};

/**
 * Shared Payment Mode + Paid From field pair used across all outflow forms.
 *
 * • Payment Mode is a dropdown of standard modes plus "Other".
 * • Paid From lists only the user's active payment accounts, filtered by the
 *   mode chosen (Smart Filtering).
 * • Selecting "Cash" auto-preselects the user's Cash Wallet (creating one on
 *   first use). The user can still change it.
 * • "+ New" opens the PaymentAccountDialog to add an account on the fly.
 */
export function PaymentFields({
  value,
  onChange,
  required = true,
  compact = false,
  className,
}: Props) {
  const { data: accounts = [] } = usePaymentAccounts();
  const [otherMode, setOtherMode] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);

  const mode = value.payment_mode ?? "";
  const isKnownMode = PAYMENT_MODES.some((m) => m.value === mode);
  const isOther = !!mode && !isKnownMode;

  useEffect(() => {
    if (isOther) setOtherMode(mode);
  }, [isOther, mode]);

  const eligibleTypes = useMemo(
    () => accountTypesForMode(mode || "other"),
    [mode],
  );

  const eligibleAccounts: PaymentAccount[] = useMemo(() => {
    return accounts.filter(
      (a) => a.is_active && eligibleTypes.includes(a.account_type),
    );
  }, [accounts, eligibleTypes]);

  // Auto-preselect Cash Wallet when mode = Cash and nothing chosen yet.
  useEffect(() => {
    if (mode !== "cash") return;
    if (value.payment_account_id) return;
    const cash = accounts.find(
      (a) => a.account_type === "cash" && a.is_active,
    );
    if (cash) {
      onChange({ ...value, payment_account_id: cash.id });
    } else {
      // Auto-seed a Cash Wallet on first use.
      ensureCashWallet()
        .then((id) => onChange({ ...value, payment_account_id: id }))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, accounts.length]);

  // If current account no longer fits the mode, clear it.
  useEffect(() => {
    if (!value.payment_account_id) return;
    const acc = accounts.find((a) => a.id === value.payment_account_id);
    if (!acc) return;
    if (!eligibleTypes.includes(acc.account_type)) {
      onChange({ ...value, payment_account_id: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eligibleTypes.join("|")]);

  const handleModeChange = (v: string) => {
    if (v === "other") {
      onChange({ payment_mode: otherMode.trim() || "other", payment_account_id: null });
    } else {
      onChange({ payment_mode: v, payment_account_id: null });
    }
  };

  const handleOtherModeBlur = () => {
    const trimmed = otherMode.trim();
    if (trimmed) onChange({ ...value, payment_mode: trimmed });
  };

  return (
    <div
      className={`grid gap-3 ${compact ? "sm:grid-cols-2" : ""} ${className ?? ""}`.trim()}
    >
      <div>
        <Label className="mb-1.5 block text-xs">
          Payment Mode{required && <span className="text-destructive"> *</span>}
        </Label>
        <Select
          value={isOther ? "other" : mode || undefined}
          onValueChange={handleModeChange}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select payment mode" />
          </SelectTrigger>
          <SelectContent>
            {PAYMENT_MODES.map((m) => (
              <SelectItem key={m.value} value={m.value}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {isOther && (
          <Input
            className="mt-2"
            placeholder="Custom mode name"
            value={otherMode}
            onChange={(e) => setOtherMode(e.target.value)}
            onBlur={handleOtherModeBlur}
          />
        )}
      </div>

      <div>
        <Label className="mb-1.5 block text-xs">
          Paid From{required && <span className="text-destructive"> *</span>}
        </Label>
        <div className="flex gap-2">
          <Select
            value={value.payment_account_id ?? undefined}
            onValueChange={(v) =>
              onChange({ ...value, payment_account_id: v || null })
            }
            disabled={!mode}
          >
            <SelectTrigger className="flex-1">
              <SelectValue
                placeholder={
                  !mode
                    ? "Choose payment mode first"
                    : eligibleAccounts.length === 0
                      ? "No matching accounts — add one"
                      : "Choose account"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {eligibleAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.name}
                  {a.last4 ? ` •••• ${a.last4}` : ""}
                  {a.is_default ? " · Default" : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setAddOpen(true)}
            className="shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="ml-1 hidden sm:inline">New</span>
          </Button>
        </div>
      </div>

      <PaymentAccountDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultType={
          eligibleTypes.length === 1 ? eligibleTypes[0] : undefined
        }
        onCreated={(id) => onChange({ ...value, payment_account_id: id })}
      />
    </div>
  );
}