// Curated static calendar for events no free API provides reliably
// (India MoSPI/RBI, ECB/BoE/BoJ/PBOC policy decisions).
//
// Rules:
//  - Dates are official/announced where known, otherwise the well-established
//    monthly release convention for that indicator. Descriptions say so.
//  - `previous` / `actual` are NEVER invented here. They stay null and are only
//    filled in by a real source later (see sync.server.ts).
//  - Deterministic: pure functions of `now`, no randomness, no I/O.

import type { EventImpact, MarketEventUpsert } from "./types";

const SOURCE = "CURATED";

function iso(y: number, m: number, d: number, hUTC: number, minUTC: number) {
  return new Date(Date.UTC(y, m - 1, d, hUTC, minUTC, 0)).toISOString();
}

type Fixed = {
  key: string;
  name: string;
  country: string;
  region: string;
  category: string;
  timezone: string;
  impact: EventImpact;
  markets: string[];
  assetClasses: string[];
  description: string;
  sourceUrl: string;
  /** [year, month, day, utcHour, utcMinute] */
  dates: Array<[number, number, number, number, number]>;
};

/** Announced / published policy-decision dates. */
const FIXED: Fixed[] = [
  {
    key: "rbi-mpc",
    name: "RBI Monetary Policy Decision",
    country: "India",
    region: "Asia",
    category: "Central Bank",
    timezone: "Asia/Kolkata",
    impact: "High",
    markets: ["NIFTY 50", "SENSEX", "INR", "G-Secs"],
    assetClasses: ["Equity", "Debt", "Currency"],
    description:
      "Reserve Bank of India Monetary Policy Committee resolution (repo rate, stance, inflation and growth projections). Announcement on the final day of the meeting, ~10:00 IST.",
    sourceUrl: "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx",
    dates: [
      [2026, 10, 7, 4, 30],
      [2026, 12, 4, 4, 30],
      [2027, 2, 5, 4, 30],
    ],
  },
  {
    key: "ecb-rate",
    name: "ECB Monetary Policy Decision",
    country: "Eurozone",
    region: "Europe",
    category: "Central Bank",
    timezone: "Europe/Frankfurt",
    impact: "Very High",
    markets: ["EURO STOXX 50", "DAX", "EUR", "Bunds"],
    assetClasses: ["Equity", "Debt", "Currency"],
    description:
      "European Central Bank Governing Council monetary policy decision, followed by the press conference. Indicative date from the ECB published meeting calendar.",
    sourceUrl: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html",
    dates: [
      [2026, 9, 10, 12, 15],
      [2026, 10, 29, 13, 15],
      [2026, 12, 17, 13, 15],
    ],
  },
  {
    key: "boe-rate",
    name: "BoE Bank Rate Decision",
    country: "UK",
    region: "Europe",
    category: "Central Bank",
    timezone: "Europe/London",
    impact: "Very High",
    markets: ["FTSE 100", "GBP", "Gilts"],
    assetClasses: ["Equity", "Debt", "Currency"],
    description:
      "Bank of England Monetary Policy Committee Bank Rate decision and minutes. Indicative date from the published MPC announcement schedule.",
    sourceUrl: "https://www.bankofengland.co.uk/monetary-policy/upcoming-mpc-dates",
    dates: [
      [2026, 9, 17, 11, 0],
      [2026, 11, 5, 12, 0],
      [2026, 12, 17, 12, 0],
    ],
  },
  {
    key: "boj-rate",
    name: "BoJ Policy Rate Decision",
    country: "Japan",
    region: "Asia",
    category: "Central Bank",
    timezone: "Asia/Tokyo",
    impact: "Very High",
    markets: ["NIKKEI 225", "JPY", "JGBs"],
    assetClasses: ["Equity", "Debt", "Currency"],
    description:
      "Bank of Japan Monetary Policy Meeting statement (policy rate, YCC and asset purchases). Announcement time varies through the trading day; indicative date from the BoJ meeting calendar.",
    sourceUrl: "https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm",
    dates: [
      [2026, 9, 18, 3, 0],
      [2026, 10, 30, 3, 0],
      [2026, 12, 18, 3, 0],
    ],
  },
];

type Monthly = Omit<Fixed, "dates"> & {
  /** Day of month the release conventionally lands on. */
  day: number;
  utcHour: number;
  utcMinute: number;
  /** Only emit for these months (1-12); omit for every month. */
  months?: number[];
};

