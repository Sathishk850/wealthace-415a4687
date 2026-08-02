import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/* =================== Types =================== */
export type AssetCategory =
  | "Cash"
  | "Property"
  | "Vehicle"
  | "EPF"
  | "PPF"
  | "Gold"
  | "Investments"
  | "Other";

export type LiabilityCategory =
  | "Home Loan"
  | "Car Loan"
  | "Personal Loan"
  | "Credit Card"
  | "Education Loan"
  | "Business Loan"
  | "Other";

export const ASSET_CATEGORIES: AssetCategory[] = [
  "Cash",
  "Property",
  "Vehicle",
  "EPF",
  "PPF",
  "Gold",
  "Investments",
  "Other",
];

export const LIABILITY_CATEGORIES: LiabilityCategory[] = [
  "Home Loan",
  "Car Loan",
  "Personal Loan",
  "Credit Card",
  "Education Loan",
  "Business Loan",
  "Other",
];

export type Asset = {
  id: string;
  user_id: string;
  name: string;
  category: AssetCategory | string;
  sub_category: string | null;
  current_value: number;
  purchase_value: number | null;
  purchase_date: string | null;
  quantity: number | null;
  unit: string | null;
  location: string | null;
  owner_member_id: string | null;
  notes: string | null;
  status: string;
  last_updated: string;
  payment_mode: string | null;
  payment_account_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Liability = {
  id: string;
  user_id: string;
  name: string;
  category: LiabilityCategory | string;
  lender: string | null;
  principal: number | null;
  outstanding: number;
  emi: number | null;
  interest_rate: number | null;
  tenure_months: number | null;
  start_date: string | null;
  end_date: string | null;
  due_date: string | null;
  status: string;
  owner_member_id: string | null;
  notes: string | null;
  payment_mode: string | null;
  payment_account_id: string | null;
  created_at: string;
  updated_at: string;
};

export const wealthKeys = {
  assets: ["wealth", "assets"] as const,
  liabilities: ["wealth", "liabilities"] as const,
  family: ["wealth", "family"] as const,
  accounts: ["wealth", "accounts"] as const,
  insurance: ["wealth", "insurance"] as const,
  investments: ["wealth", "investments"] as const,
  investmentTxns: ["wealth", "investment_txns"] as const,
};

async function uid() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

const num = (v: unknown): number => (v == null ? 0 : Number(v));
const numOrNull = (v: unknown): number | null =>
  v == null || v === "" ? null : Number(v);

/* =================== ASSETS =================== */
export function useAssets() {
  return useQuery({
    queryKey: wealthKeys.assets,
    queryFn: async (): Promise<Asset[]> => {
      const { data, error } = await supabase
        .from("wealth_assets")
        .select("*")
        .order("last_updated", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        current_value: num(r.current_value),
        purchase_value: r.purchase_value == null ? null : num(r.purchase_value),
        quantity: r.quantity == null ? null : num(r.quantity),
      })) as Asset[];
    },
  });
}

export type AssetInput = {
  id?: string;
  name: string;
  category: string;
  sub_category?: string | null;
  current_value: number;
  purchase_value?: number | null;
  purchase_date?: string | null;
  quantity?: number | null;
  unit?: string | null;
  location?: string | null;
  owner_member_id?: string | null;
  notes?: string | null;
  status?: string;
  last_updated?: string;
  payment_mode?: string | null;
  payment_account_id?: string | null;
};

export function useUpsertAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AssetInput) => {
      const user_id = await uid();
      const payload = {
        name: input.name.trim(),
        category: input.category,
        sub_category: input.sub_category?.trim() || null,
        current_value: input.current_value,
        purchase_value: numOrNull(input.purchase_value),
        purchase_date: input.purchase_date || null,
        quantity: numOrNull(input.quantity),
        unit: input.unit?.trim() || null,
        location: input.location?.trim() || null,
        owner_member_id: input.owner_member_id || null,
        notes: input.notes?.trim() || null,
        status: input.status || "active",
        last_updated: input.last_updated || new Date().toISOString().slice(0, 10),
        payment_mode: input.payment_mode?.trim() || null,
        payment_account_id: input.payment_account_id || null,
      };
      if (input.id) {
        const { error } = await supabase
          .from("wealth_assets")
          .update(payload as never)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wealth_assets")
          .insert({ ...payload, user_id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Asset saved");
      qc.invalidateQueries({ queryKey: wealthKeys.assets });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save asset"),
  });
}

export function useDeleteAsset() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wealth_assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Asset deleted");
      qc.invalidateQueries({ queryKey: wealthKeys.assets });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });
}

