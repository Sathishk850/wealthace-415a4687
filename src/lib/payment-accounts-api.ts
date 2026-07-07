import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export type PaymentAccountType =
  | "bank"
  | "credit_card"
  | "debit_card"
  | "wallet"
  | "upi"
  | "cash";

export type PaymentAccount = {
  id: string;
  user_id: string;
  name: string;
  account_type: PaymentAccountType;
  institution: string | null;
  last4: string | null;
  color: string | null;
  icon: string | null;
  is_active: boolean;
  is_default: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentAccountInput = {
  id?: string;
  name: string;
  account_type: PaymentAccountType;
  institution?: string | null;
  last4?: string | null;
  color?: string | null;
  icon?: string | null;
  is_active?: boolean;
  is_default?: boolean;
  notes?: string | null;
};

export const PAYMENT_ACCOUNT_TYPES: {
  value: PaymentAccountType;
  label: string;
}[] = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "wallet", label: "Wallet" },
  { value: "upi", label: "UPI" },
];

export const PAYMENT_MODES = [
  { value: "cash", label: "Cash" },
  { value: "upi", label: "UPI" },
  { value: "bank_transfer", label: "Bank Transfer (NEFT / RTGS / IMPS)" },
  { value: "net_banking", label: "Net Banking" },
  { value: "credit_card", label: "Credit Card" },
  { value: "debit_card", label: "Debit Card" },
  { value: "wallet", label: "Wallet" },
  { value: "cheque", label: "Cheque" },
  { value: "auto_debit", label: "Auto Debit / ECS" },
  { value: "standing_instruction", label: "Standing Instruction" },
  { value: "other", label: "Other" },
] as const;

export type PaymentModeValue = (typeof PAYMENT_MODES)[number]["value"] | string;

/** Map a payment mode → the account types that can be used to pay via it. */
export function accountTypesForMode(
  mode: string | null | undefined,
): PaymentAccountType[] {
  switch (mode) {
    case "cash":
      return ["cash"];
    case "upi":
      return ["upi", "bank"];
    case "bank_transfer":
    case "net_banking":
    case "cheque":
    case "auto_debit":
    case "standing_instruction":
      return ["bank"];
    case "credit_card":
      return ["credit_card"];
    case "debit_card":
      return ["debit_card"];
    case "wallet":
      return ["wallet"];
    default:
      return ["cash", "bank", "credit_card", "debit_card", "wallet", "upi"];
  }
}

/**
 * Generic, product-agnostic quick-add suggestions. Bank / credit / debit
 * lists are institutions only — the user picks an issuer, then names the
 * account or card themselves. Wallet / UPI lists are app names. Cash has a
 * single default label the user can rename.
 */
export const INSTITUTION_PRESETS: Record<PaymentAccountType, string[]> = {
  cash: ["Cash in Hand"],
  bank: [
    "SBI",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Kotak Mahindra Bank",
    "Canara Bank",
    "Indian Bank",
    "Union Bank",
    "Bank of Baroda",
    "Punjab National Bank",
    "IDFC FIRST Bank",
    "IndusInd Bank",
    "Federal Bank",
    "South Indian Bank",
    "Yes Bank",
  ],
  credit_card: [
    "HDFC Bank",
    "SBI Card",
    "ICICI Bank",
    "Axis Bank",
    "Kotak Bank",
    "HSBC",
    "American Express",
    "Standard Chartered",
    "IndusInd Bank",
    "Yes Bank",
  ],
  debit_card: [
    "SBI",
    "HDFC Bank",
    "ICICI Bank",
    "Axis Bank",
    "Kotak Mahindra Bank",
    "IDFC FIRST Bank",
    "IndusInd Bank",
    "Yes Bank",
  ],
  wallet: ["Amazon Pay Wallet", "Paytm Wallet", "MobiKwik"],
  upi: [
    "Google Pay",
    "PhonePe",
    "BHIM",
    "Paytm",
    "CRED",
    "Amazon Pay UPI",
    "INDmoney",
  ],
};

