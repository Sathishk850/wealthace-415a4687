// FX rate server — fetches live rates from Alpha Vantage CURRENCY_EXCHANGE_RATE.
// Never import this from client code.

const AV_BASE = "https://www.alphavantage.co/query";

type AVFxResponse = {
  "Realtime Currency Exchange Rate"?: {
    "1. From_Currency Code": string;
    "3. To_Currency Code": string;
    "5. Exchange Rate": string;
    "6. Last Refreshed": string;
    "8. Bid Price": string;
    "9. Ask Price": string;
  };
};

export type FxRate = {
  from: string;
  to: string;
  rate: number;
  bid: number;
  ask: number;
  refreshed_at: string;
  source: "alpha_vantage";
};

/** Fetch a single currency pair from Alpha Vantage (server-side only). */
export async function fetchFxRate(from: string, to: string): Promise<FxRate | null> {
  const apiKey = process.env["ALPHA_VANTAGE_API_KEY"];
  if (!apiKey) {
    console.error("[fx] ALPHA_VANTAGE_API_KEY not configured");
    return null;
  }
  try {
    const url = new URL(AV_BASE);
    url.searchParams.set("function", "CURRENCY_EXCHANGE_RATE");
    url.searchParams.set("from_currency", from);
    url.searchParams.set("to_currency", to);
    url.searchParams.set("apikey", apiKey);

    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as AVFxResponse;
    const r = data["Realtime Currency Exchange Rate"];
    if (!r) return null;

    return {
      from,
      to,
      rate: parseFloat(r["5. Exchange Rate"]) || 0,
      bid: parseFloat(r["8. Bid Price"]) || 0,
      ask: parseFloat(r["9. Ask Price"]) || 0,
      refreshed_at: r["6. Last Refreshed"],
      source: "alpha_vantage",
    };
  } catch (err) {
    console.error(`[fx] Failed to fetch ${from}/${to}`, err);
    return null;
  }
}

/**
 * Fetch all required FX pairs for WealthAce.
 * Currently: UGX/INR, UGX/USD, USD/INR.
 */
export async function fetchAllFxRates(): Promise<FxRate[]> {
  const pairs: [string, string][] = [
    ["UGX", "INR"],
    ["UGX", "USD"],
    ["UGX", "EUR"],
    ["UGX", "GBP"],
    ["USD", "INR"],
  ];
  const results = await Promise.allSettled(pairs.map(([f, t]) => fetchFxRate(f, t)));
  return results
    .filter((r): r is PromiseFulfilledResult<FxRate> => r.status === "fulfilled" && r.value !== null)
    .map((r) => r.value);
}
