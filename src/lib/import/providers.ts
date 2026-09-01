/**
 * Universal Import Engine — provider (broker / bank / platform) detection.
 *
 * Purely heuristic and offline: scores filename tokens, report preamble lines,
 * sheet names and header signatures against a signature table. Detection is
 * advisory only — mapping stays adaptive regardless of the result.
 */
import type { ParsedFile } from "./parse";

export type ProviderConfidence = "high" | "medium" | "low";

export type DetectedProvider = {
  id: string;
  name: string;
  /** Human label for the kind of export, e.g. "Holdings export". */
  kind: string;
  score: number;
  confidence: ProviderConfidence;
};

type ProviderSignature = {
  id: string;
  name: string;
  kind: string;
  /** Tokens looked for in the filename and the report preamble. */
  tokens: string[];
  /** Sheet names (lowercased substrings) that identify the export. */
  sheets?: string[];
  /** All of these headers must be present for the +4 structural bonus. */
  required?: string[];
  /** Individually scoring headers. */
  signals?: string[];
};

const SIGNATURES: ProviderSignature[] = [
  // ---- Indian brokers ----
  { id: "zerodha", name: "Zerodha", kind: "Holdings export", tokens: ["zerodha", "kite"], sheets: ["holdings"], required: ["instrument", "qty."], signals: ["avg. cost", "ltp", "cur. val", "p&l", "net chg.", "day chg."] },
  { id: "zerodha_coin", name: "Zerodha Coin", kind: "Mutual fund holdings", tokens: ["coin", "zerodha coin"], required: ["scheme name"], signals: ["folio", "units", "avg. nav", "nav", "current value"] },
  { id: "groww", name: "Groww", kind: "Holdings export", tokens: ["groww"], sheets: ["holdings", "stocks"], required: ["stock name"], signals: ["isin", "quantity", "average buy price", "buy value", "current value", "unrealised p&l"] },
  { id: "upstox", name: "Upstox", kind: "Holdings export", tokens: ["upstox", "rksv"], signals: ["trading symbol", "isin", "quantity", "average price", "last price", "close price"] },
  { id: "angelone", name: "Angel One", kind: "Holdings export", tokens: ["angel", "angelone", "angel broking"], signals: ["symbol", "isin", "qty", "avg price", "ltp", "current value", "pnl"] },
  { id: "icicidirect", name: "ICICI Direct", kind: "Portfolio export", tokens: ["icicidirect", "icici direct", "idirect"], signals: ["stock symbol", "isin code", "qty", "average cost price", "current market price", "value at cost", "value at market price"] },
  { id: "hdfcsec", name: "HDFC Securities", kind: "Portfolio export", tokens: ["hdfcsec", "hdfc securities"], signals: ["scrip name", "isin", "quantity", "avg rate", "market rate", "market value", "gain/loss"] },
  { id: "kotaksec", name: "Kotak Securities", kind: "Portfolio export", tokens: ["kotak securities", "kotaksec", "neo"], signals: ["scrip", "isin", "quantity", "average price", "ltp", "value"] },
  { id: "5paisa", name: "5paisa", kind: "Holdings export", tokens: ["5paisa", "fivepaisa"], signals: ["symbol", "isin", "quantity", "avg cost price", "current price", "current value"] },
  { id: "dhan", name: "Dhan", kind: "Holdings export", tokens: ["dhan"], signals: ["trading symbol", "isin", "available qty", "avg cost price", "ltp", "unrealized pnl"] },
  { id: "fyers", name: "Fyers", kind: "Holdings export", tokens: ["fyers"], signals: ["symbol", "isin", "quantity", "buy avg", "ltp", "market val"] },
  { id: "motilal", name: "Motilal Oswal", kind: "Portfolio export", tokens: ["motilal", "mosl", "oswal"], signals: ["scrip name", "isin", "qty", "avg rate", "cmp", "market value"] },
  { id: "sharekhan", name: "Sharekhan", kind: "Portfolio export", tokens: ["sharekhan"], signals: ["scrip", "isin", "qty", "avg price", "cmp", "value"] },

  // ---- Depository & MF aggregators ----
  { id: "cdsl_cas", name: "CDSL CAS", kind: "Consolidated account statement", tokens: ["cas", "cdsl", "consolidated account statement", "nsdl"], signals: ["isin", "security name", "current balance", "market price", "value", "folio no"] },
  { id: "kuvera", name: "Kuvera", kind: "Mutual fund holdings", tokens: ["kuvera"], signals: ["scheme name", "folio number", "units", "invested", "current", "returns"] },
  { id: "indmoney", name: "INDmoney", kind: "Portfolio export", tokens: ["indmoney", "indwealth"], signals: ["asset name", "isin", "quantity", "avg buy price", "current price", "current value"] },
  { id: "mfcentral", name: "MFCentral", kind: "Mutual fund statement", tokens: ["mfcentral", "mf central", "camsonline", "karvy", "kfintech"], signals: ["scheme name", "folio no", "units", "nav", "amount", "transaction type"] },

  // ---- Indian banks ----
  { id: "hdfc_bank", name: "HDFC Bank", kind: "Bank statement", tokens: ["hdfc bank", "hdfcbank"], signals: ["narration", "chq./ref.no.", "value dt", "withdrawal amt.", "deposit amt.", "closing balance"] },
  { id: "sbi", name: "SBI", kind: "Bank statement", tokens: ["state bank of india", "sbi", "onlinesbi"], signals: ["txn date", "value date", "description", "ref no./cheque no.", "debit", "credit", "balance"] },
  { id: "icici_bank", name: "ICICI Bank", kind: "Bank statement", tokens: ["icici bank", "icicibank"], signals: ["transaction date", "value date", "transaction remarks", "withdrawal amount (inr )", "deposit amount (inr )", "balance (inr )"] },
  { id: "axis_bank", name: "Axis Bank", kind: "Bank statement", tokens: ["axis bank", "axisbank"], signals: ["tran date", "particulars", "chq no", "debit", "credit", "balance", "init.br"] },
  { id: "kotak_bank", name: "Kotak Mahindra Bank", kind: "Bank statement", tokens: ["kotak mahindra bank", "kotak bank"], signals: ["date", "narration", "chq/ref no", "withdrawal (dr)", "deposit (cr)", "balance"] },
  { id: "idfc_bank", name: "IDFC FIRST Bank", kind: "Bank statement", tokens: ["idfc", "idfc first"], signals: ["transaction date", "particulars", "cheque no", "debit", "credit", "balance"] },

  // ---- International ----
  { id: "ibkr", name: "Interactive Brokers", kind: "Activity statement", tokens: ["interactive brokers", "ibkr", "u\u0000"], signals: ["symbol", "currency", "quantity", "cost basis", "close price", "value", "unrealized p/l"] },
  { id: "trade_republic", name: "Trade Republic", kind: "Statement", tokens: ["trade republic", "traderepublic"], signals: ["isin", "shares", "average price", "market value", "date", "type"] },
  { id: "vested", name: "Vested", kind: "US holdings export", tokens: ["vested"], signals: ["symbol", "company", "quantity", "average cost", "current price", "market value"] },
];

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();

