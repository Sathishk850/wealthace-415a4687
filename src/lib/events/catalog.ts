/**
 * Wealth Ace event catalog — client-safe metadata.
 *
 * Impact ratings here are *Wealth Ace's own potential-impact classification*
 * for recurring event types. They are NOT a purchased impact feed and are NOT
 * a prediction of market reaction.
 */

export type Impact = "Low" | "Moderate" | "High" | "Very High";
export type EventStatus = "upcoming" | "released" | "delayed" | "cancelled";

export type Region = "India" | "United States" | "Europe" | "United Kingdom" | "Japan" | "China";

export const REGIONS: Region[] = [
  "India",
  "United States",
  "Europe",
  "United Kingdom",
  "Japan",
  "China",
];

export const EVENT_CATEGORIES = [
  "Economic",
  "Central Bank",
  "Earnings",
  "Dividend",
  "Corporate Action",
  "IPO / FPO",
  "Market Event",
  "Other",
] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];

export const IMPACTS: Impact[] = ["Low", "Moderate", "High", "Very High"];

export const MARKETS = [
  "NIFTY 50",
  "SENSEX",
  "S&P 500",
  "Nasdaq",
  "FTSE 100",
  "Euro Stoxx 50",
  "Nikkei 225",
  "Shanghai Composite",
  "USD",
  "INR",
  "EUR",
  "GBP",
  "JPY",
  "CNY",
  "Gold",
  "Crude Oil",
  "Bonds",
] as const;

export const ASSET_CLASSES = [
  "Equity",
  "Index / ETF",
  "Mutual Funds",
  "Debt",
  "Gold / Commodity",
  "Currency",
  "Crypto",
] as const;

/** Flag emoji per region, used in list rows (matches the reference layout). */
export const REGION_FLAG: Record<string, string> = {
  India: "🇮🇳",
  "United States": "🇺🇸",
  Europe: "🇪🇺",
  Eurozone: "🇪🇺",
  "United Kingdom": "🇬🇧",
  Japan: "🇯🇵",
  China: "🇨🇳",
};

/**
 * Internal impact classification keyed by normalised event-type token.
 * Extend this map — never store impact judgements in the UI layer.
 */
export const IMPACT_BY_EVENT_TYPE: Record<string, Impact> = {
  fomc: "Very High",
  "fed-rate-decision": "Very High",
  "rbi-mpc": "Very High",
  "us-cpi": "Very High",
  "ecb-rate-decision": "Very High",
  "boe-rate-decision": "Very High",
  "boj-policy": "Very High",
  "us-nfp": "High",
  "india-cpi": "High",
  "india-iip": "Moderate",
  "india-wpi": "Moderate",
  "india-gdp": "High",
  "us-gdp": "High",
  "us-ppi": "High",
  "us-retail-sales": "High",
  "us-jobless-claims": "Moderate",
  "ea-hicp": "High",
  "ea-gdp": "High",
  "uk-cpi": "High",
  "japan-cpi": "Moderate",
  "china-cpi": "Moderate",
  "china-pmi": "Moderate",
  "china-gdp": "High",
  "global-pmi": "Moderate",
};

export function impactFor(eventType: string, fallback: Impact = "Moderate"): Impact {
  return IMPACT_BY_EVENT_TYPE[eventType] ?? fallback;
}

export const IMPACT_TONE: Record<Impact, string> = {
  "Very High": "border-destructive/40 bg-destructive/15 text-destructive",
  High: "border-amber-500/40 bg-amber-500/15 text-amber-400",
  Moderate: "border-mint/40 bg-mint/10 text-mint",
  Low: "border-border bg-muted/40 text-muted-foreground",
};

export const IMPACT_SCORE: Record<Impact, number> = {
  Low: 1,
  Moderate: 2,
  High: 3,
  "Very High": 4,
};

export const STATUS_LABEL: Record<EventStatus, string> = {
  upcoming: "Upcoming",
  released: "Released",
  delayed: "Delayed",
  cancelled: "Cancelled",
};

export const CATEGORY_TONE: Record<string, string> = {
  Economic: "text-mint",
  "Central Bank": "text-amber-400",
  Earnings: "text-sky-400",
  Dividend: "text-emerald-400",
  "Corporate Action": "text-violet-400",
  "IPO / FPO": "text-orange-400",
  "Market Event": "text-cyan-400",
  Other: "text-muted-foreground",
};

/** Placeholder used everywhere a real value is not available from a source. */
export const UNAVAILABLE = "Unavailable";

export function displayValue(v: string | null | undefined): string {
  const s = (v ?? "").trim();
  return s.length ? s : UNAVAILABLE;
}
