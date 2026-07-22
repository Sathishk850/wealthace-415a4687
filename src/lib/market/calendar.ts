// Market Calendar Service — extensible per exchange.
// No hardcoded timings in consumers; add new exchanges here.

import type { Exchange, MarketStatusInfo } from "./types";

type ExchangeSpec = {
  timezone: string; // IANA tz
  // 24h times in the exchange timezone
  openHour: number;
  openMinute: number;
  closeHour: number;
  closeMinute: number;
  // 0 = Sunday, 6 = Saturday
  weekdays: number[];
};

const SPECS: Record<string, ExchangeSpec> = {
  NSE: { timezone: "Asia/Kolkata", openHour: 9, openMinute: 15, closeHour: 15, closeMinute: 30, weekdays: [1, 2, 3, 4, 5] },
  BSE: { timezone: "Asia/Kolkata", openHour: 9, openMinute: 15, closeHour: 15, closeMinute: 30, weekdays: [1, 2, 3, 4, 5] },
  US:  { timezone: "America/New_York", openHour: 9, openMinute: 30, closeHour: 16, closeMinute: 0, weekdays: [1, 2, 3, 4, 5] },
};

function partsInTz(date: Date, tz: string) {
  const fmt = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour12: false,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = fmt.formatToParts(date);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekdayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hour: Number(get("hour")),
    minute: Number(get("minute")),
    weekday: weekdayMap[get("weekday")] ?? 0,
  };
}

export function getMarketStatus(exchange: Exchange, now: Date = new Date()): MarketStatusInfo {
  const spec = SPECS[exchange] ?? SPECS.NSE;
  const p = partsInTz(now, spec.timezone);
  const minutes = p.hour * 60 + p.minute;
  const openMins = spec.openHour * 60 + spec.openMinute;
  const closeMins = spec.closeHour * 60 + spec.closeMinute;
  const isTradingDay = spec.weekdays.includes(p.weekday);
  const isOpen = isTradingDay && minutes >= openMins && minutes < closeMins;
  return {
    exchange,
    is_open: isOpen,
    next_open: null,
    next_close: null,
    timezone: spec.timezone,
  };
}

const MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/**
 * Returns today's session times in the exchange's timezone, formatted as
 * "DD Mon YYYY, HH:MM". Independent of the viewer's local timezone and of any
 * price-fetch timestamp.
 */
export function getExchangeSessionLabels(exchange: Exchange, now: Date = new Date()): {
  open: string;
  close: string;
  timezone: string;
} {
  const spec = SPECS[exchange] ?? SPECS.NSE;
  const p = partsInTz(now, spec.timezone);
  const dateLabel = `${pad2(p.day)} ${MONTH_SHORT[p.month - 1]} ${p.year}`;
  return {
    open: `${dateLabel}, ${pad2(spec.openHour)}:${pad2(spec.openMinute)}`,
    close: `${dateLabel}, ${pad2(spec.closeHour)}:${pad2(spec.closeMinute)}`,
    timezone: spec.timezone,
  };
}

export function isAnyMarketOpen(exchanges: Exchange[]): boolean {
  return exchanges.some((e) => getMarketStatus(e).is_open);
}

export function stockCacheTtlMs(exchange: Exchange | null | undefined): number {
  const ex = exchange ?? "NSE";
  const status = getMarketStatus(ex);
  // Market open → 5 min; market closed → 12 h (until next session)
  return status.is_open ? 5 * 60 * 1000 : 12 * 60 * 60 * 1000;
}

export function mfCacheTtlMs(): number {
  // MFAPI publishes NAV once per business day. 6 hours is a safe TTL.
  return 6 * 60 * 60 * 1000;
}
