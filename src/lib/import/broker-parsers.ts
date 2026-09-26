import type { InvestmentInput } from "@/lib/wealth-api";

export type BrokerRow = InvestmentInput & {
  _broker: string;
  _isin: string | null;
  /** Preview-only values; not stored columns. */
  invested_value?: number | null;
  current_value?: number | null;
};

export type DetectionResult =
  | { matched: true; broker: string; parse: (raw: Record<string, unknown>[]) => BrokerRow[] }
  | { matched: false };

function get(row: Record<string, unknown>, ...keys: string[]): string {
  const lc = Object.fromEntries(
    Object.entries(row).map(([k, v]) => [k.trim().toLowerCase(), String(v ?? "").trim()]),
  );
  for (const k of keys) {
    const v = lc[k.toLowerCase()];
    if (v !== undefined && v !== "") return v;
  }
  return "";
}

function num(row: Record<string, unknown>, ...keys: string[]): number {
  const raw = get(row, ...keys).replace(/[,₹%\s]/g, "");
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : 0;
}

function isinVal(row: Record<string, unknown>, ...keys: string[]): string | null {
  const v = get(row, ...keys).trim();
  return /^[A-Z]{2}[A-Z0-9]{10}$/.test(v) ? v : null;
}

function geo(iv: string | null): string {
  if (!iv) return "India";
  if (iv.startsWith("US")) return "United States";
  if (iv.startsWith("IN")) return "India";
  return "Global";
}

function guessCat(name: string, iv: string | null): string {
  const n = name.toLowerCase();
  if (/\betf\b|bees\b|niftybees|goldbees|liquidbees|bankbees/.test(n)) return "ETFs";
  if (/\b(fund|scheme|growth|dividend|idcw|direct|regular)\b/.test(n)) return "Mutual Funds";
  if (/\b(ncd|bond|debenture|debt|gilt|gsec|g-sec)\b/.test(n)) return "Bonds";
  if (/\b(reit)\b/.test(n)) return "REIT";
  if (/\b(invit)\b/.test(n)) return "InvIT";
  if (iv?.startsWith("US")) return "Stocks";
  return "Stocks";
}

function mfCat(name: string): string {
  const n = name.toLowerCase();
  if (/gold|commodity/.test(n)) return "ETFs";
  return "Mutual Funds";
}

const TODAY = new Date().toISOString().slice(0, 10);

const valid = (r: BrokerRow | null): r is BrokerRow => r !== null && (r.quantity ?? 0) > 0;

function parse5paisa(raw: Record<string, unknown>[]): BrokerRow[] {
  return raw.map((r): BrokerRow | null => {
    const name = get(r, "scrip name", "script name", "scheme name");
    if (!name) return null;
    const qty = num(r, "qty", "quantity", "units");
    const avgPrice = num(r, "buy avg", "avg buy price", "nav");
    const cmp = num(r, "cmp", "ltp", "current nav");
    const currentVal = num(r, "current value", "market value");
    const investedVal = num(r, "invested value", "purchase value", "cost value");
    const iv = isinVal(r, "isin");
    return {
      _broker: "5paisa", _isin: iv,
      name, symbol: get(r, "symbol", "trading symbol") || null,
      category: guessCat(name, iv), quantity: qty || 1,
      avg_price: avgPrice,
      current_price: cmp || (qty > 0 ? currentVal / qty : 0),
      invested_value: investedVal || null, current_value: currentVal || null,
      purchase_date: TODAY, identifier: iv ?? undefined,
      identifier_type: iv ? "ISIN" : undefined, currency: "INR",
      notes: `Geography: ${geo(iv)}`,
    };
  }).filter(valid);
}

