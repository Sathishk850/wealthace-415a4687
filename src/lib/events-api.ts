import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useMemo } from "react";
import { useInvestments } from "@/lib/wealth-api";
import { IMPACT_SCORE, type EventStatus, type Impact } from "@/lib/events/catalog";

export type MarketEvent = {
  id: string;
  source: string;
  external_id: string;
  country: string;
  region: string;
  event_name: string;
  category: string;
  event_time: string;
  timezone: string;
  previous: string | null;
  forecast: string | null;
  actual: string | null;
  unit: string | null;
  impact: Impact;
  status: EventStatus;
  description: string | null;
  markets: string[];
  asset_classes: string[];
  source_url: string | null;
  last_updated: string;
  created_at: string;
};

export type WatchlistItem = {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  category: string;
  market: string | null;
};

export const eventKeys = {
  events: ["market-events"] as const,
  alerts: ["market-events", "alerts"] as const,
  watchlist: ["watchlist"] as const,
};

/** All stored events in a wide window; filtering happens client-side. */
export function useMarketEvents() {
  return useQuery({
    queryKey: eventKeys.events,
    queryFn: async (): Promise<MarketEvent[]> => {
      const from = new Date(Date.now() - 45 * 864e5).toISOString();
      const to = new Date(Date.now() + 180 * 864e5).toISOString();
      const { data, error } = await supabase
        .from("market_events" as never)
        .select("*")
        .gte("event_time", from)
        .lte("event_time", to)
        .order("event_time", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as MarketEvent[];
    },
    refetchInterval: 15 * 60_000,
  });
}

export function useWatchlist() {
  return useQuery({
    queryKey: eventKeys.watchlist,
    queryFn: async (): Promise<WatchlistItem[]> => {
      const { data, error } = await supabase
        .from("user_watchlist" as never)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as WatchlistItem[];
    },
  });
}

export function useEventAlerts() {
  return useQuery({
    queryKey: eventKeys.alerts,
    queryFn: async (): Promise<Array<{ id: string; event_id: string; active: boolean }>> => {
      const { data, error } = await supabase
        .from("user_event_alerts" as never)
        .select("id, event_id, active");
      if (error) throw error;
      return (data ?? []) as unknown as Array<{ id: string; event_id: string; active: boolean }>;
    },
  });
}

export function useSetEventAlert() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (event_id: string) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { error } = await supabase
        .from("user_event_alerts" as never)
        .upsert(
          { user_id: u.user.id, event_id, active: true } as never,
          { onConflict: "user_id,event_id" },
        );
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Alert set — you'll be notified in-app");
      qc.invalidateQueries({ queryKey: eventKeys.alerts });
    },
    onError: (e: Error) => toast.error(e.message || "Could not set alert"),
  });
}

/* ---------------- Exposure ---------------- */

export type ExposureHit = {
  id: string;
  name: string;
  symbol: string | null;
  category: string;
  kind: "holding" | "watchlist";
  reason: string;
};

const CATEGORY_TO_ASSET_CLASS: Record<string, string> = {
  Stocks: "Equity",
  "Mutual Funds": "Mutual Funds",
  ETFs: "Index / ETF",
  Bonds: "Debt",
  Debt: "Debt",
  Gold: "Gold / Commodity",
  Commodities: "Gold / Commodity",
  Crypto: "Crypto",
  Others: "Equity",
};

function marketMatchesRegion(region: string, symbol: string | null, currency?: string | null) {
  const s = (symbol ?? "").toUpperCase();
  if (region === "India") return s.endsWith(".NS") || s.endsWith(".BO") || currency === "INR";
  if (region === "United States") return currency === "USD" || (!!s && !s.includes("."));
  if (region === "Europe") return currency === "EUR";
  if (region === "United Kingdom") return currency === "GBP" || s.endsWith(".L");
  if (region === "Japan") return currency === "JPY" || s.endsWith(".T");
  if (region === "China") return currency === "CNY" || s.endsWith(".SS") || s.endsWith(".SZ");
  return false;
}

/**
 * Potentially-affected holdings & watchlist entries for an event.
 * Purely derived from the signed-in user's own records — never demo data.
 * Matching is a *potential* exposure signal, not a prediction.
 */
export function useEventExposure(event: MarketEvent | null) {
  const investments = useInvestments();
  const watchlist = useWatchlist();

  return useMemo(() => {
    const holdings: ExposureHit[] = [];
    const watched: ExposureHit[] = [];
    if (!event) return { holdings, watched, loading: investments.isLoading };

    const classes = new Set(event.asset_classes);

    for (const inv of investments.data ?? []) {
      const cls = CATEGORY_TO_ASSET_CLASS[inv.category] ?? "Equity";
      const byRegion = marketMatchesRegion(
        event.region,
        inv.symbol ?? null,
        (inv as { currency?: string }).currency ?? null,
      );
      const byClass = classes.has(cls);
      if (byRegion && byClass) {
        holdings.push({
          id: inv.id,
          name: inv.name,
          symbol: inv.symbol ?? null,
          category: inv.category,
          kind: "holding",
          reason: `${event.region} ${cls.toLowerCase()} exposure`,
        });
      }
    }

    for (const w of watchlist.data ?? []) {
      const cls = CATEGORY_TO_ASSET_CLASS[w.category] ?? "Equity";
      if (marketMatchesRegion(event.region, w.symbol, null) && classes.has(cls)) {
        watched.push({
          id: w.id,
          name: w.name,
          symbol: w.symbol,
          category: w.category,
          kind: "watchlist",
          reason: `${event.region} ${cls.toLowerCase()} exposure`,
        });
      }
    }

    return { holdings, watched, loading: investments.isLoading || watchlist.isLoading };
  }, [event, investments.data, investments.isLoading, watchlist.data, watchlist.isLoading]);
}

/** Count of distinct holdings potentially affected across a set of events. */
export function useAffectedCount(events: MarketEvent[]) {
  const investments = useInvestments();
  return useMemo(() => {
    const hit = new Set<string>();
    for (const e of events) {
      const classes = new Set(e.asset_classes);
      for (const inv of investments.data ?? []) {
        const cls = CATEGORY_TO_ASSET_CLASS[inv.category] ?? "Equity";
        if (
          classes.has(cls) &&
          marketMatchesRegion(e.region, inv.symbol ?? null, (inv as { currency?: string }).currency ?? null)
        ) {
          hit.add(inv.id);
        }
      }
    }
    return hit.size;
  }, [events, investments.data]);
}

export function sortByImpactThenTime(a: MarketEvent, b: MarketEvent) {
  const d = IMPACT_SCORE[b.impact] - IMPACT_SCORE[a.impact];
  if (d !== 0) return d;
  return new Date(a.event_time).getTime() - new Date(b.event_time).getTime();
}

export function isSameDay(iso: string, day: Date) {
  const d = new Date(iso);
  return (
    d.getFullYear() === day.getFullYear() &&
    d.getMonth() === day.getMonth() &&
    d.getDate() === day.getDate()
  );
}
