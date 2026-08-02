// Yahoo Finance fundamentals — no API key required. Server-only.
//
// Strategy (Yahoo locked down the keyless quote endpoints in 2024/25):
//   1. v8/chart (always works, no session) → price, 52-week range, currency,
//      instrument type, and long-window returns computed from history.
//   2. v10/quoteSummary with cookie + crumb → P/E, P/B, EPS, market cap, ROE,
//      D/E, book value, sector, industry. Silently skipped when unavailable
//      (e.g. InvITs / REITs / funds have no fundamentals document).

import type { InstrumentFundamentals, QuoteRequestItem } from "../types";
import { normalizeCurrency, normalizePrice } from "../normalize";
import { toYahooSymbol, yahooAuthedJson, yahooJson } from "./yahoo-crumb.server";

const CHART = "https://query1.finance.yahoo.com/v8/finance/chart";
const SUMMARY_URL = "https://query2.finance.yahoo.com/v10/finance/quoteSummary";

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
  MUTUALFUND: "Fund / Trust",
  CRYPTOCURRENCY: "Crypto",
  INDEX: "Index",
  CURRENCY: "Currency",
  FUTURE: "Futures",
};

type RawNum = number | { raw?: number } | null | undefined;
function pickNum(v: RawNum): number | null {
  if (v == null) return null;
  if (typeof v === "object") return normalizePrice(v.raw);
  return normalizePrice(v);
}

type ChartBody = {
  chart?: {
    result?: Array<{
      meta?: Record<string, unknown>;
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: Array<number | null> }>; adjclose?: Array<{ adjclose?: Array<number | null> }> };
    }>;
  };
};

type Point = { ts: number; close: number };

function annualized(from: number, to: number, years: number): number | null {
  if (!(from > 0) || !(to > 0) || years <= 0) return null;
  const v = (Math.pow(to / from, 1 / years) - 1) * 100;
  return Number.isFinite(v) ? v : null;
}

/** Close at or just before `target` (list ascending by ts). */
function closeAt(points: Point[], target: number): number | null {
  let found: number | null = null;
  for (const p of points) {
    if (p.ts <= target) found = p.close;
    else break;
  }
  return found;
}

export async function yahooFundamentals(
  item: QuoteRequestItem,
): Promise<InstrumentFundamentals | null> {
  const symbol = toYahooSymbol(item);

  const chart = await yahooJson<ChartBody>(
    `${CHART}/${encodeURIComponent(symbol)}?range=5y&interval=1d`,
  );
  const res = chart?.chart?.result?.[0];
  const meta = res?.meta ?? {};

  const points: Point[] = [];
  const ts = res?.timestamp ?? [];
  const closes =
    res?.indicators?.adjclose?.[0]?.adjclose ?? res?.indicators?.quote?.[0]?.close ?? [];
  for (let i = 0; i < ts.length; i++) {
    const c = normalizePrice(closes[i]);
    if (c != null && Number.isFinite(ts[i])) points.push({ ts: ts[i] * 1000, close: c });
  }
  points.sort((a, b) => a.ts - b.ts);

  const summary = await yahooAuthedJson<{
    quoteSummary?: {
      result?: Array<{
        assetProfile?: { sector?: string; industry?: string };
        defaultKeyStatistics?: Record<string, RawNum>;
        financialData?: Record<string, RawNum>;
        summaryDetail?: Record<string, RawNum>;
        price?: Record<string, RawNum>;
      }>;
    };
  }>(
    `${SUMMARY_URL}/${encodeURIComponent(symbol)}?modules=assetProfile,defaultKeyStatistics,financialData,summaryDetail,price`,
  );
  const s = summary?.quoteSummary?.result?.[0];

  if (!res && !s) return null;

  const currency =
    normalizeCurrency(meta.currency) ?? normalizeCurrency((s?.price as any)?.currency) ?? null;
  const price =
    normalizePrice(meta.regularMarketPrice) ??
    pickNum(s?.price?.regularMarketPrice) ??
    (points.length ? points[points.length - 1].close : null);

  const marketCap = pickNum(s?.price?.marketCap) ?? pickNum(s?.summaryDetail?.marketCap);
  const roeRaw = pickNum(s?.financialData?.returnOnEquity);
  const divYieldRaw =
    pickNum(s?.summaryDetail?.dividendYield) ?? pickNum(s?.summaryDetail?.trailingAnnualDividendYield);
  const divYield = divYieldRaw != null ? (divYieldRaw <= 1 ? divYieldRaw * 100 : divYieldRaw) : null;

  const quoteType = String(meta.instrumentType ?? "").toUpperCase();

  // Long-window returns computed from history — works for every instrument type.
  const YEAR = 365.25 * 86400000;
  const last = points.length ? points[points.length - 1] : null;
  const r = (years: number): number | null => {
    if (!last) return null;
    const from = closeAt(points, last.ts - years * YEAR);
    return from != null ? annualized(from, last.close, years) : null;
  };

  return {
    identifier_type: item.identifier_type,
    identifier: item.identifier,
    currency,
    price,
    week52_high:
      normalizePrice(meta.fiftyTwoWeekHigh) ?? pickNum(s?.summaryDetail?.fiftyTwoWeekHigh),
    week52_low: normalizePrice(meta.fiftyTwoWeekLow) ?? pickNum(s?.summaryDetail?.fiftyTwoWeekLow),
    pe: pickNum(s?.summaryDetail?.trailingPE) ?? pickNum(s?.defaultKeyStatistics?.forwardPE),
    pb: pickNum(s?.defaultKeyStatistics?.priceToBook),
    dividend_yield: divYield,
    eps: pickNum(s?.defaultKeyStatistics?.trailingEps),
    market_cap: marketCap,
    roe: roeRaw != null ? roeRaw * 100 : null,
    debt_to_equity:
      pickNum(s?.financialData?.debtToEquity) != null
        ? (pickNum(s?.financialData?.debtToEquity) as number) / 100
        : null,
    face_value: null,
    book_value: pickNum(s?.defaultKeyStatistics?.bookValue),
    market_cap_band: capBand(marketCap, currency),
    sector: s?.assetProfile?.sector ?? null,
    industry: s?.assetProfile?.industry ?? null,
    segment_type:
      SEGMENT_BY_TYPE[quoteType] ??
      (quoteType || null) ??
      (typeof meta.fullExchangeName === "string" ? null : null),
    nav_date: last ? new Date(last.ts).toISOString() : null,
    return_1y: r(1),
    return_3y: r(3),
    return_5y: r(5),
    source: "yahoo",
    fetched_at: new Date().toISOString(),
  };
}
