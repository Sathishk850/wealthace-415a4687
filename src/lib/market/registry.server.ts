// Provider registry — the single point where providers are selected.
// Adding a new provider = create a file in providers/ + register here.
// Server-only.

import type { IdentifierType, MarketQuote, QuoteRequestItem, SearchResult } from "./types";
import { yahooQuotes, yahooSearch } from "./providers/yahoo.server";
import { isTwelveDataAvailable, twelveDataQuotes } from "./providers/twelvedata.server";
import { mfapiQuotes, mfapiSearch } from "./providers/mfapi.server";

export type ProviderInfo = { primary: string; fallback?: string };

export function providersFor(kind: IdentifierType): ProviderInfo {
  if (kind === "mf_in") return { primary: "mfapi" };
  if (kind === "crypto") return { primary: "yahoo" };
  // stocks
  return isTwelveDataAvailable()
    ? { primary: "twelvedata", fallback: "yahoo" }
    : { primary: "yahoo" };
}

/**
 * Fetch quotes for a heterogeneous list of items.
 * Routes MFs to MFAPI, stocks/crypto to the stocks chain.
 * Never throws for individual items — returns whatever succeeded.
 */
export async function fetchQuotes(items: QuoteRequestItem[]): Promise<MarketQuote[]> {
  const mfs = items.filter((i) => i.identifier_type === "mf_in");
  const stocks = items.filter((i) => i.identifier_type !== "mf_in");

  const results: MarketQuote[] = [];

  // Mutual funds
  if (mfs.length > 0) {
    try {
      results.push(...(await mfapiQuotes(mfs)));
    } catch (err) {
      console.error("mfapi quotes failed", err);
    }
  }

  // Stocks / crypto — try primary, then fallback for missing symbols only.
  if (stocks.length > 0) {
    const useTwelve = isTwelveDataAvailable();
    let got: MarketQuote[] = [];
    if (useTwelve) {
      try {
        got = await twelveDataQuotes(stocks);
      } catch (err) {
        console.error("twelvedata failed", err);
      }
    }
    const gotIds = new Set(got.map((q) => `${q.identifier_type}:${q.identifier}`));
    const missing = stocks.filter((i) => !gotIds.has(`${i.identifier_type}:${i.identifier}`));
    if (missing.length > 0) {
      try {
        const yq = await yahooQuotes(missing);
        got = got.concat(yq);
      } catch (err) {
        console.error("yahoo failed", err);
      }
    }
    results.push(...got);
  }

  return results;
}

export async function searchInstrument(query: string, kind: IdentifierType): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  if (kind === "mf_in") return mfapiSearch(q);
  return yahooSearch(q, kind);
}
