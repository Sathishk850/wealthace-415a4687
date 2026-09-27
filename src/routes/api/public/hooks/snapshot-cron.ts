import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";
import { runSnapshotCron } from "@/lib/snapshot-cron.server";

/** Daily worker: takes automatic net worth snapshots for users who enabled them. */
export const Route = createFileRoute("/api/public/hooks/snapshot-cron")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const eq = (a: string, b: string) =>
          !!b && a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
        const provided = request.headers.get("x-webhook-secret") ?? "";
        const apiKey = request.headers.get("apikey") ?? "";
        const ok =
          eq(provided, process.env.NOTIFICATION_CRON_SECRET ?? "") ||
          eq(apiKey, process.env.SUPABASE_PUBLISHABLE_KEY ?? "") ||
          eq(apiKey, process.env.SUPABASE_ANON_KEY ?? "");
        if (!ok) return Response.json({ error: "Unauthorized" }, { status: 401 });
        try {
          const result = await runSnapshotCron();
          return Response.json({ ok: true, ...result });
        } catch (err) {
          return Response.json({ ok: false, error: String(err) }, { status: 500 });
        }
      },
    },
  },
});
