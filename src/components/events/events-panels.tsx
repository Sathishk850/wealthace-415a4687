import * as React from "react";
import {
  Bell,
  BellPlus,
  BarChart3,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  CalendarDays,
  Clock,
  Flame,
  Zap,
  Target,
  Activity,
  ArrowRight,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { formatDate, formatDateTime, formatTime } from "@/lib/date-format";
import {
  ASSET_CLASSES,
  CATEGORY_TONE,
  EVENT_CATEGORIES,
  IMPACTS,
  IMPACT_TONE,
  IMPACT_SCORE,
  MARKETS,
  REGIONS,
  REGION_FLAG,
  STATUS_LABEL,
  UNAVAILABLE,
  displayValue,
  type Impact,
} from "@/lib/events/catalog";
import type { ExposureHit, MarketEvent } from "@/lib/events-api";

/* ============================ shared ============================ */

export function Panel({
  title,
  icon: Icon,
  action,
  children,
  className,
}: {
  title: string;
  icon?: React.ComponentType<{ className?: string }>;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-border bg-card",
        className,
      )}
    >
      <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-foreground">
          {Icon && <Icon className="h-3.5 w-3.5 text-mint" />}
          {title}
        </div>
        {action}
      </header>
      <div className="min-w-0 flex-1">{children}</div>
    </section>
  );
}

export function ImpactBadge({ impact, className }: { impact: Impact; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
        IMPACT_TONE[impact],
        className,
      )}
    >
      {impact}
    </span>
  );
}

function Flag({ country }: { country: string }) {
  return (
    <span aria-hidden className="text-base leading-none">
      {REGION_FLAG[country] ?? "🏳️"}
    </span>
  );
}

function ImpactBars({ impact }: { impact: Impact }) {
  const n = IMPACT_SCORE[impact];
  return (
    <span className="flex items-end gap-[2px]" aria-label={`${impact} impact`}>
      {[1, 2, 3, 4].map((i) => (
        <span
          key={i}
          className={cn(
            "w-[3px] rounded-sm",
            i <= n ? "bg-mint" : "bg-muted",
          )}
          style={{ height: `${4 + i * 3}px` }}
        />
      ))}
    </span>
  );
}

/* ============================ summary ============================ */

