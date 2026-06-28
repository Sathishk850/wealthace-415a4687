import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

/* ============ Types ============ */

export const CHANNELS = ["in_app", "email", "push", "sms", "whatsapp"] as const;
export type Channel = (typeof CHANNELS)[number];

export type ChannelMap = Record<Channel, boolean>;

export type Notification = {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  category: "reminder" | "report" | "system" | "insight" | "general";
  priority: "low" | "normal" | "high" | "urgent";
  link: string | null;
  metadata: Record<string, unknown>;
  read_at: string | null;
  created_at: string;
  updated_at: string;
};

export type NotificationPreferences = {
  user_id: string;
  channels: ChannelMap;
  per_type: Record<string, Partial<ChannelMap>>;
  reports: Partial<ChannelMap>;
  timezone: string;
  quiet_hours: { enabled: boolean; start: string; end: string };
  created_at: string;
  updated_at: string;
};

export type ScheduleFrequency = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
export type ScheduleFormat = "pdf" | "excel" | "csv";

export type ScheduledReport = {
  id: string;
  user_id: string;
  name: string;
  report_keys: string[];
  formats: ScheduleFormat[];
  frequency: ScheduleFrequency;
  cron_expr: string | null;
  date_range: "last_period" | "ytd" | "mtd" | "all";
  recipients: string[];
  cc: string[];
  bcc: string[];
  channels: Partial<ChannelMap>;
  include_ai_insights: boolean;
  active: boolean;
  next_run_at: string;
  last_run_at: string | null;
  last_status: string | null;
  created_at: string;
  updated_at: string;
};

export type DeliveryLog = {
  id: string;
  user_id: string;
  channel: Channel;
  template: string;
  recipient: string | null;
  subject: string | null;
  payload: Record<string, unknown>;
  status: "pending" | "sent" | "failed" | "suppressed" | "retrying";
  attempts: number;
  last_error: string | null;
  scheduled_for: string;
  sent_at: string | null;
  related_kind: string | null;
  related_id: string | null;
  created_at: string;
  updated_at: string;
};

/* ============ Keys ============ */
export const notifKeys = {
  list: ["notifications", "list"] as const,
  unread: ["notifications", "unread"] as const,
  prefs: ["notifications", "prefs"] as const,
  schedules: ["notifications", "schedules"] as const,
  log: ["notifications", "log"] as const,
};

async function uid() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Not authenticated");
  return data.user.id;
}

/* ============ Notifications ============ */

export function useNotifications(limit = 50) {
  return useQuery({
    queryKey: [...notifKeys.list, limit],
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as Notification[];
    },
    refetchInterval: 60_000,
  });
}

export function useUnreadCount() {
  return useQuery({
    queryKey: notifKeys.unread,
    queryFn: async (): Promise<number> => {
      const { count, error } = await supabase
        .from("notifications" as never)
        .select("id", { head: true, count: "exact" })
        .is("read_at", null);
      if (error) throw error;
      return count ?? 0;
    },
    refetchInterval: 60_000,
  });
}

export function useMarkRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[] | "all") => {
      const q = supabase.from("notifications" as never).update({ read_at: new Date().toISOString() });
      const { error } = ids === "all"
        ? await q.is("read_at", null)
        : await q.in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
}

export function useDeleteNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notifications" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

/** Create an in-app notification for the current user. */
export async function createNotification(input: {
  title: string;
  body?: string;
  category?: Notification["category"];
  priority?: Notification["priority"];
  link?: string;
  metadata?: Record<string, unknown>;
}) {
  const user_id = await uid();
  const { error } = await supabase.from("notifications" as never).insert({
    user_id,
    title: input.title,
    body: input.body ?? null,
    category: input.category ?? "general",
    priority: input.priority ?? "normal",
    link: input.link ?? null,
    metadata: input.metadata ?? {},
  });
  if (error) throw error;
}

/* ============ Preferences ============ */

const DEFAULT_PREFS: NotificationPreferences = {
  user_id: "",
  channels: { in_app: true, email: true, push: false, sms: false, whatsapp: false },
  per_type: {},
  reports: { in_app: true, email: true },
  timezone: typeof Intl !== "undefined" ? Intl.DateTimeFormat().resolvedOptions().timeZone : "UTC",
  quiet_hours: { enabled: false, start: "22:00", end: "07:00" },
  created_at: "",
  updated_at: "",
};

