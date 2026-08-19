import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

/**
 * Cron worker for the Global Market Events module.
 *
 * Refreshes `public.market_events` from the curated calendar + FRED, then
 * dispatches web-push notifications for newly released / high-impact events.
 *
 * Auth: `x-webhook-secret: <NOTIFICATION_CRON_SECRET>` or the project's
 * publishable key in the `apikey` header (pg_cron pattern), or
 * `authorization: Bearer <NOTIFICATION_CRON_SECRET>`.
 */
export const Route = createFileRoute("/api/public/hooks/events-sync")({
  server: {
    handlers: {
      POST: async ({ request }) => handle(request),
      GET: async ({ request }) => handle(request),
    },
  },
});

async function handle(request: Request) {
  const eq = (a: string, b: string) => {
    if (!a || !b || a.length !== b.length) return false;
    return timingSafeEqual(Buffer.from(a), Buffer.from(b));
  };
  const secret = process.env["NOTIFICATION_CRON_SECRET"] ?? "";
  const provided = request.headers.get("x-webhook-secret") ?? "";
  const apiKey = request.headers.get("apikey") ?? "";
  const bearer = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");

  const authorized =
    eq(provided, secret) ||
    eq(bearer, secret) ||
    eq(apiKey, process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "") ||
    eq(apiKey, process.env["SUPABASE_ANON_KEY"] ?? "");

  if (!authorized) {
    console.warn("[events-sync] unauthorized request", {
      ip: request.headers.get("x-forwarded-for") ?? "unknown",
    });
    return Response.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { syncMarketEvents } = await import("@/lib/events/sync.server");
    const result = await syncMarketEvents();
    return Response.json({ ok: true, ...result });
  } catch (err) {
    console.error("[events-sync] failed", err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : "Sync failed" },
      { status: 500 },
    );
  }
}
