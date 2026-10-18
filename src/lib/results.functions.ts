// Shared authenticated quarterly-results read. Fetchers live in server-only modules.
import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resultKey, tagResults, type ResultsResponse } from "./results";
export type { UpcomingResult } from "./results";

export const getUpcomingResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<ResultsResponse> => {
    const [inv, wl] = await Promise.all([
      context.supabase.from("wealth_investments").select("symbol, identifier, identifier_type, exchange, status").in("identifier_type", ["stock_in", "stock_us"]),
      context.supabase.from("user_watchlist").select("symbol, category, market"),
    ]);
    if (inv.error || wl.error) throw new Error(inv.error?.message ?? wl.error?.message);
    const holdings = new Set<string>(), watchlist = new Set<string>();
    for (const r of inv.data ?? []) {
      if (r.status && r.status !== "active") continue;
      const id = r.identifier || r.symbol;
      if (id) holdings.add(`${r.identifier_type === "stock_us" ? "US" : "India"}:${resultKey(id)}`);
    }
    for (const w of wl.data ?? []) {
      if (!w.symbol || w.symbol.startsWith("^") || w.symbol.includes("=")) continue;
      watchlist.add(`${/\.(NS|BO)$/i.test(w.symbol) || /^(india|in|nse|bse)$/i.test(w.market ?? "") || w.category === "stock_in" ? "India" : "US"}:${resultKey(w.symbol)}`);
    }
    const { fetchResultsCalendar } = await import("./results-calendar.server");
    const calendar = await fetchResultsCalendar();
    return { results: tagResults(calendar.rows, holdings, watchlist, calendar.today, calendar.horizon), indiaAvailable: calendar.indiaAvailable, usAvailable: calendar.usAvailable, today: calendar.today };
  });