const MONTHLY: Monthly[] = [
  {
    key: "india-cpi",
    name: "India CPI Inflation (YoY)",
    country: "India",
    region: "Asia",
    category: "Inflation",
    timezone: "Asia/Kolkata",
    impact: "High",
    markets: ["NIFTY 50", "INR", "G-Secs"],
    assetClasses: ["Equity", "Debt", "Currency"],
    description:
      "Consumer Price Index released by MoSPI, conventionally on/around the 12th at 17:30 IST for the preceding month.",
    sourceUrl: "https://www.mospi.gov.in/web/mospi/press-release",
    day: 12,
    utcHour: 12,
    utcMinute: 0,
  },
  {
    key: "india-iip",
    name: "India Industrial Production (IIP)",
    country: "India",
    region: "Asia",
    category: "Growth",
    timezone: "Asia/Kolkata",
    impact: "Moderate",
    markets: ["NIFTY 50", "Industrials"],
    assetClasses: ["Equity"],
    description:
      "Index of Industrial Production released by MoSPI, conventionally on/around the 12th at 17:30 IST.",
    sourceUrl: "https://www.mospi.gov.in/web/mospi/press-release",
    day: 12,
    utcHour: 12,
    utcMinute: 0,
  },
  {
    key: "india-wpi",
    name: "India WPI Inflation (YoY)",
    country: "India",
    region: "Asia",
    category: "Inflation",
    timezone: "Asia/Kolkata",
    impact: "Moderate",
    markets: ["NIFTY 50", "Commodities"],
    assetClasses: ["Equity", "Commodity"],
    description:
      "Wholesale Price Index released by the Office of the Economic Adviser, conventionally on/around the 14th at 12:00 IST.",
    sourceUrl: "https://eaindustry.nic.in/",
    day: 14,
    utcHour: 6,
    utcMinute: 30,
  },
  {
    key: "india-gdp",
    name: "India GDP Growth (Quarterly)",
    country: "India",
    region: "Asia",
    category: "Growth",
    timezone: "Asia/Kolkata",
    impact: "High",
    markets: ["NIFTY 50", "SENSEX", "INR"],
    assetClasses: ["Equity", "Debt", "Currency"],
    description:
      "Quarterly national accounts released by MoSPI, conventionally on the last working day of Feb / May / Aug / Nov at 17:30 IST.",
    sourceUrl: "https://www.mospi.gov.in/web/mospi/press-release",
    day: 28,
    utcHour: 12,
    utcMinute: 0,
    months: [2, 5, 8, 11],
  },
  {
    key: "pboc-lpr",
    name: "PBOC Loan Prime Rate",
    country: "China",
    region: "Asia",
    category: "Central Bank",
    timezone: "Asia/Shanghai",
    impact: "High",
    markets: ["CSI 300", "HANG SENG", "CNY", "Metals"],
    assetClasses: ["Equity", "Currency", "Commodity"],
    description:
      "People's Bank of China 1-year and 5-year Loan Prime Rate fixing, published on/around the 20th at 09:15 CST.",
    sourceUrl: "http://www.pbc.gov.cn/en/3688229/index.html",
    day: 20,
    utcHour: 1,
    utcMinute: 15,
  },
];

/**
 * Build the curated calendar window: 2 months back through 6 months forward.
 * Past-dated rows are marked UNAVAILABLE (the event happened, but we have no
 * free source for its value — we never guess one).
 */
export function buildCuratedEvents(now: Date = new Date()): MarketEventUpsert[] {
  const out: MarketEventUpsert[] = [];
  const stamp = now.toISOString();
  const push = (
    base: Omit<Fixed, "dates"> | Omit<Monthly, "day" | "utcHour" | "utcMinute" | "months">,
    when: string,
    externalId: string,
  ) => {
    const past = new Date(when).getTime() < now.getTime();
    out.push({
      source: SOURCE,
      external_id: externalId,
      event_name: base.name,
      country: base.country,
      region: base.region,
      category: base.category,
      event_time: when,
      timezone: base.timezone,
      previous: null,
      actual: null,
      unit: null,
      impact: base.impact,
      status: past ? "UNAVAILABLE" : "UPCOMING",
      description: base.description,
      markets: base.markets,
      asset_classes: base.assetClasses,
      source_url: base.sourceUrl,
      last_updated: stamp,
    });
  };

  const windowStart = new Date(now.getTime() - 62 * 86400000).getTime();
  const windowEnd = new Date(now.getTime() + 190 * 86400000).getTime();

  for (const f of FIXED) {
    for (const [y, m, d, h, mi] of f.dates) {
      const when = iso(y, m, d, h, mi);
      const t = new Date(when).getTime();
      if (t < windowStart || t > windowEnd) continue;
      push(f, when, `${f.key}:${when.slice(0, 10)}`);
    }
  }

  for (const mo of MONTHLY) {
    for (let offset = -2; offset <= 6; offset += 1) {
      const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
      const y = cursor.getUTCFullYear();
      const m = cursor.getUTCMonth() + 1;
      if (mo.months && !mo.months.includes(m)) continue;
      const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
      const day = Math.min(mo.day, lastDay);
      const when = iso(y, m, day, mo.utcHour, mo.utcMinute);
      const t = new Date(when).getTime();
      if (t < windowStart || t > windowEnd) continue;
      push(mo, when, `${mo.key}:${when.slice(0, 7)}`);
    }
  }

  return out.sort((a, b) => a.event_time.localeCompare(b.event_time));
}
