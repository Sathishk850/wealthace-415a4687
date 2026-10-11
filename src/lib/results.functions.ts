// Upcoming quarterly results for the user's holdings + watchlist.
// Computed live from Yahoo calendarEvents — nothing is stored, so past
// results simply drop out on the next fetch.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type UpcomingResult = {
  symbol: string;
  name: string;
  date: string; // YYYY-MM-DD (IST)
  source: "holding" | "watchlist" | "both";
};

type Calendar = {
  quoteSummary?: {
    result?: Array<{
      calendarEvents?: { earnings?: { earningsDate?: Array<{ raw?: number }> } };
    }>;
  };
};

const istDate = (ms: number) =>
  new Date(ms + 5.5 * 3600_000).toISOString().slice(0, 10);

export const getUpcomingResults = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UpcomingResult[]> => {
    const { supabase } = context;
    const [inv, wl] = await Promise.all([
      supabase
        .from("wealth_investments")
        .select("name, symbol, identifier, identifier_type, exchange, status")
        .in("identifier_type", ["stock_in", "stock_us"]),
      supabase.from("user_watchlist").select("symbol, name, category, market"),
    ]);

    const map = new Map<string, { name: string; holding: boolean; watch: boolean }>();
    const add = (ysym: string, name: string, kind: "holding" | "watch") => {
      const k = ysym.toUpperCase();
      const cur = map.get(k) ?? { name, holding: false, watch: false };
      if (kind === "holding") cur.holding = true;
      else cur.watch = true;
      map.set(k, cur);
    };

    for (const r of inv.data ?? []) {
      if (r.status && r.status !== "active") continue;
      const id = (r.identifier || r.symbol || "").trim();
      if (!id) continue;
      const ysym =
        r.identifier_type === "stock_in" && !/\.(NS|BO)$/i.test(id)
          ? `${id}${r.exchange === "BSE" ? ".BO" : ".NS"}`
          : id;
      add(ysym, r.name, "holding");
    }
    for (const w of wl.data ?? []) {
      const s = (w.symbol || "").trim();
      if (!s || s.startsWith("^") || s.includes("=") || s.includes("-")) continue;
      const cat = (w.category || "").toLowerCase();
      if (cat && !/stock|equity|share|in|us/.test(cat)) continue;
      const mkt = (w.market || "").toUpperCase();
      const ysym = s.includes(".") || mkt === "US" || mkt === "NASDAQ" || mkt === "NYSE" ? s : `${s}.NS`;
      add(ysym, w.name, "watch");
    }

    const { yahooAuthedJson } = await import("./market/providers/yahoo-crumb.server");
    const now = Date.now();
    const today = istDate(now);
    const horizon = istDate(now + 7 * 86400_000);
    const entries = [...map.entries()].slice(0, 80);
    const out: UpcomingResult[] = [];

    for (let i = 0; i < entries.length; i += 8) {
      await Promise.all(
        entries.slice(i, i + 8).map(async ([sym, meta]) => {
          const body = await yahooAuthedJson<Calendar>(
            `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${encodeURIComponent(sym)}?modules=calendarEvents`,
          );
          const dates = body?.quoteSummary?.result?.[0]?.calendarEvents?.earnings?.earningsDate ?? [];
          const raw = dates.map((d) => Number(d.raw)).filter((n) => n > 0).sort()[0];
          if (!raw) return;
          const date = istDate(raw * 1000);
          if (date < today || date > horizon) return; // drop past + far future
          out.push({
            symbol: sym.replace(/\.(NS|BO)$/i, ""),
            name: meta.name,
            date,
            source: meta.holding && meta.watch ? "both" : meta.holding ? "holding" : "watchlist",
          });
        }),
      );
    }
    out.sort((a, b) => (a.date === b.date ? a.symbol.localeCompare(b.symbol) : a.date < b.date ? -1 : 1));
    return out;
  });
