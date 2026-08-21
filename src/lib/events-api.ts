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
    .filter(
      (e) => new Date(e.event_time).getTime() < now && e.status?.toLowerCase() === "released",
    )
    .sort((a, b) => b.event_time.localeCompare(a.event_time));
  return [...upcoming, ...past].slice(0, limit);
}

/** Events whose local date is today. */
export function todaysEvents(events: MarketEvent[], limit = 5): MarketEvent[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return events
    .filter((e) => {
      const d = new Date(e.event_time);
      d.setHours(0, 0, 0, 0);
      return d.getTime() === today.getTime();
    })
    .sort((a, b) => a.event_time.localeCompare(b.event_time))
    .slice(0, limit);
}

/** Next events strictly in the future, soonest first. */
export function upcomingEvents(events: MarketEvent[], limit = 5): MarketEvent[] {
  const now = Date.now();
  return events
    .filter((e) => new Date(e.event_time).getTime() > now)
    .sort((a, b) => a.event_time.localeCompare(b.event_time))
    .slice(0, limit);
}