export function useBulkInsertAssets() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: AssetInput[]) => {
      const user_id = await uid();
      const payload = rows.map((r) => ({
        user_id,
        name: r.name,
        category: r.category,
        sub_category: r.sub_category || null,
        current_value: Number(r.current_value) || 0,
        purchase_value: numOrNull(r.purchase_value),
        purchase_date: r.purchase_date || null,
        quantity: numOrNull(r.quantity),
        unit: r.unit || null,
        location: r.location || null,
        notes: r.notes || null,
        status: r.status || "active",
        last_updated: r.last_updated || new Date().toISOString().slice(0, 10),
      }));
      if (!payload.length) return 0;
      const { error } = await supabase.from("wealth_assets").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (count) => {
      toast.success(`Imported ${count} asset${count === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: wealthKeys.assets });
    },
    onError: (e: Error) => toast.error(e.message || "Import failed"),
  });
}

/* =================== LIABILITIES =================== */
export function useLiabilities() {
  return useQuery({
    queryKey: wealthKeys.liabilities,
    queryFn: async (): Promise<Liability[]> => {
      const { data, error } = await supabase
        .from("wealth_liabilities")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        principal: r.principal == null ? null : num(r.principal),
        outstanding: num(r.outstanding),
        emi: r.emi == null ? null : num(r.emi),
        interest_rate: r.interest_rate == null ? null : num(r.interest_rate),
      })) as Liability[];
    },
  });
}

export type LiabilityInput = {
  id?: string;
  name: string;
  category: string;
  lender?: string | null;
  principal?: number | null;
  outstanding: number;
  emi?: number | null;
  interest_rate?: number | null;
  tenure_months?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  due_date?: string | null;
  status?: string;
  owner_member_id?: string | null;
  notes?: string | null;
  payment_mode?: string | null;
  payment_account_id?: string | null;
};

export function useUpsertLiability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LiabilityInput) => {
      const user_id = await uid();
      const payload = {
        name: input.name.trim(),
        category: input.category,
        lender: input.lender?.trim() || null,
        principal: numOrNull(input.principal),
        outstanding: Number(input.outstanding) || 0,
        emi: numOrNull(input.emi),
        interest_rate: numOrNull(input.interest_rate),
        tenure_months:
          input.tenure_months == null || (input.tenure_months as any) === ""
            ? null
            : Number(input.tenure_months),
        start_date: input.start_date || null,
        end_date: input.end_date || null,
        due_date: input.due_date || null,
        status: input.status || "active",
        owner_member_id: input.owner_member_id || null,
        notes: input.notes?.trim() || null,
        payment_mode: input.payment_mode?.trim() || null,
        payment_account_id: input.payment_account_id || null,
      };
      if (input.id) {
        const { error } = await supabase
          .from("wealth_liabilities")
          .update(payload as never)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wealth_liabilities")
          .insert({ ...payload, user_id } as never);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Liability saved");
      qc.invalidateQueries({ queryKey: wealthKeys.liabilities });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save liability"),
  });
}

export function useDeleteLiability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("wealth_liabilities")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Liability deleted");
      qc.invalidateQueries({ queryKey: wealthKeys.liabilities });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });
}

export function useBulkInsertLiabilities() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: LiabilityInput[]) => {
      const user_id = await uid();
      const payload = rows.map((r) => ({
        user_id,
        name: r.name,
        category: r.category,
        lender: r.lender || null,
        principal: numOrNull(r.principal),
        outstanding: Number(r.outstanding) || 0,
        emi: numOrNull(r.emi),
        interest_rate: numOrNull(r.interest_rate),
        tenure_months:
          r.tenure_months == null || (r.tenure_months as any) === ""
            ? null
            : Number(r.tenure_months),
        start_date: r.start_date || null,
        end_date: r.end_date || null,
        due_date: r.due_date || null,
        status: r.status || "active",
        notes: r.notes || null,
      }));
      if (!payload.length) return 0;
      const { error } = await supabase.from("wealth_liabilities").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (count) => {
      toast.success(`Imported ${count} liabilit${count === 1 ? "y" : "ies"}`);
      qc.invalidateQueries({ queryKey: wealthKeys.liabilities });
    },
    onError: (e: Error) => toast.error(e.message || "Import failed"),
  });
}

/* =================== Helpers =================== */
export const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

/** Preserves decimal precision (2–4 dp) — use for per-unit prices like avg_price / current_price. */
export const inrPrice = (n: number) =>
  "₹" +
  (Number.isFinite(n) ? n : 0).toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });


export const inrSigned = (n: number) =>
  (n < 0 ? "-₹" : "+₹") + Math.abs(Math.round(n)).toLocaleString("en-IN");

export const inrCompact = (n: number) => {
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n)}`;
};

export function formatDate(d: string | null) {
  if (!d) return "—";
  const dt = new Date(d);
  if (isNaN(dt.getTime())) return d;
  return dt.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

/** Weighted avg interest rate by outstanding balance. */
export function weightedAvgRate(rows: Liability[]) {
  const eligible = rows.filter((r) => r.interest_rate != null && r.outstanding > 0);
  const total = eligible.reduce((s, r) => s + r.outstanding, 0);
  if (!total) return 0;
  return (
    eligible.reduce((s, r) => s + r.outstanding * (r.interest_rate || 0), 0) / total
  );
}

/** Liability "due soon" — within 7 days. */
export function dueSoon(due: string | null) {
  if (!due) return false;
  const d = new Date(due).getTime();
  const now = Date.now();
  return d - now < 7 * 86400000 && d - now >= 0;
}

/** Allocation breakdown grouped by category. */
export function groupByCategory<T extends { category: string }>(
  rows: T[],
  valueOf: (r: T) => number,
) {
  const map = new Map<string, number>();
  for (const r of rows) {
    map.set(r.category, (map.get(r.category) || 0) + valueOf(r));
  }
  const total = Array.from(map.values()).reduce((a, b) => a + b, 0);
  return Array.from(map.entries())
    .map(([name, amt]) => ({
      name,
      amt,
      pct: total ? (amt / total) * 100 : 0,
    }))
    .sort((a, b) => b.amt - a.amt);
}

/* =================== INVESTMENTS =================== */
export type InvestmentCategory =
  | "Mutual Funds"
  | "Stocks"
  | "ETFs"
  | "Commodities"
  | "REIT"
  | "InvIT"
  | "Gold"
  | "Bonds"
  | "Crypto"
  | "Others";

export const INVESTMENT_CATEGORIES: InvestmentCategory[] = [
  "Mutual Funds",
  "Stocks",
  "ETFs",
  "Commodities",
  "REIT",
  "InvIT",
  "Gold",
  "Bonds",
  "Crypto",
  "Others",
];

export type SipFrequency = "monthly" | "weekly" | "quarterly" | "yearly";

export type Currency = "INR" | "USD" | "EUR" | "GBP";
export const CURRENCIES: Currency[] = ["INR", "USD", "EUR", "GBP"];
export const CURRENCY_SYMBOL: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

/** Precise per-unit price formatter with currency symbol (2–4 dp). */
export const priceIn = (n: number, ccy: Currency | string | null | undefined) => {
  const sym = CURRENCY_SYMBOL[(ccy as Currency) ?? "INR"] ?? "₹";
  const locale = ccy === "INR" ? "en-IN" : "en-US";
  return (
    sym +
    (Number.isFinite(n) ? n : 0).toLocaleString(locale, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    })
  );
};

/** Rounded amount formatter with currency symbol (whole units). */
export const amountIn = (n: number, ccy: Currency | string | null | undefined) => {
  const sym = CURRENCY_SYMBOL[(ccy as Currency) ?? "INR"] ?? "₹";
  const locale = ccy === "INR" ? "en-IN" : "en-US";
  return sym + Math.round(Number.isFinite(n) ? n : 0).toLocaleString(locale);
};


export type Investment = {
  id: string;
  user_id: string;
  name: string;
  symbol: string | null;
  category: string;
  sub_category: string | null;
  quantity: number;
  avg_price: number;
  current_price: number;
  invested_value: number | null;
  current_value: number | null;
  purchase_date: string | null;
  account_id: string | null;
  owner_member_id: string | null;
  is_sip: boolean;
  sip_amount: number | null;
  sip_frequency: string | null;
  sip_start_date: string | null;
  sip_next_date: string | null;
  sip_active: boolean | null;
  notes: string | null;
  status: string;
  last_updated: string;
  payment_mode: string | null;
  payment_account_id: string | null;
  identifier_type: string | null;
  identifier: string | null;
  exchange: string | null;
  price_source: string | null;
  price_updated_at: string | null;
  previous_close: number | null;
  currency: Currency;
  created_at: string;
  updated_at: string;
};

export type InvestmentInput = {
  id?: string;
  name: string;
  symbol?: string | null;
  category: string;
  sub_category?: string | null;
  quantity: number;
  avg_price: number;
  current_price: number;
  purchase_date?: string | null;
  is_sip?: boolean;
  sip_amount?: number | null;
  sip_frequency?: string | null;
  sip_start_date?: string | null;
  sip_next_date?: string | null;
  sip_active?: boolean | null;
  notes?: string | null;
  status?: string;
  last_updated?: string;
  payment_mode?: string | null;
  payment_account_id?: string | null;
  identifier_type?: string | null;
  identifier?: string | null;
  exchange?: string | null;
  currency?: Currency;
};

export function useInvestments() {
  return useQuery({
    queryKey: wealthKeys.investments,
    queryFn: async (): Promise<Investment[]> => {
      const { data, error } = await supabase
        .from("wealth_investments")
        .select("*")
        .order("last_updated", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        quantity: num(r.quantity),
        avg_price: num(r.avg_price),
        current_price: num(r.current_price),
        invested_value: r.invested_value == null ? null : num(r.invested_value),
        current_value: r.current_value == null ? null : num(r.current_value),
        sip_amount: r.sip_amount == null ? null : num(r.sip_amount),
      })) as Investment[];
    },
  });
}