function parseKuvera(raw: Record<string, unknown>[]): BrokerRow[] {
  return raw.map((r): BrokerRow | null => {
    const name = get(r, "scheme name", "fund name");
    if (!name) return null;
    const units = num(r, "units", "quantity");
    const avgNav = num(r, "avg nav", "average nav", "purchase nav", "nav");
    const curNav = num(r, "current nav", "nav");
    const curVal = num(r, "current value", "market value");
    const purchaseVal = num(r, "purchase value", "invested value", "cost value");
    const iv = isinVal(r, "isin");
    return {
      _broker: "Kuvera", _isin: iv,
      name, symbol: null, category: mfCat(name), quantity: units || 1,
      avg_price: avgNav, current_price: curNav || (units > 0 ? curVal / units : 0),
      invested_value: purchaseVal || null, current_value: curVal || null,
      purchase_date: TODAY, identifier: iv ?? undefined,
      identifier_type: iv ? "ISIN" : undefined, currency: "INR",
      notes: "Geography: India",
    };
  }).filter(valid);
}

function parseDhan(raw: Record<string, unknown>[]): BrokerRow[] {
  return raw.map((r): BrokerRow | null => {
    const name = get(r, "company name", "scrip name", "instrument name", "trading symbol", "stock symbol");
    if (!name) return null;
    const qty = num(r, "net qty", "quantity", "qty", "holding qty");
    const avgCost = num(r, "avg cost price", "buy price", "avg price", "average price");
    const ltp = num(r, "ltp", "cmp", "last traded price");
    const curVal = num(r, "current value", "market value");
    const iv = isinVal(r, "isin");
    const cat = iv?.startsWith("INF") ? "Mutual Funds" : guessCat(name, iv);
    return {
      _broker: "Dhan", _isin: iv,
      name, symbol: get(r, "trading symbol", "stock symbol") || null,
      category: cat, quantity: qty || 1,
      avg_price: avgCost, current_price: ltp || (qty > 0 ? curVal / qty : 0),
      invested_value: qty > 0 && avgCost > 0 ? qty * avgCost : null,
      current_value: curVal || null, purchase_date: TODAY,
      identifier: iv ?? undefined, identifier_type: iv ? "ISIN" : undefined,
      currency: "INR", notes: `Geography: ${geo(iv)}`,
    };
  }).filter(valid);
}

function parseMFCentral(raw: Record<string, unknown>[]): BrokerRow[] {
  return raw.map((r): BrokerRow | null => {
    const name = get(r, "scheme name", "fund name");
    if (!name) return null;
    const units = num(r, "units", "quantity");
    const nav = num(r, "nav", "current nav");
    const value = num(r, "value", "current value", "market value");
    const cost = num(r, "cost value", "purchase value", "invested value");
    const iv = isinVal(r, "isin", "isin no");
    return {
      _broker: "MFCentral CAS", _isin: iv,
      name, symbol: null, category: mfCat(name), quantity: units || 1,
      avg_price: units > 0 && cost > 0 ? cost / units : nav,
      current_price: nav || (units > 0 ? value / units : 0),
      invested_value: cost || null, current_value: value || null,
      purchase_date: TODAY, identifier: iv ?? undefined,
      identifier_type: iv ? "ISIN" : undefined, currency: "INR",
      notes: "Geography: India",
    };
  }).filter(valid);
}

function parseZerodhaKite(raw: Record<string, unknown>[]): BrokerRow[] {
  return raw.map((r): BrokerRow | null => {
    const instrument = get(r, "instrument", "symbol", "tradingsymbol");
    if (!instrument) return null;
    if (get(r, "product").toUpperCase() === "MIS") return null;
    const qty = Math.abs(num(r, "qty", "quantity", "net qty"));
    const avgCost = num(r, "avg. cost", "average price", "avg cost", "avg price");
    const ltp = num(r, "ltp", "last price", "cmp");
    const curVal = num(r, "current value", "market value", "cur. val");
    const iv = isinVal(r, "isin") ?? null;
    const name = get(r, "company name", "name") || instrument;
    const cat = instrument.endsWith("-BE") ? "Bonds" : guessCat(name, iv);
    return {
      _broker: "Zerodha Kite", _isin: iv,
      name, symbol: instrument, category: cat, quantity: qty || 1,
      avg_price: avgCost, current_price: ltp || (qty > 0 ? curVal / qty : 0),
      invested_value: qty > 0 && avgCost > 0 ? qty * avgCost : null,
      current_value: curVal || null, exchange: "NSE", purchase_date: TODAY,
      identifier: iv ?? instrument, identifier_type: iv ? "ISIN" : "SYMBOL",
      currency: "INR", notes: "Geography: India",
    };
  }).filter(valid);
}

