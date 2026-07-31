// Cache-aware quote service. Server-only.
// Reads latest from market_price_cache, refreshes stale entries from providers,
// writes back, and never overwrites cached values with 0/NaN/null.

import type { MarketQuote, QuoteRequestItem } from "./types";
import { fetchQuotes } from "./registry.server";
import { mfCacheTtlMs, stockCacheTtlMs } from "./calendar";

function ttlFor(item: QuoteRequestItem): number {
  if (item.identifier_type === "mf_in") return mfCacheTtlMs();
  return stockCacheTtlMs(item.exchange ?? null);
}

function isValid(price: number | null | undefined): price is number {
  return typeof price === "number" && Number.isFinite(price) && price > 0;
}

type SupabaseAdminModule = typeof import("@/integrations/supabase/client.server");

async function loadCache(items: QuoteRequestItem[]) {
  if (items.length === 0) return new Map<string, MarketQuote>();
  const mod: SupabaseAdminModule = await import("@/integrations/supabase/client.server");
  const { supabaseAdmin } = mod;
  const types = Array.from(new Set(items.map((i) => i.identifier_type)));
  const idents = Array.from(new Set(items.map((i) => i.identifier)));
  const { data, error } = await supabaseAdmin
    .from("market_price_cache")
    .select("identifier_type, identifier, latest_price, previous_close, currency, source, fetched_at, expires_at")
    .in("identifier_type", types)
    .in("identifier", idents);
  if (error) throw error;
  const map = new Map<string, MarketQuote>();
  // Hard drop from cache: stocks/crypto after 2h (fast-moving); MFs after 24h (single NAV/day).
  const HARD_MAX_STOCK_MS = 2 * 60 * 60 * 1000;
  const HARD_MAX_MF_MS = 24 * 60 * 60 * 1000;
  const nowMs = Date.now();
  for (const row of data ?? []) {
    const key = `${row.identifier_type}:${row.identifier}`;
    const fetchedAt = row.fetched_at as string;
    const ageMs = nowMs - new Date(fetchedAt).getTime();
    const maxAge = row.identifier_type === "mf_in" ? HARD_MAX_MF_MS : HARD_MAX_STOCK_MS;
    if (Number.isFinite(ageMs) && ageMs > maxAge) {
      // Too old — force a fresh fetch by not surfacing this row.
      continue;
    }
    map.set(key, {
      identifier_type: row.identifier_type as MarketQuote["identifier_type"],
      identifier: row.identifier as string,
      latest_price: row.latest_price == null ? null : Number(row.latest_price),
      previous_close: row.previous_close == null ? null : Number(row.previous_close),
      currency: (row.currency as string) ?? null,
      source: (row.source as string) ?? null,
      fetched_at: fetchedAt,
      server_fetched_at: fetchedAt,
      expires_at: (row.expires_at as string) ?? null,
      stale: !!row.expires_at && new Date(row.expires_at as string).getTime() < nowMs,
    });
  }
  return map;
}

async function upsertCache(quotes: MarketQuote[], ttls: Map<string, number>) {
  if (quotes.length === 0) return;
  const mod: SupabaseAdminModule = await import("@/integrations/supabase/client.server");
  const { supabaseAdmin } = mod;
  const rows = quotes
    .filter((q) => isValid(q.latest_price))
    .map((q) => {
      const key = `${q.identifier_type}:${q.identifier}`;
      const ttl = ttls.get(key) ?? 5 * 60 * 1000;
      return {
        identifier_type: q.identifier_type,
        identifier: q.identifier,
        latest_price: q.latest_price,
        previous_close: q.previous_close,
        currency: q.currency,
        source: q.source,
        fetched_at: q.fetched_at,
        expires_at: new Date(Date.now() + ttl).toISOString(),
      };
    });
  if (rows.length === 0) return;
  const { error } = await supabaseAdmin
    .from("market_price_cache")
    .upsert(rows, { onConflict: "identifier_type,identifier" });
  if (error) throw error;
}

/**
 * Also mirror the latest market price back to any wealth_investments rows
 * that reference the same identifier. This keeps the existing generated
 * current_value column (qty * current_price) fresh across the app without
 * touching purchase history (quantity / avg_price / purchase_date).
 */
async function mirrorToInvestments(quotes: MarketQuote[]) {
  if (quotes.length === 0) return;
  const mod: SupabaseAdminModule = await import("@/integrations/supabase/client.server");
  const { supabaseAdmin } = mod;
  const now = new Date().toISOString();
  await Promise.all(
    quotes
      .filter((q) => isValid(q.latest_price))
      .map((q) =>
        supabaseAdmin
          .from("wealth_investments")
          .update({
            current_price: q.latest_price,
            previous_close: q.previous_close ?? undefined,
            price_source: q.source ?? undefined,
            price_updated_at: now,
            last_updated: now.slice(0, 10),
          })
          .eq("identifier_type", q.identifier_type)
          .eq("identifier", q.identifier),
      ),
  );
}

