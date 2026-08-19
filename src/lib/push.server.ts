// Web push sender — SERVER ONLY. Never import from client code.
import webpush from "web-push";
import type { SupabaseClient } from "@supabase/supabase-js";

let configured = false;

function configure() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env["VAPID_SUBJECT"] ?? "mailto:support@wealthace.app",
    process.env["VAPID_PUBLIC_KEY"] ?? "",
    process.env["VAPID_PRIVATE_KEY"] ?? "",
  );
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  tag?: string;
  url?: string;
  priority?: "very-high" | "high" | "moderate" | "low";
};

/** Sends a push payload to every active device of one user. */
export async function sendPushToUser(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any, any, any>,
  userId: string,
  payload: PushPayload,
): Promise<{ sent: number; failed: number }> {
  if (!process.env["VAPID_PRIVATE_KEY"]) return { sent: 0, failed: 0 };
  configure();

  const { data: subs } = await admin
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .eq("is_active", true);

  let sent = 0;
  let failed = 0;

  for (const sub of (subs ?? []) as Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        {
          urgency:
            payload.priority === "very-high" || payload.priority === "high" ? "high" : "normal",
        },
      );
      await admin
        .from("push_subscriptions")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", sub.id);
      sent += 1;
    } catch (err) {
      const code = (err as { statusCode?: number }).statusCode;
      if (code === 410 || code === 404) {
        await admin.from("push_subscriptions").update({ is_active: false }).eq("id", sub.id);
      }
      failed += 1;
    }
  }

  return { sent, failed };
}

/** Distinct user ids that have at least one active push subscription. */
export async function listPushUserIds(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  admin: SupabaseClient<any, any, any>,
): Promise<string[]> {
  const { data } = await admin
    .from("push_subscriptions")
    .select("user_id")
    .eq("is_active", true);
  return Array.from(new Set(((data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id)));
}