function investmentPayload(i: InvestmentInput) {
  const qty = Number(i.quantity) || 0;
  const avg = Number(i.avg_price) || 0;
  const cur = Number(i.current_price) || 0;
  return {
    name: i.name.trim(),
    symbol: i.symbol?.trim() || null,
    category: i.category,
    sub_category: i.sub_category?.trim() || null,
    quantity: qty,
    avg_price: avg,
    current_price: cur,
    purchase_date: i.purchase_date || null,
    is_sip: !!i.is_sip,
    sip_amount: numOrNull(i.sip_amount),
    sip_frequency: i.sip_frequency || null,
    sip_start_date: i.sip_start_date || null,
    sip_next_date: i.sip_next_date || null,
    sip_active: i.is_sip ? (i.sip_active ?? true) : false,
    notes: i.notes?.trim() || null,
    status: i.status || "active",
    last_updated: i.last_updated || new Date().toISOString().slice(0, 10),
    payment_mode: i.payment_mode?.trim() || null,
    payment_account_id: i.payment_account_id || null,
    identifier_type: i.identifier_type?.trim() || null,
    identifier: i.identifier?.trim() || null,
    exchange: i.exchange?.trim() || null,
    currency: (i.currency && CURRENCIES.includes(i.currency) ? i.currency : "INR") as Currency,
  };
}

