// Market events sync — SERVER ONLY. Upserts curated + FRED rows into
// public.market_events using (source, external_id) for deduplication, then
// dispatches web-push notifications for newly released / high-impact events.

import type { MarketEventUpsert } from "./types";

export type SyncResult = {
  curated: number;
  fred: number;
  upserted: number;
  pushed: number;
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

  let pushed = 0;
  try {
    pushed = await dispatchEventPushes(supabaseAdmin, rows, now);
  } catch (err) {
    errors.push(err instanceof Error ? err.message : "Push dispatch failed");
  }

  return {
    curated: curated.length,
    fred: fredCount,
    upserted,
    pushed,
    errors,
    synced_at: now.toISOString(),
  };
}

/** Notification-worthy: just-released values, or upcoming high-impact events. */
function isNotifiable(row: MarketEventUpsert, now: Date): boolean {
  const t = new Date(row.event_time).getTime();
  const highImpact = row.impact === "High" || row.impact === "Very High";
  if (row.status === "RELEASED" && row.actual) {
    return now.getTime() - t < 24 * 60 * 60 * 1000;
  }
  if (row.status === "UPCOMING" && highImpact) {
    const delta = t - now.getTime();
    return delta > 0 && delta < 24 * 60 * 60 * 1000;
  }
  return false;
}

async function dispatchEventPushes(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: any,
  rows: MarketEventUpsert[],
  now: Date,
): Promise<number> {
  const notifiable = rows.filter((r) => isNotifiable(r, now));
  if (notifiable.length === 0) return 0;

  const { sendPushToUser, listPushUserIds } = await import("@/lib/push.server");
  const userIds = await listPushUserIds(admin);
  if (userIds.length === 0) return 0;

  const { flagFor } = await import("./types");
  const cutoff = new Date(now.getTime() - 6 * 60 * 60 * 1000).toISOString();
  let sent = 0;

  for (const row of notifiable) {
    // Resolve the stored row so we can key dedup off its id.
    const { data: stored } = await admin
      .from("market_events")
      .select("id")
      .eq("source", row.source)
      .eq("external_id", row.external_id)
      .maybeSingle();
    if (!stored?.id) continue;

    const kind = `event_push:${row.status}`;
    const priority =
      row.impact === "Very High"
        ? ("very-high" as const)
        : row.impact === "High"
          ? ("high" as const)
          : row.impact === "Moderate"
            ? ("moderate" as const)
            : ("low" as const);

    const payload = {
      title: `${flagFor(row.country)} ${row.event_name}`,
      body: `${row.status} · ${row.impact} Impact · Previous: ${row.previous ?? "—"} → Actual: ${row.actual ?? "Upcoming"}`,
      tag: row.external_id,
      url: "/events",
      priority,
    };

    for (const userId of userIds) {
      const { data: dup } = await admin
        .from("event_notification_log")
        .select("id")
        .eq("user_id", userId)
        .eq("event_id", stored.id)
        .eq("kind", kind)
        .gte("created_at", cutoff)
        .maybeSingle();
      if (dup?.id) continue;

      const res = await sendPushToUser(admin, userId, payload);
      if (res.sent > 0) sent += res.sent;

      await admin
        .from("event_notification_log")
        .insert({ user_id: userId, event_id: stored.id, kind });

      await admin.from("notifications").insert({
        user_id: userId,
        title: payload.title,
        body: payload.body,
        category: "system",
        priority: priority === "very-high" || priority === "high" ? "high" : "normal",
        link: "/events",
        metadata: { event_id: stored.id, external_id: row.external_id },
      });
    }
  }

  return sent;
}
