/**
 * Universal Import Engine — holding enrichment classifier.
 *
 * Offline, rule-based derivation of the display metadata the Assets module
 * groups on: asset type (tab), segment, sector and market-cap bucket.
 * No network calls, no paid APIs, no schema changes — the values are stored
 * on the holding's existing `notes` column as "Label: value" lines, which is
 * exactly where the Assets views already read them from.
 *
 * Rule: only assign a value when confidence is high. Never guess.
 */

import { classifySecurity, normalizeInvestmentCategory } from "./classify-security";

export type HoldingEnrichment = {
  /** Canonical asset class (Stocks, Mutual Funds, ETFs, Bonds, Gold, …). */
  category: string | null;
  /** Equity / Debt / Commodity / Real Estate / Crypto / Hybrid. */
  segment: string | null;
  /** Technology, Financial Services, FMCG, … */
  sector: string | null;
  /** Large Cap / Mid Cap / Small Cap / Micro Cap. */
  market_cap: string | null;
};

const clean = (v: unknown) => (v == null ? "" : String(v).trim());

/* ---------------------------------------------------------------
   Segment (broad asset grouping) per canonical category
--------------------------------------------------------------- */
const SEGMENT_BY_CATEGORY: Record<string, string> = {
  Stocks: "Equity",
  "Mutual Funds": "Mutual Fund",
  ETFs: "Equity",
  Bonds: "Debt",
  Gold: "Commodity",
  Commodities: "Commodity",
  Crypto: "Crypto",
  REIT: "Real Estate",
  InvIT: "Infrastructure",
};

/* ---------------------------------------------------------------
   Sector canonicalisation — brokers spell the same sector many ways
   ("AUTOMOBILE", "Auto/Automotive", "Auto"), which otherwise creates
   duplicate groups in the Assets views.
--------------------------------------------------------------- */
const SECTOR_ALIASES: Array<[RegExp, string]> = [
  [/^(financial\s*services?|bank(ing)?|finance|financials|bfsi|nbfc|insurance)$/i, "Financial Services"],
  [/^(it|it\s*-?\s*software|software|software\s*services?|technolog(y|ies)|information\s*technology|it\s*services?)$/i, "Technology"],
  [/^(fmcg|consumer\s*staples?|fast\s*moving\s*consumer\s*goods)$/i, "FMCG"],
  [/^(energy|oil\s*&?\s*gas|oil\s*and\s*gas|power|utilities|energy\s*&?\s*power|petroleum)$/i, "Energy"],
  [/^(automobiles?|auto|automotive|auto\s*\/\s*automotive|auto\s*ancillar(y|ies)|automobile\s*&?\s*ancillaries)$/i, "Automobiles"],
  [/^(healthcare|health\s*care|pharma|pharmaceuticals?|pharmaceuticals?\s*&?\s*healthcare|hospitals?)$/i, "Healthcare"],
  [/^(consumer\s*durables?|consumer\s*discretionary|durables?)$/i, "Consumer Durables"],
  [/^(metals?|mining|metals?\s*&?\s*mining|ferrous|non\s*-?\s*ferrous|steel)$/i, "Metals & Mining"],
  [/^(telecom|telecommunications?|telecom\s*services?)$/i, "Telecom"],
  [/^(infrastructure|infra|construction|capital\s*goods|engineering)$/i, "Infrastructure"],
  [/^(realty|real\s*estate|property)$/i, "Real Estate"],
  [/^(chemicals?|fertilizers?|materials?)$/i, "Materials"],
];

/** Canonical sector label, or null when the value is unusable. */
export function normalizeSector(raw: unknown): string | null {
  const v = clean(raw).replace(/\s+/g, " ").trim();
  if (!v || /^(-+|_+|n\/?a|na|null|none|others?|unknown)$/i.test(v)) return null;
  for (const [re, label] of SECTOR_ALIASES) if (re.test(v)) return label;
  // Title-case unknown but usable labels so casing differences don't split groups.
  return v
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(" ");
}

/* ---------------------------------------------------------------
   Sector keyword rules (name-driven, high precision only)
--------------------------------------------------------------- */

