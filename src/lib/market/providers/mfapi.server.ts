// MFAPI provider — Indian Mutual Fund NAVs (AMFI).
// No API key. Endpoints:
//   https://api.mfapi.in/mf/search?q=<term>
//   https://api.mfapi.in/mf/<scheme_code>/latest

import type { MarketQuote, QuoteRequestItem, SearchResult } from "../types";
import { fetchWithTimeout, normalizePrice } from "../normalize";

const BASE = "https://api.mfapi.in";
const TIMEOUT_MS = 15_000;

async function mfapiSearchRaw(query: string): Promise<Array<{ schemeCode: number; schemeName: string }>> {
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
  return ((await res.json()) as Array<{ schemeCode: number; schemeName: string }>) ?? [];
}

// True when every typed word matches the start of some word in the scheme name,
// so partial typing like "parag parikh conservat" still matches.
function matchesAllWords(name: string, words: string[]): boolean {
  const nameWords = name.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  return words.every((w) => nameWords.some((nw) => nw.startsWith(w)));
}

// Look up a single scheme by its numeric AMFI code (e.g. "119551").
async function mfapiByCode(code: string): Promise<SearchResult[]> {
  try {
    const res = await fetchWithTimeout(
      `${BASE}/mf/${encodeURIComponent(code)}/latest`,
      { headers: { Accept: "application/json" } },
      TIMEOUT_MS,
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { meta?: { scheme_code?: number; scheme_name?: string } };
    if (!body?.meta?.scheme_name) return [];
    return [
      {
        identifier_type: "mf_in" as const,
        identifier: String(body.meta.scheme_code ?? code),
        name: body.meta.scheme_name,
        exchange: "AMFI",
        currency: "INR",
      },
    ];
  } catch (err) {
    console.error("[mfapi] code lookup failed", err);
    return [];
  }
}

export async function mfapiSearch(query: string): Promise<SearchResult[]> {
  if (/^\d{4,6}$/.test(query.trim())) return mfapiByCode(query.trim());
  let rows = await mfapiSearchRaw(query);
  // MFAPI only matches literal substrings, so long partial queries return
  // nothing. Fall back to the AMC (first word) and filter client-side.
  if (rows.length === 0) {
    const words = query.toLowerCase().split(/\s+/).filter(Boolean);
    if (words.length > 1) {
      rows = (await mfapiSearchRaw(words[0])).filter((r) => matchesAllWords(r.schemeName, words));
      // If the user is mid-word on the AMC itself, widen to its first 5 letters.
      if (rows.length === 0 && words[0].length > 5) {
        rows = (await mfapiSearchRaw(words[0].slice(0, 5))).filter((r) =>
          matchesAllWords(r.schemeName, words),
        );
      }
    }
  }
  return rows.slice(0, 40).map((r) => ({
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
          server_fetched_at: now,
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
