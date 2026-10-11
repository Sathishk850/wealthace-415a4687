// Upcoming quarterly results across the whole market (next 7 days).
// Fetched live from Yahoo's earnings calendar — nothing is stored, so past
// results simply drop out on the next fetch. Holdings/watchlist symbols are
// tagged so the user can spot their own companies.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UpcomingResult = {
  symbol: string;
  name: string;
  date: string; // YYYY-MM-DD (IST)
  source: "holding" | "watchlist" | "both" | "market";
};

type CalendarRow = {
  ticker?: string;
  companyshortname?: string;
  startdatetime?: string; // ISO timestamp
};

type CalendarResponse = {
  finance?: { result?: Array<{ documents?: Array<{ rows?: CalendarRow[] }> }> };
};

const istDate = (ms: number) =>
  new Date(ms + 5.5 * 3600_000).toISOString().slice(0, 10);

export const getUpcomingResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UpcomingResult[]> => {
    const { supabase } = context;

    // User's own symbols, for tagging.
    const [inv, wl] = await Promise.all([
      supabase
        .from("wealth_investments")
        .select("symbol, identifier, identifier_type, exchange, status")
        .in("identifier_type", ["stock_in", "stock_us"]),
      supabase.from("user_watchlist").select("symbol, category, market"),
    ]);

    const holdings = new Set<string>();
    const watchlist = new Set<string>();
    const key = (s: string) => s.toUpperCase().replace(/\.(NS|BO)$/i, "");

    for (const r of inv.data ?? []) {
      if (r.status && r.status !== "active") continue;
      const id = (r.identifier || r.symbol || "").trim();
      if (id) holdings.add(key(id));
    }
    for (const w of wl.data ?? []) {
      const s = (w.symbol || "").trim();
      if (!s || s.startsWith("^") || s.includes("=") || s.includes("-")) continue;
      watchlist.add(key(s));
    }

    // Market-wide earnings calendar for the next 7 days.
    const { yahooAuthedPost } = await import("./market/providers/yahoo-crumb.server");
    const now = Date.now();
    const today = istDate(now);
    const horizon = istDate(now + 7 * 86400_000);
    const mmddyyyy = (d: string) => {
      const [y, m, day] = d.split("-");
      return `${m}/${day}/${y}`;
    };

    const body = await yahooAuthedPost<CalendarResponse>(
      "https://query2.finance.yahoo.com/v1/finance/visualization",
      {
        size: 250,
        offset: 0,
        sortField: "intradaymarketcap",
        sortType: "DESC",
        quoteType: "EQUITY",
        query: {
          operator: "AND",
          operands: [
            { operator: "gte", operands: ["earningsDate", mmddyyyy(today)] },
            { operator: "lt", operands: ["earningsDate", mmddyyyy(istDate(now + 8 * 86400_000))] },
          ],
        },
        userId: "",
        userIdType: "guid",
      },
    );

    const rows = body?.finance?.result?.[0]?.documents?.[0]?.rows ?? [];
    const out: UpcomingResult[] = [];
    const seen = new Set<string>();

    for (const row of rows) {
      const ticker = (row.ticker ?? "").trim();
      if (!ticker || !row.startdatetime) continue;
      const date = istDate(Date.parse(row.startdatetime));
      if (date < today || date > horizon) continue; // drop past + far future
      const k = key(ticker);
      if (seen.has(`${k}:${date}`)) continue;
      seen.add(`${k}:${date}`);
      const isHolding = holdings.has(k);
      const isWatch = watchlist.has(k);
      out.push({
        symbol: k,
        name: (row.companyshortname ?? "").trim() || k,
        date,
        source: isHolding && isWatch ? "both" : isHolding ? "holding" : isWatch ? "watchlist" : "market",
      });
    }

    // Own companies first within each date, then by symbol.
    const rank = (s: UpcomingResult["source"]) => (s === "market" ? 1 : 0);
    out.sort((a, b) =>
      a.date !== b.date
        ? a.date < b.date
          ? -1
          : 1
        : rank(a.source) !== rank(b.source)
          ? rank(a.source) - rank(b.source)
          : a.symbol.localeCompare(b.symbol),
    );
    return out;
  });
