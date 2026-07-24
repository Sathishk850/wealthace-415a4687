// Alpha Vantage provider — free tier (5 req/min, 500/day).
// Activates only when ALPHA_VANTAGE_API_KEY is set.
// Used as a fallback for US stocks.

import type { MarketQuote, QuoteRequestItem } from "../types";
import { fetchWithTimeout, normalizePrice } from "../normalize";

const TIMEOUT_MS = 15_000;

export function isAlphaVantageAvailable(): boolean {
  return !!process.env.ALPHA_VANTAGE_API_KEY;
}

export async function alphaVantageQuotes(items: QuoteRequestItem[]): Promise<MarketQuote[]> {
  const key = process.env.ALPHA_VANTAGE_API_KEY;
  if (!key || items.length === 0) return [];

  const usable = items.filter((i) => i.identifier_type === "stock_us");
  if (usable.length === 0) return [];

  console.log(`[alphavantage] fetching ${usable.length} US symbols`);

  const now = new Date().toISOString();
  const out: MarketQuote[] = [];

  // Free tier is very rate-limited — keep sequential with short delays.
  for (const my of usable) {
    const symbol = my.identifier.trim().toUpperCase();
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${key}`;
    try {
      const res = await fetchWithTimeout(url, {}, TIMEOUT_MS);
      if (!res.ok) {
        console.error(`[alphavantage] HTTP ${res.status} for ${symbol}`);
        continue;
      }
      const raw = (await res.json()) as {
        "Global Quote"?: Record<string, string>;
        Note?: string;
        Information?: string;
      };
      if (raw.Note || raw.Information) {
        console.warn(`[alphavantage] rate limited or info:`, raw.Note ?? raw.Information);
        break;
      }
      const q = raw["Global Quote"] ?? {};
      const price = normalizePrice(q["05. price"]);
      if (price == null) {
        console.warn(`[alphavantage] invalid price for ${symbol}:`, q["05. price"]);
        continue;
      }
      const prev = normalizePrice(q["08. previous close"]);
      out.push({
        identifier_type: my.identifier_type,
        identifier: my.identifier,
        latest_price: price,
        previous_close: prev,
        currency: "USD",
        source: "alphavantage",
        fetched_at: now,
        server_fetched_at: now,
        expires_at: null,
        stale: false,
      });
    } catch (err) {
      console.error(`[alphavantage] error for ${symbol}`, err);
    }
  }
  console.log(`[alphavantage] resolved ${out.length}/${usable.length} quotes`);
  return out;
}
