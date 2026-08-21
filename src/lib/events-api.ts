// Client-side hooks for the Global Market Events module.
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listMarketEvents, triggerEventSync } from "@/lib/events.functions";
import type { MarketEvent } from "@/lib/events/types";

export const eventKeys = {
  list: ["market-events"] as const,
};

export function useMarketEvents() {
  const fetchEvents = useServerFn(listMarketEvents);
  return useQuery<{ events: MarketEvent[]; synced_at: string | null }>({
    queryKey: eventKeys.list,
    queryFn: () => fetchEvents(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSyncMarketEvents() {
  const qc = useQueryClient();
  const sync = useServerFn(triggerEventSync);
  return useMutation({
    mutationFn: () => sync(),
    onSuccess: () => qc.invalidateQueries({ queryKey: eventKeys.list }),
  });
}

/** Upcoming events first (soonest), then the most recently released. */
export function orderForCard(events: MarketEvent[], limit = 6): MarketEvent[] {
  const now = Date.now();
  const upcoming = events
    .filter((e) => new Date(e.event_time).getTime() >= now)
    .sort((a, b) => a.event_time.localeCompare(b.event_time));
  const past = events
    .filter((e) => new Date(e.event_time).getTime() < now)
    .sort((a, b) => b.event_time.localeCompare(a.event_time));
  return [...upcoming, ...past].slice(0, limit);
}
