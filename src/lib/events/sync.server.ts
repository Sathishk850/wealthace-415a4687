// Market events sync — SERVER ONLY. Upserts curated + FRED rows into
// public.market_events using (source, external_id) for deduplication.

import type { MarketEventUpsert } from "./types";

export type SyncResult = {
  curated: number;
  fred: number;
  upserted: number;
  errors: string[];
  synced_at: string;
};

export async function syncMarketEvents(now: Date = new Date()): Promise<SyncResult> {
  const errors: string[] = [];
  const rows: MarketEventUpsert[] = [];

  const { buildCuratedEvents } = await import("./static-calendar");
  const curated = buildCuratedEvents(now);
  rows.push(...curated);

  let fredCount = 0;
  try {
    const { buildFredEvents } = await import("./fred.server");
    const fred = await buildFredEvents(now);
    fredCount = fred.length;
    rows.push(...fred);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "FRED sync failed");
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  let upserted = 0;
  for (let i = 0; i < rows.length; i += 100) {
    const chunk = rows.slice(i, i + 100);
    const { error } = await supabaseAdmin
      .from("market_events")
      .upsert(chunk, { onConflict: "source,external_id" });
    if (error) errors.push(error.message);
    else upserted += chunk.length;
  }

  return {
    curated: curated.length,
    fred: fredCount,
    upserted,
    errors,
    synced_at: now.toISOString(),
  };
}
