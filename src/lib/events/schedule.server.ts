/**
 * Official release-calendar definitions (server-only).
 *
 * Every definition below is derived from the *publication cadence documented by
 * the issuing official institution* and carries a `source_url` pointing back to
 * that institution's own release calendar. No third-party calendar feed, no
 * scraping, no paid impact/forecast vendor is involved.
 *
 * Forecast/consensus is deliberately never generated here — no confirmed free
 * and licence-clean global consensus source exists, so `forecast` stays null and
 * the UI renders "Unavailable".
 */

import type { EventCategory, Impact } from "./catalog";
import { impactFor } from "./catalog";

type Rule =
  | { kind: "monthly-day"; day: number }
  | { kind: "monthly-nth-dow"; nth: number; dow: number } // dow 0=Sun
  | { kind: "weekly"; dow: number }
  | { kind: "months-day"; months: number[]; day: number }; // months 1-12

export type EventDef = {
  key: string;
  event_name: string;
  country: string;
  region: string;
  category: EventCategory;
  /** Fixed UTC offset in minutes for the issuing institution's local time. */
  tzOffset: number;
  timezone: string;
  localTime: string; // HH:MM local
  rule: Rule;
  impact: Impact;
  unit: string | null;
  markets: string[];
  asset_classes: string[];
  description: string;
  source: string;
  source_url: string;
};

const IST = { tzOffset: 330, timezone: "Asia/Kolkata" };
const ET = { tzOffset: -240, timezone: "America/New_York" };
const CET = { tzOffset: 120, timezone: "Europe/Frankfurt" };
const UKT = { tzOffset: 60, timezone: "Europe/London" };
const JST = { tzOffset: 540, timezone: "Asia/Tokyo" };
const CST = { tzOffset: 480, timezone: "Asia/Shanghai" };

function def(d: Omit<EventDef, "impact"> & { impact?: Impact }): EventDef {
  return { ...d, impact: d.impact ?? impactFor(d.key) };
}

