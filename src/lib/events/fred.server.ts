// FRED (Federal Reserve Economic Data) adapter — SERVER ONLY.
// Requires FRED_API_KEY. Never import this from client code.

import type { EventImpact, MarketEventUpsert } from "./types";

const BASE = "https://api.stlouisfed.org/fred";

type SeriesSpec = {
  id: string;
  name: string;
  category: string;
  impact: EventImpact;
  unit: string;
  /** Render latest observation as a YoY % change instead of the raw level. */
  yoy?: boolean;
  markets: string[];
  assetClasses: string[];
  description: string;
};

export const FRED_SERIES: SeriesSpec[] = [
  {
    id: "CPIAUCSL",
    name: "US CPI Inflation (YoY)",
    category: "Inflation",
    impact: "Very High",
    unit: "%",
    yoy: true,
    markets: ["S&P 500", "NASDAQ", "USD", "US Treasuries"],
    assetClasses: ["Equity", "Debt", "Currency"],
    description: "Consumer Price Index for All Urban Consumers, seasonally adjusted (BLS via FRED).",
  },
  {
    id: "UNRATE",
    name: "US Unemployment Rate",
    category: "Employment",
    impact: "High",
    unit: "%",
    markets: ["S&P 500", "USD"],
    assetClasses: ["Equity", "Currency"],
    description: "Civilian unemployment rate, seasonally adjusted (BLS via FRED).",
  },
  {
    id: "PAYEMS",
    name: "US Non-Farm Payrolls",
    category: "Employment",
    impact: "Very High",
    unit: "K jobs",
    markets: ["S&P 500", "NASDAQ", "USD"],
    assetClasses: ["Equity", "Currency"],
    description: "All employees, total non-farm payrolls, seasonally adjusted (BLS via FRED).",
  },
  {
    id: "FEDFUNDS",
    name: "US Fed Funds Effective Rate",
    category: "Central Bank",
    impact: "Very High",
    unit: "%",
    markets: ["S&P 500", "USD", "US Treasuries"],
    assetClasses: ["Equity", "Debt", "Currency"],
    description: "Effective Federal Funds Rate, monthly average (Federal Reserve via FRED).",
  },
  {
    id: "GDP",
    name: "US GDP",
    category: "Growth",
    impact: "High",
    unit: "$B",
    markets: ["S&P 500", "USD"],
    assetClasses: ["Equity", "Currency"],
    description: "Gross Domestic Product, seasonally adjusted annual rate (BEA via FRED).",
  },
  {
    id: "INDPRO",
    name: "US Industrial Production",
    category: "Growth",
    impact: "Moderate",
    unit: "index",
    markets: ["S&P 500", "Industrials"],
    assetClasses: ["Equity"],
    description: "Industrial Production, total index, seasonally adjusted (Federal Reserve via FRED).",
  },
  {
    id: "RSAFS",
    name: "US Retail Sales",
    category: "Consumption",
    impact: "High",
    unit: "$M",
    markets: ["S&P 500", "Consumer Discretionary"],
    assetClasses: ["Equity"],
    description: "Advance retail and food services sales, seasonally adjusted (Census via FRED).",
  },
  {
    id: "ICSA",
    name: "US Initial Jobless Claims",
    category: "Employment",
    impact: "Moderate",
    unit: "K",
    markets: ["S&P 500", "USD"],
    assetClasses: ["Equity", "Currency"],
    description: "Initial claims for unemployment insurance, weekly seasonally adjusted (DOL via FRED).",
  },
  {
    id: "UMCSENT",
    name: "US Consumer Sentiment",
    category: "Sentiment",
    impact: "Moderate",
    unit: "index",
    markets: ["S&P 500", "USD"],
    assetClasses: ["Equity", "Currency"],
    description: "University of Michigan Consumer Sentiment index (via FRED).",
  },

];

type Observation = { date: string; value: string };

