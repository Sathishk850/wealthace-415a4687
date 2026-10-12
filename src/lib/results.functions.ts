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

    // Market-wide calendars for the next 7 days: NSE (India) + Yahoo (US).
    const now = Date.now();
    const today = istDate(now);
    const horizon = istDate(now + 7 * 86400_000);
    const utcDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);
    const UA =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
    const MONTHS: Record<string, string> = {
      Jan: "01", Feb: "02", Mar: "03", Apr: "04", May: "05", Jun: "06",
      Jul: "07", Aug: "08", Sep: "09", Oct: "10", Nov: "11", Dec: "12",
    };

    const fetchNse = async (): Promise<Array<{ symbol: string; name: string; date: string }>> => {
      try {
        const res = await fetch("https://www.nseindia.com/api/event-calendar", {
          headers: { "User-Agent": UA, Accept: "application/json", Referer: "https://www.nseindia.com/" },
        });
        if (!res.ok) return [];
        const list = (await res.json()) as Array<{ symbol?: string; company?: string; purpose?: string; date?: string }>;
        return list
          .filter((e) => /result/i.test(e.purpose ?? "") && e.symbol && e.date)
          .map((e) => {
            const [dd, mon, yyyy] = (e.date as string).split("-");
            return { symbol: e.symbol as string, name: e.company ?? (e.symbol as string), date: `${yyyy}-${MONTHS[mon] ?? "01"}-${dd.padStart(2, "0")}` };
          });
      } catch (err) {
        console.warn("[results] NSE calendar failed", err);
        return [];
      }
    };

    const fetchUs = async (): Promise<Array<{ symbol: string; name: string; date: string }>> => {
      const { yahooAuthedPost } = await import("./market/providers/yahoo-crumb.server");
      const body = await yahooAuthedPost<CalendarResponse>(
        "https://query1.finance.yahoo.com/v1/finance/visualization?lang=en-US&region=US",
        {
          sortType: "DESC",
          entityIdType: "earnings",
          sortField: "intradaymarketcap",
          includeFields: ["ticker", "companyshortname", "startdatetime"],
          size: 250,
          offset: 0,
          query: {
            operator: "and",
            operands: [
              { operator: "eq", operands: ["region", "us"] },
              { operator: "gte", operands: ["startdatetime", utcDay(now - 86400_000)] },
              { operator: "lt", operands: ["startdatetime", utcDay(now + 8 * 86400_000)] },
            ],
          },
        },
      );
      const rows = body?.finance?.result?.[0]?.documents?.[0]?.rows ?? [];
      return rows
        .map((r) => (Array.isArray(r) ? { ticker: r[0], companyshortname: r[1], startdatetime: r[2] } : r))
        .filter((r) => r.ticker && r.startdatetime && !/[.-]/.test(r.ticker))
        .map((r) => ({
          symbol: String(r.ticker),
          name: String(r.companyshortname ?? r.ticker),
          date: istDate(Date.parse(String(r.startdatetime))),
        }));
    };

    const [nse, us] = await Promise.all([fetchNse(), fetchUs()]);
    const out: UpcomingResult[] = [];
    const seen = new Set<string>();

    for (const row of [...nse, ...us]) {
      if (row.date < today || row.date > horizon) continue; // drop past + far future
      const k = key(row.symbol);
      if (seen.has(`${k}:${row.date}`)) continue;
      seen.add(`${k}:${row.date}`);
      const isHolding = holdings.has(k);
      const isWatch = watchlist.has(k);
      out.push({
        symbol: k,
        name: row.name.trim() || k,
        date: row.date,
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
