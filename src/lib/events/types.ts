// Shared, browser-safe types for the Global Market Events module.

export const IMPACTS = ["Low", "Moderate", "High", "Very High"] as const;
export type EventImpact = (typeof IMPACTS)[number];

export const EVENT_STATUSES = ["upcoming", "released", "unavailable"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

export type MarketEvent = {
  id: string;
  source: string;
  external_id: string;
  event_name: string;
  country: string;
  region: string;
  category: string;
  /** ISO timestamp (UTC). */
  event_time: string;
  timezone: string;
  previous: string | null;
  actual: string | null;
  unit: string | null;
  impact: string;
  status: string;
  description: string | null;
  markets: string[];
  source_url: string | null;
  last_updated: string;
};

/** Row shape used when the sync job upserts into `market_events`. */
export type MarketEventUpsert = {
  source: string;
  external_id: string;
  event_name: string;
  country: string;
  region: string;
  category: string;
  event_time: string;
  timezone: string;
  previous: string | null;
  actual: string | null;
  unit: string | null;
  impact: EventImpact;
  status: EventStatus;
  description: string | null;
  markets: string[];
  asset_classes: string[];
  source_url: string | null;
  last_updated: string;
};

export const COUNTRY_FLAGS: Record<string, string> = {
  US: "🇺🇸",
  India: "🇮🇳",
  Eurozone: "🇪🇺",
  UK: "🇬🇧",
  Japan: "🇯🇵",
  China: "🇨🇳",
};

export function flagFor(country: string): string {
  return COUNTRY_FLAGS[country] ?? "🌐";
}

export const IMPACT_TINT: Record<string, string> = {
  Low: "#38bdf8",
  Moderate: "#eab308",
  High: "#f97316",
  "Very High": "#ef4444",
};

export const STATUS_TINT: Record<string, string> = {
  UPCOMING: "#22d3ee",
  RELEASED: "#22c55e",
  UNAVAILABLE: "#94a3b8",
};
