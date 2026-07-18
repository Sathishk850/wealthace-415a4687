// Pure client-side helpers to derive portfolio values from a holding + latest quote.
// No side effects, no imports of server code.

import type { Investment } from "@/lib/wealth-api";
import type { MarketQuote } from "./types";

export type DerivedHolding = {
  current_price: number;
  invested: number;
  current_value: number;
  unrealized_pl: number;
  return_pct: number;
  day_change: number | null;
  day_change_pct: number | null;
  source: string | null;
  as_of: string | null;
  has_live: boolean;
};

function num(n: unknown, fb = 0): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : fb;
}

export function deriveHolding(inv: Investment, quote?: MarketQuote | null): DerivedHolding {
  const qty = num(inv.quantity);
  const avg = num(inv.avg_price);
  const invested = num(inv.invested_value, qty * avg);
  const liveOk = quote && quote.latest_price != null && quote.latest_price > 0;
  const price = liveOk ? Number(quote!.latest_price) : num(inv.current_price, avg);
  const current_value = qty * price;
  const unrealized_pl = current_value - invested;
  const return_pct = invested > 0 ? (unrealized_pl / invested) * 100 : 0;
  const prev = liveOk && quote?.previous_close && quote.previous_close > 0 ? Number(quote.previous_close) : null;
  const day_change = prev != null ? (price - prev) * qty : null;
  const day_change_pct = prev != null && prev > 0 ? ((price - prev) / prev) * 100 : null;
  return {
    current_price: price,
    invested,
    current_value,
    unrealized_pl,
    return_pct,
    day_change,
    day_change_pct,
    source: liveOk ? quote!.source : inv.price_source ?? null,
    as_of: liveOk ? quote!.fetched_at : inv.price_updated_at ?? null,
    has_live: !!liveOk,
  };
}

export function investmentQuoteKey(inv: Pick<Investment, "identifier_type" | "identifier">): string | null {
  if (!inv.identifier_type || !inv.identifier) return null;
  return `${inv.identifier_type}:${inv.identifier}`;
}
