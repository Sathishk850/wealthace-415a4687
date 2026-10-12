import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ExternalLink, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { PushPermissionBanner } from "@/components/push/push-permission-banner";
import { TextTabs } from "@/components/text-tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { flagFor, type MarketEvent } from "@/lib/events/types";
import { UpcomingResultsCard } from "@/components/events/upcoming-results-card";
import { EventDetailPanel } from "@/components/events/EventDetailPanel";
import { useMarketEvents, useSyncMarketEvents } from "@/lib/events-api";
import { formatDate, formatTime } from "@/lib/date-format";

/** Extract a clean hostname from a URL; fall back to the raw string. */
function sourceDomain(raw: string | null | undefined): string | null {
  if (!raw || !raw.trim()) return null;
  const s = raw.trim();
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    return url.hostname.replace(/^www\./, "");
  } catch {
    return s;
  }
}

export const Route = createFileRoute("/_app/events")({
  head: () => ({
    meta: [
      { title: "Events · Wealth Ace" },
      {
        name: "description",
        content:
          "Global market and financial events — economic releases and central bank decisions with previous and actual values.",
      },
      { property: "og:title", content: "Events · Wealth Ace" },
      {
        property: "og:description",
        content:
          "Track economic releases and central bank decisions across US, India, Eurozone, UK, Japan and China.",
      },
    ],
  }),
  component: EventsPage,
});

const FILTERS = [
  { value: "all", label: "All" },
  { value: "upcoming", label: "Upcoming" },
  { value: "high", label: "High Impact" },
  { value: "qresults", label: "Q Results" },
];

const COUNTRIES = ["All Countries", "US", "India", "Eurozone", "UK", "Japan", "China"];

const DATE_RANGES = [
  { value: "today", label: "Today" },
  { value: "week", label: "This Week" },
  { value: "month", label: "This Month" },
] as const;

type DateRange = "all" | (typeof DATE_RANGES)[number]["value"];

