// Static curated list of NSE-listed REITs, InvITs and commodity ETFs plus a few
// global commodity proxies. Provider search engines index these inconsistently,
// so we merge these known instruments into search results client-side.
// Client-safe: plain data only.

import type { SearchResult } from "./types";

type Listed = {
  identifier: string;
  name: string;
  kind: "reit" | "invit" | "commodity";
  identifier_type: "stock_in" | "stock_us";
  exchange: string;
  currency: string;
};

export const INDIA_LISTED: Listed[] = [
  // ---------- REITs (NSE) ----------
  { identifier: "EMBASSY", name: "Embassy Office Parks REIT", kind: "reit", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },
  { identifier: "MINDSPACE", name: "Mindspace Business Parks REIT", kind: "reit", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },
  { identifier: "BIRET", name: "Brookfield India Real Estate Trust REIT", kind: "reit", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },
  { identifier: "NXST", name: "Nexus Select Trust REIT", kind: "reit", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },

  // ---------- InvITs (NSE) ----------
  { identifier: "PGINVIT", name: "PowerGrid Infrastructure Investment Trust (InvIT)", kind: "invit", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },
  { identifier: "IRBINVIT", name: "IRB InvIT Fund", kind: "invit", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },
  { identifier: "INDIGRID", name: "IndiGrid Infrastructure Trust (InvIT)", kind: "invit", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },

  // ---------- Commodity ETFs (NSE) ----------
  { identifier: "GOLD1", name: "ICICI Prudential Gold ETF", kind: "commodity", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },
  { identifier: "GOLDIETF", name: "Nippon India Gold ETF (GoldIETF)", kind: "commodity", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },
  { identifier: "GOLDBEES", name: "Nippon India ETF Gold BeES", kind: "commodity", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },
  { identifier: "SILVERBEES", name: "Nippon India Silver ETF (Silver BeES)", kind: "commodity", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },
  { identifier: "HDFCGOLD", name: "HDFC Gold Exchange Traded Fund", kind: "commodity", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },
  { identifier: "SETFGOLD", name: "SBI Gold ETF", kind: "commodity", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },
  { identifier: "AXISGOLD", name: "Axis Gold ETF", kind: "commodity", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },
  { identifier: "HDFCSILVER", name: "HDFC Silver ETF", kind: "commodity", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },
  { identifier: "SILVER", name: "ICICI Prudential Silver ETF", kind: "commodity", identifier_type: "stock_in", exchange: "NSE", currency: "INR" },

  // ---------- Global commodity proxies (US) ----------
  { identifier: "GLD", name: "SPDR Gold Shares (Gold ETF)", kind: "commodity", identifier_type: "stock_us", exchange: "US", currency: "USD" },
  { identifier: "IAU", name: "iShares Gold Trust", kind: "commodity", identifier_type: "stock_us", exchange: "US", currency: "USD" },
  { identifier: "SLV", name: "iShares Silver Trust (Silver ETF)", kind: "commodity", identifier_type: "stock_us", exchange: "US", currency: "USD" },
  { identifier: "USO", name: "United States Oil Fund (Crude Oil ETF)", kind: "commodity", identifier_type: "stock_us", exchange: "US", currency: "USD" },
  { identifier: "DBA", name: "Invesco DB Agriculture Fund (Agri Commodity ETF)", kind: "commodity", identifier_type: "stock_us", exchange: "US", currency: "USD" },
  { identifier: "DBC", name: "Invesco DB Commodity Index Tracking Fund", kind: "commodity", identifier_type: "stock_us", exchange: "US", currency: "USD" },
];

/** Search the curated list. `kinds` narrows to REIT / InvIT / commodity. */
export function searchIndiaListed(
  query: string,
  kinds?: Array<Listed["kind"]>,
): SearchResult[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return INDIA_LISTED.filter((l) => {
    if (kinds && !kinds.includes(l.kind)) return false;
    return l.identifier.toLowerCase().includes(q) || l.name.toLowerCase().includes(q);
  }).map((l) => ({
    identifier_type: l.identifier_type,
    identifier: l.identifier,
    name: l.name,
    exchange: l.exchange,
    currency: l.currency,
    meta: { curatedKind: l.kind },
  }));
}

/** Best-effort kind lookup for an already-linked identifier. */
export function curatedKindFor(identifier: string | null | undefined) {
  if (!identifier) return null;
  const hit = INDIA_LISTED.find((l) => l.identifier.toLowerCase() === identifier.toLowerCase());
  return hit?.kind ?? null;
}