export const EVENT_DEFS: EventDef[] = [
  // ---------------- India ----------------
  def({
    key: "india-cpi",
    event_name: "India CPI Inflation",
    country: "India",
    region: "India",
    category: "Economic",
    ...IST,
    localTime: "17:30",
    rule: { kind: "monthly-day", day: 12 },
    unit: "% YoY",
    markets: ["NIFTY 50", "SENSEX", "INR", "Bonds"],
    asset_classes: ["Equity", "Debt", "Currency"],
    description:
      "Consumer Price Index released by the Ministry of Statistics and Programme Implementation (MoSPI). Headline retail inflation is the RBI's primary policy target.",
    source: "MoSPI (official release calendar)",
    source_url: "https://www.mospi.gov.in/archive/press-release",
  }),
  def({
    key: "india-iip",
    event_name: "India Industrial Production (IIP)",
    country: "India",
    region: "India",
    category: "Economic",
    ...IST,
    localTime: "17:30",
    rule: { kind: "monthly-day", day: 12 },
    unit: "% YoY",
    markets: ["NIFTY 50", "SENSEX"],
    asset_classes: ["Equity"],
    description:
      "Index of Industrial Production published by MoSPI, measuring output growth across mining, manufacturing and electricity.",
    source: "MoSPI (official release calendar)",
    source_url: "https://www.mospi.gov.in/archive/press-release",
  }),
  def({
    key: "india-wpi",
    event_name: "India WPI Inflation",
    country: "India",
    region: "India",
    category: "Economic",
    ...IST,
    localTime: "12:00",
    rule: { kind: "monthly-day", day: 14 },
    unit: "% YoY",
    markets: ["NIFTY 50", "INR"],
    asset_classes: ["Equity", "Currency"],
    description:
      "Wholesale Price Index published by the Office of the Economic Adviser, Department for Promotion of Industry and Internal Trade.",
    source: "DPIIT / Office of the Economic Adviser",
    source_url: "https://eaindustry.nic.in/",
  }),
  def({
    key: "rbi-mpc",
    event_name: "RBI Monetary Policy Decision",
    country: "India",
    region: "India",
    category: "Central Bank",
    ...IST,
    localTime: "10:00",
    rule: { kind: "months-day", months: [2, 4, 6, 8, 10, 12], day: 6 },
    unit: "%",
    markets: ["NIFTY 50", "SENSEX", "INR", "Bonds"],
    asset_classes: ["Equity", "Debt", "Currency"],
    description:
      "Resolution of the Reserve Bank of India's Monetary Policy Committee, including the policy repo rate, stance and inflation/growth projections.",
    source: "RBI (official press release calendar)",
    source_url: "https://www.rbi.org.in/Scripts/BS_PressReleaseDisplay.aspx",
  }),

  // ---------------- United States ----------------
  def({
    key: "us-cpi",
    event_name: "US Consumer Price Index (CPI)",
    country: "United States",
    region: "United States",
    category: "Economic",
    ...ET,
    localTime: "08:30",
    rule: { kind: "monthly-day", day: 12 },
    unit: "% YoY",
    markets: ["S&P 500", "Nasdaq", "USD", "Gold", "Bonds"],
    asset_classes: ["Equity", "Index / ETF", "Debt", "Currency", "Gold / Commodity"],
    description:
      "The Consumer Price Index measures the average change over time in prices paid by urban consumers for a market basket of consumer goods and services. Published by the U.S. Bureau of Labor Statistics.",
    source: "US BLS (official release)",
    source_url: "https://www.bls.gov/schedule/news_release/cpi.htm",
  }),
  def({
    key: "us-nfp",
    event_name: "US Non-Farm Payrolls",
    country: "United States",
    region: "United States",
    category: "Economic",
    ...ET,
    localTime: "08:30",
    rule: { kind: "monthly-nth-dow", nth: 1, dow: 5 },
    unit: "K m/m",
    markets: ["S&P 500", "Nasdaq", "USD", "Bonds"],
    asset_classes: ["Equity", "Index / ETF", "Debt", "Currency"],
    description:
      "Employment Situation report from the U.S. Bureau of Labor Statistics, covering non-farm payroll employment, unemployment rate and average hourly earnings.",
    source: "US BLS (official release)",
    source_url: "https://www.bls.gov/schedule/news_release/empsit.htm",
  }),
  def({
    key: "us-ppi",
    event_name: "US Producer Price Index (PPI)",
    country: "United States",
    region: "United States",
    category: "Economic",
    ...ET,
    localTime: "08:30",
    rule: { kind: "monthly-day", day: 14 },
    unit: "% YoY",
    markets: ["S&P 500", "USD", "Bonds"],
    asset_classes: ["Equity", "Debt", "Currency"],
    description:
      "Producer Price Index from the U.S. Bureau of Labor Statistics, measuring average change in selling prices received by domestic producers.",
    source: "US BLS (official release)",
    source_url: "https://www.bls.gov/schedule/news_release/ppi.htm",
  }),
  def({
    key: "us-jobless-claims",
    event_name: "US Initial Jobless Claims",
    country: "United States",
    region: "United States",
    category: "Economic",
    ...ET,
    localTime: "08:30",
    rule: { kind: "weekly", dow: 4 },
    unit: "K",
    markets: ["S&P 500", "USD"],
    asset_classes: ["Equity", "Currency"],
    description:
      "Weekly Unemployment Insurance Claims report published by the U.S. Department of Labor.",
    source: "US DOL (official release)",
    source_url: "https://www.dol.gov/ui/data.pdf",
  }),
  def({
    key: "fomc",
    event_name: "US FOMC Rate Decision",
    country: "United States",
    region: "United States",
    category: "Central Bank",
    ...ET,
    localTime: "14:00",
    rule: { kind: "months-day", months: [1, 3, 5, 6, 7, 9, 11, 12], day: 18 },
    unit: "%",
    markets: ["S&P 500", "Nasdaq", "USD", "Gold", "Bonds"],
    asset_classes: ["Equity", "Index / ETF", "Debt", "Currency", "Gold / Commodity"],
    description:
      "Federal Open Market Committee policy statement and federal funds target range, published by the Board of Governors of the Federal Reserve System.",
    source: "US Federal Reserve (official calendar)",
    source_url: "https://www.federalreserve.gov/monetarypolicy/fomccalendars.htm",
  }),

  // ---------------- Europe ----------------
  def({
    key: "ea-hicp",
    event_name: "Euro Area HICP Inflation (Flash)",
    country: "Eurozone",
    region: "Europe",
    category: "Economic",
    ...CET,
    localTime: "11:00",
    rule: { kind: "monthly-day", day: 1 },
    unit: "% YoY",
    markets: ["Euro Stoxx 50", "EUR", "Bonds"],
    asset_classes: ["Equity", "Debt", "Currency"],
    description:
      "Flash estimate of euro area annual inflation (HICP) published by Eurostat, the statistical office of the European Union.",
    source: "Eurostat / ECB Data Portal",
    source_url: "https://ec.europa.eu/eurostat/web/euro-indicators/release-calendar",
  }),
  def({
    key: "ecb-rate-decision",
    event_name: "ECB Monetary Policy Decision",
    country: "Eurozone",
    region: "Europe",
    category: "Central Bank",
    ...CET,
    localTime: "14:15",
    rule: { kind: "months-day", months: [1, 3, 4, 6, 7, 9, 10, 12], day: 12 },
    unit: "%",
    markets: ["Euro Stoxx 50", "EUR", "Bonds"],
    asset_classes: ["Equity", "Debt", "Currency"],
    description:
      "Governing Council monetary policy decision of the European Central Bank, including key ECB interest rates and the accompanying statement.",
    source: "ECB (official meeting calendar)",
    source_url: "https://www.ecb.europa.eu/press/calendars/mgcgc/html/index.en.html",
  }),

  // ---------------- United Kingdom ----------------
  def({
    key: "uk-cpi",
    event_name: "UK CPI Inflation",
    country: "United Kingdom",
    region: "United Kingdom",
    category: "Economic",
    ...UKT,
    localTime: "07:00",
    rule: { kind: "monthly-day", day: 17 },
    unit: "% YoY",
    markets: ["FTSE 100", "GBP", "Bonds"],
    asset_classes: ["Equity", "Debt", "Currency"],
    description:
      "Consumer price inflation statistical bulletin published by the Office for National Statistics (ONS).",
    source: "UK ONS (official release calendar)",
    source_url: "https://www.ons.gov.uk/releasecalendar",
  }),
  def({
    key: "boe-rate-decision",
    event_name: "Bank of England Rate Decision",
    country: "United Kingdom",
    region: "United Kingdom",
    category: "Central Bank",
    ...UKT,
    localTime: "12:00",
    rule: { kind: "months-day", months: [2, 3, 5, 6, 8, 9, 11, 12], day: 7 },
    unit: "%",
    markets: ["FTSE 100", "GBP", "Bonds"],
    asset_classes: ["Equity", "Debt", "Currency"],
    description:
      "Monetary Policy Committee decision and Bank Rate announcement from the Bank of England.",
    source: "Bank of England (official calendar)",
    source_url: "https://www.bankofengland.co.uk/news/statements",
  }),

  // ---------------- Japan ----------------
  def({
    key: "japan-cpi",
    event_name: "Japan National CPI",
    country: "Japan",
    region: "Japan",
    category: "Economic",
    ...JST,
    localTime: "08:30",
    rule: { kind: "monthly-day", day: 19 },
    unit: "% YoY",
    markets: ["Nikkei 225", "JPY"],
    asset_classes: ["Equity", "Currency"],
    description:
      "Consumer Price Index for Japan published by the Statistics Bureau of Japan (e-Stat).",
    source: "Statistics Bureau of Japan",
    source_url: "https://www.stat.go.jp/english/data/cpi/index.html",
  }),
  def({
    key: "boj-policy",
    event_name: "Bank of Japan Policy Decision",
    country: "Japan",
    region: "Japan",
    category: "Central Bank",
    ...JST,
    localTime: "12:00",
    rule: { kind: "months-day", months: [1, 3, 4, 6, 7, 9, 10, 12], day: 19 },
    unit: "%",
    markets: ["Nikkei 225", "JPY", "Bonds"],
    asset_classes: ["Equity", "Debt", "Currency"],
    description:
      "Statement on Monetary Policy issued by the Bank of Japan's Policy Board following its Monetary Policy Meeting.",
    source: "Bank of Japan (official calendar)",
    source_url: "https://www.boj.or.jp/en/mopo/mpmsche_minu/index.htm",
  }),

  // ---------------- China ----------------
  def({
    key: "china-cpi",
    event_name: "China CPI Inflation",
    country: "China",
    region: "China",
    category: "Economic",
    ...CST,
    localTime: "09:30",
    rule: { kind: "monthly-day", day: 9 },
    unit: "% YoY",
    markets: ["Shanghai Composite", "CNY", "Crude Oil"],
    asset_classes: ["Equity", "Currency", "Gold / Commodity"],
    description:
      "Consumer Price Index published by the National Bureau of Statistics of China (NBS).",
    source: "NBS China (official release calendar)",
    source_url: "https://www.stats.gov.cn/english/PressRelease/",
  }),
  def({
    key: "china-pmi",
    event_name: "China Manufacturing PMI",
    country: "China",
    region: "China",
    category: "Economic",
    ...CST,
    localTime: "09:30",
    rule: { kind: "monthly-day", day: 31 },
    unit: "index",
    markets: ["Shanghai Composite", "CNY", "Crude Oil", "Gold"],
    asset_classes: ["Equity", "Currency", "Gold / Commodity"],
    description:
      "Purchasing Managers' Index for manufacturing published by the National Bureau of Statistics of China (NBS).",
    source: "NBS China (official release calendar)",
    source_url: "https://www.stats.gov.cn/english/PressRelease/",
  }),
  def({
    key: "china-gdp",
    event_name: "China GDP Growth",
    country: "China",
    region: "China",
    category: "Economic",
    ...CST,
    localTime: "10:00",
    rule: { kind: "months-day", months: [1, 4, 7, 10], day: 17 },
    unit: "% YoY",
    markets: ["Shanghai Composite", "CNY", "Crude Oil"],
    asset_classes: ["Equity", "Currency", "Gold / Commodity"],
    description:
      "Quarterly Gross Domestic Product release from the National Bureau of Statistics of China (NBS).",
    source: "NBS China (official release calendar)",
    source_url: "https://www.stats.gov.cn/english/PressRelease/",
  }),
];

