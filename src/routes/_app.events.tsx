import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { CalendarClock } from "lucide-react";

import {
  DEFAULT_FILTERS,
  DeepDetails,
  EventCalendar,
  EventFilters,
  EventTimeline,
  EventsSidebar,
  SummaryCards,
  TodaysEvents,
  UpcomingImportantEvents,
  type EventFilterState,
} from "@/components/events/events-panels";
import {
  isSameDay,
  sortByImpactThenTime,
  useEventAlerts,
  useEventExposure,
  useMarketEvents,
  useSetEventAlert,
  useWatchlist,
  type MarketEvent,
} from "@/lib/events-api";
import { EVENT_CATEGORIES, IMPACT_SCORE } from "@/lib/events/catalog";
import { useInvestments } from "@/lib/wealth-api";
import { useUpsertReminder } from "@/lib/tools-api";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/events")({
  head: () => ({
    meta: [
      { title: "Events — Global Market & Financial Calendar | Wealth Ace" },
      {
        name: "description",
        content:
          "Track global market and financial events across India, US, Europe, UK, Japan and China, with potential impact and portfolio exposure.",
      },
      { property: "og:title", content: "Wealth Ace Events — Global Market & Financial Calendar" },
      {
        property: "og:description",
        content:
          "Official-source economic and central bank events with Wealth Ace potential-impact ratings and portfolio exposure.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsPage,
});

const CATEGORY_TO_ASSET_CLASS: Record<string, string> = {
  Stocks: "Equity",
  "Mutual Funds": "Mutual Funds",
  ETFs: "Index / ETF",
  Bonds: "Debt",
  Debt: "Debt",
  Gold: "Gold / Commodity",
  Commodities: "Gold / Commodity",
  Crypto: "Crypto",
};

function regionMatches(region: string, symbol: string | null, currency?: string | null) {
  const s = (symbol ?? "").toUpperCase();
  if (region === "India") return s.endsWith(".NS") || s.endsWith(".BO") || currency === "INR";
  if (region === "United States") return currency === "USD" || (!!s && !s.includes("."));
  if (region === "Europe") return currency === "EUR";
  if (region === "United Kingdom") return currency === "GBP" || s.endsWith(".L");
  if (region === "Japan") return currency === "JPY" || s.endsWith(".T");
  if (region === "China") return currency === "CNY" || s.endsWith(".SS") || s.endsWith(".SZ");
  return false;
}

function EventsPage() {
  const eventsQ = useMarketEvents();
  const investmentsQ = useInvestments();
  const watchlistQ = useWatchlist();
  const alertsQ = useEventAlerts();
  const setAlert = useSetEventAlert();
  const upsertReminder = useUpsertReminder();

  const [filters, setFilters] = React.useState<EventFilterState>(DEFAULT_FILTERS);
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [month, setMonth] = React.useState(() => new Date());
  const [timelineLimit, setTimelineLimit] = React.useState(10);

  const all = eventsQ.data ?? [];

  /** Per-event exposure count from the user's own holdings. */
  const exposureCount = React.useCallback(
    (e: MarketEvent) => {
      let n = 0;
      const classes = new Set(e.asset_classes);
      for (const inv of investmentsQ.data ?? []) {
        const cls = CATEGORY_TO_ASSET_CLASS[inv.category] ?? "Equity";
        if (classes.has(cls) && regionMatches(e.region, inv.symbol, inv.currency)) n += 1;
      }
      return n;
    },
    [investmentsQ.data],
  );

  const filtered = React.useMemo(() => {
    const now = new Date();
    const past = filters.range === "past";
    const days = past ? 30 : Number(filters.range);
    const start = past ? new Date(now.getTime() - days * 864e5) : now;
    const end = past ? now : new Date(now.getTime() + days * 864e5);

    return all.filter((e) => {
      const t = new Date(e.event_time).getTime();
      if (t < start.getTime() - 864e5 || t > end.getTime()) return false;
      if (filters.region !== "all" && e.region !== filters.region) return false;
      if (filters.category !== "all" && e.category !== filters.category) return false;
      if (filters.impact !== "all" && e.impact !== filters.impact) return false;
      if (filters.market !== "all" && !e.markets.includes(filters.market)) return false;
      if (filters.assetClass !== "all" && !e.asset_classes.includes(filters.assetClass)) return false;

      if (filters.quick === "today" && !isSameDay(e.event_time, now)) return false;
      if (filters.quick === "upcoming" && t < now.getTime()) return false;
      if (filters.quick === "high" && IMPACT_SCORE[e.impact] < 3) return false;
      if (filters.quick === "portfolio" && exposureCount(e) === 0) return false;
      return true;
    });
  }, [all, filters, exposureCount]);

  const now = new Date();
  const todays = React.useMemo(
    () => filtered.filter((e) => isSameDay(e.event_time, now)).sort(sortByImpactThenTime),
    [filtered],
  );
  const upcoming = React.useMemo(
    () =>
      filtered
        .filter((e) => new Date(e.event_time).getTime() >= now.getTime())
        .sort((a, b) => new Date(a.event_time).getTime() - new Date(b.event_time).getTime()),
    [filtered],
  );
  const important = React.useMemo(
    () => [...upcoming].sort(sortByImpactThenTime).slice(0, 8),
    [upcoming],
  );
  const highlights = React.useMemo(
    () => upcoming.filter((e) => IMPACT_SCORE[e.impact] >= 3).sort(sortByImpactThenTime),
    [upcoming],
  );

  // default selection: first of today's events, else next upcoming
  React.useEffect(() => {
    if (selectedId && all.some((e) => e.id === selectedId)) return;
    const first = todays[0] ?? upcoming[0] ?? all[0];
    if (first) setSelectedId(first.id);
  }, [all, todays, upcoming, selectedId]);

  const selected = all.find((e) => e.id === selectedId) ?? null;
  const { holdings, watched } = useEventExposure(selected);

  const categoryCounts = React.useMemo(
    () =>
      EVENT_CATEGORIES.map((c) => ({
        category: c,
        count: all.filter((e) => e.category === c).length,
      })).filter((c) => c.count > 0 || c.category === "Economic"),
    [all],
  );

  const affectingEvents = React.useMemo(
    () => upcoming.filter((e) => exposureCount(e) > 0),
    [upcoming, exposureCount],
  );

  const affectedHoldingIds = React.useMemo(() => {
    const ids = new Set<string>();
    for (const e of affectingEvents) {
      const classes = new Set(e.asset_classes);
      for (const inv of investmentsQ.data ?? []) {
        const cls = CATEGORY_TO_ASSET_CLASS[inv.category] ?? "Equity";
        if (classes.has(cls) && regionMatches(e.region, inv.symbol, inv.currency)) ids.add(inv.id);
      }
    }
    return ids;
  }, [affectingEvents, investmentsQ.data]);



  const exposureBuckets = React.useMemo(() => {
    const counts = new Map<string, number>();
    for (const inv of investmentsQ.data ?? []) {
      const cls = CATEGORY_TO_ASSET_CLASS[inv.category] ?? "Equity";
      counts.set(cls, (counts.get(cls) ?? 0) + 1);
    }
    const total = [...counts.values()].reduce((a, b) => a + b, 0);
    const tones: Record<string, string> = {
      Equity: "bg-mint",
      "Index / ETF": "bg-sky-400",
      "Mutual Funds": "bg-violet-400",
      Debt: "bg-emerald-400",
      "Gold / Commodity": "bg-amber-400",
      Currency: "bg-orange-400",
      Crypto: "bg-pink-400",
    };
    if (!total) return [];
    return [...counts.entries()]
      .map(([label, n]) => ({
        label,
        pct: Math.round((n / total) * 100),
        tone: tones[label] ?? "bg-muted",
      }))
      .sort((a, b) => b.pct - a.pct);
  }, [investmentsQ.data]);

  const alertActive = !!selected && (alertsQ.data ?? []).some((a) => a.event_id === selected.id && a.active);

  const handleAddReminder = (e: MarketEvent | null) => {
    if (!e) return;
    upsertReminder.mutate({
      kind: "custom",
      title: `${e.event_name} (${e.country})`,
      amount: 0,
      due_date: new Date(e.event_time).toISOString().slice(0, 10),
      recurrence: "none",
      notify_days_before: 1,
      notify_enabled: true,
      notes: `Wealth Ace potential impact: ${e.impact}. Source: ${e.source}`,
    });
  };

  const exposureLabel = (e: MarketEvent) => {
    const n = exposureCount(e);
    const w = (watchlistQ.data ?? []).length;
    if (n === 0) return "No potential exposure detected";
    return `Potentially affects ${n} holding${n === 1 ? "" : "s"}${w ? ` • ${w} watchlist` : ""}`;
  };

  return (
    <div className="space-y-4 2xl:-mx-[calc((100vw-1280px)/2-2rem)]">
      {/* -------- plain page header -------- */}
      <div className="flex items-start gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-mint/10 text-mint">
          <CalendarClock className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Events
          </h1>
          <div className="text-sm font-semibold text-mint">Global Market &amp; Financial Events</div>
          <p className="mt-1 max-w-2xl text-xs text-muted-foreground">
            Track important financial events, understand potential market impact, and see how
            events may affect your holdings and watchlist.
          </p>
        </div>
      </div>

      <EventFilters value={filters} onChange={setFilters} onReset={() => setFilters(DEFAULT_FILTERS)} />

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-4">
          <div className="grid min-w-0 gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,7fr)] lg:items-start">
            <TodaysEvents events={todays} selectedId={selectedId} onSelect={(e) => setSelectedId(e.id)} />
            <DeepDetails
              event={selected}
              holdings={holdings}
              watched={watched}
              alertActive={alertActive}
              onSetAlert={() => selected && setAlert.mutate(selected.id)}
              onAddReminder={() => handleAddReminder(selected)}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <UpcomingImportantEvents
              events={important}
              selectedId={selectedId}
              onSelect={(e) => setSelectedId(e.id)}
              exposureLabel={exposureLabel}
            />
            <EventCalendar
              events={all}
              month={month}
              onMonthChange={setMonth}
              onSelect={(e) => setSelectedId(e.id)}
              selectedId={selectedId}
            />
          </div>
        </div>

        <div className="min-w-0">
          <EventsSidebar
            highlights={highlights}
            categoryCounts={categoryCounts}
            exposure={{ total: affectingEvents.length, buckets: exposureBuckets }}
            onSelect={(e) => setSelectedId(e.id)}
            selectedId={selectedId}
            onManageAlerts={() =>
              toast.info("Event alerts are delivered in-app. Manage channels in Settings → Notifications.")
            }
          />
        </div>
      </div>

      <EventTimeline
        events={filtered.slice(0, timelineLimit)}
        selectedId={selectedId}
        onSelect={(e) => setSelectedId(e.id)}
        exposureCount={exposureCount}
        onSetAlert={(e) => setAlert.mutate(e.id)}
        onLoadMore={() => setTimelineLimit((n) => n + 10)}
        canLoadMore={filtered.length > timelineLimit}
      />


      {eventsQ.isLoading && (
        <p className="text-center text-xs text-muted-foreground">Loading events…</p>
      )}
      {!eventsQ.isLoading && all.length === 0 && (
        <p className="text-center text-xs text-muted-foreground">
          No events synchronised yet — the backend synchronisation job populates this from official
          sources.
        </p>
      )}
    </div>
  );
}
