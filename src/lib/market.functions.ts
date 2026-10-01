// Public server-fn surface for the Market Data Service.
// Client modules ONLY call these — never providers directly.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type {
  CorporateAction,
  InstrumentFundamentals,
  MarketQuote,
  QuoteRequestItem,
  SearchResult,
} from "./market/types";


const identifierTypeSchema = z.enum(["stock_in", "stock_us", "mf_in", "crypto"]);

const quoteItemSchema = z.object({
  identifier_type: identifierTypeSchema,
  identifier: z.string().min(1),
  exchange: z.string().nullable().optional(),
});

const getQuotesSchema = z.object({
  items: z.array(quoteItemSchema).max(200),
  force: z.boolean().optional(),
});

export const getMarketQuotes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => getQuotesSchema.parse(input))
  .handler(async ({ data }): Promise<MarketQuote[]> => {
    const { getQuotes } = await import("./market/service.server");
    const items: QuoteRequestItem[] = data.items.map((i) => ({
      identifier_type: i.identifier_type,
      identifier: i.identifier,
      exchange: i.exchange ?? null,
    }));
    return getQuotes(items, { force: data.force, mirror: true });
  });

const searchSchema = z.object({
  query: z.string().min(1),
  kind: identifierTypeSchema,
});

export const searchInstruments = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => searchSchema.parse(input))
  .handler(async ({ data }): Promise<SearchResult[]> => {
    const { searchInstrument } = await import("./market/registry.server");
    try {
      return await searchInstrument(data.query, data.kind);
    } catch (err) {
      console.error("searchInstruments failed", err);
      return [];
    }
  });

/**
 * Refresh all active linked holdings for the current user.
 * Reads the caller's investments (RLS-scoped), refreshes cache + mirrors back.
 */
export const refreshMyHoldings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ refreshed: number; total: number }> => {
    const { supabase } = context;
    const { isSgb } = await import("./sgb");
    const { data: rows, error } = await supabase
      .from("wealth_investments")
      .select("id, name, symbol, sub_category, identifier_type, identifier, exchange, status");
    if (error) throw error;

    const items: QuoteRequestItem[] = [];
    const seen = new Set<string>();
    const sgbIds: string[] = [];
    for (const r of rows ?? []) {
      if ((r.status ?? "active") !== "active") continue;
      if (isSgb(r)) {
        sgbIds.push(r.id as string);
        continue;
      }
      if (!r.identifier || !r.identifier_type) continue;
      const key = `${r.identifier_type}:${r.identifier}`;
      if (seen.has(key)) continue;
      seen.add(key);
      items.push({
        identifier_type: r.identifier_type as QuoteRequestItem["identifier_type"],
        identifier: r.identifier as string,
        exchange: (r.exchange as string) ?? null,
      });
    }

    if (items.length === 0 && sgbIds.length === 0) return { refreshed: 0, total: 0 };

    const { getQuotes } = await import("./market/service.server");
    let refreshed = 0;
    if (items.length > 0) {
      const quotes = await getQuotes(items, { force: true, mirror: true });
      refreshed += quotes.filter((q) => q.latest_price != null).length;
    }

    // SGBs: 1 unit = 1 gram of gold → price via the NSE GOLDBEES ETF.
    if (sgbIds.length > 0) {
      const [gb] = await getQuotes(
        [{ identifier_type: "stock_in", identifier: "GOLDBEES", exchange: "NSE" }],
        { force: true },
      );
      const price = gb?.latest_price ?? null;
      if (price && price > 0) {
        const { error: upErr } = await supabase
          .from("wealth_investments")
          .update({
            current_price: price,
            previous_close: gb.previous_close ?? null,
            price_source: "GOLDBEES",
            price_updated_at: new Date().toISOString(),
          })
          .in("id", sgbIds);
        if (!upErr) refreshed += sgbIds.length;
      }
    }
    return { refreshed, total: items.length + sgbIds.length };
  });

const fundamentalsSchema = z.object({
  identifier_type: identifierTypeSchema,
  identifier: z.string().min(1),
  exchange: z.string().nullable().optional(),
});

/** Auto-fetched, read-only fundamentals + classification for one instrument. */
export const getInstrumentFundamentals = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => fundamentalsSchema.parse(input))
  .handler(async ({ data }): Promise<InstrumentFundamentals | null> => {
    try {
      if (data.identifier_type === "mf_in") {
        const { mfapiFundamentals } = await import(
          "./market/providers/mfapi-fundamentals.server"
        );
        return await mfapiFundamentals({
          identifier_type: data.identifier_type,
          identifier: data.identifier,
          exchange: data.exchange ?? null,
        });
      }
      const { yahooFundamentals } = await import("./market/providers/yahoo-fundamentals.server");
      return await yahooFundamentals({
        identifier_type: data.identifier_type,
        identifier: data.identifier,
        exchange: data.exchange ?? null,
      });
    } catch (err) {
      console.error("getInstrumentFundamentals failed", err);
      return null;
    }
  });

/** Auto-fetched corporate actions (dividends, splits) for one instrument. */
export const getCorporateActions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => fundamentalsSchema.parse(input))
  .handler(async ({ data }): Promise<CorporateAction[]> => {
    try {
      if (data.identifier_type === "mf_in") return [];
      const { yahooCorporateActions } = await import(
        "./market/providers/yahoo-actions.server"
      );
      return await yahooCorporateActions({
        identifier_type: data.identifier_type,
        identifier: data.identifier,
        exchange: data.exchange ?? null,
      });
    } catch (err) {
      console.error("getCorporateActions failed", err);
      return [];
    }
  });
