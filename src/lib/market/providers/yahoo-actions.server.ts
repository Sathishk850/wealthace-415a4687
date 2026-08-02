// Corporate actions (dividends + splits) from Yahoo's keyless v8 chart events.
// Server-only.

import type { CorporateAction, QuoteRequestItem } from "../types";
import { toYahooSymbol, yahooJson } from "./yahoo-crumb.server";

const CHART = "https://query1.finance.yahoo.com/v8/finance/chart";

type ChartBody = {
  chart?: {
    result?: Array<{
      events?: {
        dividends?: Record<string, { amount?: number; date?: number }>;
        splits?: Record<
          string,
          { date?: number; numerator?: number; denominator?: number; splitRatio?: string }
        >;
      };
    }>;
  };
};

const iso = (secs: unknown): string | null => {
  const n = Number(secs);
  if (!Number.isFinite(n) || n <= 0) return null;
  return new Date(n * 1000).toISOString();
};

export async function yahooCorporateActions(
  item: QuoteRequestItem,
): Promise<CorporateAction[]> {
  const symbol = toYahooSymbol(item);
  const body = await yahooJson<ChartBody>(
    `${CHART}/${encodeURIComponent(symbol)}?range=10y&interval=1d&events=div%2Csplit`,
  );
  const events = body?.chart?.result?.[0]?.events;
  if (!events) return [];

  const out: CorporateAction[] = [];

  for (const d of Object.values(events.dividends ?? {})) {
    const date = iso(d?.date);
    const amount = Number(d?.amount);
    if (!date) continue;
    out.push({
      type: "dividend",
      date,
      detail: Number.isFinite(amount) ? `${amount}` : "—",
      amount: Number.isFinite(amount) ? amount : null,
      ratio: null,
      source: "yahoo",
    });
  }

  for (const s of Object.values(events.splits ?? {})) {
    const date = iso(s?.date);
    if (!date) continue;
    const num = Number(s?.numerator);
    const den = Number(s?.denominator);
    const ratio =
      s?.splitRatio ??
      (Number.isFinite(num) && Number.isFinite(den) && den > 0 ? `${num}:${den}` : null);
    const isBonus = Number.isFinite(num) && Number.isFinite(den) && den === 1 && num > 1;
    out.push({
      type: isBonus ? "split" : "split",
      date,
      detail: ratio ?? "—",
      amount: null,
      ratio: ratio ?? null,
      source: "yahoo",
    });
  }

  out.sort((a, b) => (a.date < b.date ? 1 : -1));
  return out;
}
