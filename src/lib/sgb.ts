/** Sovereign Gold Bond detection — SGBs are priced via NSE GOLDBEES (1 unit ≈ 1g 24K). */
export function isSgb(inv: {
  name?: string | null;
  ticker?: string | null;
  symbol?: string | null;
  sub_category?: string | null;
}): boolean {
  const n = (inv.name ?? "").toLowerCase();
  const t = (inv.ticker ?? inv.symbol ?? "").toLowerCase();
  const sc = (inv.sub_category ?? "").toLowerCase();
  return (
    n.includes("sovereign gold bond") ||
    /\bsgb/.test(n) ||
    t.includes("sgb") ||
    sc === "sgb"
  );
}
