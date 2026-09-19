import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, Check, X } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAlertSweep, useInsights } from "@/lib/insights";
import { useMarkRead, type Notification } from "@/lib/notifications-api";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

const SESSION_KEY = "alerts-digest-shown-v1";

type DigestNotification = Omit<Notification, "priority"> & {
  priority: Notification["priority"] | "info";
};

function notificationDate(item: DigestNotification) {
  const dueDate = item.metadata?.due_date;
  return typeof dueDate === "string" ? dueDate : item.created_at;
}

function seededRank(value: string, seed: string) {
  let hash = 2166136261;
  for (const char of `${seed}:${value}`) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/**
 * Login-time alert digest.
 *
 * On every sign-in we re-derive every actionable alert (bills, SIPs, EMIs,
 * insurance renewals, maturities, goal reviews, corporate actions, allocation
 * drift, overdue items) and surface everything still unread. The sweep also
 * re-runs daily and whenever module data changes, so the list stays current.
 */
export function AlertsDigest() {
  const markRead = useMarkRead();
  const [open, setOpen] = useState(false);

  const sessionQ = useQuery({
    queryKey: ["auth-session-id"],
    queryFn: async () => (await supabase.auth.getSession()).data.session?.user.id ?? null,
  });

  const { fingerprint, isLoading } = useInsights();
  const sweepQ = useAlertSweep(fingerprint, !!sessionQ.data && !isLoading);


  const unreadQ = useQuery({
    queryKey: ["notifications", "unread-reminders", sessionQ.data],
    enabled: !!sessionQ.data && !!sweepQ.data,
    queryFn: async (): Promise<DigestNotification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .is("read_at", null)
        .eq("category", "reminder")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return (data ?? []) as unknown as DigestNotification[];
    },
  });

  const items = useMemo(() => {
    const rows = unreadQ.data ?? [];
    const currentRebalance = rows.find(
      (item) => item.metadata?.kind === "rebalance" && item.metadata?.rebalance_group,
    );
    const withoutLegacyRebalances = rows.filter(
      (item) => item.metadata?.kind !== "rebalance" || item.id === currentRebalance?.id,
    );
    const high = withoutLegacyRebalances
      .filter((item) => item.priority === "high" || item.priority === "urgent")
      .sort((a, b) => notificationDate(a).localeCompare(notificationDate(b)));
    const normal = withoutLegacyRebalances
      .filter((item) => item.priority === "normal")
      .sort((a, b) => notificationDate(a).localeCompare(notificationDate(b)));
    const seed = new Date().toDateString();
    const info = withoutLegacyRebalances
      .filter((item) => item.priority === "info" || item.priority === "low")
      .sort((a, b) => seededRank(a.id, seed) - seededRank(b.id, seed))
      .slice(0, 3);
    return [...high, ...normal, ...info];
  }, [unreadQ.data]);

  useEffect(() => {
    if (items.length === 0) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY) === sessionQ.data) return;
    sessionStorage.setItem(SESSION_KEY, sessionQ.data ?? "1");
    setOpen(true);
  }, [items.length, sessionQ.data]);

  if (items.length === 0) return null;

  if (!open) return null;

  return (
    <aside
      role="dialog"
      aria-label="Notifications"
      className="fixed bottom-4 right-4 z-50 flex max-h-[420px] w-[360px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-2xl"
    >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <Bell className="h-4 w-4 shrink-0 text-mint" />
            <span className="text-[13px] font-medium">Notifications</span>
            <span className="rounded-full bg-mint px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">
              {items.length}
            </span>
          </div>
          <Button type="button" variant="ghost" size="icon" aria-label="Close notifications" onClick={() => setOpen(false)} className="h-7 w-7">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">
          {items.map((n) => (
            <div
              key={n.id}
              className="relative flex items-start gap-2 border-b border-border px-4 py-3 last:border-b-0"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5 pr-7">
                  {n.priority === "high" || n.priority === "urgent" ? (
                    <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-400">HIGH PRIORITY</span>
                  ) : n.priority === "normal" && Number(n.metadata?.due_days) >= 0 && Number(n.metadata?.due_days) <= 7 ? (
                    <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">DUE SOON</span>
                  ) : null}
                  <p className="text-[13px] font-medium text-foreground">{n.title}</p>
                </div>
                {n.body ? (
                  <p className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{n.body}</p>
                ) : null}
                {n.link ? (
                  <Link
                    to={n.link}
                    onClick={() => setOpen(false)}
                    className="mt-1 inline-block text-[11px] font-medium text-mint"
                  >
                    View →
                  </Link>
                ) : null}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                aria-label="Mark as read"
                onClick={() => markRead.mutate([n.id])}
                className="absolute right-3 top-2.5 h-7 w-7 text-mint"
              >
                <Check className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setOpen(false)}
            className="text-xs text-muted-foreground"
          >
            Remind me later
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              markRead.mutate("all");
              setOpen(false);
            }}
            className="bg-mint text-xs font-semibold text-primary-foreground hover:bg-mint/90"
          >
            Mark all read
          </Button>
        </div>
    </aside>
  );
}
