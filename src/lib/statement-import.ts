/**
 * Bank statement import engine.
 *
 * Parses CSV / XLS / XLSX statements from Indian retail banks (HDFC, SBI,
 * ICICI, Axis, Kotak, and a generic fallback), normalises them into
 * transaction drafts, auto-categorises by merchant keywords and flags likely
 * duplicates against existing transactions.
 *
 * Pure functions only — no React, no network.
 */

import { classifyCategory } from "./import/categorize";

export type ParsedRow = {
  occurred_on: string; // YYYY-MM-DD
  merchant: string;
  amount: number;
  kind: "income" | "expense";
  note: string | null;
  balance: number | null;
  raw: string;
};

export type ImportDraft = ParsedRow & {
  include: boolean;
  category_id: string | null;
  categoryGuess: string | null;
  duplicate: boolean;
};

export type DetectedBank =
  | "HDFC Bank"
  | "State Bank of India"
  | "ICICI Bank"
  | "Axis Bank"
  | "Kotak Mahindra Bank"
  | "Generic";

/* ---------------- header detection ---------------- */

const DATE_KEYS = ["date", "txn date", "transaction date", "value date", "tran date", "posting date"];
const DESC_KEYS = ["narration", "description", "particulars", "details", "remarks", "transaction remarks", "narrative"];
const DEBIT_KEYS = ["withdrawal amt.", "withdrawal amount", "withdrawal", "debit", "debit amount", "dr", "paid out"];
const CREDIT_KEYS = ["deposit amt.", "deposit amount", "deposit", "credit", "credit amount", "cr", "paid in"];
const AMOUNT_KEYS = ["amount", "transaction amount", "amt"];
const BALANCE_KEYS = ["balance", "closing balance", "available balance", "running balance"];
const REF_KEYS = ["chq./ref.no.", "ref no", "reference", "cheque no", "chq no", "utr"];

function norm(v: unknown) {
  return String(v ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}

function findIndex(header: string[], keys: string[]) {
  for (let i = 0; i < header.length; i++) {
    const h = norm(header[i]);
    if (!h) continue;
    if (keys.some((k) => h === k)) return i;
  }
  for (let i = 0; i < header.length; i++) {
    const h = norm(header[i]);
    if (!h) continue;
    if (keys.some((k) => h.includes(k))) return i;
  }
  return -1;
}

export function detectBank(text: string): DetectedBank {
  const t = text.toLowerCase();
  if (t.includes("hdfc")) return "HDFC Bank";
  if (t.includes("state bank of india") || /\bsbi\b/.test(t)) return "State Bank of India";
  if (t.includes("icici")) return "ICICI Bank";
  if (t.includes("axis bank")) return "Axis Bank";
  if (t.includes("kotak")) return "Kotak Mahindra Bank";
  return "Generic";
}

/* ---------------- value coercion ---------------- */

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const cleaned = String(v)
    .replace(/[₹$€£,\s]/g, "")
    .replace(/\((.*)\)/, "-$1")
    .replace(/(cr|dr)\.?$/i, "")
    .trim();
  if (!cleaned || !/^-?\d*\.?\d+$/.test(cleaned)) return null;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

const MONTHS: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

/** Bank statements are DD/MM/YY(YY) or DD-MMM-YY. Excel dates arrive as serials. */
export function toISODate(v: unknown): string | null {
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    return `${v.getFullYear()}-${String(v.getMonth() + 1).padStart(2, "0")}-${String(v.getDate()).padStart(2, "0")}`;
  }
  if (typeof v === "number" && v > 20000 && v < 60000) {
    // Excel serial (1900 epoch)
    const ms = Math.round((v - 25569) * 86400 * 1000);
    const d = new Date(ms);
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  }
  const s = String(v ?? "").trim();
  if (!s) return null;
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{2,4})$/.exec(s);
  if (m) {
    const dd = m[1]!.padStart(2, "0");
    const mm = m[2]!.padStart(2, "0");
    let yy = m[3]!;
    if (yy.length === 2) yy = Number(yy) > 70 ? `19${yy}` : `20${yy}`;
    return `${yy}-${mm}-${dd}`;
  }
  m = /^(\d{1,2})[\s\-/]([A-Za-z]{3,})[\s\-/](\d{2,4})$/.exec(s);
  if (m) {
    const mm = MONTHS[m[2]!.slice(0, 3).toLowerCase()];
    if (mm) {
      let yy = m[3]!;
      if (yy.length === 2) yy = `20${yy}`;
      return `${yy}-${mm}-${m[1]!.padStart(2, "0")}`;
    }
  }
  return null;
}