/**
 * Custom institutions the user has added via "Other". Persisted in
 * localStorage so they surface as suggestions on the next open. No schema
 * changes — this is a UX-only cache.
 */
const CUSTOM_PRESETS_KEY = "finvista.paymentAccounts.customPresets.v1";

type CustomPresetStore = Partial<Record<PaymentAccountType, string[]>>;

function readCustomPresetStore(): CustomPresetStore {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CUSTOM_PRESETS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as CustomPresetStore;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getCustomInstitutionPresets(
  type: PaymentAccountType,
): string[] {
  return readCustomPresetStore()[type] ?? [];
}

export function addCustomInstitutionPreset(
  type: PaymentAccountType,
  value: string,
): void {
  if (typeof window === "undefined") return;
  const trimmed = value.trim();
  if (!trimmed) return;
  const store = readCustomPresetStore();
  const list = store[type] ?? [];
  const builtins = INSTITUTION_PRESETS[type] ?? [];
  const exists = [...builtins, ...list].some(
    (v) => v.toLowerCase() === trimmed.toLowerCase(),
  );
  if (exists) return;
  store[type] = [...list, trimmed];
  try {
    window.localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(store));
  } catch {
    /* ignore quota errors */
  }
}

export const paymentAccountKeys = {
  all: ["payment_accounts"] as const,
};

async function uid() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

export function usePaymentAccounts() {
  return useQuery({
    queryKey: paymentAccountKeys.all,
    queryFn: async (): Promise<PaymentAccount[]> => {
      const { data, error } = await supabase
        .from("payment_accounts" as never)
        .select("*")
        .order("is_default", { ascending: false })
        .order("is_active", { ascending: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as PaymentAccount[];
    },
  });
}

/** Ensures the user has at least one Cash account; returns its id. */
export async function ensureCashWallet(): Promise<string> {
  const user_id = await uid();
  const { data: existing } = await supabase
    .from("payment_accounts" as never)
    .select("id")
    .eq("user_id", user_id)
    .eq("account_type", "cash")
    .eq("is_active", true)
    .limit(1)
    .maybeSingle();
  if (existing && (existing as { id: string }).id) {
    return (existing as { id: string }).id;
  }
  const { data, error } = await supabase
    .from("payment_accounts" as never)
    .insert({
      user_id,
      name: "Cash Wallet",
      account_type: "cash",
      is_active: true,
      is_default: false,
      icon: "Wallet",
    } as never)
    .select("id")
    .single();
  if (error) throw error;
  return (data as { id: string }).id;
}

export function useUpsertPaymentAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: PaymentAccountInput) => {
      const user_id = await uid();
      const payload = {
        name: input.name.trim(),
        account_type: input.account_type,
        institution: input.institution?.trim() || null,
        last4: input.last4?.trim() || null,
        color: input.color || null,
        icon: input.icon || null,
        is_active: input.is_active ?? true,
        is_default: input.is_default ?? false,
        notes: input.notes?.trim() || null,
      };
      if (input.is_default) {
        // clear other defaults for this user first
        await supabase
          .from("payment_accounts" as never)
          .update({ is_default: false } as never)
          .eq("user_id", user_id)
          .eq("is_default", true);
      }
      if (input.id) {
        const { error } = await supabase
          .from("payment_accounts" as never)
          .update(payload as never)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("payment_accounts" as never)
          .insert({ ...payload, user_id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Payment account saved");
      qc.invalidateQueries({ queryKey: paymentAccountKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save account"),
  });
}

export function useDeletePaymentAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("payment_accounts" as never)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Payment account deleted");
      qc.invalidateQueries({ queryKey: paymentAccountKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });
}

export function useTogglePaymentAccountActive() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("payment_accounts" as never)
        .update({ is_active } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: paymentAccountKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update"),
  });
}

export function useSetDefaultPaymentAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const user_id = await uid();
      await supabase
        .from("payment_accounts" as never)
        .update({ is_default: false } as never)
        .eq("user_id", user_id)
        .eq("is_default", true);
      const { error } = await supabase
        .from("payment_accounts" as never)
        .update({ is_default: true } as never)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Default account updated");
      qc.invalidateQueries({ queryKey: paymentAccountKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to update default"),
  });
}