/** Currency is immutable after creation — strip it from update payloads. */
function investmentUpdatePayload(i: InvestmentInput) {
  const p = investmentPayload(i);
  const { currency: _omit, ...rest } = p;
  void _omit;
  return rest;
}

export function useUpsertInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InvestmentInput) => {
      const user_id = await uid();
      if (input.id) {
        const { error } = await supabase
          .from("wealth_investments")
          .update(investmentUpdatePayload(input))
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wealth_investments")
          .insert({ ...investmentPayload(input), user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Investment saved");
      qc.invalidateQueries({ queryKey: wealthKeys.investments });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save investment"),
  });
}

export type LinkInvestmentInput = {
  id: string;
  identifier_type: string;
  identifier: string;
  exchange?: string | null;
  name?: string | null;
  symbol?: string | null;
};

export function useLinkInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: LinkInvestmentInput) => {
      const patch: {
        identifier_type: string;
        identifier: string;
        exchange: string | null;
        last_updated: string;
        name?: string;
        symbol?: string;
      } = {
        identifier_type: input.identifier_type,
        identifier: input.identifier,
        exchange: input.exchange?.trim() || null,
        last_updated: new Date().toISOString().slice(0, 10),
      };
      if (input.name && input.name.trim()) patch.name = input.name.trim();
      if (input.symbol && input.symbol.trim()) patch.symbol = input.symbol.trim();
      const { error } = await supabase
        .from("wealth_investments")
        .update(patch)
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Investment linked");
      qc.invalidateQueries({ queryKey: wealthKeys.investments });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to link investment"),
  });
}

export function useDeleteInvestment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wealth_investments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Investment deleted");
      qc.invalidateQueries({ queryKey: wealthKeys.investments });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });
}