/* ---------------- merchant cleanup ---------------- */

const NOISE = [
  /^upi[/-]/i, /^neft[/-]/i, /^imps[/-]/i, /^rtgs[/-]/i, /^ach[/-]?[dc]?[/-]/i,
  /^pos\s*\d*/i, /^atw[/-]/i, /^nwd[/-]/i, /^mmt[/-]/i, /^ib[/-]/i, /^inb[/-]/i,
  /^by transfer[/-]?/i, /^to transfer[/-]?/i, /^chq\s*no.*/i,
];

export function cleanMerchant(desc: string): string {
  let s = String(desc ?? "").replace(/\s+/g, " ").trim();
  for (const re of NOISE) s = s.replace(re, " ").trim();
  const parts = s.split(/[/|]/).map((p) => p.trim()).filter(Boolean);
  // Prefer the longest alphabetic chunk — that's usually the counterparty.
  const words = parts.filter((p) => /[a-z]{3,}/i.test(p) && !/^\d+$/.test(p));
  const best = words.sort((a, b) => b.length - a.length)[0] ?? s;
  const out = best.replace(/\b\d{6,}\b/g, "").replace(/\s+/g, " ").trim();
  const titled = out
    .toLowerCase()
    .split(" ")
    .map((w) => (w.length > 2 ? w[0]!.toUpperCase() + w.slice(1) : w.toUpperCase()))
    .join(" ");
  return (titled || "Bank Transaction").slice(0, 80);
}

/* ---------------- auto categorisation ---------------- */

/**
 * Best-effort category name guess from the raw statement narration.
 * Delegates to the shared Universal Import classifier so both import paths
 * behave identically. Learned per-user corrections can be supplied by the
 * caller via `corrections` (see `loadCategoryCorrections()`).
 */
export function guessCategory(
  raw: string,
  kind: "income" | "expense",
  corrections?: CorrectionMap,
): string | null {
  return classifyCategory(raw, kind, corrections).category;
}


/* ---------------- parsing ---------------- */

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]!;
    if (ch === '"') {
      if (quoted && line[i + 1] === '"') { cur += '"'; i++; }
      else quoted = !quoted;
    } else if ((ch === "," || ch === "\t") && !quoted) {
      out.push(cur);
      cur = "";
    } else cur += ch;
  }
  out.push(cur);
  return out.map((c) => c.trim());
}

function rowsFromCsv(text: string): unknown[][] {
  return text
    .split(/\r?\n/)
    .filter((l) => l.trim().length > 0)
    .map(splitCsvLine);
}

async function rowsFromWorkbook(file: File): Promise<unknown[][]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]!]!;
  return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: true, defval: "" });
}

export type ParseResult = {
  bank: DetectedBank;
  rows: ParsedRow[];
  skipped: number;
  headerRow: number;
};

/** Locate the header row — statements carry several preamble lines. */
function locateHeader(rows: unknown[][]) {
  for (let i = 0; i < Math.min(rows.length, 30); i++) {
    const header = (rows[i] ?? []).map((c) => String(c ?? ""));
    const dateIdx = findIndex(header, DATE_KEYS);
    const descIdx = findIndex(header, DESC_KEYS);
    const debitIdx = findIndex(header, DEBIT_KEYS);
    const creditIdx = findIndex(header, CREDIT_KEYS);
    const amountIdx = findIndex(header, AMOUNT_KEYS);
    if (dateIdx >= 0 && (descIdx >= 0 || amountIdx >= 0) && (debitIdx >= 0 || creditIdx >= 0 || amountIdx >= 0)) {
      return { i, header, dateIdx, descIdx, debitIdx, creditIdx, amountIdx };
    }
  }
  return null;
}

