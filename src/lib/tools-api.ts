import { supabase } from "@/integrations/supabase/client";
import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { toast } from "sonner";

/* ===== Types ===== */
export const REMINDER_KINDS = [
  "sip",
  "emi",
  "loan",
  "credit_card",
  "insurance",
  "subscription",
  "bill",
  "goal",
  "custom",
] as const;
export type ReminderKind = (typeof REMINDER_KINDS)[number];

export const REMINDER_KIND_LABEL: Record<ReminderKind, string> = {
  sip: "SIP",
  emi: "EMI",
  loan: "Loan",
  credit_card: "Credit Card",
  insurance: "Insurance Premium",
  subscription: "Subscription",
  bill: "Bill Payment",
  goal: "Goal Contribution",
  custom: "Custom",
};

export type Recurrence = "none" | "weekly" | "monthly" | "quarterly" | "yearly";

export type Reminder = {
  id: string;
  user_id: string;
  kind: ReminderKind;
  title: string;
  amount: number;
  due_date: string;
  recurrence: Recurrence;
  notify_days_before: number;
  notify_enabled: boolean;
  status: "upcoming" | "completed" | "snoozed";
  notes: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SavedCalculation = {
  id: string;
  user_id: string;
  calc_type: string;
  label: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type ToolsActivity = {
  id: string;
  user_id: string;
  item_type: "report" | "calculator";
  item_slug: string;
  item_label: string;
  last_used_at: string;
  use_count: number;
};

export const toolsKeys = {
  reminders: ["tools", "reminders"] as const,
  savedCalcs: ["tools", "saved_calcs"] as const,
  activity: ["tools", "activity"] as const,
};

async function uid() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

/* ===== Reminders ===== */
export function useReminders() {
  return useQuery({
    queryKey: toolsKeys.reminders,
    queryFn: async (): Promise<Reminder[]> => {
      const { data, error } = await supabase
        .from("tools_reminders" as any)
        .select("*")
        .order("due_date", { ascending: true });
      if (error) throw error;
      return ((data ?? []) as any[]).map((r) => ({
        ...r,
        amount: Number(r.amount),
        notify_days_before: Number(r.notify_days_before),
      })) as Reminder[];
    },
  });
}

export function useUpsertReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<Reminder> & { title: string; due_date: string; kind: ReminderKind }) => {
      const user_id = await uid();
      const payload: any = {
        kind: input.kind,
        title: input.title.trim(),
        amount: input.amount ?? 0,
        due_date: input.due_date,
        recurrence: input.recurrence ?? "none",
        notify_days_before: input.notify_days_before ?? 1,
        notify_enabled: input.notify_enabled ?? true,
        status: input.status ?? "upcoming",
        notes: input.notes?.toString().trim() || null,
      };
      if (input.id) {
        const { error } = await supabase.from("tools_reminders" as any).update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tools_reminders" as any).insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Reminder saved");
      qc.invalidateQueries({ queryKey: toolsKeys.reminders });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save reminder"),
  });
}

export function useDeleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tools_reminders" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Reminder deleted");
      qc.invalidateQueries({ queryKey: toolsKeys.reminders });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });
}

export function useCompleteReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (r: Reminder) => {
      // If recurring, mark this completed AND schedule the next occurrence by advancing due_date
      if (r.recurrence !== "none") {
        const next = advanceDate(r.due_date, r.recurrence);
        const { error } = await supabase.from("tools_reminders" as any)
          .update({ due_date: next, status: "upcoming" })
          .eq("id", r.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tools_reminders" as any)
          .update({ status: "completed", completed_at: new Date().toISOString() })
          .eq("id", r.id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Marked complete");
      qc.invalidateQueries({ queryKey: toolsKeys.reminders });
    },
    onError: (e: Error) => toast.error(e.message || "Failed"),
  });
}

function advanceDate(iso: string, rec: Recurrence): string {
  const d = new Date(iso + "T00:00:00");
  if (rec === "weekly") d.setDate(d.getDate() + 7);
  else if (rec === "monthly") d.setMonth(d.getMonth() + 1);
  else if (rec === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (rec === "yearly") d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
}

/* ===== Saved Calculations ===== */
export function useSavedCalculations() {
  return useQuery({
    queryKey: toolsKeys.savedCalcs,
    queryFn: async (): Promise<SavedCalculation[]> => {
      const { data, error } = await supabase
        .from("tools_saved_calculations" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SavedCalculation[];
    },
  });
}

export function useSaveCalculation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { calc_type: string; label: string; inputs: Record<string, unknown>; outputs: Record<string, unknown> }) => {
      const user_id = await uid();
      const { error } = await supabase.from("tools_saved_calculations" as any).insert({
        user_id,
        calc_type: input.calc_type,
        label: input.label.trim(),
        inputs: input.inputs,
        outputs: input.outputs,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Calculation saved");
      qc.invalidateQueries({ queryKey: toolsKeys.savedCalcs });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save"),
  });
}

export function useDeleteSavedCalculation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tools_saved_calculations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: toolsKeys.savedCalcs });
    },
  });
}

/* ===== Activity tracking ===== */
export function useToolsActivity() {
  return useQuery({
    queryKey: toolsKeys.activity,
    queryFn: async (): Promise<ToolsActivity[]> => {
      const { data, error } = await supabase
        .from("tools_activity" as any)
        .select("*")
        .order("last_used_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as ToolsActivity[];
    },
  });
}

export async function logToolsActivity(item_type: "report" | "calculator", item_slug: string, item_label: string) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const user_id = u.user.id;
    // try update first
    const { data: existing } = await supabase
      .from("tools_activity" as any)
      .select("id, use_count")
      .eq("user_id", user_id)
      .eq("item_type", item_type)
      .eq("item_slug", item_slug)
      .maybeSingle();
    if (existing) {
      await supabase.from("tools_activity" as any).update({
        use_count: (existing as any).use_count + 1,
        last_used_at: new Date().toISOString(),
        item_label,
      }).eq("id", (existing as any).id);
    } else {
      await supabase.from("tools_activity" as any).insert({
        user_id, item_type, item_slug, item_label,
      });
    }
  } catch {
    /* non-blocking */
  }
}

/* ===== utils ===== */
export const inr = (n: number) =>
  "₹" + Math.round(n).toLocaleString("en-IN");

export function daysUntil(iso: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(iso + "T00:00:00");
  return Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}