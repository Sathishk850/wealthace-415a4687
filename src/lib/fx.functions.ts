import { createServerFn } from "@tanstack/react-start";
import type { FxRate } from "@/lib/fx-types";

// Simple in-process cache to avoid hitting Alpha Vantage on every render.
let fxCache: { data: FxRate[]; at: number } | null = null;
const TTL_MS = 15 * 60 * 1000; // 15 minutes

export const getFxRates = createServerFn({ method: "GET" }).handler(
  async (): Promise<{ rates: FxRate[]; cached: boolean }> => {
    const now = Date.now();
    if (fxCache && now - fxCache.at < TTL_MS) {
      return { rates: fxCache.data, cached: true };
    }
    const { fetchAllFxRates } = await import("@/lib/fx.server");
    const rates = await fetchAllFxRates();
    if (rates.length > 0) fxCache = { data: rates, at: now };
    return { rates, cached: false };
  },
);