function parseVested(raw: Record<string, unknown>[]): BrokerRow[] {
  return raw.map((r): BrokerRow | null => {
    const symbol = get(r, "symbol");
    const name = get(r, "company name", "name") || symbol;
    if (!symbol && !name) return null;
    const qty = num(r, "quantity", "qty");
    const avgPrice = num(r, "average price", "avg price", "avg. price");
    const ltp = num(r, "current price", "ltp");
    const curVal = num(r, "market value", "current value");
    const investedVal = num(r, "invested amount", "invested value", "cost");
    const iv = isinVal(r, "isin") ?? null;
    return {
      _broker: "Vested", _isin: iv,
      name, symbol,
      category: "Stocks", quantity: qty || 1,
      avg_price: avgPrice, current_price: ltp || (qty > 0 ? curVal / qty : 0),
      invested_value: investedVal || null, current_value: curVal || null,
      exchange: "NYSE/NASDAQ", purchase_date: TODAY,
      identifier: iv ?? symbol, identifier_type: iv ? "ISIN" : "SYMBOL",
      currency: "USD", notes: "Geography: United States",
    };
  }).filter(valid);
}

function parseTickertape(raw: Record<string, unknown>[]): BrokerRow[] {
  return raw.map((r): BrokerRow | null => {
    const symbol = get(r, "ticker", "symbol");
    const name = get(r, "security name", "company", "name") || symbol;
    if (!symbol && !name) return null;
    const qty = num(r, "quantity", "shares", "qty");
    const avgCost = num(r, "cost basis", "average cost", "avg cost", "avg. cost");
    const ltp = num(r, "current price", "price");
    const curVal = num(r, "current value", "market value");
    const iv = isinVal(r, "isin") ?? null;
    return {
      _broker: "Tickertape", _isin: iv,
      name, symbol,
      category: "Stocks", quantity: qty || 1,
      avg_price: avgCost, current_price: ltp || (qty > 0 ? curVal / qty : 0),
      invested_value: qty > 0 && avgCost > 0 ? qty * avgCost : null,
      current_value: curVal || null,
      exchange: "NYSE/NASDAQ", purchase_date: TODAY,
      identifier: iv ?? symbol, identifier_type: iv ? "ISIN" : "SYMBOL",
      currency: "USD", notes: "Geography: United States",
    };
  }).filter(valid);
}

const SIGNATURES: Array<{
  broker: string;
  mustHave: string[][];
  parse: (r: Record<string, unknown>[]) => BrokerRow[];
}> = [
  { broker: "MFCentral CAS", mustHave: [["folio number", "folio no"], ["amc"], ["scheme name", "fund name"]], parse: parseMFCentral },
  { broker: "Kuvera", mustHave: [["folio"], ["avg nav", "average nav", "purchase nav"], ["scheme name", "fund name"]], parse: parseKuvera },
  { broker: "Zerodha Kite", mustHave: [["instrument", "tradingsymbol"], ["avg. cost", "avg cost", "average price"], ["product"]], parse: parseZerodhaKite },
  { broker: "Vested", mustHave: [["symbol"], ["average price", "avg price", "avg. price"], ["market value"], ["p&l", "p&l %"]], parse: parseVested },
  { broker: "Tickertape", mustHave: [["ticker", "symbol"], ["cost basis", "average cost"], ["gain/loss", "gain loss", "gain / loss"]], parse: parseTickertape },
  { broker: "5paisa", mustHave: [["scrip name", "script name", "scheme name"], ["buy avg", "avg buy price"]], parse: parse5paisa },
  { broker: "Dhan", mustHave: [["net qty", "avg cost price", "trading symbol", "stock symbol"], ["isin"]], parse: parseDhan },
];

export function detectBroker(rawHeaders: string[]): DetectionResult {
  const headers = rawHeaders.map((h) => h.trim().toLowerCase());
  for (const sig of SIGNATURES) {
    const ok = sig.mustHave.every((group) =>
      group.some((keyword) => headers.some((h) => h.includes(keyword))),
    );
    if (ok) return { matched: true, broker: sig.broker, parse: sig.parse };
  }
  return { matched: false };
}
