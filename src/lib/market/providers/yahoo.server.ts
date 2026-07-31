// Yahoo Finance provider — no API key required.
// Server-only: file suffix `.server.ts` blocks client bundle import.

import type { IdentifierType, MarketQuote, QuoteRequestItem, SearchResult } from "../types";
import { fetchWithTimeout, normalizeCurrency, normalizePrice } from "../normalize";

const QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote";
const CHART_URL = "https://query1.finance.yahoo.com/v8/finance/chart";
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
  if (item.identifier_type === "stock_us") {
    // Strip accidental suffixes (.US, .O, .NS, .BO) — Yahoo US tickers are bare.
    return item.identifier.trim().toUpperCase().replace(/\.(US|O|NS|BO)$/i, "");
  }
  return item.identifier;
}

type YahooQuoteRow = Record<string, unknown>;

function quoteFromRow(
  row: YahooQuoteRow,
  req: QuoteRequestItem,
  symbol: string,
  now: string,
  source = "yahoo",
): MarketQuote | null {
  const price = normalizePrice(row.regularMarketPrice);
  if (price == null) {
    console.warn(`[yahoo] invalid price for ${symbol}:`, row.regularMarketPrice);
    return null;
  }
  const prev = normalizePrice(row.regularMarketPreviousClose ?? row.chartPreviousClose);
  console.log(
    `[yahoo] ${req.identifier_type}:${req.identifier} → ${price} ${row.currency ?? ""} (prev ${prev ?? "-"}) via "${symbol}"`,
  );
  return {
    identifier_type: req.identifier_type,
    identifier: req.identifier,
    latest_price: price,
    previous_close: prev,
    currency: normalizeCurrency(row.currency),
    source,
    fetched_at: now,
    server_fetched_at: now,
    expires_at: null,
    stale: false,
  };
}

/**
 * Yahoo's v7 batch quote endpoint can return 401 without a crumb/cookie.
 * The public v8 chart endpoint exposes the same current price in `meta` and
 * remains available without authentication, so use it for unresolved symbols.
 */
async function yahooChartQuote(
  symbol: string,
  req: QuoteRequestItem,
  now: string,
): Promise<MarketQuote | null> {
  const url = `${CHART_URL}/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  let res: Response;
  try {
    res = await fetchWithTimeout(
      url,
      { headers: { "User-Agent": UA, Accept: "application/json" } },
      TIMEOUT_MS,
    );
  } catch (err) {
    console.error(`[yahoo-chart] network error for ${symbol}`, err);
    return null;
  }
  if (!res.ok) {
    console.error(`[yahoo-chart] HTTP ${res.status} for ${symbol}`);
    return null;
  }
  try {
    const body = (await res.json()) as {
      chart?: {
        result?: Array<{
          meta?: YahooQuoteRow;
          indicators?: { quote?: Array<{ close?: unknown[] }> };
        }>;
        error?: unknown;
      };
    };
    if (body.chart?.error) {
      console.error(`[yahoo-chart] API error for ${symbol}`, body.chart.error);
      return null;
    }
    const result = body.chart?.result?.[0];
    const meta = result?.meta;
    if (!meta) return null;

    // regularMarketPrice is authoritative. The last daily close is a fallback
    // for instruments whose chart metadata omits it outside trading hours.
    const closes = result?.indicators?.quote?.[0]?.close ?? [];
    const lastClose = [...closes].reverse().find((value) => normalizePrice(value) != null);
    return quoteFromRow(
      {
        ...meta,
        regularMarketPrice: meta.regularMarketPrice ?? lastClose,
        regularMarketPreviousClose: meta.previousClose ?? meta.chartPreviousClose,
      },
      req,
      symbol,
      now,
      "yahoo-chart",
    );
  } catch (err) {
    console.error(`[yahoo-chart] malformed JSON for ${symbol}`, err);
    return null;
  }
}

export async function yahooQuotes(items: QuoteRequestItem[]): Promise<MarketQuote[]> {
  if (items.length === 0) return [];
  const symbolMap = new Map<string, QuoteRequestItem>();
  for (const it of items) symbolMap.set(toYahooSymbol(it), it);
  const symbols = Array.from(symbolMap.keys()).join(",");
  const url = `${QUOTE_URL}?symbols=${encodeURIComponent(symbols)}`;

  console.log(`[yahoo] fetching ${symbolMap.size} symbols: ${symbols}`);

  let res: Response | null = null;
  try {
    res = await fetchWithTimeout(
      url,
      { headers: { "User-Agent": UA, Accept: "application/json" } },
      TIMEOUT_MS,
    );
  } catch (err) {
    console.error("[yahoo] network error", err);
  }
  if (res && !res.ok) {
    console.error(`[yahoo] HTTP ${res.status} for ${symbols}`);
    res = null;
  }

  let rows: YahooQuoteRow[] = [];
  if (res) {
    try {
      const body = (await res.json()) as {
        quoteResponse?: { result?: YahooQuoteRow[]; error?: unknown };
      };
      if (body.quoteResponse?.error) console.error("[yahoo] API error", body.quoteResponse.error);
      rows = body.quoteResponse?.result ?? [];
    } catch (err) {
      console.error("[yahoo] malformed JSON", err);
    }
  }

  const now = new Date().toISOString();
  const out: MarketQuote[] = [];
  for (const q of rows) {
    const sym = String(q.symbol ?? "");
    const req = symbolMap.get(sym);
    if (!req) {
      console.warn(`[yahoo] response symbol "${sym}" not in request map`);
      continue;
    }
    const quote = quoteFromRow(q, req, sym, now);
    if (quote) out.push(quote);
  }

  const resolved = new Set(out.map((quote) => `${quote.identifier_type}:${quote.identifier}`));
  const unresolved = Array.from(symbolMap.entries()).filter(
    ([, req]) => !resolved.has(`${req.identifier_type}:${req.identifier}`),
  );
  // Process in modest batches to avoid rate spikes on large portfolios.
  for (let index = 0; index < unresolved.length; index += 8) {
    const batch = unresolved.slice(index, index + 8);
    const quotes = await Promise.all(
      batch.map(([symbol, req]) => yahooChartQuote(symbol, req, now)),
    );
    for (const quote of quotes) if (quote) out.push(quote);
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
