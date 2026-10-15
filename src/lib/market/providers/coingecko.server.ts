// CoinGecko free public API (no key, ~30 calls/min). Server-only.
// Crypto identifiers without a "-" (e.g. "bitcoin") are CoinGecko coin ids;
// Yahoo-style pairs ("BTC-USD") keep using Yahoo.
import type { MarketQuote, QuoteRequestItem, SearchResult } from "../types";

const BASE = "https://api.coingecko.com/api/v3";
const TIMEOUT = 8000;

export function isCoinGeckoId(identifier: string): boolean {
  return /^[a-z0-9][a-z0-9-]*$/.test(identifier) && !/-(usd|inr|usdt)$/i.test(identifier) && identifier === identifier.toLowerCase();
}

export async function coingeckoSearch(query: string): Promise<SearchResult[]> {
  try {
    const res = await fetch(`${BASE}/search?query=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(TIMEOUT) });
    if (!res.ok) return [];
    const data = (await res.json()) as { coins?: { id: string; name: string; symbol: string }[] };
    return (data.coins ?? []).slice(0, 5).map((c) => ({
      identifier_type: "crypto" as const,
      identifier: c.id,
      name: `${c.name} (${c.symbol.toUpperCase()})`,
      exchange: "CoinGecko",
      currency: "INR",
      meta: { source: "coingecko", symbol: c.symbol.toUpperCase() },
    }));
  } catch {
    return [];
  }
}

export async function coingeckoPrice(coinId: string): Promise<{ inr: number; usd: number } | null> {
  const q = await coingeckoQuotes([{ identifier_type: "crypto", identifier: coinId }]);
  const p = q[0];
  return p?.latest_price != null ? { inr: p.latest_price, usd: Number(p.meta_usd ?? 0) } : null;
}

type CgQuote = MarketQuote & { meta_usd?: number };

/** Batch price fetch (one request for all ids) — only called on explicit/stale refresh. */
export async function coingeckoQuotes(items: QuoteRequestItem[]): Promise<CgQuote[]> {
  const ids = [...new Set(items.map((i) => i.identifier))];
  if (!ids.length) return [];
  try {
    const res = await fetch(
      `${BASE}/simple/price?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=inr,usd&include_24hr_change=true`,
      { signal: AbortSignal.timeout(TIMEOUT) },
    );
    if (!res.ok) return [];
    const data = (await res.json()) as Record<string, { inr?: number; usd?: number; inr_24h_change?: number }>;
    const now = new Date().toISOString();
    const out: CgQuote[] = [];
    for (const id of ids) {
      const p = data[id];
      if (!p?.inr) continue;
      const ch = p.inr_24h_change;
      out.push({
        identifier_type: "crypto",
        identifier: id,
        latest_price: p.inr,
        previous_close: typeof ch === "number" && ch > -100 ? p.inr / (1 + ch / 100) : null,
        currency: "INR",
        source: "CoinGecko",
        fetched_at: now,
        server_fetched_at: now,
        expires_at: null,
        stale: false,
        meta_usd: p.usd,
      }); 
    }
    return out;
  } catch {
    return [];
  }
}