export function useBulkInsertInvestments() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: InvestmentInput[]) => {
      const user_id = await uid();
      const payload = rows.map((r) => ({ ...investmentPayload(r), user_id }));
      if (!payload.length) return 0;
      const { error } = await supabase.from("wealth_investments").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (count) => {
      toast.success(`Imported ${count} investment${count === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: wealthKeys.investments });
    },
    onError: (e: Error) => toast.error(e.message || "Import failed"),
  });
}

/* =================== INSURANCE =================== */
export type InsuranceType =
  | "Term Life"
  | "Health"
  | "Vehicle"
  | "Personal Accident"
  | "Property"
  | "Travel"
  | "Other";

export const INSURANCE_TYPES: InsuranceType[] = [
  "Term Life",
  "Health",
  "Vehicle",
  "Personal Accident",
  "Property",
  "Travel",
  "Other",
];

export type Insurance = {
  id: string;
  user_id: string;
  policy_name: string;
  policy_number: string | null;
  policy_type: string;
  provider: string | null;
  coverage_amount: number;
  premium_amount: number | null;
  premium_frequency: string | null;
  start_date: string | null;
  renewal_date: string | null;
  end_date: string | null;
  nominee_member_id: string | null;
  insured_member_id: string | null;
  claim_status: string | null;
  status: string;
  notes: string | null;
  payment_mode: string | null;
  payment_account_id: string | null;
  created_at: string;
  updated_at: string;
};

export type InsuranceInput = {
  id?: string;
  policy_name: string;
  policy_number?: string | null;
  policy_type: string;
  provider?: string | null;
  coverage_amount: number;
  premium_amount?: number | null;
  premium_frequency?: string | null;
  start_date?: string | null;
  renewal_date?: string | null;
  end_date?: string | null;
  status?: string;
  notes?: string | null;
  payment_mode?: string | null;
  payment_account_id?: string | null;
};

export function useInsurance() {
  return useQuery({
    queryKey: wealthKeys.insurance,
    queryFn: async (): Promise<Insurance[]> => {
      const { data, error } = await supabase
        .from("wealth_insurance")
        .select("*")
        .order("renewal_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        coverage_amount: num(r.coverage_amount),
        premium_amount: r.premium_amount == null ? null : num(r.premium_amount),
      })) as Insurance[];
    },
  });
}

function insurancePayload(i: InsuranceInput) {
  return {
    policy_name: i.policy_name.trim(),
    policy_number: i.policy_number?.trim() || null,
    policy_type: i.policy_type,
    provider: i.provider?.trim() || null,
    coverage_amount: Number(i.coverage_amount) || 0,
    premium_amount: numOrNull(i.premium_amount),
    premium_frequency: i.premium_frequency || null,
    start_date: i.start_date || null,
    renewal_date: i.renewal_date || null,
    end_date: i.end_date || null,
    status: i.status || "active",
    notes: i.notes?.trim() || null,
    payment_mode: i.payment_mode?.trim() || null,
    payment_account_id: i.payment_account_id || null,
  };
}

export function useUpsertInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InsuranceInput) => {
      const user_id = await uid();
      const payload = insurancePayload(input);
      if (input.id) {
        const { error } = await supabase
          .from("wealth_insurance")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wealth_insurance")
          .insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Policy saved");
      qc.invalidateQueries({ queryKey: wealthKeys.insurance });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save policy"),
  });
}

export function useDeleteInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wealth_insurance").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Policy deleted");
      qc.invalidateQueries({ queryKey: wealthKeys.insurance });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });
}

export function useBulkInsertInsurance() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: InsuranceInput[]) => {
      const user_id = await uid();
      const payload = rows.map((r) => ({ ...insurancePayload(r), user_id }));
      if (!payload.length) return 0;
      const { error } = await supabase.from("wealth_insurance").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (count) => {
      toast.success(`Imported ${count} polic${count === 1 ? "y" : "ies"}`);
      qc.invalidateQueries({ queryKey: wealthKeys.insurance });
    },
    onError: (e: Error) => toast.error(e.message || "Import failed"),
  });
}

/* =================== Investment math =================== */

/** Compute CAGR % from invested → current over years (>= 0.01). */
export function cagrPct(invested: number, current: number, years: number) {
  if (invested <= 0 || current <= 0 || years <= 0.01) return 0;
  return (Math.pow(current / invested, 1 / years) - 1) * 100;
}

function yearsBetween(a: Date, b: Date) {
  return (b.getTime() - a.getTime()) / (365.25 * 86400000);
}

/**
 * XIRR via Newton-Raphson on { date, amount } cashflows.
 * Outflows (buys) should be negative; inflows (current value / sells) positive.
 * Returns percentage bounded to [-100, 200]. Returns 0 when it cannot converge
 * to a realistic value — never a runaway/infinite/NaN number.
 */
export function xirr(
  flows: { date: Date; amount: number }[],
  guess = 0.1,
): number {
  const cf = flows
    .filter(
      (f) =>
        f.amount !== 0 &&
        Number.isFinite(f.amount) &&
        f.date instanceof Date &&
        !isNaN(f.date.getTime()),
    )
    .sort((a, b) => a.date.getTime() - b.date.getTime());
  if (cf.length < 2) return 0;
  if (!cf.some((f) => f.amount > 0) || !cf.some((f) => f.amount < 0)) return 0;

  const t0 = cf[0].date;
  const tLast = cf[cf.length - 1].date;
  const spanDays = (tLast.getTime() - t0.getTime()) / 86400000;
  if (spanDays <= 0) {
    // Same-day flows: use simple return, not annualised (avoids runaway CAGR).
    const invested = cf.filter((f) => f.amount < 0).reduce((s, f) => s + -f.amount, 0);
    const returned = cf.filter((f) => f.amount > 0).reduce((s, f) => s + f.amount, 0);
    if (invested <= 0) return 0;
    return Math.max(-100, Math.min(200, ((returned - invested) / invested) * 100));
  }

  let r = guess;
  for (let i = 0; i < 100; i++) {
    let v = 0;
    let d = 0;
    for (const f of cf) {
      const t = yearsBetween(t0, f.date);
      const p = Math.pow(1 + r, t);
      if (!isFinite(p) || p === 0) return 0;
      v += f.amount / p;
      d += -(t * f.amount) / (p * (1 + r));
    }
    if (!isFinite(v) || !isFinite(d) || Math.abs(d) < 1e-10) break;
    const r1 = r - v / d;
    if (!isFinite(r1)) return 0;
    if (Math.abs(r1) > 5) return 0; // runaway — bail
    if (Math.abs(r1 - r) < 1e-7) {
      r = r1;
      break;
    }
    r = r1;
  }

  const pct = r * 100;
  if (!isFinite(pct)) return 0;
  return Math.max(-100, Math.min(200, pct));
}

/** Aggregate XIRR for a set of investments using purchase_date → current_value. */
export function portfolioXirr(rows: Investment[]) {
  const today = new Date();
  const flows: { date: Date; amount: number }[] = [];
  let totalCurrent = 0;
  for (const r of rows) {
    const qty = Number(r.quantity) || 0;
    const avg = Number(r.avg_price) || 0;
    const px = Number(r.current_price) || 0;
    if (qty <= 0 || avg <= 0) continue;
    if (!r.purchase_date) continue;
    const d = new Date(r.purchase_date);
    if (isNaN(d.getTime())) continue;
    const invested = r.invested_value ?? qty * avg;
    const rawCurrent = r.current_value ?? qty * px;
    const current = rawCurrent > 0 ? rawCurrent : invested;
    flows.push({ date: d, amount: -invested });
    totalCurrent += current;
  }
  if (!flows.length || totalCurrent <= 0 || !isFinite(totalCurrent)) return 0;
  flows.push({ date: today, amount: totalCurrent });
  return xirr(flows);
}

/** Per-investment XIRR (single buy → current value). */
export function singleXirr(inv: Investment) {
  const qty = Number(inv.quantity) || 0;
  const avg = Number(inv.avg_price) || 0;
  const px = Number(inv.current_price) || 0;
  if (qty <= 0 || avg <= 0 || !inv.purchase_date) return 0;
  const d = new Date(inv.purchase_date);
  if (isNaN(d.getTime())) return 0;
  const invested = inv.invested_value ?? qty * avg;
  const rawCurrent = inv.current_value ?? qty * px;
  const current = rawCurrent > 0 ? rawCurrent : invested;
  if (invested <= 0 || current <= 0) return 0;
  return xirr([
    { date: d, amount: -invested },
    { date: new Date(), amount: current },
  ]);
}

/** Days from today to date — negative if past. */
export function daysUntil(date: string | null) {
  if (!date) return null;
  const d = new Date(date).getTime();
  return Math.ceil((d - Date.now()) / 86400000);
}

/* =================== ACCOUNTS =================== */
export type AccountType =
  | "Bank Account"
  | "Credit Card"
  | "Wallet"
  | "Loan"
  | "Cash"
  | "Other";

export const ACCOUNT_TYPES: AccountType[] = [
  "Bank Account",
  "Credit Card",
  "Wallet",
  "Loan",
  "Cash",
  "Other",
];

export type Account = {
  id: string;
  user_id: string;
  name: string;
  account_type: string;
  provider: string | null;
  account_number_masked: string | null;
  ifsc: string | null;
  balance: number;
  currency: string;
  owner_member_id: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type AccountInput = {
  id?: string;
  name: string;
  account_type: string;
  provider?: string | null;
  account_number_masked?: string | null;
  ifsc?: string | null;
  balance: number;
  currency?: string;
  owner_member_id?: string | null;
  status?: string;
  notes?: string | null;
};

export function useAccounts() {
  return useQuery({
    queryKey: wealthKeys.accounts,
    queryFn: async (): Promise<Account[]> => {
      const { data, error } = await supabase
        .from("wealth_accounts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({ ...r, balance: num(r.balance) })) as Account[];
    },
  });
}

function accountPayload(a: AccountInput) {
  return {
    name: a.name.trim(),
    account_type: a.account_type,
    provider: a.provider?.trim() || null,
    account_number_masked: a.account_number_masked?.trim() || null,
    ifsc: a.ifsc?.trim() || null,
    balance: Number(a.balance) || 0,
    currency: a.currency || "INR",
    owner_member_id: a.owner_member_id || null,
    status: a.status || "active",
    notes: a.notes?.trim() || null,
  };
}

export function useUpsertAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: AccountInput) => {
      const user_id = await uid();
      const payload = accountPayload(input);
      if (input.id) {
        const { error } = await supabase.from("wealth_accounts").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wealth_accounts").insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Account saved");
      qc.invalidateQueries({ queryKey: wealthKeys.accounts });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save account"),
  });
}

export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wealth_accounts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Account deleted");
      qc.invalidateQueries({ queryKey: wealthKeys.accounts });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });
}

export function useBulkInsertAccounts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: AccountInput[]) => {
      const user_id = await uid();
      const payload = rows.map((r) => ({ ...accountPayload(r), user_id }));
      if (!payload.length) return 0;
      const { error } = await supabase.from("wealth_accounts").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (count) => {
      toast.success(`Imported ${count} account${count === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: wealthKeys.accounts });
    },
    onError: (e: Error) => toast.error(e.message || "Import failed"),
  });
}

