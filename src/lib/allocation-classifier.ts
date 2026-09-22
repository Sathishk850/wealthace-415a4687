/**
 * Canonical asset-allocation classifier.
 *
 * Maps any holding (market investment, manual asset or account) onto one of
 * seven high-level allocation categories. Pure function, no side effects, so
 * every view that shows an allocation split can agree on the same buckets.
 */

export type AllocationCategory =
  | "Equity"
  | "Debt"
  | "Commodity"
  | "Real Estate"
  | "Crypto"
  | "Cash & Savings"
  | "Other";

export const ALLOCATION_CATEGORIES: AllocationCategory[] = [
  "Equity",
  "Debt",
  "Commodity",
  "Real Estate",
  "Crypto",
  "Cash & Savings",
  "Other",
];

export const ALLOCATION_COLORS: Record<AllocationCategory, string> = {
  Equity: "#00d4aa",
  Debt: "#4fa8e8",
  Commodity: "#f0a050",
  "Real Estate": "#e87070",
  Crypto: "#c87abe",
  "Cash & Savings": "#70c870",
  Other: "#888780",
};

const DEBT_NAME_RE = /debt|bond|liquid|credit risk|corporate|gilt|treasury|money market/i;

export type ClassifiableHolding = {
  asset_type?: string | null;
  category?: string | null;
  sub_category?: string | null;
  name?: string | null;
  ticker?: string | null;
  isin?: string | null;
};

export function classifyHolding(holding: ClassifiableHolding): AllocationCategory {
  const type = (holding.asset_type ?? "").toLowerCase().trim();
  const cat = (holding.category ?? "").toLowerCase().trim();
  const sub = (holding.sub_category ?? "").toLowerCase().trim();
  const name = `${holding.name ?? ""} ${holding.ticker ?? ""}`.toLowerCase();

  // --- INDEX FUNDS (decide before the generic equity list) ---
  if (["index-fund", "index fund"].includes(type)) {
    return DEBT_NAME_RE.test(name) || DEBT_NAME_RE.test(sub) ? "Debt" : "Equity";
  }

  // --- EQUITY ---
  if (
    [
      "direct-stock",
      "direct stock",
      "stock",
      "stocks",
      "equity-stock",
      "equity-etf",
      "equity etf",
      "etf",
      "etfs",
      "equity-mf",
      "equity mutual fund",
      "thematic-mf",
      "thematic mf",
      "elss",
      "hybrid-fund",
      "arbitrage-fund",
      "intl-mf",
      "international mf",
      "equity",
    ].includes(type)
  )
    return "Equity";
  if (["stocks", "etfs", "equity"].includes(cat)) return "Equity";
  if (sub === "equity") return "Equity";

  // --- CRYPTO (before commodity so crypto ETFs aren't caught by name rules) ---
  if (["crypto-coin", "crypto token", "crypto", "crypto-etf", "crypto etf"].includes(type))
    return "Crypto";
  if (cat === "crypto") return "Crypto";

  // --- COMMODITY ---
  if (
    [
      "physical-gold",
      "physical gold",
      "gold",
      "silver",
      "physical-silver",
      "physical silver",
      "gold-etf",
      "gold etf",
      "silver-etf",
      "silver etf",
      "sgb",
      "sovereign gold bond",
      "sgb-bond",
      "gold-mf",
      "gold mf",
      "commodity",
      "commodities",
      "commodity-mf",
    ].includes(type)
  )
    return "Commodity";
  if (["gold", "commodity", "commodities", "silver"].includes(cat)) return "Commodity";
  if (/\bgold\b|\bsilver\b|precious metal|commodity/i.test(name)) return "Commodity";

  // --- DEBT ---
  if (
    [
      "debt-fund",
      "debt mf",
      "liquid-fund",
      "liquid fund",
      "debt-etf",
      "debt etf",
      "bond",
      "bonds",
      "govt-bond",
      "government bond",
      "corporate-bond",
      "corporate bond",
      "tax-free-bond",
      "tax free bond",
      "tbill",
      "treasury bill",
      "nsc-kvp",
      "nsc",
      "kvp",
      "bank-fd",
      "bank fd",
      "fixed deposit",
      "corporate-fd",
      "corporate fd",
      "rd",
      "recurring deposit",
      "epf",
      "vpf",
      "epf-vpf",
      "epf / vpf",
      "ppf",
      "nps",
      "ssy",
      "sukanya samriddhi",
      "debt",
    ].includes(type)
  )
    return "Debt";
  if (["debt", "bonds", "fixed deposit", "epf", "ppf", "nps"].includes(cat)) return "Debt";

  // --- REAL ESTATE ---
  if (["property", "reit", "invit", "real estate", "real-estate"].includes(type))
    return "Real Estate";
  if (["real estate", "property", "reit", "invit"].includes(cat)) return "Real Estate";

  // --- CASH & SAVINGS ---
  if (
    [
      "savings-account",
      "savings account",
      "current-account",
      "current account",
      "cash-wallet",
      "cash",
      "wallet",
      "cash & savings",
      "bank",
    ].includes(type)
  )
    return "Cash & Savings";
  if (["cash & savings", "savings", "cash", "wallet", "bank"].includes(cat))
    return "Cash & Savings";

  // --- MUTUAL FUNDS (fall back on the fund name once nothing else matched) ---
  if (["mutual funds", "mutual fund", "mf"].includes(cat) || ["mutual-fund", "mf"].includes(type)) {
    return DEBT_NAME_RE.test(name) || DEBT_NAME_RE.test(sub) ? "Debt" : "Equity";
  }

  // --- LOAN GIVEN (an asset, not a liability — bucketed as Other) ---
  if (type === "loan-given" || type === "loan given") return "Other";

  return "Other";
}
