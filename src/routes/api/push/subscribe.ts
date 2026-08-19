import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

type SubBody = {
  endpoint?: string;
  keys?: { p256dh?: string; auth?: string };
};

async function authedClient(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "";
  const client = createClient(process.env["SUPABASE_URL"]!, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        h.set("apikey", key);
        h.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) return null;
  return { client, userId: data.user.id };
}

export const Route = createFileRoute("/api/push/subscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await authedClient(request);
        if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });

        let body: SubBody;
        try {
          body = (await request.json()) as SubBody;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        const endpoint = body.endpoint;
        const p256dh = body.keys?.p256dh;
        const authKey = body.keys?.auth;
        if (!endpoint || !p256dh || !authKey) {
          return Response.json({ error: "Invalid subscription" }, { status: 400 });
        }

        const { error } = await auth.client.from("push_subscriptions").upsert(
          {
            user_id: auth.userId,
            endpoint,
            p256dh,
            auth: authKey,
            user_agent: request.headers.get("user-agent"),
            is_active: true,
          },
          { onConflict: "user_id,endpoint" },
        );
        if (error) return Response.json({ error: error.message }, { status: 400 });
        return Response.json({ ok: true });
      },

      DELETE: async ({ request }) => {
        const auth = await authedClient(request);
        if (!auth) return Response.json({ error: "Unauthorized" }, { status: 401 });
        let body: SubBody;
        try {
          body = (await request.json()) as SubBody;
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        if (!body.endpoint) return Response.json({ error: "endpoint required" }, { status: 400 });
        const { error } = await auth.client
          .from("push_subscriptions")
          .update({ is_active: false })
          .eq("user_id", auth.userId)
          .eq("endpoint", body.endpoint);
        if (error) return Response.json({ error: error.message }, { status: 400 });
        return Response.json({ ok: true });
      },
    },
  },
});