/* =================== FAMILY =================== */
export const RELATIONSHIPS = [
  "Self",
  "Spouse",
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Brother",
  "Sister",
  "Grandfather",
  "Grandmother",
  "Other",
] as const;
export type Relationship = (typeof RELATIONSHIPS)[number];

export type FamilyMember = {
  id: string;
  user_id: string;
  name: string;
  relationship: string;
  date_of_birth: string | null;
  gender: string | null;
  is_dependent: boolean;
  is_nominee: boolean;
  pan: string | null;
  aadhaar_masked: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type FamilyMemberInput = {
  id?: string;
  name: string;
  relationship: string;
  date_of_birth?: string | null;
  gender?: string | null;
  is_dependent?: boolean;
  is_nominee?: boolean;
  pan?: string | null;
  aadhaar_masked?: string | null;
  email?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export function useFamily() {
  return useQuery({
    queryKey: wealthKeys.family,
    queryFn: async (): Promise<FamilyMember[]> => {
      const { data, error } = await supabase
        .from("wealth_family_members")
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FamilyMember[];
    },
  });
}

function familyPayload(m: FamilyMemberInput) {
  return {
    name: m.name.trim(),
    relationship: m.relationship,
    date_of_birth: m.date_of_birth || null,
    gender: m.gender?.trim() || null,
    is_dependent: !!m.is_dependent,
    is_nominee: !!m.is_nominee,
    pan: m.pan?.trim() || null,
    aadhaar_masked: m.aadhaar_masked?.trim() || null,
    email: m.email?.trim() || null,
    phone: m.phone?.trim() || null,
    notes: m.notes?.trim() || null,
  };
}

export function useUpsertFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: FamilyMemberInput) => {
      const user_id = await uid();
      const payload = familyPayload(input);
      if (input.id) {
        const { error } = await supabase.from("wealth_family_members").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("wealth_family_members").insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Member saved");
      qc.invalidateQueries({ queryKey: wealthKeys.family });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save member"),
  });
}

