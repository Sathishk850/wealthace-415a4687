// MFAPI provider — Indian Mutual Fund NAVs (AMFI).
// No API key. Endpoints:
//   https://api.mfapi.in/mf/search?q=<term>
//   https://api.mfapi.in/mf/<scheme_code>/latest

import type { MarketQuote, QuoteRequestItem, SearchResult } from "../types";
import { fetchWithTimeout, normalizePrice } from "../normalize";

const BASE = "https://api.mfapi.in";
const TIMEOUT_MS = 15_000;

export async function mfapiSearch(query: string): Promise<SearchResult[]> {
  const url = `${BASE}/mf/search?q=${encodeURIComponent(query)}`;
  let res: Response;
  try {
    res = await fetchWithTimeout(url, { headers: { Accept: "application/json" } }, TIMEOUT_MS);
  } catch (err) {
    console.error("[mfapi] search network error", err);
    return [];
  }
  if (!res.ok) {
    console.error(`[mfapi] search HTTP ${res.status}`);
    return [];
  }
  const rows = (await res.json()) as Array<{ schemeCode: number; schemeName: string }>;
  return (rows ?? []).slice(0, 40).map((r) => ({
    identifier_type: "mf_in" as const,
    identifier: String(r.schemeCode),
    name: r.schemeName,
    exchange: "AMFI",
    currency: "INR",
  }));
}

// Parse dd-mm-yyyy (MFAPI native format) → ISO string, or null.
function parseMfapiDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

export async function mfapiQuotes(items: QuoteRequestItem[]): Promise<MarketQuote[]> {
  const targets = items.filter((i) => i.identifier_type === "mf_in");
  if (targets.length === 0) return [];
  console.log(`[mfapi] fetching ${targets.length} scheme(s)`);
  const now = new Date().toISOString();
  const out: MarketQuote[] = [];
  await Promise.all(
    targets.map(async (it) => {
      try {
        const res = await fetchWithTimeout(
          `${BASE}/mf/${encodeURIComponent(it.identifier)}/latest`,
          { headers: { Accept: "application/json" } },
          TIMEOUT_MS,
        );
        if (!res.ok) {
          console.warn(`[mfapi] scheme ${it.identifier} HTTP ${res.status}`);
          return;
        }
        const body = (await res.json()) as {
          data?: Array<{ nav?: unknown; date?: unknown }>;
          status?: string;
        };
        const row = body?.data?.[0];
        if (!row) {
          console.warn(`[mfapi] scheme ${it.identifier} returned no data`);
          return;
        }
        const nav = normalizePrice(row.nav);
        if (nav == null) {
          console.warn(`[mfapi] scheme ${it.identifier} invalid nav:`, row.nav);
          return;
        }
        const navDate = parseMfapiDate(row.date);
        out.push({
          identifier_type: "mf_in",
          identifier: it.identifier,
          latest_price: nav,
          previous_close: null,
          currency: "INR",
          source: "mfapi",
          fetched_at: navDate ?? now,
          expires_at: null,
          stale: false,
        });
      } catch (err) {
        console.error(`[mfapi] scheme ${it.identifier} failed`, err);
      }
    }),
  );
  console.log(`[mfapi] resolved ${out.length}/${targets.length} NAVs`);
  return out;
}