export function SummaryCards({
  upcoming,
  today,
  highImpact,
  withMarketImpact,
  affecting,
  affectedHoldings,
  watchlistCount,
}: {
  upcoming: number;
  today: number;
  highImpact: number;
  withMarketImpact: number;
  affecting: number;
  affectedHoldings: number;
  watchlistCount: number;
}) {
  const cards = [
    { label: "Upcoming Events", value: upcoming, icon: CalendarDays, sub: "Next 30 days" },
    { label: "Events Today", value: today, icon: Zap, sub: "Scheduled today" },
    { label: "High Impact Events", value: highImpact, icon: Flame, sub: "High / Very High" },
    { label: "Events With Market Impact", value: withMarketImpact, icon: BarChart3, sub: "Mapped markets" },
    {
      label: "Events Affecting My Portfolio",
      value: affecting,
      icon: Target,
      sub: `${affectedHoldings} Holdings • ${watchlistCount} Watchlist`,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {cards.map((c) => (
        <div key={c.label} className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-start gap-3">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint/10 text-mint">
              <c.icon className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {c.label}
              </div>
              <div className="mt-1 font-display text-2xl font-bold text-foreground">{c.value}</div>
              <div className="mt-0.5 truncate text-[10px] text-muted-foreground">{c.sub}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ============================ filters ============================ */

export type QuickFilter = "all" | "today" | "upcoming" | "high" | "portfolio";

export type EventFilterState = {
  region: string;
  category: string;
  impact: string;
  market: string;
  assetClass: string;
  range: string;
  quick: QuickFilter;
};

export const DEFAULT_FILTERS: EventFilterState = {
  region: "all",
  category: "all",
  impact: "all",
  market: "all",
  assetClass: "all",
  range: "30",
  quick: "all",
};

const QUICK: Array<{ key: QuickFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "high", label: "High Impact" },
  { key: "portfolio", label: "Affecting My Portfolio" },
];

function FilterSelect({
  label,
  value,
  onChange,
  options,
  allLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: readonly string[];
  allLabel: string;
}) {
  return (
    <div className="min-w-0">
      <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-9 w-full text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{allLabel}</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function EventFilters({
  value,
  onChange,
  onReset,
}: {
  value: EventFilterState;
  onChange: (v: EventFilterState) => void;
  onReset: () => void;
}) {
  const set = (patch: Partial<EventFilterState>) => onChange({ ...value, ...patch });
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        <FilterSelect label="Region" value={value.region} onChange={(v) => set({ region: v })} options={REGIONS} allLabel="All Regions" />
        <FilterSelect label="Event Type" value={value.category} onChange={(v) => set({ category: v })} options={EVENT_CATEGORIES} allLabel="All Events" />
        <FilterSelect label="Impact" value={value.impact} onChange={(v) => set({ impact: v })} options={IMPACTS} allLabel="All Impact" />
        <FilterSelect label="Market" value={value.market} onChange={(v) => set({ market: v })} options={MARKETS} allLabel="All Markets" />
        <FilterSelect label="Asset Class" value={value.assetClass} onChange={(v) => set({ assetClass: v })} options={ASSET_CLASSES} allLabel="All Asset Classes" />
        <div className="min-w-0">
          <label className="mb-1 block text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            Date Range
          </label>
          <Select value={value.range} onValueChange={(v) => set({ range: v })}>
            <SelectTrigger className="h-9 w-full text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Next 7 Days</SelectItem>
              <SelectItem value="30">Next 30 Days</SelectItem>
              <SelectItem value="90">Next 90 Days</SelectItem>
              <SelectItem value="180">Next 180 Days</SelectItem>
              <SelectItem value="past">Past 30 Days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {QUICK.map((q) => (
            <button
              key={q.key}
              type="button"
              onClick={() => set({ quick: q.key })}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                value.quick === q.key
                  ? "border-mint bg-mint/15 text-mint"
                  : "border-border text-muted-foreground hover:text-foreground",
              )}
            >
              {q.label}
            </button>
          ))}
        </div>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-xs">
          <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Reset Filters
        </Button>
      </div>
    </div>
  );
}

/* ============================ event rows ============================ */

function EventRow({
  event,
  selected,
  onSelect,
  meta,
}: {
  event: MarketEvent;
  selected: boolean;
  onSelect: () => void;
  meta?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={selected}
      className={cn(
        "flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition",
        selected
          ? "border-l-mint bg-mint/10"
          : "border-l-transparent hover:bg-surface-2",
      )}
    >
      <Flag country={event.country} />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-foreground">{event.event_name}</div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {event.country} • {event.category}
        </div>
        <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
          {formatDate(event.event_time)} • {formatTime(event.event_time)}
        </div>
        {meta}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <ImpactBadge impact={event.impact} />
        <ImpactBars impact={event.impact} />
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </button>
  );
}

export function TodaysEvents({
  events,
  selectedId,
  onSelect,
}: {
  events: MarketEvent[];
  selectedId: string | null;
  onSelect: (e: MarketEvent) => void;
}) {
  return (
    <Panel
      title="Today's Events"
      icon={Clock}
      action={<span className="text-[11px] text-muted-foreground">{events.length} Events</span>}
    >
      {events.length === 0 ? (
        <EmptyState text="No events scheduled today." />
      ) : (
        <div className="max-h-[320px] divide-y divide-border overflow-y-auto">
          {events.map((e) => (
            <EventRow key={e.id} event={e} selected={e.id === selectedId} onSelect={() => onSelect(e)} />
          ))}
        </div>
      )}
    </Panel>
  );
}

export function UpcomingImportantEvents({
  events,
  selectedId,
  onSelect,
  exposureLabel,
}: {
  events: MarketEvent[];
  selectedId: string | null;
  onSelect: (e: MarketEvent) => void;
  exposureLabel: (e: MarketEvent) => string;
}) {
  return (
    <Panel
      title="Upcoming Important Events"
      icon={ArrowRight}
      action={<span className="text-[11px] text-mint">View All →</span>}
    >
      {events.length === 0 ? (
        <EmptyState text="No upcoming events match your filters." />
      ) : (
        <div className="max-h-[300px] divide-y divide-border overflow-y-auto">
          {events.map((e) => (
            <EventRow
              key={e.id}
              event={e}
              selected={e.id === selectedId}
              onSelect={() => onSelect(e)}
              meta={
                <div className="mt-1 truncate text-[10px] text-mint">{exposureLabel(e)}</div>
              }
            />
          ))}
        </div>
      )}
    </Panel>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="px-4 py-8 text-center text-xs text-muted-foreground">{text}</div>;
}

/* ============================ deep details ============================ */

function ValueBox({ label, value, sub }: { label: string; value: string; sub?: string }) {
  const unavailable = value === UNAVAILABLE;
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-3 py-2 text-center">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div
        className={cn(
          "mt-1 font-display text-sm font-bold",
          unavailable ? "text-muted-foreground" : "text-foreground",
        )}
      >
        {value}
      </div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function ExposureList({
  title,
  hits,
  emptyText,
}: {
  title: string;
  hits: ExposureHit[];
  emptyText: string;
}) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </div>
      {hits.length === 0 ? (
        <p className="mt-2 text-[11px] text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-2">
          {hits.slice(0, 6).map((h) => (
            <li key={`${h.kind}-${h.id}`} className="flex items-center gap-2">
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-mint/10 text-[10px] font-bold text-mint">
                {(h.symbol || h.name).slice(0, 2).toUpperCase()}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-foreground">
                  {h.symbol || h.name}
                </span>
                <span className="block truncate text-[10px] text-muted-foreground">{h.name}</span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function DeepDetails({
  event,
  holdings,
  watched,
  onSetAlert,
  alertActive,
  onAddReminder,
}: {
  event: MarketEvent | null;
  holdings: ExposureHit[];
  watched: ExposureHit[];
  onSetAlert: () => void;
  alertActive: boolean;
  onAddReminder: () => void;
}) {
  if (!event) {
    return (
      <Panel title="Selected Event — Deep Details" icon={Activity}>
        <EmptyState text="Select an event to see its deep details." />
      </Panel>
    );
  }
  const total = holdings.length + watched.length;
  return (
    <Panel title="Selected Event — Deep Details" icon={Activity}>
      <div className="grid items-stretch gap-0 lg:grid-cols-[repeat(3,minmax(0,1fr))] lg:divide-x lg:divide-border">
        {/* --- column 1: identity + values --- */}
        <div className="min-w-0 p-4">
          <span
            className={cn(
              "inline-flex items-center rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider",
              CATEGORY_TONE[event.category] ?? "text-muted-foreground",
            )}
          >
            {event.category} Event
          </span>
          <h3 className="mt-2 font-display text-base font-bold leading-snug text-foreground">
            {event.event_name}
          </h3>
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <Flag country={event.country} /> {event.country}
          </div>
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {formatDateTime(event.event_time)} ({event.timezone})
          </div>
          <div className="mt-1 flex items-center gap-2">
            <span className="rounded-md border border-border bg-surface-2 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
              {STATUS_LABEL[event.status] ?? "Unavailable"}
            </span>
            <ImpactBadge impact={event.impact} />
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2">
            <ValueBox label="Previous" value={displayValue(event.previous)} />
            <ValueBox label="Forecast" value={displayValue(event.forecast)} />
            <ValueBox
              label="Actual"
              value={displayValue(event.actual)}
              sub={event.status === "upcoming" ? "(Pending)" : undefined}
            />
          </div>

          <div className="mt-3 border-t border-border pt-3">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Event Description
            </div>
            <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
              {event.description ?? UNAVAILABLE}
            </p>
            {event.source_url && (
              <a
                href={event.source_url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-2 inline-flex items-center gap-1 text-[10px] text-mint hover:underline"
              >
                Source: {event.source} <ExternalLink className="h-3 w-3" />
              </a>
            )}
          </div>
        </div>

        {/* --- column 2: market impact + gauge + scenarios --- */}
        <div className="min-w-0 border-t border-border p-4 lg:border-t-0">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="min-w-0">
              <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Market Impact
              </div>
              {event.markets.length === 0 ? (
                <p className="mt-2 text-[11px] text-muted-foreground">{UNAVAILABLE}</p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {event.markets.map((m) => (
                    <li key={m} className="flex items-center justify-between gap-2">
                      <span className="truncate text-[11px] text-foreground">{m}</span>
                      <ImpactBadge impact={event.impact} />
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <ImpactDonut impact={event.impact} />
          </div>

          <div className="mt-4 border-t border-border pt-4">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Scenario Analysis
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {[
                {
                  head: "Higher Than Expected",
                  tone: "text-destructive",
                  points: ["Tighter policy expectations", "Pressure on equities", "Support for the currency"],
                },
                {
                  head: "In Line With Expectations",
                  tone: "text-mint",
                  points: ["Limited directional move", "Normal volatility", "Range-bound markets"],
                },
                {
                  head: "Lower Than Expected",
                  tone: "text-success",
                  points: ["Easier policy expectations", "Support for equities", "Softer currency"],
                },
              ].map((s) => (
                <div key={s.head} className="rounded-xl border border-border bg-surface-2 p-2">
                  <div className={cn("text-[10px] font-bold", s.tone)}>{s.head}</div>
                  <ul className="mt-1 space-y-0.5">
                    {s.points.map((p) => (
                      <li key={p} className="text-[9px] leading-snug text-muted-foreground">
                        • {p}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-muted-foreground">
              Scenario framing is generic guidance. No forecast/consensus value is available from a
              licence-clean source, so Forecast shows “{UNAVAILABLE}”.
            </p>
          </div>
        </div>


        {/* --- column 3: exposure + actions --- */}
        <div className="flex min-w-0 flex-col border-t border-border p-4 lg:border-t-0">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your Portfolio Exposure
          </div>
          <div className="mt-1 text-[11px] text-mint">
            {total > 0
              ? `${total} position${total === 1 ? "" : "s"} potentially affected`
              : "No potential exposure detected"}
          </div>
          <div className="mt-3 flex-1 space-y-4">
            <ExposureList
              title="Potentially affected holdings"
              hits={holdings}
              emptyText="None of your holdings map to this event's markets."
            />
            <ExposureList
              title="Potentially affected watchlist"
              hits={watched}
              emptyText="No watchlist entries map to this event's markets."
            />
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-3">
            <Button size="sm" variant={alertActive ? "default" : "outline"} onClick={onSetAlert}>
              <Bell className="mr-1.5 h-3.5 w-3.5" />
              {alertActive ? "Alert Set" : "Set Alert"}
            </Button>
            <Button size="sm" variant="outline" onClick={onAddReminder}>
              <BellPlus className="mr-1.5 h-3.5 w-3.5" /> Add Reminder
            </Button>
          </div>
        </div>
      </div>
    </Panel>
  );
}

/* ============================ calendar ============================ */

const DOW = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function EventCalendar({
  events,
  month,
  onMonthChange,
  onSelect,
  selectedId,
}: {
  events: MarketEvent[];
  month: Date;
  onMonthChange: (d: Date) => void;
  onSelect: (e: MarketEvent) => void;
  selectedId: string | null;
}) {
  const year = month.getFullYear();
  const mi = month.getMonth();
  const first = new Date(year, mi, 1);
  const startOffset = (first.getDay() + 6) % 7; // Monday-first
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) cells.push(new Date(year, mi, 1 - startOffset + i));

  const byDay = new Map<string, MarketEvent[]>();
  for (const e of events) {
    const k = new Date(e.event_time).toDateString();
    byDay.set(k, [...(byDay.get(k) ?? []), e]);
  }
  const today = new Date().toDateString();

  return (
    <Panel
      title="Event Calendar"
      icon={CalendarDays}
      action={<span className="text-[11px] text-mint">View Full Calendar →</span>}
    >
      <div className="p-4">
        <div className="mb-3 flex items-center justify-between">
          <button
            type="button"
            aria-label="Previous month"
            onClick={() => onMonthChange(new Date(year, mi - 1, 1))}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="text-sm font-semibold text-foreground">
            {month.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
          </div>
          <button
            type="button"
            aria-label="Next month"
            onClick={() => onMonthChange(new Date(year, mi + 1, 1))}
            className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {DOW.map((d) => (
            <div key={d} className="pb-1 text-[10px] font-medium uppercase text-muted-foreground">
              {d}
            </div>
          ))}
          {cells.map((d) => {
            const list = byDay.get(d.toDateString()) ?? [];
            const inMonth = d.getMonth() === mi;
            const isToday = d.toDateString() === today;
            const hasSelected = list.some((e) => e.id === selectedId);
            return (
              <button
                key={d.toISOString()}
                type="button"
                disabled={list.length === 0}
                onClick={() => list[0] && onSelect(list[0]!)}
                className={cn(
                  "flex h-11 flex-col items-center justify-center rounded-lg text-xs transition",
                  inMonth ? "text-foreground" : "text-muted-foreground/50",
                  list.length > 0 && "hover:bg-surface-2",
                  isToday && "ring-1 ring-mint",
                  hasSelected && "bg-mint/15",
                )}
                title={list.map((e) => e.event_name).join(", ")}
              >
                <span>{d.getDate()}</span>
                <span className="mt-0.5 flex h-1.5 items-center gap-0.5">
                  {list.slice(0, 4).map((e) => (
                    <span
                      key={e.id}
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        e.category === "Central Bank"
                          ? "bg-amber-400"
                          : e.category === "Earnings"
                          ? "bg-sky-400"
                          : e.category === "Dividend"
                          ? "bg-emerald-400"
                          : e.category === "Corporate Action"
                          ? "bg-violet-400"
                          : "bg-mint",
                      )}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3 text-[10px] text-muted-foreground">
          {[
            ["Economic", "bg-mint"],
            ["Central Bank", "bg-amber-400"],
            ["Earnings", "bg-sky-400"],
            ["Dividend", "bg-emerald-400"],
            ["Corporate Action", "bg-violet-400"],
          ].map(([label, tone]) => (
            <span key={label} className="inline-flex items-center gap-1">
              <span className={cn("h-1.5 w-1.5 rounded-full", tone)} /> {label}
            </span>
          ))}
        </div>
      </div>
    </Panel>
  );
}

/* ============================ timeline ============================ */

export function EventTimeline({
  events,
  selectedId,
  onSelect,
  exposureCount,
  onSetAlert,
  onLoadMore,
  canLoadMore,
}: {
  events: MarketEvent[];
  selectedId: string | null;
  onSelect: (e: MarketEvent) => void;
  exposureCount: (e: MarketEvent) => number;
  onSetAlert: (e: MarketEvent) => void;
  onLoadMore: () => void;
  canLoadMore: boolean;
}) {
  return (
    <Panel title="Event Timeline" icon={Clock}>
      {events.length === 0 ? (
        <EmptyState text="No events match your filters." />
      ) : (
        <>
          <div className="w-full min-w-0">
            <table className="w-full table-fixed text-left text-xs">
              <colgroup>
                <col className="w-[7%]" />
                <col className="w-[18%]" />
                <col className="w-[12%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[8%]" />
                <col className="w-[9%]" />
                <col className="w-[14%]" />
                <col className="w-[9%]" />
                <col className="w-[7%]" />
              </colgroup>
              <thead>
                <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2 font-medium">Time</th>
                  <th className="px-3 py-2 font-medium">Event</th>
                  <th className="px-3 py-2 font-medium">Date &amp; Time</th>
                  <th className="px-3 py-2 font-medium">Previous</th>
                  <th className="px-3 py-2 font-medium">Forecast</th>
                  <th className="px-3 py-2 font-medium">Actual</th>
                  <th className="px-3 py-2 font-medium">Impact</th>
                  <th className="px-3 py-2 font-medium">Affected Markets / Assets</th>
                  <th className="px-3 py-2 font-medium">Your Exposure</th>
                  <th className="px-3 py-2 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {events.map((e) => {
                  const n = exposureCount(e);
                  return (
                    <tr
                      key={e.id}
                      onClick={() => onSelect(e)}
                      className={cn(
                        "cursor-pointer border-b border-border/60 transition hover:bg-surface-2",
                        e.id === selectedId && "bg-mint/10",
                      )}
                    >
                      <td className="px-4 py-2.5 align-top text-muted-foreground">
                        {formatTime(e.event_time)}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex items-start gap-2">
                          <Flag country={e.country} />
                          <div className="min-w-0">
                            <div className="break-words font-semibold text-foreground">{e.event_name}</div>
                            <div className="break-words text-[10px] text-muted-foreground">
                              {e.country} • {e.category}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top text-muted-foreground">
                        {formatDateTime(e.event_time)}
                      </td>
                      <td className="break-words px-3 py-2.5 align-top text-foreground">
                        {displayValue(e.previous)}
                      </td>
                      <td className="break-words px-3 py-2.5 align-top text-muted-foreground">
                        {displayValue(e.forecast)}
                      </td>
                      <td className="break-words px-3 py-2.5 align-top text-foreground">
                        {displayValue(e.actual)}
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <ImpactBadge impact={e.impact} />
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        <div className="flex flex-wrap gap-1">
                          {e.markets.slice(0, 4).map((m) => (
                            <span
                              key={m}
                              className="rounded-md border border-border bg-surface-2 px-1.5 py-0.5 text-[10px] text-muted-foreground"
                            >
                              {m}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 align-top">
                        {n > 0 ? (
                          <span className="inline-block rounded-md border border-mint/40 bg-mint/10 px-1.5 py-0.5 text-[10px] font-semibold text-mint">
                            {n} Holding{n === 1 ? "" : "s"}
                          </span>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">None</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5 text-right align-top">
                        <button
                          type="button"
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onSetAlert(e);
                          }}
                          aria-label={`Set alert for ${e.event_name}`}
                          className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-mint/10 hover:text-mint"
                        >
                          <Bell className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {canLoadMore && (
            <div className="flex justify-center border-t border-border p-3">
              <Button variant="outline" size="sm" onClick={onLoadMore} className="text-xs">
                Load More Events
              </Button>
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

/* ============================ sidebar ============================ */

export function EventsSidebar({
  highlights,
  categoryCounts,
  exposure,
  onSelect,
  selectedId,
  onManageAlerts,
}: {
  highlights: MarketEvent[];
  categoryCounts: Array<{ category: string; count: number }>;
  exposure: { total: number; buckets: Array<{ label: string; pct: number; tone: string }> };
  onSelect: (e: MarketEvent) => void;
  selectedId: string | null;
  onManageAlerts: () => void;
}) {
  return (
    <div className="flex flex-col gap-4">
      <Panel title="Market Impact Highlights" icon={BarChart3}>
        {highlights.length === 0 ? (
          <EmptyState text="No high impact events in range." />
        ) : (
          <div className="divide-y divide-border">
            {highlights.slice(0, 4).map((e) => (
              <button
                key={e.id}
                type="button"
                onClick={() => onSelect(e)}
                className={cn(
                  "flex w-full items-start gap-2 px-4 py-3 text-left transition hover:bg-surface-2",
                  e.id === selectedId && "bg-mint/10",
                )}
              >
                <Flag country={e.country} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xs font-semibold text-foreground">
                    {e.event_name} ({formatDate(e.event_time).slice(0, 5)})
                  </div>
                  <div className="mt-0.5 truncate text-[10px] text-muted-foreground">
                    {e.markets.slice(0, 3).join(" • ") || "—"}
                  </div>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <ImpactBars impact={e.impact} />
                  <span className="text-[9px] font-semibold text-muted-foreground">{e.impact}</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </Panel>

      <Panel
        title="Event Categories"
        icon={Activity}
        action={<span className="text-[11px] text-mint">View All →</span>}
      >
        <ul className="divide-y divide-border">
          {categoryCounts.map((c) => (
            <li key={c.category} className="flex items-center justify-between px-4 py-2.5">
              <span
                className={cn("text-xs font-medium", CATEGORY_TONE[c.category] ?? "text-foreground")}
              >
                {c.category}
              </span>
              <span className="text-xs font-semibold text-muted-foreground">{c.count}</span>
            </li>
          ))}
        </ul>
      </Panel>

      <Panel
        title="My Exposure"
        icon={Target}
        action={<span className="text-[11px] text-mint">View Details →</span>}
      >
        <div className="p-4">
          <div className="text-center">
            <div className="font-display text-2xl font-bold text-foreground">{exposure.total}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Events Affecting You
            </div>
          </div>
          {exposure.buckets.length === 0 ? (
            <p className="mt-3 text-center text-[11px] text-muted-foreground">
              No potential exposure detected from your holdings.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {exposure.buckets.map((b) => (
                <li key={b.label} className="flex items-center justify-between gap-2 text-[11px]">
                  <span className="inline-flex items-center gap-2 text-muted-foreground">
                    <span className={cn("h-1.5 w-1.5 rounded-full", b.tone)} /> {b.label}
                  </span>
                  <span className="font-semibold text-foreground">{b.pct}%</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Panel>

      <div className="rounded-2xl border border-border bg-card p-4 text-center">
        <Bell className="mx-auto h-5 w-5 text-amber-400" />
        <div className="mt-2 text-sm font-semibold text-foreground">
          Never Miss an Important Event
        </div>
        <p className="mt-1 text-[11px] text-muted-foreground">
          Get in-app alerts for high-impact events
        </p>
        <Button size="sm" className="mt-3 w-full" onClick={onManageAlerts}>
          Manage Event Alerts
        </Button>
      </div>
    </div>
  );
}
