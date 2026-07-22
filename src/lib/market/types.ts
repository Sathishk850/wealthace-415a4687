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
