import { supabase } from "@/integrations/supabase/client";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

export type Kind = "income" | "expense";

export type Category = {
  id: string;
  user_id: string;
  name: string;
  kind: Kind;
  color: string;
  icon: string;
  created_at: string;
  updated_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  kind: Kind;
  amount: number;
  occurred_on: string; // YYYY-MM-DD
  category_id: string | null;
  merchant: string;
  account: string | null;
  note: string | null;
  created_at: string;
  updated_at: string;
};

export type Budget = {
  id: string;
  user_id: string;
  category_id: string;
  period_month: string; // YYYY-MM-01
  amount_limit: number;
  created_at: string;
  updated_at: string;
};

export const keys = {
  categories: ["money", "categories"] as const,
  transactions: ["money", "transactions"] as const,
  budgets: ["money", "budgets"] as const,
};

async function uid() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

/* ---------- CATEGORIES ---------- */
export function useCategories() {
  return useQuery({
    queryKey: keys.categories,
    queryFn: async (): Promise<Category[]> => {
      const { data, error } = await supabase
        .from("money_categories")
        .select("*")
        .order("name", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Category[];
    },
  });
}

export function useUpsertCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      kind: Kind;
      color: string;
      icon: string;
    }) => {
      const user_id = await uid();
      if (input.id) {
        const { error } = await supabase
          .from("money_categories")
          .update({
            name: input.name.trim(),
            kind: input.kind,
            color: input.color,
            icon: input.icon,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("money_categories").insert({
          user_id,
          name: input.name.trim(),
          kind: input.kind,
          color: input.color,
          icon: input.icon,
        });
        if (error) {
          if (error.code === "23505")
            throw new Error("A category with this name already exists.");
          throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success("Category saved");
      qc.invalidateQueries({ queryKey: keys.categories });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save category"),
  });
}

export function useDeleteCategory() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("money_categories")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Category deleted");
      qc.invalidateQueries({ queryKey: keys.categories });
      qc.invalidateQueries({ queryKey: keys.transactions });
      qc.invalidateQueries({ queryKey: keys.budgets });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });
}

/* ---------- TRANSACTIONS ---------- */
export function useTransactions() {
  return useQuery({
    queryKey: keys.transactions,
    queryFn: async (): Promise<Transaction[]> => {
      const { data, error } = await supabase
        .from("money_transactions")
        .select("*")
        .order("occurred_on", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...(r as any),
        amount: Number((r as any).amount),
      })) as Transaction[];
    },
  });
}

export function useUpsertTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      kind: Kind;
      amount: number;
      occurred_on: string;
      category_id: string | null;
      merchant: string;
      account?: string | null;
      note?: string | null;
    }) => {
      const user_id = await uid();
      const payload = {
        kind: input.kind,
        amount: input.amount,
        occurred_on: input.occurred_on,
        category_id: input.category_id,
        merchant: input.merchant.trim(),
        account: input.account?.trim() || null,
        note: input.note?.trim() || null,
      };
      if (input.id) {
        const { error } = await supabase
          .from("money_transactions")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("money_transactions")
          .insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Transaction saved");
      qc.invalidateQueries({ queryKey: keys.transactions });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("money_transactions")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Transaction deleted");
      qc.invalidateQueries({ queryKey: keys.transactions });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });
}

/* ---------- BUDGETS ---------- */
export function useBudgets() {
  return useQuery({
    queryKey: keys.budgets,
    queryFn: async (): Promise<Budget[]> => {
      const { data, error } = await supabase
        .from("money_budgets")
        .select("*")
        .order("period_month", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        ...(r as any),
        amount_limit: Number((r as any).amount_limit),
      })) as Budget[];
    },
  });
}

export function useUpsertBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      category_id: string;
      period_month: string; // YYYY-MM-01
      amount_limit: number;
    }) => {
      const user_id = await uid();
      if (input.id) {
        const { error } = await supabase
          .from("money_budgets")
          .update({
            category_id: input.category_id,
            period_month: input.period_month,
            amount_limit: input.amount_limit,
          })
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("money_budgets").insert({
          user_id,
          category_id: input.category_id,
          period_month: input.period_month,
          amount_limit: input.amount_limit,
        });
        if (error) {
          if (error.code === "23505")
            throw new Error(
              "A budget for this category and month already exists."
            );
          throw error;
        }
      }
    },
    onSuccess: () => {
      toast.success("Budget saved");
      qc.invalidateQueries({ queryKey: keys.budgets });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("money_budgets")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Budget deleted");
      qc.invalidateQueries({ queryKey: keys.budgets });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });
}

/* ---------- helpers ---------- */
export const inr = (n: number) =>
  "₹ " + Math.round(n).toLocaleString("en-IN");
export const inrCompact = (n: number) =>
  (n < 0 ? "-" : "") + "₹" + Math.abs(Math.round(n)).toLocaleString("en-IN");

export function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}
export function currentMonthKey() {
  return monthKey(new Date());
}
export function formatMonthLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleString("en-IN", { month: "long", year: "numeric" });
}
export function formatDateLabel(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
export function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(d.getDate()).padStart(2, "0")}`;
}

export const PALETTE = [
  "#22C55E",
  "#3B82F6",
  "#F97316",
  "#A78BFA",
  "#EF4444",
  "#EC4899",
  "#14D8CF",
  "#FBBF24",
  "#6E8294",
];