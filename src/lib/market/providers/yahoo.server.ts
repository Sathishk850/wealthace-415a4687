// Yahoo Finance provider — no API key required.
// Server-only: file suffix `.server.ts` blocks client bundle import.

import type { IdentifierType, MarketQuote, QuoteRequestItem, SearchResult } from "../types";
import { fetchWithTimeout, normalizeCurrency, normalizePrice } from "../normalize";

const QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote";
const SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search";
const UA = "Mozilla/5.0 (compatible; FinVista/1.0)";
const TIMEOUT_MS = 15_000;

function toYahooSymbol(item: QuoteRequestItem): string {
  if (item.identifier_type === "stock_in") {
    const suffix = item.exchange === "BSE" ? ".BO" : ".NS";
    return item.identifier.endsWith(".NS") || item.identifier.endsWith(".BO")
      ? item.identifier
      : `${item.identifier}${suffix}`;
  }
  if (item.identifier_type === "crypto") {
    return item.identifier.includes("-") ? item.identifier : `${item.identifier}-USD`;
  }
  return item.identifier; // stock_us or already suffixed
}

export async function yahooQuotes(items: QuoteRequestItem[]): Promise<MarketQuote[]> {
  if (items.length === 0) return [];
  const symbolMap = new Map<string, QuoteRequestItem>();
  for (const it of items) symbolMap.set(toYahooSymbol(it), it);
  const symbols = Array.from(symbolMap.keys()).join(",");
  const url = `${QUOTE_URL}?symbols=${encodeURIComponent(symbols)}`;

  console.log(`[yahoo] fetching ${symbolMap.size} symbols: ${symbols}`);

  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      { headers: { "User-Agent": UA, Accept: "application/json" } },
      TIMEOUT_MS,
    );
  } catch (err) {
    console.error("[yahoo] network error", err);
    return [];
  }
  if (!res.ok) {
    console.error(`[yahoo] HTTP ${res.status} for ${symbols}`);
    return [];
  }

  let body: { quoteResponse?: { result?: Array<Record<string, unknown>>; error?: unknown } };
  try {
    body = (await res.json()) as typeof body;
  } catch (err) {
    console.error("[yahoo] malformed JSON", err);
    return [];
  }
  if (body.quoteResponse?.error) {
    console.error("[yahoo] API error", body.quoteResponse.error);
  }

  const now = new Date().toISOString();
  const out: MarketQuote[] = [];
  for (const q of body.quoteResponse?.result ?? []) {
    const sym = String(q.symbol ?? "");
    const req = symbolMap.get(sym);
    if (!req) continue;
    const price = normalizePrice(q.regularMarketPrice);
    if (price == null) {
      console.warn(`[yahoo] invalid price for ${sym}:`, q.regularMarketPrice);
      continue;
    }
    const prev = normalizePrice(q.regularMarketPreviousClose);
    out.push({
      identifier_type: req.identifier_type,
      identifier: req.identifier,
      latest_price: price,
      previous_close: prev,
      currency: normalizeCurrency(q.currency),
      source: "yahoo",
      fetched_at: now,
      server_fetched_at: now,
      expires_at: null,
      stale: false,
    });
  }
  console.log(`[yahoo] resolved ${out.length}/${symbolMap.size} quotes`);
  return out;
}

export async function yahooSearch(query: string, kind: IdentifierType): Promise<SearchResult[]> {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0`;
  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      { headers: { "User-Agent": UA, Accept: "application/json" } },
      TIMEOUT_MS,
    );
  } catch (err) {
    console.error("[yahoo] search network error", err);
    return [];
  }
  if (!res.ok) {
    console.error(`[yahoo] search HTTP ${res.status}`);
    return [];
  }
  const body = (await res.json()) as {
    quotes?: Array<{
      symbol?: string;
      shortname?: string;
      longname?: string;
      exchange?: string;
      exchDisp?: string;
      quoteType?: string;
    }>;
  };
  const results: SearchResult[] = [];
  for (const q of body.quotes ?? []) {
    if (!q.symbol) continue;
    const symbol = q.symbol;
    const name = q.longname || q.shortname || symbol;
    if (kind === "stock_in") {
      if (symbol.endsWith(".NS")) {
        results.push({
          identifier_type: "stock_in",
          identifier: symbol.replace(/\.NS$/, ""),
          name,
          exchange: "NSE",
          currency: "INR",
        });
      } else if (symbol.endsWith(".BO")) {
        results.push({
          identifier_type: "stock_in",
          identifier: symbol.replace(/\.BO$/, ""),
          name,
          exchange: "BSE",
          currency: "INR",
        });
      }
    } else if (kind === "stock_us") {
      if (!symbol.includes(".") && (q.quoteType === "EQUITY" || q.quoteType === "ETF")) {
        results.push({
          identifier_type: "stock_us",
          identifier: symbol,
          name,
          exchange: q.exchDisp ?? q.exchange ?? "US",
          currency: "USD",
        });
      }
    } else if (kind === "crypto") {
      if (q.quoteType === "CRYPTOCURRENCY") {
        results.push({
          identifier_type: "crypto",
          identifier: symbol,
          name,
          exchange: "CRYPTO",
          currency: "USD",
        });
      }
    }
  }
  return results;
}