export function usePreferences() {
  return useQuery({
    queryKey: notifKeys.prefs,
    queryFn: async (): Promise<NotificationPreferences> => {
      const user_id = await uid();
      const { data, error } = await supabase
        .from("notification_preferences" as never)
        .select("*")
        .eq("user_id", user_id)
        .maybeSingle();
      if (error) throw error;
      if (!data) return { ...DEFAULT_PREFS, user_id };
      return data as unknown as NotificationPreferences;
    },
  });
}

export function useUpdatePreferences() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<NotificationPreferences>) => {
      const user_id = await uid();
      const { error } = await supabase
        .from("notification_preferences" as never)
        .upsert({ user_id, ...patch }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preferences saved");
      qc.invalidateQueries({ queryKey: notifKeys.prefs });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save preferences"),
  });
}

/* ============ Scheduled Reports ============ */

export function useScheduledReports() {
  return useQuery({
    queryKey: notifKeys.schedules,
    queryFn: async (): Promise<ScheduledReport[]> => {
      const { data, error } = await supabase
        .from("scheduled_reports" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ScheduledReport[];
    },
  });
}

export function computeNextRun(freq: ScheduleFrequency, from = new Date()): Date {
  const d = new Date(from);
  d.setHours(8, 0, 0, 0); // 8am local
  if (freq === "daily") d.setDate(d.getDate() + 1);
  else if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "monthly") d.setMonth(d.getMonth() + 1);
  else if (freq === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (freq === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setDate(d.getDate() + 1);
  return d;
}

export function useUpsertScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: Partial<ScheduledReport> & { name: string; report_keys: string[]; frequency: ScheduleFrequency }) => {
      const user_id = await uid();
      const next_run_at = input.next_run_at ?? computeNextRun(input.frequency).toISOString();
      const payload = {
        name: input.name.trim(),
        report_keys: input.report_keys,
        formats: input.formats ?? ["pdf"],
        frequency: input.frequency,
        cron_expr: input.cron_expr ?? null,
        date_range: input.date_range ?? "last_period",
        recipients: input.recipients ?? [],
        cc: input.cc ?? [],
        bcc: input.bcc ?? [],
        channels: input.channels ?? { email: true, in_app: true },
        include_ai_insights: input.include_ai_insights ?? true,
        active: input.active ?? true,
        next_run_at,
      };
      if (input.id) {
        const { error } = await supabase.from("scheduled_reports" as never).update(payload).eq("id", input.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("scheduled_reports" as never).insert({ ...payload, user_id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Schedule saved");
      qc.invalidateQueries({ queryKey: notifKeys.schedules });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save schedule"),
  });
}

export function useDeleteScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("scheduled_reports" as never).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Schedule removed");
      qc.invalidateQueries({ queryKey: notifKeys.schedules });
    },
  });
}

export function useToggleScheduledReport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase.from("scheduled_reports" as never).update({ active }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: notifKeys.schedules }),
  });
}

/* ============ Delivery Log ============ */

export function useDeliveryLog(limit = 100) {
  return useQuery({
    queryKey: [...notifKeys.log, limit],
    queryFn: async (): Promise<DeliveryLog[]> => {
      const { data, error } = await supabase
        .from("notification_delivery_log" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data ?? []) as unknown as DeliveryLog[];
    },
  });
}

/**
 * Enqueue a delivery — channel-agnostic. Writes status='pending' to the log.
 * The cron worker picks up pending rows and dispatches them. Email sender
 * is stubbed until an email domain is verified; flipping it on requires no
 * client-side code changes.
 */
export async function enqueueDelivery(input: {
  channel: Channel;
  template: string;
  recipient?: string;
  subject?: string;
  payload?: Record<string, unknown>;
  related_kind?: string;
  related_id?: string;
  scheduled_for?: string;
}) {
  const user_id = await uid();
  const { error } = await supabase.from("notification_delivery_log" as never).insert({
    user_id,
    channel: input.channel,
    template: input.template,
    recipient: input.recipient ?? null,
    subject: input.subject ?? null,
    payload: input.payload ?? {},
    status: "pending",
    scheduled_for: input.scheduled_for ?? new Date().toISOString(),
    related_kind: input.related_kind ?? null,
    related_id: input.related_id ?? null,
  });
  if (error) throw error;
}

/* ============ Helpers ============ */
export const CHANNEL_LABEL: Record<Channel, string> = {
  in_app: "In-App",
  email: "Email",
  push: "Browser Push",
  sms: "SMS",
  whatsapp: "WhatsApp",
};

export const FREQUENCY_LABEL: Record<ScheduleFrequency, string> = {
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  quarterly: "Quarterly",
  yearly: "Yearly",
  custom: "Custom",
};