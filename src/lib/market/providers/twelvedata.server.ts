// Twelve Data provider. Activates only when TWELVE_DATA_API_KEY is set.
// Kept as a scaffold so adding the key later requires no code changes.

import type { MarketQuote, QuoteRequestItem } from "../types";

export function isTwelveDataAvailable(): boolean {
  return !!process.env.TWELVE_DATA_API_KEY;
}

function toTwelveSymbol(item: QuoteRequestItem): string {
  if (item.identifier_type === "stock_in") {
    const ex = item.exchange === "BSE" ? "BSE" : "NSE";
    return `${item.identifier}:${ex}`;
  }
  return item.identifier;
}

export async function twelveDataQuotes(items: QuoteRequestItem[]): Promise<MarketQuote[]> {
  const key = process.env.TWELVE_DATA_API_KEY;
  if (!key || items.length === 0) return [];
  const symbolMap = new Map<string, QuoteRequestItem>();
  for (const it of items) symbolMap.set(toTwelveSymbol(it), it);
  const symbols = Array.from(symbolMap.keys()).join(",");
  const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbols)}&apikey=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`TwelveData HTTP ${res.status}`);
  const raw = (await res.json()) as unknown;
  const now = new Date().toISOString();
  const out: MarketQuote[] = [];
  const consume = (row: Record<string, unknown>, key: string | null) => {
    const sym = String(row.symbol ?? key ?? "");
    const req = symbolMap.get(sym);
    if (!req) return;
    const price = Number(row.close ?? row.price);
    const prev = Number(row.previous_close);
    if (!Number.isFinite(price) || price <= 0) return;
    out.push({
      identifier_type: req.identifier_type,
      identifier: req.identifier,
      latest_price: price,
      previous_close: Number.isFinite(prev) && prev > 0 ? prev : null,
      currency: (row.currency as string) ?? null,
      source: "twelvedata",
      fetched_at: now,
      expires_at: null,
      stale: false,
    });
  };
  if (Array.isArray(raw)) {
    for (const r of raw) if (r && typeof r === "object") consume(r as Record<string, unknown>, null);
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    if (obj.symbol) consume(obj, null);
    else for (const [k, v] of Object.entries(obj)) if (v && typeof v === "object") consume(v as Record<string, unknown>, k);
  }
  return out;
}