export type GetQuotesOptions = {
  force?: boolean;
  mirror?: boolean; // also update wealth_investments rows
};

export async function getQuotes(
  requested: QuoteRequestItem[],
  opts: GetQuotesOptions = {},
): Promise<MarketQuote[]> {
  // Dedupe
  const seen = new Set<string>();
  const items = requested.filter((it) => {
    if (!it.identifier) return false;
    const key = `${it.identifier_type}:${it.identifier}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  if (items.length === 0) return [];

  console.log(`[market] getQuotes: ${items.length} unique instrument(s), force=${!!opts.force}`);

  const cache = await loadCache(items);

  const now = Date.now();
  const stale: QuoteRequestItem[] = [];
  const fresh: MarketQuote[] = [];

  for (const it of items) {
    const key = `${it.identifier_type}:${it.identifier}`;
    const cached = cache.get(key);
    const cachedFresh =
      cached &&
      isValid(cached.latest_price) &&
      cached.expires_at &&
      new Date(cached.expires_at).getTime() > now;
    if (!opts.force && cachedFresh && cached) {
      fresh.push(cached);
    } else {
      stale.push(it);
    }
  }

  console.log(`[market] cache hits=${fresh.length}, refresh=${stale.length}`);

  // Refresh stale
  let refreshed: MarketQuote[] = [];
  if (stale.length > 0) {
    try {
      refreshed = await fetchQuotes(stale);
    } catch (err) {
      console.error("[market] provider fetch failed", err);
      refreshed = [];
    }
  }

  // Identify invalid refreshed quotes and purge their cache rows so next fetch is forced.
  const invalidRefreshed = refreshed.filter((q) => !isValid(q.latest_price));
  refreshed = refreshed.filter((q) => {
    const ok = isValid(q.latest_price);
    if (!ok) console.warn(`[market] dropping invalid quote for ${q.identifier_type}:${q.identifier}`);
    return ok;
  });
  if (invalidRefreshed.length > 0) {
    try {
      const mod: SupabaseAdminModule = await import("@/integrations/supabase/client.server");
      const { supabaseAdmin } = mod;
      await Promise.all(
        invalidRefreshed.map((q) => {
          console.log(`[market] purging invalid cache for ${q.identifier_type}:${q.identifier}`);
          return supabaseAdmin
            .from("market_price_cache")
            .delete()
            .eq("identifier_type", q.identifier_type)
            .eq("identifier", q.identifier);
        }),
      );
    } catch (err) {
      console.error("[market] cache purge failed", err);
    }
  }

  // Variance guard: warn when price jumps >20% vs previous close (still returned, flagged in logs).
  for (const q of refreshed) {
    if (q.previous_close && q.previous_close > 0 && q.latest_price) {
      const variance = Math.abs((q.latest_price - q.previous_close) / q.previous_close);
      if (variance > 0.2) {
        console.warn(
          `[market] VARIANCE ${q.identifier_type}:${q.identifier} jumped ${(variance * 100).toFixed(1)}% from ${q.previous_close} to ${q.latest_price} (source=${q.source})`,
        );
      }
    }
  }

  // Merge: prefer refreshed valid values; fall back to prior cache if provider failed.
  const refreshedKeys = new Set(refreshed.map((q) => `${q.identifier_type}:${q.identifier}`));
  const finalStale: MarketQuote[] = refreshed.slice();
  for (const it of stale) {
    const key = `${it.identifier_type}:${it.identifier}`;
    if (refreshedKeys.has(key)) continue;
    const prior = cache.get(key);
    if (prior && isValid(prior.latest_price)) {
      finalStale.push({ ...prior, stale: true });
    }
  }


  // Write successfully refreshed values to cache
  if (refreshed.length > 0) {
    const ttls = new Map<string, number>();
    for (const it of stale) ttls.set(`${it.identifier_type}:${it.identifier}`, ttlFor(it));
    try {
      await upsertCache(refreshed, ttls);
    } catch (err) {
      console.error("cache upsert failed", err);
    }
    if (opts.mirror !== false) {
      try {
        await mirrorToInvestments(refreshed);
      } catch (err) {
        console.error("mirror to investments failed", err);
      }
    }
  }

  const responseNow = new Date().toISOString();
  const ONE_HOUR_MS = 60 * 60 * 1000;
  const nowMs = Date.now();
  return [...fresh, ...finalStale].map((q) => {
    const ageMs = nowMs - new Date(q.fetched_at).getTime();
    const potentiallyStale = Number.isFinite(ageMs) && ageMs > ONE_HOUR_MS;
    return {
      ...q,
      server_fetched_at: responseNow,
      stale: q.stale || potentiallyStale,
    };
  });
}
