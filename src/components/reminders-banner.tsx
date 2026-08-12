import { Link } from "@tanstack/react-router";
import { AlertTriangle, ArrowRight, Check, X } from "lucide-react";
import { useState } from "react";
import { useMarkRead } from "@/lib/notifications-api";
import { isHighPriority, useReminderFeed } from "@/lib/insights";

const SESSION_KEY = "reminders-banner-dismissed-v1";

/**
 * Persistent high-priority strip. Shows overdue / urgent reminders at the top
 * of every page until they're marked done. Dismissal is per browser session,
 * so anything unresolved is back on the next login.
 */
export function RemindersBanner() {
  const feed = useReminderFeed(50);
  const markRead = useMarkRead();
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return sessionStorage.getItem(SESSION_KEY) === "1";
  });

  const items = (feed.data ?? []).filter((n) => !n.read_at && isHighPriority(n));
  if (dismissed || items.length === 0) return null;

  const first = items[0]!;
  const rest = items.length - 1;

  return (
    <div className="mb-5 flex flex-wrap items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/10 px-4 py-3">
      <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{first.title}</p>
        {first.body ? (
          <p className="truncate text-xs text-muted-foreground">{first.body}</p>
        ) : null}
      </div>
      {rest > 0 ? (
        <Link
          to="/tools"
          className="rounded-lg border border-amber-500/40 px-2.5 py-1 text-[11px] font-semibold text-amber-500"
        >
          +{rest} more
        </Link>
      ) : null}
      <Link
        to={(first.link ?? "/tools") as string}
        className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-[11px] font-semibold text-[#1a1200]"
      >
        View <ArrowRight className="h-3 w-3" />
      </Link>
      <button
        type="button"
        aria-label="Mark as done"
        onClick={() => markRead.mutate([first.id])}
        className="grid h-7 w-7 place-items-center rounded-lg border border-amber-500/40 text-amber-500 transition hover:bg-amber-500/15"
      >
        <Check className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        aria-label="Hide for now"
        onClick={() => {
          try {
            sessionStorage.setItem(SESSION_KEY, "1");
          } catch {}
          setDismissed(true);
        }}
        className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground transition hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