const SECTOR_RULES: Array<[RegExp, string]> = [
  [/\b(infosys|tcs|tata consultancy|wipro|hcl tech|tech mahindra|mphasis|ltimindtree|persistent|coforge|mindtree|infotech|software|technolog|cyient|zensar)\b/i, "Technology"],
  [/\b(hdfc bank|icici bank|axis bank|kotak mahindra|state bank|sbi\b|bank of baroda|punjab national|indusind|federal bank|idfc|yes bank|bandhan bank|au small finance|bajaj finance|bajaj finserv|shriram finance|chola|muthoot|hdfc life|sbi life|icici pru|max financial|insurance|finserv|nbfc|\bbank\b|financial services)\b/i, "Financial Services"],
  [/\b(hindustan unilever|hul\b|itc\b|nestle|britannia|dabur|marico|godrej consumer|colgate|emami|tata consumer|varun beverages|united spirits|radico|jubilant food|fmcg)\b/i, "FMCG"],
  [/\b(maruti|tata motors|mahindra & mahindra|m&m\b|bajaj auto|hero motocorp|tvs motor|eicher|ashok leyland|bosch|motherson|balkrishna|mrf\b|apollo tyres|exide|automobil|auto ancillar)\b/i, "Automobiles"],
  [/\b(sun pharma|cipla|dr\.? reddy|divis|lupin|aurobindo|torrent pharma|alkem|zydus|glenmark|biocon|apollo hospital|fortis|max healthcare|laurus|ipca|pharma|healthcare|hospital|diagnostic)\b/i, "Healthcare"],
  [/\b(reliance industries|ongc|oil india|bpcl|hpcl|indian oil|ioc\b|gail|petronet|adani green|ntpc|power grid|tata power|jsw energy|nhpc|sjvn|coal india|energy|petroleum|refiner|\bpower\b|renewable)\b/i, "Energy & Power"],
  [/\b(ultratech|shree cement|ambuja|acc\b|dalmia bharat|jk cement|ramco cement|grasim|tata steel|jsw steel|jindal|sail\b|hindalco|vedanta|nalco|nmdc|hindustan zinc|apl apollo|steel|cement|metal|mining)\b/i, "Materials"],
  [/\b(larsen|l&t\b|gmr|irb infra|ncc\b|kec international|siemens|abb\b|cummins|thermax|bharat heavy|bhel|bel\b|hal\b|bharat electronics|hindustan aeronautics|capital goods|infrastructur|engineering|construction|defence)\b/i, "Industrials"],
  [/\b(bharti airtel|vodafone idea|indus towers|tata communications|railtel|telecom|hathway)\b/i, "Telecom"],
  [/\b(dmart|avenue supermarts|trent\b|titan\b|aditya birla fashion|vedant fashions|nykaa|zomato|swiggy|jubilant|retail|apparel|jewell)\b/i, "Consumer Discretionary"],
  [/\b(dlf\b|godrej propert|oberoi realty|prestige estate|brigade|macrotech|lodha|phoenix mills|sobha|realty|real estate|reit)\b/i, "Real Estate"],
  [/\b(indigo|interglobe|spicejet|irctc|container corp|concor|adani ports|gateway distripark|blue dart|delhivery|logistic|airline|shipping|transport)\b/i, "Transport & Logistics"],
];

/* ---------------------------------------------------------------
   Market-cap buckets from well-known index constituents.
   Trimmed to the most commonly held names on Indian brokers, plus
   name-driven fund/ETF bands.
--------------------------------------------------------------- */
const LARGE_CAP = new Set([
  "RELIANCE", "TCS", "HDFCBANK", "ICICIBANK", "INFY", "HINDUNILVR", "ITC", "SBIN", "BHARTIARTL",
  "LT", "KOTAKBANK", "AXISBANK", "BAJFINANCE", "ASIANPAINT", "MARUTI", "HCLTECH", "SUNPHARMA",
  "TITAN", "ULTRACEMCO", "WIPRO", "NESTLEIND", "ONGC", "NTPC", "POWERGRID", "TATAMOTORS",
  "TATASTEEL", "JSWSTEEL", "ADANIENT", "ADANIPORTS", "COALINDIA", "GRASIM", "HINDALCO",
  "TECHM", "DIVISLAB", "DRREDDY", "CIPLA", "BRITANNIA", "EICHERMOT", "HEROMOTOCO", "BAJAJ-AUTO",
  "BAJAJFINSV", "BPCL", "INDUSINDBK", "SBILIFE", "HDFCLIFE", "APOLLOHOSP", "TATACONSUM",
  "LTIM", "SHRIRAMFIN", "TRENT", "DMART", "PIDILITIND", "GAIL", "IOC", "VEDL", "DLF", "ZOMATO",
]);