export function useDeleteFamilyMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wealth_family_members").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Member deleted");
      qc.invalidateQueries({ queryKey: wealthKeys.family });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });
}

export function useBulkInsertFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (rows: FamilyMemberInput[]) => {
      const user_id = await uid();
      const payload = rows.map((r) => ({ ...familyPayload(r), user_id }));
      if (!payload.length) return 0;
      const { error } = await supabase.from("wealth_family_members").insert(payload);
      if (error) throw error;
      return payload.length;
    },
    onSuccess: (count) => {
      toast.success(`Imported ${count} member${count === 1 ? "" : "s"}`);
      qc.invalidateQueries({ queryKey: wealthKeys.family });
    },
    onError: (e: Error) => toast.error(e.message || "Import failed"),
  });
}

/** Age in whole years from a YYYY-MM-DD date. */
export function ageFromDob(dob: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  if (isNaN(d.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - d.getFullYear();
  const m = now.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
  return age;
}
/* =================== Investment Transactions =================== */
export type InvestmentTxn = {
  id: string;
  user_id: string;
  investment_id: string;
  txn_type: "buy" | "sell" | string;
  quantity: number;
  price: number;
  amount: number;
  occurred_on: string;
  notes: string | null;
  payment_mode: string | null;
  payment_account_id: string | null;
  created_at: string;
  updated_at: string;
};

export type InvestmentTxnInput = {
  id?: string;
  investment_id: string;
  txn_type: "buy" | "sell";
  quantity: number;
  price: number;
  amount?: number;
  occurred_on: string;
  notes?: string | null;
  payment_mode?: string | null;
  payment_account_id?: string | null;
};

export function useInvestmentTxns(investment_id: string | null | undefined) {
  return useQuery({
    queryKey: [...wealthKeys.investmentTxns, investment_id ?? "none"],
    enabled: !!investment_id,
    queryFn: async (): Promise<InvestmentTxn[]> => {
      const { data, error } = await supabase
        .from("wealth_investment_txns")
        .select("*")
        .eq("investment_id", investment_id!)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        quantity: num(r.quantity),
        price: num(r.price),
        amount: num(r.amount),
      })) as InvestmentTxn[];
    },
  });
}

