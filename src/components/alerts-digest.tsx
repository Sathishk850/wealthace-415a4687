import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { BellRing, Check } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useAlertSweep, useInsights } from "@/lib/insights";
import { useMarkRead, type Notification } from "@/lib/notifications-api";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SESSION_KEY = "alerts-digest-shown-v1";

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
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .is("read_at", null)
        .eq("category", "reminder")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(25);
      if (error) throw error;
      return (data ?? []) as unknown as Notification[];
    },
  });

  const items = unreadQ.data ?? [];

  useEffect(() => {
    if (items.length === 0) return;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SESSION_KEY) === sessionQ.data) return;
    sessionStorage.setItem(SESSION_KEY, sessionQ.data ?? "1");
    setOpen(true);
  }, [items.length, sessionQ.data]);

  if (items.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b border-border px-5 py-4">
          <DialogTitle className="flex items-center gap-2 text-base">
            <BellRing className="h-4 w-4 text-mint" />
            {items.length} thing{items.length === 1 ? "" : "s"} need your attention
          </DialogTitle>
          <DialogDescription className="text-xs">
            These stay here on every sign-in until you mark them as read.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[55vh] space-y-2 overflow-y-auto px-5 py-4">
          {items.map((n) => (
            <div
              key={n.id}
              className="flex items-start gap-3 rounded-xl border border-border bg-card/60 px-3 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">{n.title}</p>
                {n.body ? (
                  <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                ) : null}
                {n.link ? (
                  <Link
                    to={n.link}
                    onClick={() => setOpen(false)}
                    className="mt-1 inline-block text-[11px] font-semibold text-mint"
                  >
                    View →
                  </Link>
                ) : null}
              </div>
              <button
                type="button"
                aria-label="Mark as read"
                onClick={() => markRead.mutate([n.id])}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-lg border border-mint/40 text-mint transition hover:bg-mint/10"
              >
                <Check className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground"
          >
            Remind me later
          </button>
          <button
            type="button"
            onClick={() => {
              markRead.mutate("all");
              setOpen(false);
            }}
            className="rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-[#04121C]"
          >
            Mark all read
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
