// Browser-side push subscription helpers.
import { supabase } from "@/integrations/supabase/client";
import { VAPID_PUBLIC_KEY, urlBase64ToUint8Array } from "@/lib/push/vapid";

/** Push needs a real service worker, which never registers in dev/preview. */
export function pushContextBlocked(): string | null {
  if (typeof window === "undefined") return "Unavailable";
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "This browser does not support push notifications.";
  }
  if (!import.meta.env.PROD) return "Push notifications work in the published app.";
  try {
    if (window.self !== window.top) return "Push notifications work in the published app.";
  } catch {
    return "Push notifications work in the published app.";
  }
  const host = window.location.hostname;
  if (
    host.startsWith("id-preview--") ||
    host.startsWith("preview--") ||
    host.endsWith(".lovableproject.com") ||
    host.endsWith(".lovableproject-dev.com") ||
    host.endsWith(".beta.lovable.dev")
  ) {
    return "Push notifications work in the published app.";
  }
  return null;
}

async function authHeader(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function readyRegistration(): Promise<ServiceWorkerRegistration> {
  const existing = await navigator.serviceWorker.getRegistration("/");
  if (existing) return existing;
  return navigator.serviceWorker.register("/sw.js");
}

export async function enablePush(): Promise<{ ok: boolean; reason?: string }> {
  const blocked = pushContextBlocked();
  if (blocked) return { ok: false, reason: blocked };

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { ok: false, reason: "Notifications blocked — enable in browser settings." };
  }

  const reg = await readyRegistration();
  await navigator.serviceWorker.ready;

  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
    }));

  const res = await fetch("/api/push/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify(sub.toJSON()),
  });
  if (!res.ok) return { ok: false, reason: "Could not save this device." };
  return { ok: true };
}

export async function disablePush(): Promise<{ ok: boolean }> {
  if (pushContextBlocked()) return { ok: false };
  const reg = await navigator.serviceWorker.getRegistration("/");
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return { ok: true };
  await fetch("/api/push/unsubscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await authHeader()) },
    body: JSON.stringify({ endpoint: sub.endpoint }),
  });
  await sub.unsubscribe();
  return { ok: true };
}

export async function isPushSubscribed(): Promise<boolean> {
  if (pushContextBlocked()) return false;
  const reg = await navigator.serviceWorker.getRegistration("/");
  return !!(await reg?.pushManager.getSubscription());
}
