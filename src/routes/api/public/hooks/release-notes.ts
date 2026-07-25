import { createFileRoute } from "@tanstack/react-router";
import { timingSafeEqual } from "crypto";

/**
 * POST /api/public/hooks/release-notes
 *
 * Body:
 *   { version, releaseDate, changes: string[], secret }
 *
 * The endpoint validates the shared secret against RELEASE_WEBHOOK_SECRET.
 * Persistence to a database is intentionally not wired here — the current
 * "What's New" surface reads from src/lib/releases.ts. This endpoint
 * accepts and validates the payload so an external CI/CD job can call it,
 * and returns 201 when a valid release payload is received.
 */
export const Route = createFileRoute("/api/public/hooks/release-notes")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RELEASE_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook not configured", { status: 503 });
        }

        let payload: unknown;
        try {
          payload = await request.json();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        const body = payload as {
          version?: unknown;
          releaseDate?: unknown;
          changes?: unknown;
          secret?: unknown;
        };

        const provided = typeof body.secret === "string" ? body.secret : "";
        const a = Buffer.from(provided);
        const b = Buffer.from(secret);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Unauthorized", { status: 401 });
        }

        const version = typeof body.version === "string" ? body.version.trim() : "";
        const releaseDate = typeof body.releaseDate === "string" ? body.releaseDate.trim() : "";
        const changes = Array.isArray(body.changes)
          ? body.changes.filter((c): c is string => typeof c === "string" && c.trim().length > 0)
          : [];

        if (!/^\d+\.\d+\.\d+/.test(version)) {
          return new Response("Invalid version", { status: 400 });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
          return new Response("Invalid releaseDate (expected YYYY-MM-DD)", { status: 400 });
        }
        if (changes.length === 0) {
          return new Response("changes must be a non-empty array of strings", { status: 400 });
        }

        return Response.json(
          {
            ok: true,
            received: { version, releaseDate, changes },
            note: "Release accepted. Update src/lib/releases.ts or wire persistence to display in the app.",
          },
          { status: 201 },
        );
      },
    },
  },
});
