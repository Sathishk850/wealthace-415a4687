import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Check, CheckCircle2, Lightbulb, RefreshCw, Sparkles, TrendingUp } from "lucide-react";
import { TextTabs } from "@/components/text-tabs";
import { useMarkRead, type Notification } from "@/lib/notifications-api";
import {
  filterReminders,
  isHighPriority,
  useAlertSweep,
  useInsights,
  useReminderFeed,
  type Insight,
  type ReminderFilter,
} from "@/lib/insights";
import { formatDateTime } from "@/lib/date-format";
import { cn } from "@/lib/utils";

const PRIORITY_LABEL: Record<string, { label: string; cls: string }> = {
  urgent: { label: "URGENT", cls: "bg-red-500/20 text-red-400" },
  high: { label: "HIGH", cls: "bg-orange-500/20 text-orange-400" },
  normal: { label: "", cls: "" },
  low: { label: "LOW", cls: "bg-slate-500/20 text-slate-400" },
};


const TONE_CLASS: Record<Insight["tone"], string> = {
  positive: "border-emerald-500/30 bg-emerald-500/5",
  warning: "border-amber-500/30 bg-amber-500/5",
  critical: "border-red-500/30 bg-red-500/5",
  neutral: "border-border bg-card",
};

const TONE_DOT: Record<Insight["tone"], string> = {
  positive: "bg-emerald-500",
  warning: "bg-amber-500",
  critical: "bg-red-500",
  neutral: "bg-mint",
};

export function InsightsRemindersPanel() {
  const { insights, fingerprint, isLoading } = useInsights();
  const sweep = useAlertSweep(fingerprint, !isLoading);
  const feed = useReminderFeed();
  const markRead = useMarkRead();
  const [tab, setTab] = useState<ReminderFilter>("pending");

  const rows = feed.data ?? [];
  const visible = useMemo(() => filterReminders(rows, tab), [rows, tab]);
  const pendingCount = rows.filter((r) => !r.read_at).length;

  return (
    <>
      <section className="mb-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Sparkles className="h-4 w-4 text-mint" /> Insights
          </h2>
          <button
            type="button"
            onClick={() => sweep.refetch()}
            disabled={sweep.isFetching}
            className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-semibold text-muted-foreground disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${sweep.isFetching ? "animate-spin" : ""}`} />
            {sweep.isFetching ? "Refreshing…" : "Refresh now"}
          </button>
        </div>
        {isLoading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : insights.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <Lightbulb className="mx-auto mb-2 h-5 w-5 text-mint" />
            Add some transactions, holdings or goals and insights will appear here automatically.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {insights.map((i) => (
              <article key={i.id} className={`rounded-2xl border p-4 ${TONE_CLASS[i.tone]}`}>
                <div className="flex items-start gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${TONE_DOT[i.tone]}`} />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground">{i.title}</h3>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{i.body}</p>
                    {i.link ? (
                      <Link to={i.link} className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-mint">
                        {i.linkLabel ?? "Open"} <TrendingUp className="h-3 w-3" />
                      </Link>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Bell className="h-4 w-4 text-mint" /> Reminders
            {pendingCount > 0 ? (
              <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[10px] font-bold text-mint">
                {pendingCount} pending
              </span>
            ) : null}
          </h2>
          <div className="flex items-center gap-2">
            <TextTabs<ReminderFilter>
              value={tab}
              onChange={setTab}
              items={[
                { value: "all", label: "All" },
                { value: "pending", label: "Pending" },
                { value: "completed", label: "Completed" },
              ]}
            />
            {pendingCount > 0 ? (
              <button
                type="button"
                onClick={() => markRead.mutate("all")}
                className="rounded-xl border border-border px-3 py-1.5 text-xs font-semibold text-muted-foreground"
              >
                Mark all done
              </button>
            ) : null}
          </div>
        </div>

        {feed.isLoading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 animate-pulse rounded-2xl border border-border bg-card" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            <CheckCircle2 className="mx-auto mb-2 h-5 w-5 text-emerald-500" />
            {tab === "completed" ? "Nothing completed yet." : "You're all caught up."}
          </div>
        ) : (
          <ul className="space-y-2">
            {visible.map((n) => (
              <ReminderRow key={n.id} n={n} onDone={() => markRead.mutate([n.id])} />
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function ReminderRow({ n, onDone }: { n: Notification; onDone: () => void }) {
  const done = !!n.read_at;
  const kind = String((n.metadata as Record<string, unknown>)?.["kind"] ?? "reminder");
  return (
    <li
      className={`flex items-start gap-3 rounded-2xl border px-4 py-3 ${
        done
          ? "border-border bg-card/40 opacity-70"
          : isHighPriority(n)
            ? "border-amber-500/30 bg-amber-500/5"
            : "border-border bg-card"
      }`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className={`text-sm font-semibold ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
            {n.title}
          </p>
          <span className="rounded-md bg-muted px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {kind.replace(/_/g, " ")}
          </span>
        </div>
        {n.body ? <p className="mt-0.5 text-xs text-muted-foreground">{n.body}</p> : null}
        <p className="mt-1 text-[10px] text-muted-foreground">
          {done ? `Completed ${formatDateTime(n.read_at)}` : formatDateTime(n.created_at)}
        </p>
      </div>
      {n.link ? (
        <Link to={n.link} className="shrink-0 self-center text-[11px] font-semibold text-mint">
          View →
        </Link>
      ) : null}
      {!done ? (
        <button
          type="button"
          aria-label="Mark as done"
          onClick={onDone}
          className="grid h-7 w-7 shrink-0 place-items-center self-center rounded-lg border border-mint/40 text-mint transition hover:bg-mint/10"
        >
          <Check className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </li>
  );
}