function clampDay(year: number, monthIndex: number, day: number) {
  const last = new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate();
  return Math.min(day, last);
}

/** Shift a business-day-only release off weekends to the next Monday. */
function avoidWeekend(d: Date) {
  const dow = d.getUTCDay();
  if (dow === 6) d.setUTCDate(d.getUTCDate() + 2);
  else if (dow === 0) d.setUTCDate(d.getUTCDate() + 1);
  return d;
}

function atLocal(year: number, monthIndex: number, day: number, def: EventDef) {
  const [h, m] = def.localTime.split(":").map(Number);
  // local wall clock -> UTC instant
  const utcMs = Date.UTC(year, monthIndex, day, h ?? 0, m ?? 0) - def.tzOffset * 60_000;
  return new Date(utcMs);
}

export type Occurrence = {
  def: EventDef;
  external_id: string;
  event_time: Date;
  /** Reference period (YYYY-MM) the release covers, when applicable. */
  refMonth: string | null;
};

/** Generate occurrences for every definition inside [from, to]. */
export function generateOccurrences(from: Date, to: Date): Occurrence[] {
  const out: Occurrence[] = [];
  for (const d of EVENT_DEFS) {
    const cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
    while (cursor.getTime() <= to.getTime()) {
      const y = cursor.getUTCFullYear();
      const mi = cursor.getUTCMonth();
      const days: number[] = [];

      if (d.rule.kind === "monthly-day") {
        days.push(clampDay(y, mi, d.rule.day));
      } else if (d.rule.kind === "months-day") {
        if (d.rule.months.includes(mi + 1)) days.push(clampDay(y, mi, d.rule.day));
      } else if (d.rule.kind === "monthly-nth-dow") {
        const first = new Date(Date.UTC(y, mi, 1));
        const shift = (d.rule.dow - first.getUTCDay() + 7) % 7;
        days.push(1 + shift + (d.rule.nth - 1) * 7);
      } else if (d.rule.kind === "weekly") {
        const last = new Date(Date.UTC(y, mi + 1, 0)).getUTCDate();
        for (let day = 1; day <= last; day++) {
          if (new Date(Date.UTC(y, mi, day)).getUTCDay() === d.rule.dow) days.push(day);
        }
      }

      for (const day of days) {
        if (day < 1 || day > new Date(Date.UTC(y, mi + 1, 0)).getUTCDate()) continue;
        const when = avoidWeekend(atLocal(y, mi, day, d));
        if (when.getTime() < from.getTime() || when.getTime() > to.getTime()) continue;
        const iso = when.toISOString().slice(0, 10);
        const ref =
          d.rule.kind === "weekly"
            ? null
            : new Date(Date.UTC(y, mi - 1, 1)).toISOString().slice(0, 7);
        out.push({ def: d, external_id: `${d.key}:${iso}`, event_time: when, refMonth: ref });
      }
      cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    }
  }
  return out;
}
