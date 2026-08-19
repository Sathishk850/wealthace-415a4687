/**
 * VAPID public key — safe to ship to the browser (the private key lives only
 * in server secrets as VAPID_PRIVATE_KEY).
 */
export const VAPID_PUBLIC_KEY =
  "BPbjGyRWOcCK32mU1MDuQ3OpoReMLscreMKQXPYFf6WjZnheKnb4q-HaVp3pq628M3PjTpJR2fAEXlINoHnXHB8";

/** Base64url → Uint8Array, required by PushManager.subscribe(). */
export function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}
