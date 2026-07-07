import { useEffect, useMemo, useRef, useState } from "react";
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
  channelSourceForMode,
  channelAccountTypesForMode,
  CHANNEL_PRESETS,
  type PaymentAccount,
  type PaymentAccountType,
} from "@/lib/payment-accounts-api";
import { PaymentAccountDialog } from "@/components/payment/payment-account-dialog";
import {
  usePaymentPrefs,
  stagePaymentPreference,
} from "@/lib/user-payment-prefs-api";

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

const OTHER = "__other__";

/**
 * Shared Payment Mode + Payment Channel + Paid From triple used across all
 * outflow forms.
 *
 * • Payment Mode is a dropdown of standard modes plus "Other".
 * • Payment Channel is dynamic per mode: hidden for Cash, a preset app /
 *   bank list for UPI / Net Banking / Wallet, a filtered account picker
 *   for Credit Card / Debit Card / Cheque / Auto Debit / SI, and a free
 *   text input for Other. Card / cheque / auto-debit channels double as
 *   Paid From, so Paid From auto-selects and hides when unambiguous.
 * • Paid From lists the user's active payment accounts, filtered by the
 *   mode chosen (Smart Filtering). Auto-preselects Cash Wallet for Cash.
 * • "+ New" opens the PaymentAccountDialog to add an account inline.
 * • Last-used channel per mode is remembered in localStorage (UX only, no
 *   schema change).
 */
