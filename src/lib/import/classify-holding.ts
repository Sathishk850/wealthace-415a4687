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

  /* -------- segment -------- */
  let segment = clean(input.segment) || null;
  if (!segment && category) segment = SEGMENT_BY_CATEGORY[category] ?? null;

  /* -------- sector -------- */
  let sector = clean(input.sector) || null;
  if (sector && /^[-–—.\/]+$/.test(sector)) sector = null;
  if (!sector && sub && !/cap\b|plan|growth|direct|regular/i.test(sub)) sector = sub;
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
