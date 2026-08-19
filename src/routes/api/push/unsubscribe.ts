import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

export const Route = createFileRoute("/api/push/unsubscribe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
        if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

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
        const { data: userRes, error: userErr } = await client.auth.getUser(token);
        if (userErr || !userRes.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

        let body: { endpoint?: string };
        try {
          body = (await request.json()) as { endpoint?: string };
        } catch {
          return Response.json({ error: "Invalid JSON" }, { status: 400 });
        }
        if (!body.endpoint) return Response.json({ error: "endpoint required" }, { status: 400 });

        const { error } = await client
          .from("push_subscriptions")
          .update({ is_active: false })
          .eq("user_id", userRes.user.id)
          .eq("endpoint", body.endpoint);
        if (error) return Response.json({ error: error.message }, { status: 400 });
        return Response.json({ ok: true });
      },
    },
  },
});