export function detectProvider(parsed: ParsedFile): DetectedProvider | null {
  const fileName = norm(parsed.fileName);
  const preamble = norm(parsed.preamble.join(" "));
  const sheet = norm(parsed.sheetName ?? "");
  const headers = parsed.columns.map((c) => c.header.toLowerCase().trim());
  const headersNorm = headers.map(norm);

  const hasHeader = (h: string) => {
    const n = norm(h);
    return headersNorm.some((x) => x === n || x.includes(n) || n.includes(x));
  };

  let best: DetectedProvider | null = null;
  for (const sig of SIGNATURES) {
    let score = 0;
    for (const t of sig.tokens) {
      const n = norm(t);
      if (!n) continue;
      if (fileName.includes(n)) score += 2;
      if (preamble.includes(n)) score += 2;
    }
    if (sig.sheets?.some((s) => sheet.includes(norm(s)))) score += 3;
    if (sig.required?.length && sig.required.every(hasHeader)) score += 4;
    for (const s of sig.signals ?? []) if (hasHeader(s)) score += 1;

    if (score > 0 && (!best || score > best.score)) {
      best = {
        id: sig.id,
        name: sig.name,
        kind: sig.kind,
        score,
        confidence: score >= 8 ? "high" : score >= 5 ? "medium" : "low",
      };
    }
  }
  return best;
}