export function useUpsertInvestmentTxn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: InvestmentTxnInput) => {
      const user_id = await uid();
      const qty = Number(input.quantity) || 0;
      const price = Number(input.price) || 0;
      const amount = Number(input.amount ?? qty * price) || 0;
      const payload = {
        investment_id: input.investment_id,
        txn_type: input.txn_type,
        quantity: qty,
        price,
        amount,
        occurred_on: input.occurred_on,
        notes: input.notes?.trim() || null,
        payment_mode: input.payment_mode ?? null,
        payment_account_id: input.payment_account_id ?? null,
      };
      if (input.id) {
        const { error } = await supabase
          .from("wealth_investment_txns")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wealth_investment_txns")
          .insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      toast.success("Transaction saved");
      qc.invalidateQueries({ queryKey: [...wealthKeys.investmentTxns, vars.investment_id] });
      qc.invalidateQueries({ queryKey: wealthKeys.investmentTxns });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save transaction"),
  });
}

export function useDeleteInvestmentTxn() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; investment_id: string }) => {
      const { error } = await supabase
        .from("wealth_investment_txns")
        .delete()
        .eq("id", payload.id);
      if (error) throw error;
      return payload;
    },
    onSuccess: (p) => {
      toast.success("Transaction deleted");
      qc.invalidateQueries({ queryKey: [...wealthKeys.investmentTxns, p.investment_id] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete transaction"),
  });
}

export function useUpdateInvestmentNotes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; notes: string | null }) => {
      const { error } = await supabase
        .from("wealth_investments")
        .update({ notes: payload.notes?.trim() || null })
        .eq("id", payload.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notes saved");
      qc.invalidateQueries({ queryKey: wealthKeys.investments });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save notes"),
  });
}

/** Transactions for several holdings at once (used by merged / duplicate rows). */
export function useInvestmentTxnsMulti(ids: string[]) {
  const key = [...ids].sort().join(",");
  return useQuery({
    queryKey: [...wealthKeys.investmentTxns, "multi", key],
    enabled: ids.length > 0,
    queryFn: async (): Promise<InvestmentTxn[]> => {
      const { data, error } = await supabase
        .from("wealth_investment_txns")
        .select("*")
        .in("investment_id", ids)
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r: any) => ({
        ...r,
        quantity: num(r.quantity),
        price: num(r.price),
        amount: num(r.amount),
      })) as InvestmentTxn[];
    },
  });
}

/** Transaction count per investment id — powers the badge on holdings rows. */
export function useInvestmentTxnCounts() {
  return useQuery({
    queryKey: [...wealthKeys.investmentTxns, "counts"],
    queryFn: async (): Promise<Record<string, number>> => {
      const { data, error } = await supabase
        .from("wealth_investment_txns")
        .select("investment_id");
      if (error) throw error;
      const out: Record<string, number> = {};
      for (const r of (data ?? []) as Array<{ investment_id: string }>) {
        out[r.investment_id] = (out[r.investment_id] ?? 0) + 1;
      }
      return out;
    },
    staleTime: 60 * 1000,
  });
}
