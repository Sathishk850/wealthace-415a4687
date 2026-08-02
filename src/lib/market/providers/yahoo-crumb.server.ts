// Yahoo Finance session helper — server-only.
//
// Yahoo's v7/quote and v10/quoteSummary endpoints now return 401
// ("Invalid Cookie" / "Invalid Crumb") unless the request carries a consent
// cookie plus the matching crumb token. This module obtains and caches that
// pair, and exposes small JSON helpers used by the Yahoo providers.
//
// The keyless v8 chart endpoint needs no session and is used as a fallback.

import type { QuoteRequestItem } from "../types";
import { fetchWithTimeout } from "../normalize";

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const TIMEOUT_MS = 15_000;
const SESSION_TTL_MS = 25 * 60 * 1000;

type Session = { cookie: string; crumb: string; at: number };
let cached: Session | null = null;
let inflight: Promise<Session | null> | null = null;

async function mintSession(): Promise<Session | null> {
  try {
    const seed = await fetchWithTimeout(
      "https://fc.yahoo.com",
      { headers: { "User-Agent": UA, Accept: "text/html" }, redirect: "follow" },
      TIMEOUT_MS,
    );
    const raw = seed.headers.get("set-cookie");
    if (!raw) return null;
    // Keep only the name=value pair of the first cookie.
    const cookie = raw.split(";")[0].trim();
    if (!cookie.includes("=")) return null;

    const res = await fetchWithTimeout(
      "https://query1.finance.yahoo.com/v1/test/getcrumb",
      { headers: { "User-Agent": UA, Accept: "*/*", Cookie: cookie } },
      TIMEOUT_MS,
    );
    if (!res.ok) return null;
    const crumb = (await res.text()).trim();
    if (!crumb || crumb.length > 40 || crumb.includes("{")) return null;
    return { cookie, crumb, at: Date.now() };
  } catch (err) {
    console.warn("[yahoo] session mint failed", err);
    return null;
  }
}

export async function getYahooSession(force = false): Promise<Session | null> {
  if (!force && cached && Date.now() - cached.at < SESSION_TTL_MS) return cached;
  if (!inflight) {
    inflight = mintSession().then((s) => {
      inflight = null;
      if (s) cached = s;
      return s;
    });
  }
  return inflight;
}

/** GET JSON with no session (works for v8/chart, v1/finance/search). */
export async function yahooJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(
      url,
      { headers: { "User-Agent": UA, Accept: "application/json" } },
      TIMEOUT_MS,
    );
    if (!res.ok) {
      console.warn(`[yahoo] HTTP ${res.status} ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn("[yahoo] fetch failed", err);
    return null;
  }
}

/** GET JSON on an endpoint that requires cookie + crumb; retries once with a fresh session. */
export async function yahooAuthedJson<T>(urlWithoutCrumb: string): Promise<T | null> {
  for (const force of [false, true]) {
    const session = await getYahooSession(force);
    if (!session) continue;
    const sep = urlWithoutCrumb.includes("?") ? "&" : "?";
    const url = `${urlWithoutCrumb}${sep}crumb=${encodeURIComponent(session.crumb)}`;
    try {
      const res = await fetchWithTimeout(
        url,
        {
          headers: {
            "User-Agent": UA,
            Accept: "application/json",
            Cookie: session.cookie,
          },
        },
        TIMEOUT_MS,
      );
      if (res.status === 401 || res.status === 403) {
        cached = null;
        continue; // retry with a fresh session
      }
      if (!res.ok) return null; // 404 = no fundamentals for this symbol
      return (await res.json()) as T;
    } catch (err) {
      console.warn("[yahoo] authed fetch failed", err);
    }
  }
  return null;
}

/** Map an internal instrument reference to a Yahoo ticker. */
export function toYahooSymbol(item: QuoteRequestItem): string {
  if (item.identifier_type === "stock_in") {
    const suffix = item.exchange === "BSE" ? ".BO" : ".NS";
    return item.identifier.endsWith(".NS") || item.identifier.endsWith(".BO")
      ? item.identifier
      : `${item.identifier}${suffix}`;
  }
  if (item.identifier_type === "crypto") {
    return item.identifier.includes("-") ? item.identifier : `${item.identifier}-USD`;
  }
  return item.identifier
    .trim()
    .toUpperCase()
    .replace(/\.(US|O)$/i, "");
}
