/** Browser-safe earnings dates and alert rules. All calendar days use IST. */
export type ResultRow = { symbol: string; name: string; date: string; market: "India" | "US" };
export type UpcomingResult = ResultRow & { source: "holding" | "watchlist" | "both" | "market" };
export type ResultsResponse = { results: UpcomingResult[]; indiaAvailable: boolean; usAvailable: boolean; today: string };
export const istDate = (ms: number) => new Date(ms + 19_800_000).toISOString().slice(0, 10);
export const resultKey = (s: string) => s.trim().toUpperCase().replace(/\.(NS|BO)$/i, "");
export const resultRank = (s: UpcomingResult["source"]) => s === "holding" || s === "both" ? 0 : s === "watchlist" ? 1 : 2;
export function nseDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const m = raw.match(/^(\d{1,2})-([A-Za-z]{3}|\d{2})-(\d{4})/);
  if (!m) return null;
  const months = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
  const month = /^\d{2}$/.test(m[2]) ? Number(m[2]) : months.indexOf(m[2].toLowerCase()) + 1;
  const day = Number(m[1]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `${m[3]}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}
export function parseNseRows(rows: Record<string, unknown>[]): ResultRow[] {
  return rows.flatMap(r => {
    const symbol = r.symbol ?? r.bm_symbol;
    const purpose = r.purpose ?? r.bm_purpose;
    const date = nseDate(r.date ?? r.bm_date);
    if (typeof symbol !== "string" || !date || !/result/i.test(String(purpose ?? ""))) return [];
    return [{ symbol: resultKey(symbol), name: String(r.company ?? r.bm_company ?? r.sm_name ?? symbol), date, market: "India" as const }];
  });
}
export function tagResults(rows: ResultRow[], holdings: Set<string>, watchlist: Set<string>, today: string, horizon: string): UpcomingResult[] {
  const seen = new Set<string>();
  const results: UpcomingResult[] = [];
  for (const r of rows) {
    if (r.date < today || r.date > horizon) continue;
    const symbol = resultKey(r.symbol);
    const id = `${symbol}:${r.date}`;
    if (seen.has(id)) continue;
    seen.add(id);
    const h = holdings.has(`${r.market}:${symbol}`), w = watchlist.has(`${r.market}:${symbol}`);
    results.push({ ...r, symbol, source: h && w ? "both" : h ? "holding" : w ? "watchlist" : "market" });
  }
  return results.sort((a, b) => a.date.localeCompare(b.date) || resultRank(a.source) - resultRank(b.source) || a.symbol.localeCompare(b.symbol));
}
export function resultSlot(now: Date): { slot: "evening" | "morning"; date: string } | null {
  const hour = new Date(now.getTime() + 19_800_000).getUTCHours();
  if (hour === 18) return { slot: "evening", date: istDate(now.getTime() + 86_400_000) };
  if (hour === 8) return { slot: "morning", date: istDate(now.getTime()) };
  return null;
}
export function resultBatches(rows: UpcomingResult[]): UpcomingResult[][] {
  const ordered = [...rows].sort((a,b) => resultRank(a.source) - resultRank(b.source) || a.symbol.localeCompare(b.symbol));
  return ordered.length > 3 ? [ordered] : ordered.map(r => [r]);
}
export function resultChannels(prefs: { channels?: Record<string, boolean>; per_type?: Record<string, unknown> } | null) {
  const types = prefs?.per_type ?? {};
  const override = types.q_results as Record<string, boolean> | undefined;
  const enabled = types["alert:q_results"] !== false;
  return { in_app: enabled && (override?.in_app ?? prefs?.channels?.in_app ?? true), push: enabled && (override?.push ?? prefs?.channels?.push ?? false) };
}