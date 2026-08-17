/**
 * Actual-value adapters (server-only), official + keyless sources.
 *
 *  - US: Bureau of Labor Statistics public API (no key required)
 *  - Euro area: ECB Data Portal API (no key required)
 *
 * Every value returned here comes from the issuing institution. Anything a
 * source does not publish is returned as `null` and rendered "Unavailable".
 * Forecast/consensus is intentionally never produced.
 */

export type ActualPoint = {
  /** YYYY-MM reference period */
  period: string;
  value: string;
};

type Series = Record<string, string>; // period -> formatted value

async function safeJson(url: string, init?: RequestInit): Promise<any | null> {
  try {
    const res = await fetch(url, {
      ...init,
      headers: { Accept: "application/json", ...(init?.headers ?? {}) },
    });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.warn("[events-sync] source fetch failed", url, (e as Error).message);
    return null;
  }
}

/** BLS timeseries (v1, keyless). Returns period -> raw numeric value. */
async function blsSeries(seriesId: string, startYear: number, endYear: number) {
  const json = await safeJson(
    `https://api.bls.gov/publicAPI/v1/timeseries/data/${seriesId}?startyear=${startYear}&endyear=${endYear}`,
  );
  const rows = json?.Results?.series?.[0]?.data as
    | Array<{ year: string; period: string; value: string }>
    | undefined;
  if (!rows) return null;
  const map = new Map<string, number>();
  for (const r of rows) {
    if (!/^M\d\d$/.test(r.period)) continue;
    const v = Number(r.value);
    if (!Number.isFinite(v)) continue;
    map.set(`${r.year}-${r.period.slice(1)}`, v);
  }
  return map;
}

function prevYear(period: string) {
  const [y, m] = period.split("-");
  return `${Number(y) - 1}-${m}`;
}
function prevMonth(period: string) {
  const [y, m] = period.split("-").map(Number);
  const d = new Date(Date.UTC(y!, (m ?? 1) - 2, 1));
  return d.toISOString().slice(0, 7);
}

/** US CPI headline, year-over-year percent, computed from the BLS index level. */
async function usCpiYoY(year: number): Promise<Series> {
  const map = await blsSeries("CUUR0000SA0", year - 2, year);
  const out: Series = {};
  if (!map) return out;
  for (const [period, value] of map) {
    const base = map.get(prevYear(period));
    if (!base) continue;
    out[period] = `${(((value - base) / base) * 100).toFixed(1)}%`;
  }
  return out;
}

/** US non-farm payrolls monthly change, in thousands (BLS level series). */
async function usNfpChange(year: number): Promise<Series> {
  const map = await blsSeries("CES0000000001", year - 1, year);
  const out: Series = {};
  if (!map) return out;
  for (const [period, value] of map) {
    const base = map.get(prevMonth(period));
    if (!base) continue;
    out[period] = `${Math.round(value - base)}K`;
  }
  return out;
}

/** US PPI (final demand) year-over-year percent. */
async function usPpiYoY(year: number): Promise<Series> {
  const map = await blsSeries("WPUFD4", year - 2, year);
  const out: Series = {};
  if (!map) return out;
  for (const [period, value] of map) {
    const base = map.get(prevYear(period));
    if (!base) continue;
    out[period] = `${(((value - base) / base) * 100).toFixed(1)}%`;
  }
  return out;
}

/** Euro area HICP annual rate straight from the ECB Data Portal. */
async function eaHicpYoY(): Promise<Series> {
  const json = await safeJson(
    "https://data-api.ecb.europa.eu/service/data/ICP/M.U2.N.000000.4.ANR?lastNObservations=36&format=jsondata",
  );
  const out: Series = {};
  try {
    const periods: Array<{ id: string }> =
      json?.structure?.dimensions?.observation?.[0]?.values ?? [];
    const obs: Record<string, number[]> =
      json?.dataSets?.[0]?.series?.["0:0:0:0:0:0"]?.observations ?? {};
    for (const [idx, arr] of Object.entries(obs)) {
      const p = periods[Number(idx)]?.id;
      const v = arr?.[0];
      if (!p || v == null) continue;
      out[p] = `${Number(v).toFixed(1)}%`;
    }
  } catch {
    /* shape change — treat as unavailable */
  }
  return out;
}

/**
 * Fetch every available actual series, keyed by event definition key.
 * Missing sources simply yield an empty series (→ "Unavailable" in the UI).
 */
export async function fetchActualSeries(now = new Date()): Promise<Record<string, Series>> {
  const year = now.getUTCFullYear();
  const [cpi, nfp, ppi, hicp] = await Promise.all([
    usCpiYoY(year),
    usNfpChange(year),
    usPpiYoY(year),
    eaHicpYoY(),
  ]);
  return {
    "us-cpi": cpi,
    "us-nfp": nfp,
    "us-ppi": ppi,
    "ea-hicp": hicp,
  };
}

/** Look up actual + previous for a reference period inside a series. */
export function pickValues(series: Series | undefined, refMonth: string | null) {
  if (!series || !refMonth) return { actual: null as string | null, previous: null as string | null };
  return {
    actual: series[refMonth] ?? null,
    previous: series[prevMonth(refMonth)] ?? null,
  };
}
