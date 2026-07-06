// Guarded service-worker registration wrapper.
// Only registers in production, never in Lovable preview/dev/iframe.
// Supports ?sw=off kill switch. Notifies subscribers when an update is ready.

type UpdateHandler = (reload: () => void) => void;

const listeners = new Set<UpdateHandler>();
let readyReload: (() => void) | null = null;

export function onSwUpdateReady(handler: UpdateHandler): () => void {
  listeners.add(handler);
  if (readyReload) handler(readyReload);
  return () => listeners.delete(handler);
}

function notify(reload: () => void) {
  readyReload = reload;
  listeners.forEach((h) => {
    try { h(reload); } catch (e) { console.error(e); }
  });
}

function isBlockedContext(): boolean {
  if (typeof window === "undefined") return true;
  if (!("serviceWorker" in navigator)) return true;
  if (!import.meta.env.PROD) return true;
  try { if (window.self !== window.top) return true; } catch { return true; }
  const host = window.location.hostname;
  if (host.startsWith("id-preview--") || host.startsWith("preview--")) return true;
  if (host === "lovableproject.com" || host.endsWith(".lovableproject.com")) return true;
  if (host === "lovableproject-dev.com" || host.endsWith(".lovableproject-dev.com")) return true;
  if (host === "beta.lovable.dev" || host.endsWith(".beta.lovable.dev")) return true;
  const params = new URLSearchParams(window.location.search);
  if (params.get("sw") === "off") return true;
  return false;
}

async function unregisterMatching(): Promise<void> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      const url = reg.active?.scriptURL || reg.waiting?.scriptURL || reg.installing?.scriptURL || "";
      if (url.endsWith("/sw.js")) await reg.unregister();
    }
  } catch (e) {
    console.warn("[pwa] unregister failed", e);
  }
}

export async function registerServiceWorker(): Promise<void> {
  if (isBlockedContext()) {
    await unregisterMatching();
    return;
  }
  try {
    const { Workbox } = await import("workbox-window");
    const wb = new Workbox("/sw.js");

    const promptUpdate = () => {
      notify(() => {
        wb.addEventListener("controlling", () => window.location.reload());
        wb.messageSkipWaiting();
      });
    };

    wb.addEventListener("waiting", promptUpdate);
    wb.addEventListener("externalwaiting", promptUpdate);

    await wb.register();
  } catch (e) {
    console.warn("[pwa] service worker registration failed", e);
  }
}