export function PaymentFields({
  value,
  onChange,
  required = true,
  compact = false,
  className,
}: Props) {
  const { data: accounts = [] } = usePaymentAccounts();
  const { data: prefs } = usePaymentPrefs();
  const [otherMode, setOtherMode] = useState<string>("");
  const [channel, setChannel] = useState<string>("");
  const [channelOtherText, setChannelOtherText] = useState<string>("");
  const [addOpen, setAddOpen] = useState(false);
  const [addType, setAddType] = useState<PaymentAccountType | undefined>();
  const restoredRef = useRef(false);

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

  const channelSource = channelSourceForMode(isOther ? "other" : mode);
  const channelAcctTypes = useMemo(
    () => channelAccountTypesForMode(mode),
    [mode],
  );
  const channelAccounts: PaymentAccount[] = useMemo(() => {
    if (channelSource !== "account") return [];
    return accounts.filter(
      (a) => a.is_active && channelAcctTypes.includes(a.account_type),
    );
  }, [accounts, channelAcctTypes, channelSource]);
  const presetChannels = channelSource === "preset" ? CHANNEL_PRESETS[mode] ?? [] : [];

  // Auto-restore preferences on first open of a NEW outflow form.
  // Mode → Channel → Paid From (only if the referenced account is active).
  useEffect(() => {
    if (restoredRef.current) return;
    if (!prefs) return;
    if (accounts.length === 0 && (prefs.last_account_by_mode ?? {})) {
      // wait until accounts have loaded before validating account id
    }
    if (value.payment_mode || value.payment_account_id) {
      // Editing an existing transaction — do not overwrite.
      restoredRef.current = true;
      return;
    }
    const restoreMode = prefs.last_payment_mode;
    if (!restoreMode) {
      restoredRef.current = true;
      return;
    }
    const restoreAccountId = prefs.last_account_by_mode?.[restoreMode] ?? null;
    const restoreChannel = prefs.last_channel_by_mode?.[restoreMode] ?? null;
    // Validate account is still active.
    let validAccountId: string | null = null;
    if (restoreAccountId) {
      const acc = accounts.find((a) => a.id === restoreAccountId);
      if (acc && acc.is_active) validAccountId = acc.id;
    }
    onChange({ payment_mode: restoreMode, payment_account_id: validAccountId });
    if (restoreChannel) {
      // Preset / text channels are plain strings; account channels are ids.
      setChannel(restoreChannel);
      setChannelOtherText(restoreChannel);
    }
    restoredRef.current = true;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [prefs, accounts]);

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

  // When mode changes (after initial restore), reset channel from prefs for
  // that mode if available.
  useEffect(() => {
    if (!mode) {
      setChannel("");
      return;
    }
    if (channelSource === "none") {
      setChannel("");
      return;
    }
    const last =
      channelSource === "account"
        ? prefs?.last_account_by_mode?.[mode] ?? null
        : prefs?.last_channel_by_mode?.[mode] ?? null;
    if (channelSource === "preset") {
      if (last && presetChannels.includes(last)) setChannel(last);
      else setChannel("");
    } else if (channelSource === "account") {
      // If only one candidate account, auto-select.
      if (channelAccounts.length === 1) {
        setChannel(channelAccounts[0].id);
        onChange({ ...value, payment_account_id: channelAccounts[0].id });
      } else if (last && channelAccounts.some((a) => a.id === last)) {
        setChannel(last);
        onChange({ ...value, payment_account_id: last });
      } else {
        setChannel("");
      }
    } else if (channelSource === "text") {
      setChannel(last ? OTHER : "");
      setChannelOtherText(last ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, channelSource, channelAccounts.length]);

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

  const handleChannelChange = (v: string) => {
    setChannel(v);
    if (channelSource === "account" && v) {
      onChange({ ...value, payment_account_id: v });
    }
  };

  const handleChannelOtherBlur = () => {
    /* value staged via the effect below */
  };

  // Stage current selection for post-save persistence.
  useEffect(() => {
    if (!mode) {
      stagePaymentPreference({ mode: null, channel: null, accountId: null });
      return;
    }
    let ch: string | null = null;
    if (channelSource === "preset") {
      ch = channel === OTHER ? channelOtherText.trim() || null : channel || null;
    } else if (channelSource === "text") {
      ch = channelOtherText.trim() || null;
    } else if (channelSource === "account") {
      ch = value.payment_account_id || null;
    }
    stagePaymentPreference({
      mode,
      channel: ch,
      accountId: value.payment_account_id,
    });
  }, [mode, channel, channelOtherText, channelSource, value.payment_account_id]);

  // Paid From is hidden when the channel unambiguously identifies the account.
  const hidePaidFrom = channelSource === "account";

  const openAddDialog = (type?: PaymentAccountType) => {
    setAddType(type);
    setAddOpen(true);
  };

  const addLabelFor = (t: PaymentAccountType | undefined): string => {
    switch (t) {
      case "credit_card":
        return "Add New Credit Card";
      case "debit_card":
        return "Add New Debit Card";
      case "bank":
        return "Add New Bank Account";
      case "wallet":
        return "Add New Wallet";
      case "upi":
        return "Add New UPI Account";
      default:
        return "Add New Account";
    }
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

      {channelSource !== "none" && (
        <div>
          <Label className="mb-1.5 block text-xs">
            Payment Channel
            {required && <span className="text-destructive"> *</span>}
          </Label>

          {channelSource === "preset" && (
            <>
              <Select value={channel || undefined} onValueChange={handleChannelChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose channel" />
                </SelectTrigger>
                <SelectContent>
                  {presetChannels.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                  <SelectItem value={OTHER}>Other</SelectItem>
                </SelectContent>
              </Select>
              {channel === OTHER && (
                <Input
                  className="mt-2"
                  placeholder="Enter channel"
                  value={channelOtherText}
                  onChange={(e) => setChannelOtherText(e.target.value)}
                  onBlur={handleChannelOtherBlur}
                />
              )}
            </>
          )}

          {channelSource === "account" && (
            <>
              {channelAccounts.length === 0 ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full justify-start gap-1"
                  onClick={() => openAddDialog(channelAcctTypes[0])}
                >
                  <Plus className="h-3.5 w-3.5" />
                  {addLabelFor(channelAcctTypes[0])}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Select value={channel || undefined} onValueChange={handleChannelChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Choose" />
                    </SelectTrigger>
                    <SelectContent>
                      {channelAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                          {a.last4 ? ` •••• ${a.last4}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => openAddDialog(channelAcctTypes[0])}
                    className="shrink-0"
                  >
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </>
          )}

          {channelSource === "text" && (
            <Input
              placeholder="Enter channel"
              value={channelOtherText}
              onChange={(e) => setChannelOtherText(e.target.value)}
              onBlur={handleChannelOtherBlur}
            />
          )}
        </div>
      )}

      {!hidePaidFrom && (
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
            onClick={() => openAddDialog(eligibleTypes.length === 1 ? eligibleTypes[0] : undefined)}
            className="shrink-0"
          >
            <Plus className="h-3.5 w-3.5" />
            <span className="ml-1 hidden sm:inline">New</span>
          </Button>
        </div>
      </div>
      )}

      <PaymentAccountDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        defaultType={addType ?? (eligibleTypes.length === 1 ? eligibleTypes[0] : undefined)}
        onCreated={(id) => {
          onChange({ ...value, payment_account_id: id });
          if (channelSource === "account") {
            setChannel(id);
          }
        }}
      />
    </div>
  );
}