import { X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { flagFor, type MarketEvent } from "@/lib/events/types";
import { useInvestments } from "@/lib/wealth-api";
import { impactClass, statusClass, eventDay, eventTime } from "./market-events-card";

type Scenario = { label: string; outcome: string; tone: "red" | "yellow" | "green" };

function scenariosFor(category: string): Scenario[] {
  switch (category?.toLowerCase()) {
    case "inflation":
      return [
        {
          label: "Higher Than Expected",
          outcome:
            "Risk-off: equity pressure, bond yields rise, currency may strengthen. Central bank may signal tighter policy.",
          tone: "red",
        },
        { label: "In Line with Expectations", outcome: "Limited market reaction. Status quo maintained.", tone: "yellow" },
        {
          label: "Lower Than Expected",
          outcome: "Risk-on: equities may rally, bond yields fall, potential rate cut signal.",
          tone: "green",
        },
      ];
    case "employment":
      return [
        {
          label: "Higher Than Expected",
          outcome: "Strong jobs: equity rally possible, USD strengthens, rate hike expectations may rise.",
          tone: "green",
        },
        { label: "In Line with Expectations", outcome: "Neutral reaction, range-bound markets.", tone: "yellow" },
        {
          label: "Lower Than Expected",
          outcome: "Weak jobs: equities may fall, USD weakens, rate cut expectations rise.",
          tone: "red",
        },
      ];
    case "central bank":
      return [
        {
          label: "Hawkish Surprise",
          outcome: "Rate hike or hawkish tone: bonds sell off, currency strengthens, equities under pressure.",
          tone: "red",
        },
        { label: "As Expected", outcome: "Policy unchanged or in line: limited volatility.", tone: "yellow" },
        {
          label: "Dovish Surprise",
          outcome: "Rate cut or dovish tone: bonds rally, currency weakens, equities may rise.",
          tone: "green",
        },
      ];
    case "growth":
      return [
        {
          label: "Higher Than Expected",
          outcome: "Strong growth: equities positive, currency strengthens.",
          tone: "green",
        },
        { label: "In Line with Expectations", outcome: "Neutral: limited market impact.", tone: "yellow" },
        {
          label: "Lower Than Expected",
          outcome: "Weak growth: equities negative, recession concerns may rise.",
          tone: "red",
        },
      ];
    default:
      return [
        {
          label: "Higher Than Expected",
          outcome: "An upside surprise may lift growth-sensitive assets and firm the currency.",
          tone: "green",
        },
        { label: "In Line with Expectations", outcome: "Limited market reaction expected.", tone: "yellow" },
        {
          label: "Lower Than Expected",
          outcome: "A downside surprise may weigh on risk assets and soften the currency.",
          tone: "red",
        },
      ];
  }
}

const TONE: Record<Scenario["tone"], string> = {
  red: "border-red-500/30 bg-red-500/5",
  yellow: "border-yellow-500/30 bg-yellow-500/5",
  green: "border-green-500/30 bg-green-500/5",
};

const TONE_TEXT: Record<Scenario["tone"], string> = {
  red: "text-red-400",
  yellow: "text-yellow-400",
  green: "text-green-400",
};

function has(list: string[] | null | undefined, ...needles: string[]): boolean {
  const lower = (list ?? []).map((v) => v.toLowerCase());
  return needles.some((n) => lower.includes(n.toLowerCase()));
}

function isRelevant(
  category: string,
  event: MarketEvent,
): boolean {
  const markets = event.markets ?? [];
  const classes = event.asset_classes ?? [];
  const c = (category ?? "").toLowerCase();
  const indian = event.country === "India";

  if (/gold|silver|commodit/.test(c)) return has(markets, "Gold", "Commodities", "Metals") || has(classes, "Commodity");
  if (/bond|debt|fd|ppf|nps|g-sec|deposit/.test(c))
    return has(classes, "Debt") || has(markets, "G-Secs", "US Treasuries", "Gilts", "Bunds", "JGBs");
  if (/reit|invit|real estate/.test(c)) return has(classes, "Equity");
  if (/etf|stock|equity|mutual|fund|share/.test(c)) {
    return (
      has(markets, "S&P 500", "NASDAQ") ||
      ((has(markets, "NIFTY 50", "SENSEX") || has(classes, "Equity")) && indian) ||
      has(classes, "Equity")
    );
  }
  return false;
}

export function EventDetailPanel({
  event,
  onClose,
}: {
  event: MarketEvent;
  onClose: () => void;
}) {
  const { data: investments } = useInvestments();
  const holdings = investments ?? [];
  const matched = holdings.filter((h) => isRelevant(String(h.category ?? ""), event));

  return (
    <Card className="w-full shrink-0 space-y-4 p-4 lg:w-[380px]">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <div className="text-lg font-bold leading-tight text-foreground">{event.event_name}</div>
          <div className="mt-1 truncate text-xs text-muted-foreground">
            {flagFor(event.country)} {event.country} · {event.category}
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {eventDay(event.event_time)} · {eventTime(event.event_time)}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">
            Previous: <span className="text-foreground">{event.previous ?? "—"}</span> · Actual:{" "}
            <span className="font-medium text-foreground">{event.actual ?? "—"}</span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", impactClass(event.impact))}>
              {event.impact}
            </span>
            <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", statusClass(event.status))}>
              {event.status}
            </span>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close details"
          className="shrink-0 rounded-lg border border-border p-1.5 text-muted-foreground transition hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <section className="rounded-xl border border-primary/20 bg-primary/5 p-3">
        <h3 className="text-sm font-semibold text-foreground">Market Impact</h3>
        <div className="mt-2 space-y-2">
          {(event.markets ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No market mapping recorded for this event.</p>
          ) : (
            (event.markets ?? []).map((m) => (
              <div key={m} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm text-foreground">{m}</div>
                  <div className="text-[11px] text-muted-foreground">Potentially affected</div>
                </div>
                <span
                  className={cn(
                    "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                    impactClass(event.impact),
                  )}
                >
                  {event.impact}
                </span>
              </div>
            ))
          )}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-foreground">Scenario Analysis</h3>
        <div className="mt-2 space-y-2">
          {scenariosFor(event.category).map((s) => (
            <div key={s.label} className={cn("rounded-xl border p-3", TONE[s.tone])}>
              <div className={cn("text-xs font-semibold", TONE_TEXT[s.tone])}>{s.label}</div>
              <p className="mt-1 text-xs text-muted-foreground">{s.outcome}</p>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Potential outcome — not a guaranteed market reaction.
        </p>
      </section>

      <section>
        <h3 className="text-sm font-semibold text-foreground">Portfolio Impact</h3>
        {holdings.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Add holdings in the Wealth module to see your exposure.
          </p>
        ) : matched.length === 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            No direct portfolio overlap detected for this event.
          </p>
        ) : (
          <div className="mt-2 space-y-1.5">
            <div className="text-xs font-semibold text-foreground">
              {matched.length} holding{matched.length === 1 ? "" : "s"} may be affected
            </div>
            {matched.map((h) => (
              <div key={h.id} className="truncate text-xs text-muted-foreground">
                <span className="text-foreground">{h.name}</span> · {h.category}
              </div>
            ))}
          </div>
        )}
        <p className="mt-2 text-[11px] text-muted-foreground">
          Potentially affects — informational only, not investment advice.
        </p>
      </section>
    </Card>
  );
}
