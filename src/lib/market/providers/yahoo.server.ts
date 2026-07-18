// Yahoo Finance provider — no API key required.
// Server-only: file suffix `.server.ts` blocks client bundle import.

import type { IdentifierType, MarketQuote, QuoteRequestItem, SearchResult } from "../types";

const QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote";
const SEARCH_URL = "https://query2.finance.yahoo.com/v1/finance/search";
const UA = "Mozilla/5.0 (compatible; FinVista/1.0)";

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
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Yahoo quote HTTP ${res.status}`);
  const body = (await res.json()) as {
    quoteResponse?: { result?: Array<Record<string, unknown>> };
  };
  const now = new Date().toISOString();
  const out: MarketQuote[] = [];
  for (const q of body.quoteResponse?.result ?? []) {
    const sym = String(q.symbol ?? "");
    const req = symbolMap.get(sym);
    if (!req) continue;
    const price = Number(q.regularMarketPrice);
    const prev = Number(q.regularMarketPreviousClose);
    if (!Number.isFinite(price) || price <= 0) continue; // Never emit 0/NaN
    out.push({
      identifier_type: req.identifier_type,
      identifier: req.identifier,
      latest_price: price,
      previous_close: Number.isFinite(prev) && prev > 0 ? prev : null,
      currency: (q.currency as string) ?? null,
      source: "yahoo",
      fetched_at: now,
      expires_at: null,
      stale: false,
    });
  }
  return out;
}

export async function yahooSearch(query: string, kind: IdentifierType): Promise<SearchResult[]> {
  const url = `${SEARCH_URL}?q=${encodeURIComponent(query)}&quotesCount=15&newsCount=0`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok) throw new Error(`Yahoo search HTTP ${res.status}`);
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
