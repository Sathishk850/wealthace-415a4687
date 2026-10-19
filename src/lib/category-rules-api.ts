import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { applyRules, type CategoryRule } from "./category-rules";

export { applyRules, applyRulesToTransactions, type CategoryRule } from "./category-rules";

export const ruleKeys = {
  all: ["money", "category-rules"] as const,
};

export function useCategoryRules() {
  return useQuery({
    queryKey: ruleKeys.all,
    queryFn: async (): Promise<CategoryRule[]> => {
      const { data, error } = await supabase
        .from("money_category_rules")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CategoryRule[];
    },
  });
}

export function useUpsertCategoryRule(opts: { silent?: boolean } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      keywords: string[];
      category_id: string;
      kind: "income" | "expense";
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const keywords = Array.from(
        new Set(input.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean)),
      );
      if (!keywords.length) throw new Error("Add at least one keyword");
      const payload = {
        keywords,
        category_id: input.category_id,
        kind: input.kind,
        updated_at: new Date().toISOString(),
      };
      if (input.id) {
        const { error } = await supabase.from("money_category_rules").update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("money_category_rules")
          .insert({ ...payload, user_id: user.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      if (!opts.silent) toast.success("Rule saved");
      qc.invalidateQueries({ queryKey: ruleKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save rule"),
  });
}

export function useDeleteCategoryRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("money_category_rules").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Rule deleted");
      qc.invalidateQueries({ queryKey: ruleKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete rule"),
  });
}

/** Re-export for convenience in non-hook callers. */
export const matchRule = applyRules;
