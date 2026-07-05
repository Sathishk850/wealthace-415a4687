import { supabase } from "@/integrations/supabase/client";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

export const GOAL_TYPES = [
  "emergency_fund",
  "vehicle",
  "house",
  "education",
  "wedding",
  "vacation",
  "business",
  "custom",
] as const;
export type GoalType = (typeof GOAL_TYPES)[number];

export const GOAL_TYPE_LABEL: Record<GoalType, string> = {
  emergency_fund: "Emergency Fund",
  vehicle: "Vehicle",
  house: "House",
  education: "Education",
  wedding: "Wedding",
  vacation: "Vacation",
  business: "Business",
  custom: "Custom",
};

export type Goal = {
  id: string;
  user_id: string;
  name: string;
  goal_type: GoalType;
  target_amount: number;
  saved_amount: number;
  target_date: string | null;
  monthly_contribution: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PlannerSettings = {
  user_id: string;
  current_age: number;
  retirement_age: number;
  life_expectancy: number;
  monthly_expense: number;
  inflation_pct: number;
  pre_return_pct: number;
  post_return_pct: number;
  current_corpus: number;
  monthly_sip: number;
  withdrawal_rate_pct: number;
  retirement_plan_saved: boolean;
  fire_plan_saved: boolean;
  created_at: string;
  updated_at: string;
};

export type RetirementPlan = {
  user_id: string;
  current_age: number;
  retirement_age: number;
  life_expectancy: number;
  monthly_expense: number;
  inflation_pct: number;
  pre_return_pct: number;
  post_return_pct: number;
  current_corpus: number;
  monthly_sip: number;
  created_at: string;
  updated_at: string;
};

export type FirePlan = {
  user_id: string;
  current_age: number;
  monthly_expense: number;
  current_corpus: number;
  monthly_sip: number;
  pre_return_pct: number;
  withdrawal_rate_pct: number;
  created_at: string;
  updated_at: string;
};

export const plannerKeys = {
  goals: ["planner", "goals"] as const,
  settings: ["planner", "settings"] as const,
  retirementPlan: ["planner", "retirement-plan"] as const,
  firePlan: ["planner", "fire-plan"] as const,
};

async function uid() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

const num = (r: any, keys: string[]) => {
  const out: any = { ...r };
  for (const k of keys) if (out[k] != null) out[k] = Number(out[k]);
  return out;
};

/* ---------- GOALS ---------- */
export function useGoals() {
  return useQuery({
    queryKey: plannerKeys.goals,
    queryFn: async (): Promise<Goal[]> => {
      const { data, error } = await supabase
        .from("planner_goals")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((r) =>
        num(r, ["target_amount", "saved_amount", "monthly_contribution"])
      ) as Goal[];
    },
  });
}

export function useUpsertGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id?: string;
      name: string;
      goal_type: GoalType;
      target_amount: number;
      saved_amount: number;
      target_date: string | null;
      monthly_contribution: number;
      notes?: string | null;
    }) => {
      const user_id = await uid();
      const payload = {
        name: input.name.trim(),
        goal_type: input.goal_type,
        target_amount: input.target_amount,
        saved_amount: input.saved_amount,
        target_date: input.target_date,
        monthly_contribution: input.monthly_contribution,
        notes: input.notes?.trim() || null,
      };
      if (input.id) {
        const { error } = await supabase
          .from("planner_goals")
          .update(payload)
          .eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("planner_goals")
          .insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Goal saved");
      qc.invalidateQueries({ queryKey: plannerKeys.goals });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save goal"),
  });
}

export function useDeleteGoal() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("planner_goals")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Goal deleted");
      qc.invalidateQueries({ queryKey: plannerKeys.goals });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });
}

/* ---------- SETTINGS ---------- */
export function usePlannerSettings() {
  return useQuery({
    queryKey: plannerKeys.settings,
    queryFn: async (): Promise<PlannerSettings | null> => {
      const { data, error } = await supabase
        .from("planner_settings")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return num(data, [
        "current_age",
        "retirement_age",
        "life_expectancy",
        "monthly_expense",
        "inflation_pct",
        "pre_return_pct",
        "post_return_pct",
        "current_corpus",
        "monthly_sip",
        "withdrawal_rate_pct",
      ]) as PlannerSettings;
    },
  });
}

export function useSavePlannerSettings() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<PlannerSettings, "user_id" | "created_at" | "updated_at">) => {
      const user_id = await uid();
      const { error } = await supabase
        .from("planner_settings")
        .upsert({ user_id, ...input }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plan updated");
      qc.invalidateQueries({ queryKey: plannerKeys.settings });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });
}

