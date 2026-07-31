// Yahoo Finance fundamentals — no API key required. Server-only.
// Best effort: the v7 quote endpoint supplies most metrics; quoteSummary is
// attempted for sector/industry/ROE/D-E and silently skipped when unavailable.

import type { InstrumentFundamentals, QuoteRequestItem } from "../types";
import { fetchWithTimeout, normalizeCurrency, normalizePrice } from "../normalize";

const QUOTE_URL = "https://query1.finance.yahoo.com/v7/finance/quote";
const SUMMARY_URL = "https://query2.finance.yahoo.com/v10/finance/quoteSummary";
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
  return item.identifier
    .trim()
    .toUpperCase()
    .replace(/\.(US|O|NS|BO)$/i, "");
}

function capBand(marketCap: number | null, currency: string | null): string | null {
  if (marketCap == null || marketCap <= 0) return null;
  if (currency === "INR") {
    const cr = marketCap / 1e7;
    if (cr >= 85_000) return "Large Cap";
    if (cr >= 28_000) return "Mid Cap";
    return "Small Cap";
  }
  if (marketCap >= 10e9) return "Large Cap";
  if (marketCap >= 2e9) return "Mid Cap";
  return "Small Cap";
}

const SEGMENT_BY_TYPE: Record<string, string> = {
  EQUITY: "Equity",
  ETF: "Exchange Traded Fund",
  MUTUALFUND: "Mutual Fund",
  CRYPTOCURRENCY: "Crypto",
  INDEX: "Index",
};

type RawNum = number | { raw?: number } | null | undefined;
function pickNum(v: RawNum): number | null {
  if (v == null) return null;
  if (typeof v === "object") return normalizePrice(v.raw);
  return normalizePrice(v);
}

async function json<T>(url: string): Promise<T | null> {
  try {
    const res = await fetchWithTimeout(
      url,
      { headers: { "User-Agent": UA, Accept: "application/json" } },
      TIMEOUT_MS,
    );
    if (!res.ok) {
      console.warn(`[yahoo-fund] HTTP ${res.status} for ${url}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (err) {
    console.warn("[yahoo-fund] fetch failed", err);
    return null;
  }
}

export async function yahooFundamentals(
  item: QuoteRequestItem,
): Promise<InstrumentFundamentals | null> {
  const symbol = toYahooSymbol(item);
  const quoteBody = await json<{
    quoteResponse?: { result?: Array<Record<string, unknown>> };
  }>(`${QUOTE_URL}?symbols=${encodeURIComponent(symbol)}`);
  const q = quoteBody?.quoteResponse?.result?.[0];

  const summary = await json<{
    quoteSummary?: {
      result?: Array<{
        assetProfile?: { sector?: string; industry?: string };
        defaultKeyStatistics?: Record<string, RawNum>;
        financialData?: Record<string, RawNum>;
        summaryDetail?: Record<string, RawNum>;
      }>;
    };
  }>(
    `${SUMMARY_URL}/${encodeURIComponent(symbol)}?modules=assetProfile,defaultKeyStatistics,financialData,summaryDetail`,
  );
  const s = summary?.quoteSummary?.result?.[0];

  if (!q && !s) return null;

  const currency = normalizeCurrency(q?.currency) ?? null;
  const marketCap =
    pickNum(q?.marketCap as RawNum) ?? pickNum(s?.defaultKeyStatistics?.enterpriseValue);
  const roeRaw = pickNum(s?.financialData?.returnOnEquity);
  const divYield =
    pickNum(q?.dividendYield as RawNum) ??
    (pickNum(s?.summaryDetail?.dividendYield) != null
      ? (pickNum(s?.summaryDetail?.dividendYield) as number) * 100
      : null);

  const quoteType = String(q?.quoteType ?? "").toUpperCase();

  return {
    identifier_type: item.identifier_type,
    identifier: item.identifier,
    currency,
    price: pickNum(q?.regularMarketPrice as RawNum),
    week52_high:
      pickNum(q?.fiftyTwoWeekHigh as RawNum) ?? pickNum(s?.summaryDetail?.fiftyTwoWeekHigh),
    week52_low: pickNum(q?.fiftyTwoWeekLow as RawNum) ?? pickNum(s?.summaryDetail?.fiftyTwoWeekLow),
    pe: pickNum(q?.trailingPE as RawNum) ?? pickNum(s?.summaryDetail?.trailingPE),
    pb: pickNum(q?.priceToBook as RawNum) ?? pickNum(s?.defaultKeyStatistics?.priceToBook),
    dividend_yield: divYield,
    eps:
      pickNum(q?.epsTrailingTwelveMonths as RawNum) ??
      pickNum(s?.defaultKeyStatistics?.trailingEps),
    market_cap: marketCap,
    roe: roeRaw != null ? roeRaw * 100 : null,
    debt_to_equity:
      pickNum(s?.financialData?.debtToEquity) != null
        ? (pickNum(s?.financialData?.debtToEquity) as number) / 100
        : null,
    face_value: null,
    book_value: pickNum(q?.bookValue as RawNum) ?? pickNum(s?.defaultKeyStatistics?.bookValue),
    market_cap_band: capBand(marketCap, currency),
    sector: s?.assetProfile?.sector ?? null,
    industry: s?.assetProfile?.industry ?? null,
    segment_type: SEGMENT_BY_TYPE[quoteType] ?? (quoteType || null),
    source: "yahoo",
    fetched_at: new Date().toISOString(),
  };
}
