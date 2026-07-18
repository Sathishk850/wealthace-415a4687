// MFAPI provider — Indian Mutual Fund NAVs (AMFI).
// No API key. Endpoints:
//   https://api.mfapi.in/mf/search?q=<term>
//   https://api.mfapi.in/mf/<scheme_code>

import type { MarketQuote, QuoteRequestItem, SearchResult } from "../types";

const BASE = "https://api.mfapi.in";

export async function mfapiSearch(query: string): Promise<SearchResult[]> {
  const url = `${BASE}/mf/search?q=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`MFAPI search HTTP ${res.status}`);
  const rows = (await res.json()) as Array<{ schemeCode: number; schemeName: string }>;
  return (rows ?? []).slice(0, 40).map((r) => ({
    identifier_type: "mf_in" as const,
    identifier: String(r.schemeCode),
    name: r.schemeName,
    exchange: "AMFI",
    currency: "INR",
  }));
}

export async function mfapiQuotes(items: QuoteRequestItem[]): Promise<MarketQuote[]> {
  const targets = items.filter((i) => i.identifier_type === "mf_in");
  if (targets.length === 0) return [];
  const now = new Date().toISOString();
  const out: MarketQuote[] = [];
  await Promise.all(
    targets.map(async (it) => {
      try {
        const res = await fetch(`${BASE}/mf/${encodeURIComponent(it.identifier)}/latest`, {
          headers: { Accept: "application/json" },
        });
        if (!res.ok) return;
        const body = (await res.json()) as {
          data?: Array<{ nav: string; date: string }>;
        };
        const row = body.data?.[0];
        const nav = row ? Number(row.nav) : NaN;
        if (!Number.isFinite(nav) || nav <= 0) return;
        out.push({
          identifier_type: "mf_in",
          identifier: it.identifier,
          latest_price: nav,
          previous_close: null,
          currency: "INR",
          source: "mfapi",
          fetched_at: now,
          expires_at: null,
          stale: false,
        });
      } catch {
        /* ignore individual failures */
      }
    }),
  );
  return out;
}
