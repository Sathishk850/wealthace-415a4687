import { Link } from "@tanstack/react-router";
import { Calendar, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { flagFor, type MarketEvent } from "@/lib/events/types";
import { orderForCard, useMarketEvents, useSyncMarketEvents } from "@/lib/events-api";

export function impactClass(impact: string): string {
  switch (impact) {
    case "Low": return "bg-sky-500/15 text-sky-400";
    case "Moderate": return "bg-yellow-500/15 text-yellow-400";
    case "High": return "bg-orange-500/15 text-orange-400";
    case "Very High": return "bg-red-500/15 text-red-400";
    default: return "bg-muted text-muted-foreground";
  }
}

export function statusClass(status: string): string {
  switch (status) {
    case "UPCOMING": return "bg-cyan-500/15 text-cyan-400";
    case "RELEASED": return "bg-green-500/15 text-green-400";
    default: return "bg-slate-500/15 text-slate-400";
  }
}

export function eventDay(iso: string): string {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

export function eventTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function Pill({ label, className }: { label: string; className: string }) {
  return (
    <span className={cn("rounded-full px-1.5 py-0.5 text-[10px] font-semibold leading-tight", className)}>
      {label}
    </span>
  );
}

function Row({ e }: { e: MarketEvent }) {
  return (
    <div className="flex items-center gap-2 border-b border-border/60 py-2.5 last:border-0">
      <span className="w-6 shrink-0 text-base leading-none">{flagFor(e.country)}</span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-foreground">{e.event_name}</div>
        <div className="truncate text-xs text-muted-foreground">{e.country}</div>
      </div>
      <div className="hidden w-[78px] shrink-0 text-right text-xs text-muted-foreground sm:block">
        <div>{eventDay(e.event_time)}</div>
        <div className="opacity-70">{eventTime(e.event_time)}</div>
      </div>
      <div className="hidden w-[62px] shrink-0 text-right text-xs sm:block">
        <div className="text-[10px] uppercase text-muted-foreground">Prev</div>
        <div className="truncate text-muted-foreground">{e.previous ?? "—"}</div>
      </div>
      <div className="w-[62px] shrink-0 text-right text-xs">
        <div className="text-[10px] uppercase text-muted-foreground">Actual</div>
        <div className="truncate font-medium text-foreground">{e.actual ?? "—"}</div>
      </div>
      <div className="flex w-[76px] shrink-0 flex-col items-end gap-1">
        <Pill label={e.impact} className={impactClass(e.impact)} />
        <Pill label={e.status} className={statusClass(e.status)} />
      </div>
    </div>
  );
}

export function MarketEventsCard({ className }: { className?: string }) {
  const { data, isLoading } = useMarketEvents();
  const sync = useSyncMarketEvents();
  const rows = orderForCard(data?.events ?? [], 6);

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
            <Calendar className="h-4 w-4" />
          </span>
          <div>
            <div className="text-sm font-semibold text-foreground">Market Events</div>
            <div className="text-xs text-muted-foreground">Economic &amp; Central Bank</div>
          </div>
        </div>
        <Link to="/events" className="text-sm font-semibold text-primary hover:underline">
          View All →
        </Link>
      </div>

      <div className="mt-3">
        {isLoading ? (
          <div className="space-y-2.5 py-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-9 animate-pulse rounded bg-muted/40" />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No events loaded yet — click Refresh to sync.
          </p>
        ) : (
          rows.map((e) => <Row key={e.id} e={e} />)
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">
          Last synced: {data?.synced_at ? new Date(data.synced_at).toLocaleString() : "Never"}
        </span>
        <button
          type="button"
          onClick={() => sync.mutate()}
          disabled={sync.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-2.5 py-1 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", sync.isPending && "animate-spin")} /> Refresh
        </button>
      </div>
    </Card>
  );
}
