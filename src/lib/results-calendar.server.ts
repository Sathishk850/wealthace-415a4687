import { istDate, parseNseRows, type ResultRow } from "./results";
import { yahooAuthedPost } from "./market/providers/yahoo-crumb.server";

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const dated = (d: string) => d.split("-").reverse().join("-");

export async function fetchNseResults(today: string, horizon: string, fetcher: typeof fetch = fetch) {
  let cookie = "";
  async function prime() {
    const r = await fetcher("https://www.nseindia.com/", { headers: { "User-Agent": UA, Accept: "text/html" }, signal: AbortSignal.timeout(12_000) });
    if (!r.ok) throw new Error(`NSE session HTTP ${r.status}`);
    const headers = r.headers as Headers & { getSetCookie?: () => string[] };
    const cookies = headers.getSetCookie?.() ?? (headers.get("set-cookie") ?? "").split(/,(?=\s*[^;,=\s]+=)/);
    cookie = cookies.map(c => c.split(";")[0].trim()).filter(Boolean).join("; ");
    await r.body?.cancel();
  }
  try { await prime(); } catch (e) { console.warn("[results] NSE session prime failed", String(e)); }
  async function feed(path: string): Promise<ResultRow[] | null> {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        if (attempt) await prime();
        const url = new URL(`https://www.nseindia.com/api/${path}`);
        url.searchParams.set("from_date", dated(today));
        url.searchParams.set("to_date", dated(horizon));
        if (path === "corporate-board-meetings") url.searchParams.set("index", "equities");
        const r = await fetcher(url, { headers: { "User-Agent": UA, Accept: "application/json", Referer: "https://www.nseindia.com/", ...(cookie ? { Cookie: cookie } : {}) }, signal: AbortSignal.timeout(12_000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const body: unknown = await r.json();
        if (!Array.isArray(body)) throw new Error("Unexpected NSE calendar response");
        return parseNseRows(body);
      } catch (e) { console.warn(`[results] NSE ${path} attempt ${attempt + 1} failed`, String(e)); }
    }
    return null;
  }
  const [calendar, meetings] = await Promise.all([feed("event-calendar"), feed("corporate-board-meetings")]);
  return { rows: [...(calendar ?? []), ...(meetings ?? [])], available: calendar !== null || meetings !== null };
}

export async function fetchResultsCalendar(now = Date.now()) {
  const today = istDate(now), horizon = istDate(now + 7 * 86_400_000);
  const india = fetchNseResults(today, horizon);
  const us = (async () => {
    const rows: ResultRow[] = [];
    // Page through market-wide results; timestamps are converted to IST only after retrieval.
    for (let offset = 0; offset < 2500; offset += 250) {
      const body = await yahooAuthedPost<{ finance?: { result?: { documents?: { rows?: (Record<string, unknown> | unknown[])[] }[] }[] } }>(
        "https://query1.finance.yahoo.com/v1/finance/visualization?lang=en-US&region=US",
        { sortType: "DESC", entityIdType: "earnings", sortField: "intradaymarketcap", includeFields: ["ticker", "companyshortname", "startdatetime"], size: 250, offset,
          query: { operator: "and", operands: [{ operator: "eq", operands: ["region", "us"] }, { operator: "gte", operands: ["startdatetime", new Date(now - 86_400_000).toISOString().slice(0,10)] }, { operator: "lt", operands: ["startdatetime", new Date(now + 8 * 86_400_000).toISOString().slice(0,10)] }] } });
      if (!body) { console.warn("[results] US earnings feed unavailable", { offset }); return { rows, available: false }; }
      const page = body.finance?.result?.[0]?.documents?.[0]?.rows ?? [];
      for (const raw of page) {
        const r = Array.isArray(raw) ? { ticker: raw[0], companyshortname: raw[1], startdatetime: raw[2] } : raw;
        const timestamp = Date.parse(String(r.startdatetime));
        if (!r.ticker || !Number.isFinite(timestamp)) continue;
        const date = istDate(timestamp);
        if (date >= today && date <= horizon) rows.push({ symbol: String(r.ticker), name: String(r.companyshortname ?? r.ticker), date, market: "US" });
      }
      if (page.length < 250) break;
    }
    return { rows, available: true };
  })();
  const [nse, yahoo] = await Promise.all([india, us]);
  return { rows: [...nse.rows, ...yahoo.rows], indiaAvailable: nse.available, usAvailable: yahoo.available, today, horizon };
}