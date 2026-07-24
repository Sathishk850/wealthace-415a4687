// Finnhub provider — free tier, reliable for US stocks.
// Activates only when FINNHUB_API_KEY is set.

import type { MarketQuote, QuoteRequestItem } from "../types";
import { fetchWithTimeout, normalizePrice } from "../normalize";

const TIMEOUT_MS = 15_000;

export function isFinnhubAvailable(): boolean {
  return !!process.env.FINNHUB_API_KEY;
}

/** Finnhub `/quote` returns one symbol at a time. Fan out with modest concurrency. */
export async function finnhubQuotes(items: QuoteRequestItem[]): Promise<MarketQuote[]> {
  const key = process.env.FINNHUB_API_KEY;
  if (!key || items.length === 0) return [];

  // Only usable for US stocks / crypto — MFs and Indian stocks aren't covered here.
  const usable = items.filter((i) => i.identifier_type === "stock_us");
  if (usable.length === 0) return [];

  console.log(`[finnhub] fetching ${usable.length} US symbols`);

  const now = new Date().toISOString();
  const out: MarketQuote[] = [];

  // Small concurrency to respect rate limits (free tier ~60 req/min).
  const CONCURRENCY = 4;
  let idx = 0;
  async function worker() {
    while (idx < usable.length) {
      const my = usable[idx++];
      const symbol = my.identifier.trim().toUpperCase();
      const url = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${key}`;
      try {
        const res = await fetchWithTimeout(url, {}, TIMEOUT_MS);
        if (!res.ok) {
          console.error(`[finnhub] HTTP ${res.status} for ${symbol}`);
          continue;
        }
        const raw = (await res.json()) as {
          c?: number | string; // current
          pc?: number | string; // previous close
          t?: number; // unix seconds
        };
        const price = normalizePrice(raw.c);
        if (price == null) {
          console.warn(`[finnhub] invalid price for ${symbol}:`, raw.c);
          continue;
        }
        const prev = normalizePrice(raw.pc);
        out.push({
          identifier_type: my.identifier_type,
          identifier: my.identifier,
          latest_price: price,
          previous_close: prev,
          currency: "USD",
          source: "finnhub",
          fetched_at: now,
          server_fetched_at: now,
          expires_at: null,
          stale: false,
        });
      } catch (err) {
        console.error(`[finnhub] error for ${symbol}`, err);
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(CONCURRENCY, usable.length) }, worker));
  console.log(`[finnhub] resolved ${out.length}/${usable.length} quotes`);
  return out;
}