const MID_CAP = new Set([
  "PERSISTENT", "MPHASIS", "COFORGE", "CUMMINSIND", "POLYCAB", "ASTRAL", "AUBANK", "FEDERALBNK",
  "IDFCFIRSTB", "BANDHANBNK", "MUTHOOTFIN", "CHOLAFIN", "LICHSGFIN", "MAXHEALTH", "LUPIN",
  "AUROPHARMA", "TORNTPHARM", "ALKEM", "ZYDUSLIFE", "GLENMARK", "BIOCON", "IPCALAB",
  "ASHOKLEY", "BALKRISIND", "MRF", "APOLLOTYRE", "EXIDEIND", "BHARATFORG", "SUPREMEIND",
  "OBEROIRLTY", "GODREJPROP", "PRESTIGE", "PHOENIXLTD", "PAGEIND", "VOLTAS", "CROMPTON",
  "TATACHEM", "TATAELXSI", "TATACOMM", "INDHOTEL", "IRCTC", "CONCOR", "PETRONET", "SJVN",
  "NHPC", "BEL", "HAL", "BHEL", "SAIL", "NMDC", "NATIONALUM", "JINDALSTEL", "ABFRL",
]);

const SMALL_CAP = new Set([
  "CYIENT", "ZENSARTECH", "KPITTECH", "SONATSOFTW", "MASTEK", "HAPPSTMNDS", "NEWGEN",
  "RADICO", "VBL", "EMAMILTD", "JUBLFOOD", "DEVYANI", "SAPPHIRE", "CAMPUS", "METROBRAND",
  "RAILTEL", "IRFC", "RVNL", "IRCON", "NBCC", "NCC", "KEC", "GMRINFRA", "IRB", "HFCL",
  "SOBHA", "BRIGADE", "MAHLIFE", "GATEWAY", "BLUEDART", "DELHIVERY", "APLAPOLLO",
]);

function marketCapFromName(name: string): string | null {
  const s = name.toLowerCase();
  if (/\bmicro\s?cap\b/.test(s)) return "Micro Cap";
  if (/\blarge\s?cap\b|\bnifty\s?50\b|\bbluechip\b|\bsensex\b|\btop\s?100\b/.test(s)) return "Large Cap";
  if (/\bmid\s?cap\b|midcap\s?150/.test(s)) return "Mid Cap";
  if (/\bsmall\s?cap\b|smallcap\s?250/.test(s)) return "Small Cap";
  return null;
}

function marketCapFromValue(v: unknown): string | null {
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) return null;
  // Values are assumed to be in INR crore when small, in INR when huge.
  const crore = n > 1e7 ? n / 1e7 : n;
  if (crore >= 50_000) return "Large Cap";
  if (crore >= 15_000) return "Mid Cap";
  if (crore >= 1_000) return "Small Cap";
  return "Micro Cap";
}

/**
 * Derive asset type, segment, sector and market-cap bucket for one imported
 * holding. Every field is independently nullable — unknown stays null.
 */
