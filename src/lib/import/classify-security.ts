/**
 * Universal Import Engine — security auto-classifier.
 *
 * Offline, rule based: infers asset class (category) and sub-category from an
 * ISIN, ticker and instrument name. No network calls, no ML.
 */

export type SecurityConfidence = "high" | "medium" | "low";

export type ClassifiedSecurity = {
  category: string;
  sub_category?: string;
  confidence: SecurityConfidence;
  reason: string;
};

const ETF_TICKERS = new Set([
  "NIFTYBEES", "GOLDBEES", "BANKBEES", "LIQUIDBEES", "SILVERBEES", "ITBEES",
  "PSUBNKBEES", "CPSE", "BHARAT22",
]);

const CRYPTO_TICKERS = new Set(["BTC", "ETH", "XRP", "SOL", "BNB", "ADA", "MATIC", "DOGE"]);

const clean = (v?: string | null) => (v == null ? "" : String(v).trim());

export function classifySecurity(input: {
  name?: string | null;
  symbol?: string | null;
  isin?: string | null;
}): ClassifiedSecurity | null {
  const name = clean(input.name);
  const lower = name.toLowerCase();
  const symbolRaw = clean(input.symbol).toUpperCase();
  const isin = clean(input.isin ?? input.symbol).toUpperCase().replace(/\s+/g, "");

  const nameHasEtf = /\b(etf|exchange traded)\b/.test(lower) || /bees\b/.test(lower);
  const nameHasBond = /\b(ncd|bond|bonds|debenture|debentures|g-sec|gsec|t-bill|tbill|sdl)\b/.test(lower);
  const nameHasGold = /\bgold\b/.test(lower);
  const nameHasSgb = /\b(sgb|sovereign gold)\b/.test(lower);

  /* ---------------- ISIN rules ---------------- */
  if (/^IN[EF][A-Z0-9]{9}$/.test(isin) || /^IN[0-9A-Z]{10}$/.test(isin)) {
    if (isin.startsWith("INF")) {
      if (nameHasEtf) return { category: "ETF", sub_category: nameHasGold ? "Gold ETF" : undefined, confidence: "high", reason: "ISIN INF with ETF in name" };
      return { category: "Mutual Fund", sub_category: undefined, confidence: "high", reason: "ISIN prefix INF (mutual fund)" };
    }
    if (isin.startsWith("INE")) {
      if (nameHasEtf) return { category: "ETF", sub_category: nameHasGold ? "Gold ETF" : undefined, confidence: "high", reason: "ISIN INE with ETF in name" };
      if (nameHasBond) return { category: "Bonds", confidence: "high", reason: "ISIN INE with bond in name" };
      return { category: "Stocks", sub_category: "Indian Equity", confidence: "high", reason: "ISIN prefix INE (listed equity)" };
    }
    if (isin.startsWith("IN0")) {
      return { category: "Bonds", sub_category: nameHasSgb ? "SGB" : "Government Security", confidence: "medium", reason: "ISIN IN0 (government security)" };
    }
  }
  if (/^[A-Z]{2}[A-Z0-9]{9}[0-9]$/.test(isin) && !isin.startsWith("IN")) {
    return { category: "International Stocks", sub_category: isin.slice(0, 2), confidence: "medium", reason: `Foreign ISIN (${isin.slice(0, 2)})` };
  }

  /* ---------------- Ticker rules ---------------- */
  const symbol = symbolRaw.replace(/[-.].*$/, "");
  if (ETF_TICKERS.has(symbol)) {
    if (symbol === "GOLDBEES") return { category: "Gold", sub_category: "ETF", confidence: "high", reason: "Gold ETF ticker" };
    if (symbol === "SILVERBEES") return { category: "ETF", sub_category: "Silver ETF", confidence: "high", reason: "Known ETF ticker" };
    return { category: "ETF", confidence: "high", reason: "Known ETF ticker" };
  }
  if (/^SGB[A-Z0-9]*$/.test(symbol) || nameHasSgb) {
    return { category: "Gold", sub_category: "SGB", confidence: "high", reason: "Sovereign Gold Bond" };
  }
  if (CRYPTO_TICKERS.has(symbol) || CRYPTO_TICKERS.has(symbol.replace(/(USD|USDT|INR)$/, ""))) {
    return { category: "Crypto", sub_category: symbol, confidence: "high", reason: "Known crypto ticker" };
  }

  /* ---------------- Name token rules ---------------- */
  if (nameHasGold && (nameHasEtf || /bees\b/.test(lower) || nameHasSgb || /\bbond\b/.test(lower))) {
    return { category: "Gold", sub_category: nameHasSgb ? "SGB" : "ETF", confidence: "medium", reason: "Gold instrument name" };
  }
  if (nameHasEtf) return { category: "ETF", confidence: "medium", reason: "ETF in instrument name" };
  if (nameHasBond) return { category: "Bonds", confidence: "medium", reason: "Bond keyword in name" };
  if (/\breit\b/.test(lower)) return { category: "REIT", confidence: "medium", reason: "REIT in name" };
  if (/\binvit\b/.test(lower)) return { category: "InvIT", confidence: "medium", reason: "InvIT in name" };
  if (/\b(fund|scheme|direct plan|folio)\b/.test(lower)) {
    return { category: "Mutual Fund", confidence: "low", reason: "Fund/scheme keyword in name" };
  }

  return null;
}

/* =========================================================
   Canonical asset-class normalisation
   ---------------------------------------------------------
   Broker/registrar exports carry free-form asset-class labels
   ("Equity - Small Cap", "Others - Index Funds/ETFs", "-").
   Holdings tabs bucket on the canonical WealthAce categories,
   so every imported category must be mapped onto one of them.
========================================================= */

export const CANONICAL_CATEGORIES = [
  "Stocks",
  "Mutual Funds",
  "ETFs",
  "Bonds",
  "Gold",
  "Commodities",
  "Crypto",
  "REIT",
  "InvIT",
  "Others",
] as const;

/** Map any classifier / file label onto a canonical category. Null = unknown. */
export function normalizeInvestmentCategory(raw?: string | null): string | null {
  const v = clean(raw).toLowerCase().replace(/\s+/g, " ");
  if (!v || /^[-–—.\/]+$/.test(v) || ["na", "n/a", "null", "unknown", "others", "other"].includes(v)) {
    return null;
  }
  if (/\b(reit|reits)\b/.test(v)) return "REIT";
  if (/\b(invit|invits)\b/.test(v)) return "InvIT";
  if (/crypto|bitcoin|ethereum/.test(v)) return "Crypto";
  if (/\b(bond|bonds|ncd|debenture|g-?sec|gsec|sdl|t-?bill|sgb|sovereign gold)\b/.test(v)) {
    return /sgb|sovereign gold/.test(v) ? "Gold" : "Bonds";
  }
  if (/gold|silver/.test(v)) return "Gold";
  if (/commodit/.test(v)) return "Commodities";
  // "fund" beats "etf": index-fund/ETF buckets in MF statements are schemes.
  if (/fund|scheme|elss|liquid|hybrid|flexi|multi asset|arbitrage|debt fund|sip/.test(v)) {
    return "Mutual Funds";
  }
  if (/etf|exchange traded|bees/.test(v)) return "ETFs";
  if (/stock|share|equity/.test(v)) return "Stocks";
  return null;
}
