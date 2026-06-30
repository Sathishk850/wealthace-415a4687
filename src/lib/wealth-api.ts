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
      };
      if (input.id) {
        const { error } = await supabase
          .from("wealth_assets")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wealth_assets")
          .insert({ ...payload, user_id });
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
      };
      if (input.id) {
        const { error } = await supabase
          .from("wealth_liabilities")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wealth_liabilities")
          .insert({ ...payload, user_id });
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