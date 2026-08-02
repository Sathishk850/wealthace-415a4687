// Client-safe shared types for the Market Data Service.
// Do NOT import server-only code here.

export type IdentifierType = "stock_in" | "stock_us" | "mf_in" | "crypto";
export type Exchange = "NSE" | "BSE" | "US" | string;

export type InstrumentKind = "stock" | "mf" | "crypto";

export type MarketQuote = {
  identifier_type: IdentifierType;
  identifier: string;
  latest_price: number | null;
  previous_close: number | null;
  currency: string | null;
  source: string | null;
  fetched_at: string; // ISO — exchange-native / provider-reported time
  server_fetched_at: string; // ISO — server wall-clock time when quote was returned
  expires_at: string | null;
  stale: boolean;
};

export type QuoteRequestItem = {
  identifier_type: IdentifierType;
  identifier: string;
  exchange?: Exchange | null;
};

export type SearchResult = {
  identifier_type: IdentifierType;
  identifier: string;
  name: string;
  exchange?: string | null;
  currency?: string | null;
  meta?: Record<string, string> | null;
};

export type MarketStatusInfo = {
  exchange: Exchange;
  is_open: boolean;
  next_open: string | null; // ISO
  next_close: string | null; // ISO
  timezone: string;
};

export const MARKET_REFRESH_INTERVALS = [5, 10, 15] as const;
export type MarketRefreshInterval = (typeof MARKET_REFRESH_INTERVALS)[number];

export type MarketDataSettings = {
  auto_refresh: boolean;
  interval_minutes: MarketRefreshInterval;
  last_refresh_at: string | null;
};

export const DEFAULT_MARKET_SETTINGS: MarketDataSettings = {
  auto_refresh: true,
  interval_minutes: 5,
  last_refresh_at: null,
};

/* ---------------- Fundamentals (auto-fetched, read-only) ---------------- */

export type InstrumentFundamentals = {
  identifier_type: IdentifierType;
  identifier: string;
  currency: string | null;
  price: number | null;
  week52_high: number | null;
  week52_low: number | null;
  pe: number | null;
  pb: number | null;
  dividend_yield: number | null; // percent
  eps: number | null;
  market_cap: number | null; // native currency, absolute
  roe: number | null; // percent
  debt_to_equity: number | null;
  face_value: number | null;
  book_value: number | null;
  /** Classification block */
  market_cap_band: string | null; // Large Cap / Mid Cap / Small Cap
  sector: string | null;
  industry: string | null;
  segment_type: string | null;
  /** Fund / ETF specific block (null for equities) */
  nav_date?: string | null;
  return_1y?: number | null; // percent, annualized
  return_3y?: number | null;
  return_5y?: number | null;
  category_average?: number | null;
  expense_ratio?: number | null;
  exit_load?: string | null;
  risk_rating?: string | null;
  fund_manager?: string | null;
  fund_house?: string | null;
  scheme_category?: string | null;
  source: string | null;
  fetched_at: string; // ISO
};

/* ---------------- Corporate actions (auto-fetched, read-only) ---------------- */

export type CorporateActionType = "dividend" | "split" | "bonus" | "rights" | "merger";

export type CorporateAction = {
  type: CorporateActionType;
  date: string; // ISO
  detail: string;
  amount: number | null;
  ratio: string | null;
  source: string | null;
};

