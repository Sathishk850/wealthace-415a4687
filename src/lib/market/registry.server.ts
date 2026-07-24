// Provider registry — the single point where providers are selected.
// Adding a new provider = create a file in providers/ + register here.
// Server-only.

import type { IdentifierType, MarketQuote, QuoteRequestItem, SearchResult } from "./types";
import { yahooQuotes, yahooSearch } from "./providers/yahoo.server";
import { isTwelveDataAvailable, twelveDataQuotes } from "./providers/twelvedata.server";
import { isFinnhubAvailable, finnhubQuotes } from "./providers/finnhub.server";
import { isAlphaVantageAvailable, alphaVantageQuotes } from "./providers/alphavantage.server";
import { mfapiQuotes, mfapiSearch } from "./providers/mfapi.server";

export type ProviderInfo = { primary: string; fallback?: string };

export function providersFor(kind: IdentifierType): ProviderInfo {
  if (kind === "mf_in") return { primary: "mfapi" };
  if (kind === "crypto") return { primary: "yahoo" };
  if (kind === "stock_us") {
    if (isTwelveDataAvailable()) return { primary: "twelvedata", fallback: "finnhub|alphavantage|yahoo" };
    if (isFinnhubAvailable()) return { primary: "finnhub", fallback: "alphavantage|yahoo" };
    if (isAlphaVantageAvailable()) return { primary: "alphavantage", fallback: "yahoo" };
    return { primary: "yahoo" };
  }
  // stock_in
  return isTwelveDataAvailable()
    ? { primary: "twelvedata", fallback: "yahoo" }
    : { primary: "yahoo" };
}

type FetchFn = (items: QuoteRequestItem[]) => Promise<MarketQuote[]>;

/** Run a provider chain, only re-fetching symbols that are still missing. */
async function runChain(items: QuoteRequestItem[], chain: Array<{ name: string; fn: FetchFn }>): Promise<MarketQuote[]> {
  let got: MarketQuote[] = [];
  let remaining = items;
  for (const step of chain) {
    if (remaining.length === 0) break;
    try {
      const batch = await step.fn(remaining);
      got = got.concat(batch);
      const have = new Set(got.map((q) => `${q.identifier_type}:${q.identifier}`));
      remaining = remaining.filter((i) => !have.has(`${i.identifier_type}:${i.identifier}`));
    } catch (err) {
      console.error(`[market] provider ${step.name} failed`, err);
    }
  }
  return got;
}

/**
 * Fetch quotes for a heterogeneous list of items.
 * Routes MFs → MFAPI, US stocks → TwelveData/Finnhub/AlphaVantage/Yahoo,
 * Indian stocks + crypto → TwelveData/Yahoo.
 * Never throws for individual items — returns whatever succeeded.
 */
export async function fetchQuotes(items: QuoteRequestItem[]): Promise<MarketQuote[]> {
  const mfs = items.filter((i) => i.identifier_type === "mf_in");
  const usStocks = items.filter((i) => i.identifier_type === "stock_us");
  const other = items.filter((i) => i.identifier_type !== "mf_in" && i.identifier_type !== "stock_us");

  const results: MarketQuote[] = [];

  if (mfs.length > 0) {
    try {
      results.push(...(await mfapiQuotes(mfs)));
    } catch (err) {
      console.error("mfapi quotes failed", err);
    }
  }

  if (usStocks.length > 0) {
    const chain: Array<{ name: string; fn: FetchFn }> = [];
    if (isTwelveDataAvailable()) chain.push({ name: "twelvedata", fn: twelveDataQuotes });
    if (isFinnhubAvailable()) chain.push({ name: "finnhub", fn: finnhubQuotes });
    if (isAlphaVantageAvailable()) chain.push({ name: "alphavantage", fn: alphaVantageQuotes });
    chain.push({ name: "yahoo", fn: yahooQuotes });
    results.push(...(await runChain(usStocks, chain)));
  }

  if (other.length > 0) {
    const chain: Array<{ name: string; fn: FetchFn }> = [];
    if (isTwelveDataAvailable()) chain.push({ name: "twelvedata", fn: twelveDataQuotes });
    chain.push({ name: "yahoo", fn: yahooQuotes });
    results.push(...(await runChain(other, chain)));
  }

  // Log source distribution for observability.
  const bySource = results.reduce<Record<string, number>>((acc, q) => {
    const k = q.source ?? "unknown";
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
  console.log(`[market] fetchQuotes done — sources:`, bySource);

  return results;
}

export async function searchInstrument(query: string, kind: IdentifierType): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  if (kind === "mf_in") return mfapiSearch(q);
  return yahooSearch(q, kind);
}
