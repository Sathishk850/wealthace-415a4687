import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { timingSafeEqual } from "crypto";
import { generateOccurrences } from "@/lib/events/schedule.server";
import { fetchActualSeries, pickValues } from "@/lib/events/actuals.server";

/**
 * Scheduled Events synchronisation worker.
 *
 * Official sources → normalise → upsert into public.market_events → UI reads
 * from the database only. Existing rows are updated in place (deduplicated on
 * source + external_id), so changed times, newly released actuals and status
 * transitions flow through automatically.
 *
 * Also creates in-app notifications for high-impact and portfolio-relevant
 * events, deduplicated through public.event_notification_log.
 *
 * Called by pg_cron with header `apikey: <publishable key>`.
 */
export const Route = createFileRoute("/api/public/hooks/events-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const eq = (a: string, b: string) => {
          if (!a || !b || a.length !== b.length) return false;
          return timingSafeEqual(Buffer.from(a), Buffer.from(b));
        };
        const apiKey = request.headers.get("apikey") ?? "";
        const secret = request.headers.get("x-webhook-secret") ?? "";
        const authorized =
          eq(secret, process.env["NOTIFICATION_CRON_SECRET"] ?? "") ||
          eq(apiKey, process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "") ||
          eq(apiKey, process.env["SUPABASE_ANON_KEY"] ?? "");
        if (!authorized) {
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }

        const admin = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { autoRefreshToken: false, persistSession: false } },
        );

        const now = new Date();
        const from = new Date(now.getTime() - 90 * 864e5);
        const to = new Date(now.getTime() + 180 * 864e5);

        const occurrences = generateOccurrences(from, to);
        const series = await fetchActualSeries(now);

        const rows = occurrences.map((o) => {
          const { actual, previous } = pickValues(series[o.def.key], o.refMonth);
          const past = o.event_time.getTime() < now.getTime();
          const status = !past ? "upcoming" : actual ? "released" : "delayed";
          return {
            source: o.def.source,
            external_id: o.external_id,
            country: o.def.country,
            region: o.def.region,
            event_name: o.def.event_name,
            category: o.def.category,
            event_time: o.event_time.toISOString(),
            timezone: o.def.timezone,
            previous,
            forecast: null, // no licence-clean global consensus source
            actual,
            unit: o.def.unit,
            impact: o.def.impact,
            status,
            description: o.def.description,
            markets: o.def.markets,
            asset_classes: o.def.asset_classes,
            source_url: o.def.source_url,
            last_updated: now.toISOString(),
          };
        });

        let upserted = 0;
        for (let i = 0; i < rows.length; i += 200) {
          const chunk = rows.slice(i, i + 200);
          const { error } = await admin
            .from("market_events")
            .upsert(chunk, { onConflict: "source,external_id" });
          if (error) {
            console.error("[events-sync] upsert failed", error.message);
            return new Response(JSON.stringify({ error: error.message }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
          upserted += chunk.length;
        }

        /* ---------- notifications ---------- */
        const soon = new Date(now.getTime() + 48 * 3600_000).toISOString();
        const { data: upcoming } = await admin
          .from("market_events")
          .select("id, event_name, country, impact, event_time, status, actual")
          .gte("event_time", now.toISOString())
          .lte("event_time", soon)
          .in("impact", ["High", "Very High"]);

        const { data: released } = await admin
          .from("market_events")
          .select("id, event_name, country, impact, event_time, actual")
          .eq("status", "released")
          .gte("event_time", new Date(now.getTime() - 36 * 3600_000).toISOString())
          .in("impact", ["High", "Very High"]);

        const { data: users } = await admin.from("profiles").select("user_id");
        let notifications = 0;

        for (const u of users ?? []) {
          const userId = (u as { user_id: string }).user_id;
          const queue: Array<{ id: string; kind: string; title: string; body: string }> = [];

          for (const e of upcoming ?? []) {
            queue.push({
              id: e.id as string,
              kind: "upcoming",
              title: `${e.impact} impact event: ${e.event_name}`,
              body: `${e.country} • scheduled ${new Date(e.event_time as string).toUTCString()}. Potentially affects your holdings and watchlist.`,
            });
          }
          for (const e of released ?? []) {
            queue.push({
              id: e.id as string,
              kind: "actual",
              title: `${e.event_name}: actual released`,
              body: `${e.country} • actual ${e.actual}. Review potentially affected holdings.`,
            });
          }

          for (const q of queue) {
            const { error: logErr } = await admin
              .from("event_notification_log")
              .insert({ user_id: userId, event_id: q.id, kind: q.kind });
            if (logErr) continue; // unique violation → already notified
            const { error: nErr } = await admin.from("notifications").insert({
              user_id: userId,
              title: q.title,
              body: q.body,
              category: "insight",
              priority: "normal",
              link: "/events",
              metadata: { event_id: q.id, kind: q.kind },
            });
            if (!nErr) notifications += 1;
          }
        }

        return new Response(
          JSON.stringify({ ok: true, events_upserted: upserted, notifications }),
          { headers: { "Content-Type": "application/json" } },
        );
      },
    },
  },
});