function EventsPage() {
  const { data, isLoading } = useMarketEvents();
  const sync = useSyncMarketEvents();
  const [filter, setFilter] = useState("all");
  const [country, setCountry] = useState("All Countries");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [selected, setSelected] = useState<MarketEvent | null>(null);

  const filtered = useMemo(() => {
    const all = data?.events ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekEnd = new Date(today);
    weekEnd.setDate(today.getDate() + 7);
    const monthEnd = new Date(today);
    monthEnd.setMonth(today.getMonth() + 1);

    return all.filter((e) => {
      if (country !== "All Countries" && e.country !== country) return false;

      if (dateRange === "today") {
        const d = new Date(e.event_time);
        d.setHours(0, 0, 0, 0);
        if (d.getTime() !== today.getTime()) return false;
      }
      if (dateRange === "week") {
        const t = new Date(e.event_time).getTime();
        if (t < today.getTime() || t > weekEnd.getTime()) return false;
      }
      if (dateRange === "month") {
        const t = new Date(e.event_time).getTime();
        if (t < today.getTime() || t > monthEnd.getTime()) return false;
      }

      if (filter === "upcoming") return e.status?.toLowerCase() === "upcoming";
      if (filter === "high") return ["high", "very high"].includes(e.impact?.toLowerCase() ?? "");
      return true;
    });
  }, [data, filter, country, dateRange]);

  // Nearest upcoming first, then most recent past below.
  const rows = useMemo(() => {
    const now = Date.now();
    const upcoming = filtered
      .filter((e) => new Date(e.event_time).getTime() >= now)
      .sort((a, b) => a.event_time.localeCompare(b.event_time));
    const past = filtered
      .filter((e) => new Date(e.event_time).getTime() < now)
      .sort((a, b) => b.event_time.localeCompare(a.event_time));
    return [...upcoming, ...past];
  }, [filtered]);

  // Show Previous/Actual columns only if at least one row has a real value.
  const hasPrev = rows.some((e) => e.previous && e.previous.trim());
  const hasActual = rows.some((e) => e.actual && e.actual.trim());
  const showValueCols = hasPrev || hasActual;
  // Columns: flag, event, country, date, category, [prev], [actual], source
  const colCount = showValueCols ? 8 : 6;

  const runSync = () => {
    sync.mutate(undefined, {
      onSuccess: (res) => {
        const r = res as { upserted?: number; curated?: number; fred?: number } | undefined;
        toast.success(
          `Synced ${r?.upserted ?? 0} events — ${r?.curated ?? 0} curated + ${r?.fred ?? 0} FRED`,
        );
      },
      onError: (err: unknown) => {
        toast.error(`Sync failed: ${err instanceof Error ? err.message : "unknown error"}`);
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader
          title="Events — Global Market & Financial Events"
          description="Real economic & central bank events — previous and actual values from FRED and curated sources."
        />
        <button
          type="button"
          onClick={runSync}
          disabled={sync.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/40 px-3 py-1.5 text-xs font-semibold text-primary transition hover:bg-primary/10 disabled:opacity-60"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", sync.isPending && "animate-spin")} /> Sync Now
        </button>
      </div>

      <PushPermissionBanner />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <TextTabs items={FILTERS} value={filter} onChange={setFilter} />
        {filter !== "qresults" && (
          <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            {DATE_RANGES.map((r) => (
              <button
                key={r.value}
                type="button"
                onClick={() => setDateRange(dateRange === r.value ? "all" : r.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-semibold transition",
                  dateRange === r.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:text-foreground",
                )}
              >
                {r.label}
              </button>
            ))}
          </div>
          <Select value={country} onValueChange={setCountry}>
          <SelectTrigger className="w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row">
      <Card className="min-w-0 flex-1 overflow-x-auto p-0">
        <table className="w-full min-w-[900px] text-sm">
          <thead>
            <tr className="border-b border-border text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="px-3 py-2.5"></th>
              <th className="px-3 py-2.5">Event</th>
              <th className="px-3 py-2.5">Country</th>
              <th className="px-3 py-2.5">Date &amp; Time</th>
              <th className="px-3 py-2.5">Category</th>
              {showValueCols && hasPrev && (
                <th className="px-3 py-2.5 text-right">Previous</th>
              )}
              {showValueCols && hasActual && (
                <th className="px-3 py-2.5 text-right">Actual</th>
              )}
              <th className="px-3 py-2.5">Source</th>
            </tr>
          </thead>
          <tbody className={cn(sync.isPending && "pointer-events-none opacity-50")}>
            {isLoading ? (
              <tr>
                <td colSpan={colCount} className="px-3 py-8 text-center text-muted-foreground">
                  Loading events…
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-3 py-8 text-center text-muted-foreground">
                  No events match these filters — try Sync Now.
                </td>
              </tr>
            ) : (
              rows.map((e) => {
                const domain = sourceDomain(e.source_url) ?? sourceDomain(e.source);
                const href = e.source_url ?? (e.source && /^https?:\/\//i.test(e.source) ? e.source : null);
                return (
                  <tr
                    key={e.id}
                    onClick={() => setSelected(e)}
                    className={cn(
                      "cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-muted/40",
                      selected?.id === e.id && "bg-muted/50",
                    )}
                  >
                    <td className="px-3 py-2.5 text-base">{flagFor(e.country)}</td>
                    <td className="px-3 py-2.5 font-medium text-foreground">{e.event_name}</td>
                    <td className="px-3 py-2.5 text-muted-foreground">{e.country}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                      {formatDate(e.event_time)} · {formatTime(e.event_time)}
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground">{e.category}</td>
                    {showValueCols && hasPrev && (
                      <td className="px-3 py-2.5 text-right text-muted-foreground">
                        {e.previous && e.previous.trim() ? e.previous : "—"}
                      </td>
                    )}
                    {showValueCols && hasActual && (
                      <td className="px-3 py-2.5 text-right font-medium text-foreground">
                        {e.actual && e.actual.trim() ? e.actual : "—"}
                      </td>
                    )}
                    <td className="px-3 py-2.5">
                      {domain && href ? (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(ev) => ev.stopPropagation()}
                          className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
                        >
                          {domain}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : domain ? (
                        <span className="text-muted-foreground">{domain}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </Card>
      {selected && <EventDetailPanel event={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}
