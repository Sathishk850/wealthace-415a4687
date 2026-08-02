// MFAPI fundamentals — Indian Mutual Fund scheme facts derived from the
// full NAV history (no API key). Server-only.
//
// Endpoint: https://api.mfapi.in/mf/<scheme_code>
// Response: { meta: { fund_house, scheme_type, scheme_category, scheme_name },
//             data: [{ date: "dd-mm-yyyy", nav: "123.45" }, ...] }  (newest first)

import type { InstrumentFundamentals, QuoteRequestItem } from "../types";
import { fetchWithTimeout, normalizePrice } from "../normalize";

const BASE = "https://api.mfapi.in";
const TIMEOUT_MS = 15_000;

type Row = { date: string; nav: number; ts: number };

function parseDate(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const m = raw.trim().match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return null;
  const t = Date.parse(`${m[3]}-${m[2]}-${m[1]}T00:00:00Z`);
  return Number.isNaN(t) ? null : t;
}

/** NAV closest to (but not after) `target`, searching a newest-first list. */
function navAt(rows: Row[], target: number): number | null {
  for (const r of rows) {
    if (r.ts <= target) return r.nav;
  }
  return null;
}

function annualized(from: number, to: number, years: number): number | null {
  if (!(from > 0) || !(to > 0) || years <= 0) return null;
  const v = (Math.pow(to / from, 1 / years) - 1) * 100;
  return Number.isFinite(v) ? v : null;
}

export async function mfapiFundamentals(
  item: QuoteRequestItem,
): Promise<InstrumentFundamentals | null> {
  type Body = {
    meta?: Record<string, unknown>;
    data?: Array<{ date?: unknown; nav?: unknown }>;
  };
  let body: Body | null = null;
  try {
    const res = await fetchWithTimeout(
      `${BASE}/mf/${encodeURIComponent(item.identifier)}`,
      { headers: { Accept: "application/json" } },
      TIMEOUT_MS,
    );
    if (!res.ok) {
      console.warn(`[mfapi-fund] scheme ${item.identifier} HTTP ${res.status}`);
      return null;
    }
    body = (await res.json()) as Body;
  } catch (err) {
    console.warn("[mfapi-fund] fetch failed", err);
    return null;
  }

  const rows: Row[] = [];
  for (const r of body?.data ?? []) {
    const nav = normalizePrice(r.nav);
    const ts = parseDate(r.date);
    if (nav != null && ts != null) rows.push({ date: String(r.date), nav, ts });
  }
  if (rows.length === 0) return null;
  rows.sort((a, b) => b.ts - a.ts);

  const latest = rows[0];
  const YEAR = 365.25 * 86400000;
  const oneYearWindow = rows.filter((r) => r.ts >= latest.ts - YEAR);
  const navs52 = oneYearWindow.map((r) => r.nav);

  const meta = body?.meta ?? {};
  const str = (k: string): string | null => {
    const v = meta[k];
    return typeof v === "string" && v.trim() ? v.trim() : null;
  };

  const n1 = navAt(rows, latest.ts - YEAR);
  const n3 = navAt(rows, latest.ts - 3 * YEAR);
  const n5 = navAt(rows, latest.ts - 5 * YEAR);

  return {
    identifier_type: item.identifier_type,
    identifier: item.identifier,
    currency: "INR",
    price: latest.nav,
    week52_high: navs52.length ? Math.max(...navs52) : null,
    week52_low: navs52.length ? Math.min(...navs52) : null,
    pe: null,
    pb: null,
    dividend_yield: null,
    eps: null,
    market_cap: null,
    roe: null,
    debt_to_equity: null,
    face_value: null,
    book_value: null,
    market_cap_band: null,
    sector: str("scheme_category"),
    industry: str("fund_house"),
    segment_type: str("scheme_type") ?? "Mutual Fund",
    // Fund-specific block
    nav_date: new Date(latest.ts).toISOString(),
    return_1y: n1 != null ? annualized(n1, latest.nav, 1) : null,
    return_3y: n3 != null ? annualized(n3, latest.nav, 3) : null,
    return_5y: n5 != null ? annualized(n5, latest.nav, 5) : null,
    category_average: null,
    expense_ratio: null,
    exit_load: null,
    risk_rating: null,
    fund_manager: null,
    fund_house: str("fund_house"),
    scheme_category: str("scheme_category"),
    source: "mfapi",
    fetched_at: new Date().toISOString(),
  };
}
