// Client-side persisted market data settings (interval + auto refresh).
// Uses localStorage; small and non-critical. Cross-device sync can be layered later.

import { DEFAULT_MARKET_SETTINGS, MARKET_REFRESH_INTERVALS } from "./types";
import type { MarketDataSettings, MarketRefreshInterval } from "./types";

const KEY = "finvista:market-settings:v1";

function safeGet(): MarketDataSettings {
  if (typeof window === "undefined") return DEFAULT_MARKET_SETTINGS;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_MARKET_SETTINGS;
    const parsed = JSON.parse(raw) as Partial<MarketDataSettings>;
    const interval = MARKET_REFRESH_INTERVALS.includes(parsed.interval_minutes as MarketRefreshInterval)
      ? (parsed.interval_minutes as MarketRefreshInterval)
      : DEFAULT_MARKET_SETTINGS.interval_minutes;
    return {
      auto_refresh: typeof parsed.auto_refresh === "boolean" ? parsed.auto_refresh : true,
      interval_minutes: interval,
      last_refresh_at: typeof parsed.last_refresh_at === "string" ? parsed.last_refresh_at : null,
    };
  } catch {
    return DEFAULT_MARKET_SETTINGS;
  }
}

export function getMarketSettings(): MarketDataSettings {
  return safeGet();
}

export function saveMarketSettings(patch: Partial<MarketDataSettings>): MarketDataSettings {
  const next = { ...safeGet(), ...patch };
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(next));
      window.dispatchEvent(new CustomEvent("finvista:market-settings-changed"));
    } catch {
      /* ignore */
    }
  }
  return next;
}

export function markLastRefresh(when: Date = new Date()): void {
  saveMarketSettings({ last_refresh_at: when.toISOString() });
}
