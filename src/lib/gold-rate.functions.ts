// Live gold rate via the NSE GOLDBEES ETF (1 unit ≈ 1 gram of 24K gold at
// domestic Indian wholesale price), fetched from Yahoo Finance server-side.

import { createServerFn } from "@tanstack/react-start";

export interface GoldRateResult {
  pricePerGram24K: number; // GOLDBEES current price in INR per gram
  pricePerGram22K: number; // 24K × (22/24)
  pricePerGram18K: number; // 24K × (18/24)
  ticker: string;
  source: string;
  fetchedAt: string;
}

export const fetchGoldRate = createServerFn({ method: "GET" }).handler(
  async (): Promise<GoldRateResult> => {
    const ticker = "GOLDBEES.NS";
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1m&range=1d`;

    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0" },
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) throw new Error(`Yahoo Finance returned ${res.status}`);

    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    const price: number = meta?.regularMarketPrice ?? meta?.previousClose;

    if (!price || !Number.isFinite(price)) {
      throw new Error("Could not parse GOLDBEES price from Yahoo Finance");
    }

    // GOLDBEES 1 unit ≈ 1 gram 24K gold
    const p24 = Math.round(price * 100) / 100;
    return {
      pricePerGram24K: p24,
      pricePerGram22K: Math.round(((p24 * 22) / 24) * 100) / 100,
      pricePerGram18K: Math.round(((p24 * 18) / 24) * 100) / 100,
      ticker,
      source: "NSE GOLDBEES via Yahoo Finance",
      fetchedAt: new Date().toISOString(),
    };
  },
);

/** Purity multiplier — given a purity label from the spec options, return the fraction. */
export function purityMultiplier(purity: string): number {
  if (purity.startsWith("24K")) return 1.0;
  if (purity.startsWith("22K")) return 22 / 24;
  if (purity.startsWith("18K")) return 18 / 24;
  if (purity.startsWith("14K")) return 14 / 24;
  if (purity.startsWith("999")) return 1.0; // Fine silver
  if (purity.startsWith("925")) return 0.925;
  return 1.0; // Other / unknown
}
