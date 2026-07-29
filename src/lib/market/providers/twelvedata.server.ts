// Twelve Data provider. Activates only when TWELVE_DATA_API_KEY is set.
// Kept as a scaffold so adding the key later requires no code changes.

import type { MarketQuote, QuoteRequestItem } from "../types";
import { fetchWithTimeout, normalizeCurrency, normalizePrice } from "../normalize";

const TIMEOUT_MS = 15_000;

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

  console.log(`[twelvedata] fetching ${symbolMap.size} symbols`);

  let res: Response;
  try {
    res = await fetchWithTimeout(url, {}, TIMEOUT_MS);
  } catch (err) {
    console.error("[twelvedata] network error", err);
    return [];
  }
  if (!res.ok) {
    console.error(`[twelvedata] HTTP ${res.status}`);
    return [];
  }
  let raw: unknown;
  try {
    raw = await res.json();
  } catch (err) {
    console.error("[twelvedata] malformed JSON", err);
    return [];
  }

  const now = new Date().toISOString();
  const out: MarketQuote[] = [];
  const consume = (row: Record<string, unknown>, keyHint: string | null) => {
    // API-level error rows: { code, message, status: "error" }
    if (row.status === "error" || row.code) {
      console.error(`[twelvedata] symbol error ${keyHint ?? row.symbol}:`, row.message ?? row.code);
      return;
    }
    // Prefer the request keyHint (e.g. "HDFC:NSE") because the batch response
    // sometimes strips the exchange suffix on `row.symbol`, causing lookup misses.
    const rowSym = String(row.symbol ?? "");
    const req =
      (keyHint && symbolMap.get(keyHint)) ||
      symbolMap.get(rowSym) ||
      // Last resort: match by bare identifier when exchange suffix is missing.
      (rowSym ? Array.from(symbolMap.values()).find((r) => r.identifier === rowSym) : undefined);
    if (!req) {
      console.warn(`[twelvedata] no request match for response symbol="${rowSym}" keyHint="${keyHint}"`);
      return;
    }
    const price = normalizePrice(row.close ?? row.price);
    if (price == null) {
      console.warn(`[twelvedata] invalid price for ${keyHint ?? rowSym}:`, row.close ?? row.price);
      return;
    }
    const prev = normalizePrice(row.previous_close);
    console.log(
      `[twelvedata] ${req.identifier_type}:${req.identifier} → ${price} (prev ${prev ?? "-"}) via "${keyHint ?? rowSym}"`,
    );
    out.push({
      identifier_type: req.identifier_type,
      identifier: req.identifier,
      latest_price: price,
      previous_close: prev,
      currency: normalizeCurrency(row.currency),
      source: "twelvedata",
      fetched_at: now,
      server_fetched_at: now,
      expires_at: null,
      stale: false,
    });
  };
  if (Array.isArray(raw)) {
    for (const r of raw) if (r && typeof r === "object") consume(r as Record<string, unknown>, null);
  } else if (raw && typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    // Single-symbol response
    if (symbolMap.size === 1 && (obj.symbol || obj.close || obj.price)) {
      consume(obj, Array.from(symbolMap.keys())[0] ?? null);
    } else if (obj.symbol || obj.close || obj.price) {
      consume(obj, null);
    } else {
      for (const [k, v] of Object.entries(obj)) if (v && typeof v === "object") consume(v as Record<string, unknown>, k);
    }
  }
  console.log(`[twelvedata] resolved ${out.length}/${symbolMap.size} quotes`);
  return out;
}
