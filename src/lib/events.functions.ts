// Server functions for the Global Market Events module.
// Thin wrappers only — no runtime helpers at module scope.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { MarketEvent } from "@/lib/events/types";

/** Upcoming + recent released events, sorted by event_time ascending. */
export const listMarketEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ events: MarketEvent[]; synced_at: string | null }> => {
    // Upcoming events in the current + next month, plus the 2 most recent past ones.
    const now = new Date();
    const nowIso = now.toISOString();
    const windowEnd = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1),
    ).toISOString();

    const [upcomingRes, pastRes] = await Promise.all([
      context.supabase
        .from("market_events")
        .select("*")
        .gte("event_time", nowIso)
        .lt("event_time", windowEnd)
        .order("event_time", { ascending: true })
        .limit(200),
      context.supabase
        .from("market_events")
        .select("*")
        .lt("event_time", nowIso)
        .order("event_time", { ascending: false })
        .limit(2),
    ]);
    const error = upcomingRes.error ?? pastRes.error;
    if (error) throw new Error(error.message);
    const rows = [
      ...((pastRes.data ?? []) as unknown as MarketEvent[]).reverse(),
      ...((upcomingRes.data ?? []) as unknown as MarketEvent[]),
    ];
    const lastSync = rows.reduce((latest, row) => {
      const t = row.last_updated ?? "";
      return t > latest ? t : latest;
    }, "");
    return { events: rows, synced_at: lastSync || null };
  });

/** Triggers an immediate sync (Refresh / Sync Now buttons). */
export const triggerEventSync = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { syncMarketEvents } = await import("@/lib/events/sync.server");
    return syncMarketEvents();
  });