export function paymentModeLabel(value: string | null | undefined): string {
  if (!value) return "—";
  const found = PAYMENT_MODES.find((m) => m.value === value);
  return found ? found.label : value;
}

export function accountTypeLabel(type: PaymentAccountType | string): string {
  const found = PAYMENT_ACCOUNT_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
}

/* ------------------------------------------------------------------ */
/* Payment Channel helpers                                             */
/* ------------------------------------------------------------------ */
/**
 * Payment Channel is a UI-only concept layered on top of Payment Mode.
 * It captures the specific app / bank / card / wallet used, and helps
 * narrow the Paid From list. Channels for app-style modes come from a
 * static preset list; channels for account-style modes come from the
 * user's existing Payment Accounts.
 *
 * IMPORTANT: we intentionally do NOT persist channel to the database —
 * this is a UX layer over the existing payment_mode + payment_account_id
 * columns. Last-used channel per mode is remembered in localStorage.
 */

export type ChannelSource = "preset" | "account" | "text" | "none";

export function channelSourceForMode(mode: string | null | undefined): ChannelSource {
  switch (mode) {
    case "cash":
      return "none";
    case "upi":
    case "net_banking":
    case "bank_transfer":
    case "wallet":
      return "preset";
    case "credit_card":
    case "debit_card":
    case "cheque":
    case "auto_debit":
    case "standing_instruction":
      return "account";
    case "other":
      return "text";
    default:
      return "text";
  }
}

/** Static channel presets for app/institution-style modes. */
export const CHANNEL_PRESETS: Record<string, string[]> = {
  upi: [
    "Google Pay",
    "PhonePe",
    "BHIM",
    "Paytm",
    "Amazon Pay UPI",
    "CRED",
    "WhatsApp Pay",
    "INDmoney",
  ],
  net_banking: [
    "HDFC Bank",
    "SBI",
    "ICICI Bank",
    "Axis Bank",
    "Kotak Mahindra Bank",
    "Canara Bank",
    "Indian Bank",
    "Union Bank",
    "Bank of Baroda",
    "Punjab National Bank",
    "IDFC FIRST Bank",
    "IndusInd Bank",
    "Federal Bank",
    "Yes Bank",
  ],
  bank_transfer: [
    "HDFC Bank",
    "SBI",
    "ICICI Bank",
    "Axis Bank",
    "Kotak Mahindra Bank",
    "Canara Bank",
    "Indian Bank",
    "Union Bank",
    "Bank of Baroda",
    "Punjab National Bank",
    "IDFC FIRST Bank",
    "IndusInd Bank",
    "Federal Bank",
    "Yes Bank",
  ],
  wallet: ["Amazon Pay Wallet", "Paytm Wallet", "MobiKwik", "Freecharge"],
};

/** For account-source modes, which account types the channel picks from. */
export function channelAccountTypesForMode(
  mode: string | null | undefined,
): PaymentAccountType[] {
  switch (mode) {
    case "credit_card":
      return ["credit_card"];
    case "debit_card":
      return ["debit_card"];
    case "cheque":
    case "auto_debit":
    case "standing_instruction":
      return ["bank"];
    default:
      return [];
  }
}

/**
 * Last-used Payment Channel per Mode is now stored per-user in the
 * `user_payment_prefs` table (see `src/lib/user-payment-prefs-api.ts`), so
 * the value syncs across every device the user signs in on. PaymentFields
 * reads from `usePaymentPrefs()` and stages updates via
 * `stagePaymentPreference()` / `commitStagedPaymentPreferences()`.
 */