export function useRetirementPlan() {
  return useQuery({
    queryKey: plannerKeys.retirementPlan,
    queryFn: async (): Promise<RetirementPlan | null> => {
      const user_id = await uid();
      const { data, error } = await supabase
        .from("planner_retirement_plans")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return num(data, [
        "current_age",
        "retirement_age",
        "life_expectancy",
        "monthly_expense",
        "inflation_pct",
        "pre_return_pct",
        "post_return_pct",
        "current_corpus",
        "monthly_sip",
      ]) as RetirementPlan;
    },
  });
}

export function useSaveRetirementPlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<RetirementPlan, "user_id" | "created_at" | "updated_at">) => {
      const user_id = await uid();
      const { error } = await supabase
        .from("planner_retirement_plans")
        .upsert({ user_id, ...input }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Retirement plan saved");
      qc.invalidateQueries({ queryKey: plannerKeys.retirementPlan });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });
}

export function useFirePlan() {
  return useQuery({
    queryKey: plannerKeys.firePlan,
    queryFn: async (): Promise<FirePlan | null> => {
      const user_id = await uid();
      const { data, error } = await supabase
        .from("planner_fire_plans")
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return num(data, [
        "current_age",
        "monthly_expense",
        "current_corpus",
        "monthly_sip",
        "pre_return_pct",
        "withdrawal_rate_pct",
      ]) as FirePlan;
    },
  });
}

export function useSaveFirePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Omit<FirePlan, "user_id" | "created_at" | "updated_at">) => {
      const user_id = await uid();
      const { error } = await supabase
        .from("planner_fire_plans")
        .upsert({ user_id, ...input }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("FIRE plan saved");
      qc.invalidateQueries({ queryKey: plannerKeys.firePlan });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });
}

/* ---------- helpers ---------- */
export const inr = (n: number) =>
  n >= 10000000
    ? `₹${(n / 10000000).toFixed(2)}Cr`
    : n >= 100000
    ? `₹${(n / 100000).toFixed(2)}L`
    : n >= 1000
    ? `₹${(n / 1000).toFixed(1)}K`
    : `₹${Math.round(n)}`;

export const inrFull = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

/** Future value of current corpus + monthly SIP after `years`. */
export function projectCorpus(
  currentCorpus: number,
  monthlySip: number,
  annualReturnPct: number,
  years: number
) {
  const r = annualReturnPct / 100 / 12;
  const n = Math.max(0, years) * 12;
  if (n === 0) return currentCorpus;
  const fvLump = currentCorpus * Math.pow(1 + r, n);
  const fvSip = r === 0 ? monthlySip * n : monthlySip * ((Math.pow(1 + r, n) - 1) / r) * (1 + r);
  return fvLump + fvSip;
}

/** Years required for current corpus + SIP to grow to target. */
export function yearsToReach(
  currentCorpus: number,
  monthlySip: number,
  annualReturnPct: number,
  target: number
) {
  if (currentCorpus >= target) return 0;
  if (monthlySip <= 0 && currentCorpus <= 0) return Infinity;
  let lo = 0;
  let hi = 80;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    const fv = projectCorpus(currentCorpus, monthlySip, annualReturnPct, mid);
    if (fv >= target) hi = mid;
    else lo = mid;
  }
  return hi;
}

/** Required corpus at retirement to sustain expenses through life expectancy. */
export function retirementCorpusNeeded(s: PlannerSettings) {
  const yearsToRet = Math.max(0, s.retirement_age - s.current_age);
  const yearsInRet = Math.max(1, s.life_expectancy - s.retirement_age);
  const annualExpenseToday = s.monthly_expense * 12;
  // inflate to retirement
  const expAtRet = annualExpenseToday * Math.pow(1 + s.inflation_pct / 100, yearsToRet);
  // real return post-retirement
  const realR =
    (1 + s.post_return_pct / 100) / (1 + s.inflation_pct / 100) - 1;
  if (Math.abs(realR) < 1e-6) return expAtRet * yearsInRet;
  // PV of annuity of inflation-adjusted expenses
  return (expAtRet * (1 - Math.pow(1 + realR, -yearsInRet))) / realR;
}

export function fireNumber(s: PlannerSettings) {
  const wr = s.withdrawal_rate_pct / 100;
  if (wr <= 0) return Infinity;
  return (s.monthly_expense * 12) / wr;
}