export async function parseStatementFile(file: File): Promise<ParseResult> {
  const isCsv = /\.(csv|txt|tsv)$/i.test(file.name);
  const rawText = isCsv ? await file.text() : "";
  const rows = isCsv ? rowsFromCsv(rawText) : await rowsFromWorkbook(file);
  if (rows.length === 0) throw new Error("The file appears to be empty.");

  const preamble = rows
    .slice(0, 15)
    .map((r) => r.map((c) => String(c ?? "")).join(" "))
    .join(" ");
  const bank = detectBank(`${file.name} ${preamble}`);

  const found = locateHeader(rows);
  if (!found) {
    throw new Error(
      "Could not find a statement header. Expected columns like Date, Narration/Description and Debit/Credit or Amount.",
    );
  }

  const { i: headerRow, header, dateIdx, descIdx, debitIdx, creditIdx, amountIdx } = found;
  const balanceIdx = findIndex(header, BALANCE_KEYS);
  const refIdx = findIndex(header, REF_KEYS);

  const out: ParsedRow[] = [];
  let skipped = 0;

  for (let r = headerRow + 1; r < rows.length; r++) {
    const row = rows[r] ?? [];
    const cells = row.map((c) => String(c ?? "").trim());
    if (cells.every((c) => !c)) continue;

    const date = toISODate(row[dateIdx]);
    if (!date) { skipped++; continue; }

    const debit = debitIdx >= 0 ? toNumber(row[debitIdx]) : null;
    const credit = creditIdx >= 0 ? toNumber(row[creditIdx]) : null;
    let amount: number | null = null;
    let kind: "income" | "expense" = "expense";

    if (debit && Math.abs(debit) > 0) { amount = Math.abs(debit); kind = "expense"; }
    else if (credit && Math.abs(credit) > 0) { amount = Math.abs(credit); kind = "income"; }
    else if (amountIdx >= 0) {
      const a = toNumber(row[amountIdx]);
      if (a !== null && a !== 0) {
        amount = Math.abs(a);
        const cellText = String(row[amountIdx] ?? "");
        kind = a < 0 || /dr\.?$/i.test(cellText) ? "expense" : "income";
      }
    }
    if (amount === null || amount === 0) { skipped++; continue; }

    const desc = descIdx >= 0 ? String(row[descIdx] ?? "") : "";
    const ref = refIdx >= 0 ? String(row[refIdx] ?? "").trim() : "";
    const rawLine = [desc, ref].filter(Boolean).join(" ").trim() || "Bank Transaction";

    out.push({
      occurred_on: date,
      merchant: cleanMerchant(desc || rawLine),
      amount: Math.round(amount * 100) / 100,
      kind,
      note: rawLine.slice(0, 240),
      balance: balanceIdx >= 0 ? toNumber(row[balanceIdx]) : null,
      raw: rawLine,
    });
  }

  if (out.length === 0) {
    throw new Error("No transaction rows could be read from this statement.");
  }
  return { bank, rows: out, skipped, headerRow };
}

/* ---------------- drafts ---------------- */

export type ExistingKey = { occurred_on: string; amount: number; kind: string };

function dupKey(t: { occurred_on: string; amount: number; kind: string }) {
  return `${t.occurred_on}|${t.kind}|${Math.round(Number(t.amount) * 100)}`;
}

export function buildDrafts(
  parsed: ParsedRow[],
  categories: { id: string; name: string; kind: string }[],
  existing: ExistingKey[],
): ImportDraft[] {
  const existingKeys = new Set(existing.map(dupKey));
  const byName = new Map(categories.map((c) => [`${c.kind}|${c.name.toLowerCase()}`, c.id]));
  const seen = new Set<string>();

  return parsed.map((p) => {
    const guess = guessCategory(p.raw, p.kind);
    const catId = guess ? (byName.get(`${p.kind}|${guess.toLowerCase()}`) ?? null) : null;
    const key = dupKey(p);
    const duplicate = existingKeys.has(key) || seen.has(key);
    seen.add(key);
    return {
      ...p,
      include: !duplicate,
      category_id: catId,
      categoryGuess: guess,
      duplicate,
    };
  });
}