export function classifyHolding(input: {
  name?: unknown;
  symbol?: unknown;
  isin?: unknown;
  category?: unknown;
  sub_category?: unknown;
  sector?: unknown;
  segment?: unknown;
  market_cap?: unknown;
  exchange?: unknown;
  quantity?: unknown;
}): HoldingEnrichment {
  const name = clean(input.name);
  const symbol = clean(input.symbol).toUpperCase().replace(/[-.].*$/, "");
  const isin = clean(input.isin).toUpperCase();
  const sub = clean(input.sub_category);

  /* -------- asset class -------- */
  let category = normalizeInvestmentCategory(clean(input.category));
  if (!category) {
    const guess = classifySecurity({ name, symbol: symbol || isin, isin: isin || undefined });
    if (guess && guess.confidence !== "low") {
      category = normalizeInvestmentCategory(guess.category);
    }
  }

  /* -------- mutual-fund overrides --------
     Broker/registrar exports frequently label schemes as plain equity. These
     three signals are unambiguous, so they win over a generic category. */
  const mfText = `${name} ${sub}`.toLowerCase();
  const isEtf = /\b(etf|exchange traded)\b/.test(mfText) || /bees\b/.test(mfText);
  const mfKeyword =
    /\b(fund|scheme|folio|idcw)\b/.test(mfText) ||
    /\b(direct|regular)\s+plan\b/.test(mfText) ||
    /\b(growth|dividend)\b/.test(mfText);
  const qty = Number(input.quantity);
  const fractionalQty = Number.isFinite(qty) && qty > 0 && Math.abs(qty % 1) > 1e-9;
  if (!isEtf && (isin.startsWith("INF") || mfKeyword || (fractionalQty && category !== "Crypto"))) {
    category = "Mutual Funds";
  }

  /* -------- segment -------- */
  let segment = clean(input.segment) || null;
  if (!segment && category) segment = SEGMENT_BY_CATEGORY[category] ?? null;

  /* -------- sector -------- */
  let sector = normalizeSector(input.sector);
  if (!sector && sub && !/cap\b|plan|growth|direct|regular/i.test(sub)) sector = normalizeSector(sub);
  if (!sector) {
    const hay = `${name} ${symbol}`;
    for (const [re, label] of SECTOR_RULES) {
      if (re.test(hay)) {
        sector = label;
        break;
      }
    }
  }


  /* -------- market cap -------- */
  let market_cap =
    marketCapFromValue(input.market_cap) ??
    (clean(input.market_cap) ? marketCapFromName(clean(input.market_cap)) : null);
  if (!market_cap && symbol) {
    if (LARGE_CAP.has(symbol)) market_cap = "Large Cap";
    else if (MID_CAP.has(symbol)) market_cap = "Mid Cap";
    else if (SMALL_CAP.has(symbol)) market_cap = "Small Cap";
  }
  if (!market_cap) market_cap = marketCapFromName(`${name} ${sub}`);

  return { category: category ?? null, segment, sector, market_cap };
}

/**
 * Merge enrichment into a holding's notes as "Label: value" lines — the same
 * format the Add Investment form writes and every Assets view reads.
 * Existing lines are never overwritten.
 */
export function notesWithEnrichment(notes: unknown, e: HoldingEnrichment): string | null {
  const base = clean(notes);
  const lines = base ? base.split(/\r?\n/) : [];
  const has = (label: string) => lines.some((l) => new RegExp(`^\\s*${label}\\s*:`, "i").test(l));
  const add = (label: string, value: string | null) => {
    if (value && !has(label)) lines.push(`${label}: ${value}`);
  };
  add("Segment", e.segment);
  add("Sector", e.sector);
  add("Classification", e.market_cap);
  const out = lines.filter((l) => l.trim()).join("\n");
  return out || null;
}

/**
 * Best-effort market-data identifier for an imported holding, so live prices
 * refresh automatically after the import commits. Conservative: only emitted
 * when the instrument can be looked up by ticker.
 */
export function identifierForHolding(input: {
  symbol?: unknown;
  isin?: unknown;
  category?: unknown;
  exchange?: unknown;
}): { identifier_type: "stock_in" | "stock_us" | "crypto"; identifier: string } | null {
  const symbol = clean(input.symbol).toUpperCase().replace(/\s+/g, "");
  if (!symbol || /^IN[EF0][A-Z0-9]{9}$/.test(symbol)) return null;
  const category = normalizeInvestmentCategory(clean(input.category));
  if (category === "Crypto") return { identifier_type: "crypto", identifier: symbol };
  if (category === "Mutual Funds") return null;
  const isin = clean(input.isin).toUpperCase();
  const exchange = clean(input.exchange).toUpperCase();
  const indian = isin.startsWith("IN") || /NSE|BSE|NS|BO/.test(exchange);
  const foreign = /NASDAQ|NYSE|AMEX|US/.test(exchange) || (!!isin && !isin.startsWith("IN"));
  if (indian) return { identifier_type: "stock_in", identifier: symbol };
  if (foreign) return { identifier_type: "stock_us", identifier: symbol };
  return { identifier_type: "stock_in", identifier: symbol };
}