async function fredGet(path: string, params: Record<string, string>, apiKey: string) {
  const url = new URL(`${BASE}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  url.searchParams.set("api_key", apiKey);
  url.searchParams.set("file_type", "json");
  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`FRED ${path} ${res.status}`);
  return (await res.json()) as Record<string, unknown>;
}

function fmtValue(spec: SeriesSpec, value: number | null): string | null {
  if (value === null || !Number.isFinite(value)) return null;
  if (spec.unit === "%") return `${value.toFixed(2)}%`;
  if (spec.unit === "K jobs") return `${Math.round(value).toLocaleString("en-US")}K`;
  if (spec.unit === "$B" || spec.unit === "$M") return value.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return value.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function num(v: string): number | null {
  if (!v || v === ".") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

/** YoY % change from a 13+ observation tail (monthly series). */
function yoyPct(obs: Observation[], idxFromEnd: number): number | null {
  const i = obs.length - 1 - idxFromEnd;
  const j = i - 12;
  if (i < 0 || j < 0) return null;
  const a = num(obs[i]!.value);
  const b = num(obs[j]!.value);
  if (a === null || b === null || b === 0) return null;
  return ((a - b) / b) * 100;
}

async function nextReleaseDate(seriesId: string, apiKey: string, today: string): Promise<string | null> {
  try {
    const rel = (await fredGet("series/release", { series_id: seriesId }, apiKey)) as {
      releases?: Array<{ id: number }>;
    };
    const releaseId = rel.releases?.[0]?.id;
    if (!releaseId) return null;
    const dates = (await fredGet(
      "releases/dates",
      {
        release_id: String(releaseId),
        include_release_dates_with_no_data: "true",
        realtime_start: today,
        sort_order: "asc",
        limit: "5",
      },
      apiKey,
    )) as { release_dates?: Array<{ date: string }> };
    const next = dates.release_dates?.find((d) => d.date >= today);
    return next?.date ?? null;
  } catch (err) {
    console.error(`[events] FRED release dates failed for ${seriesId}`, err);
    return null;
  }
}

/**
 * Build FRED-sourced events: one RELEASED row for the latest observation and,
 * when a schedule is published, one UPCOMING row for the next release.
 */
export async function buildFredEvents(now: Date = new Date()): Promise<MarketEventUpsert[]> {
  const apiKey = process.env["FRED_API_KEY"];
  if (!apiKey) throw new Error("FRED_API_KEY is not configured");

  const today = now.toISOString().slice(0, 10);
  const stamp = now.toISOString();
  const out: MarketEventUpsert[] = [];

  for (const spec of FRED_SERIES) {
    try {
      const obsRes = (await fredGet(
        "series/observations",
        { series_id: spec.id, sort_order: "desc", limit: spec.yoy ? "14" : "3" },
        apiKey,
      )) as { observations?: Observation[] };
      // FRED returned newest-first; reverse to ascending for YoY indexing.
      const obs = (obsRes.observations ?? []).filter((o) => o.value !== ".").reverse();
      if (obs.length < 2) continue;

      const latest = obs[obs.length - 1]!;
      const prior = obs[obs.length - 2]!;

      const actualNum = spec.yoy ? yoyPct(obs, 0) : num(latest.value);
      const prevNum = spec.yoy ? yoyPct(obs, 1) : num(prior.value);
      const actual = fmtValue(spec, actualNum);
      const previous = fmtValue(spec, prevNum);

      const common = {
        source: "FRED",
        event_name: spec.name,
        country: "US",
        region: "Americas",
        category: spec.category,
        timezone: "America/New_York",
        unit: spec.unit,
        impact: spec.impact,
        description: spec.description,
        markets: spec.markets,
        asset_classes: spec.assetClasses,
        source_url: `https://fred.stlouisfed.org/series/${spec.id}`,
        last_updated: stamp,
      };

      out.push({
        ...common,
        external_id: `${spec.id}:${latest.date}`,
        event_time: new Date(`${latest.date}T12:30:00Z`).toISOString(),
        previous,
        actual,
        status: actual ? "released" : "unavailable",
      });

      const next = await nextReleaseDate(spec.id, apiKey, today);
      if (next) {
        out.push({
          ...common,
          external_id: `${spec.id}:next:${next}`,
          event_time: new Date(`${next}T12:30:00Z`).toISOString(),
          previous: actual,
          actual: null,
          status: "upcoming",
        });
      }
    } catch (err) {
      console.error(`[events] FRED sync failed for ${spec.id}`, err);
    }
  }

  return out;
}
