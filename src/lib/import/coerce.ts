/**
 * Universal Import Engine — value coercion layer.
 *
 * Pure functions that turn arbitrary spreadsheet/report cell values into
 * WealthAce canonical primitives. Handles international number formats,
 * currency glyphs, parentheses negatives, percentages, booleans and a wide
 * range of date formats. No React, no network, no side effects.
 */

export type CellValue = unknown;

export const CURRENCY_GLYPHS: Record<string, string> = {
  "₹": "INR",
  $: "USD",
  "€": "EUR",
  "£": "GBP",
  "USh": "UGX",
};

/** Detect a currency code from a raw cell ("₹1,200", "USD 45", "45 EUR"). */
export function detectCurrency(raw: CellValue): string | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const code = s.toUpperCase().match(/\b(INR|USD|EUR|GBP|UGX|AED|SGD|JPY|AUD|CAD|CHF)\b/);
  if (code) return code[1];
  for (const [glyph, cur] of Object.entries(CURRENCY_GLYPHS)) {
    if (s.includes(glyph)) return cur;
  }
  if (/\bRs\.?\b/i.test(s)) return "INR";
  return null;
}

/**
 * Parse a number out of a messy cell.
 * Supports: "1,234.56", "1.234,56", "(1,200)", "-1200", "₹ 1,200/-", "12%",
 * "1.2K", "3.4L", "2Cr", "1.1M", "45 Cr.".
 */
export function toNumber(raw: CellValue): number | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "boolean") return raw ? 1 : 0;
  if (raw instanceof Date) return raw.getTime();

  let s = String(raw).trim();
  if (!s) return null;
  if (/^(na|n\/a|nil|none|-|--|—)$/i.test(s)) return null;

  let sign = 1;
  // Accounting negatives: (1,200) or 1,200 Dr / Cr handled by callers.
  if (/^\(.*\)$/.test(s)) {
    sign = -1;
    s = s.slice(1, -1);
  }
  if (/^-/.test(s.replace(/[^\d.,-]/g, ""))) sign *= 1; // keep, handled below

  const lower = s.toLowerCase();
  let scale = 1;
  if (/\bcr\.?\b|\bcrore/.test(lower)) scale = 1e7;
  else if (/\blac\b|\blakh|\bl\b(?!\w)/.test(lower) && !/\bltp\b/.test(lower)) scale = 1e5;
  else if (/\bmn\b|\bmillion\b|\d\s*m\b/.test(lower)) scale = 1e6;
  else if (/\bbn\b|\bbillion\b/.test(lower)) scale = 1e9;
  else if (/\d\s*k\b/.test(lower)) scale = 1e3;

  // Strip everything that is not digits / separators / sign / exponent.
  s = s.replace(/[^\d.,\-+eE]/g, "");
  if (!s || s === "-" || s === "+") return null;

  const neg = s.startsWith("-");
  s = s.replace(/[-+]/g, "");

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) s = s.replace(/\./g, "").replace(",", ".");
    else s = s.replace(/,/g, "");
  } else if (hasComma) {
    const parts = s.split(",");
    // "150,50" → decimal comma; "1,50,000" / "1,234" → thousands sep.
    if (parts.length === 2 && parts[1].length > 0 && parts[1].length !== 3) {
      s = parts[0] + "." + parts[1];
    } else {
      s = s.replace(/,/g, "");
    }
  }

  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return (neg ? -n : n) * sign * scale;
}

/** Parse a percentage cell into a plain number (12.5% → 12.5). */
export function toPercent(raw: CellValue): number | null {
  const n = toNumber(raw);
  if (n == null) return null;
  // A fraction like 0.125 written where a percent is expected.
  if (typeof raw === "number" && Math.abs(n) > 0 && Math.abs(n) < 1) return n * 100;
  return n;
}

const MONTHS: Record<string, number> = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, sept: 9, oct: 10, nov: 11, dec: 12,
};

function iso(y: number, m: number, d: number): string | null {
  if (!y || !m || !d) return null;
  if (y < 100) y += y > 70 ? 1900 : 2000;
  if (m < 1 || m > 12 || d < 1 || d > 31 || y < 1900 || y > 2200) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Parse a date cell into `YYYY-MM-DD`.
 * Handles ISO, DD/MM/YYYY, MM/DD/YYYY (when unambiguous), DD-MMM-YYYY,
 * "12 Aug 2025", "Aug 12, 2025", Excel serial numbers and JS Dates.
 * Ambiguous numeric dates default to day-first (Indian/EU convention).
 */
export function toDate(raw: CellValue, preferMonthFirst = false): string | null {
  if (raw == null || raw === "") return null;
  if (raw instanceof Date && !isNaN(raw.getTime())) {
    return iso(raw.getUTCFullYear(), raw.getUTCMonth() + 1, raw.getUTCDate());
  }
  if (typeof raw === "number" && Number.isFinite(raw)) {
    // Excel serial date (days since 1899-12-30).
    if (raw > 20000 && raw < 80000) {
      const ms = Math.round((raw - 25569) * 86400000);
      const d = new Date(ms);
      return iso(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
    }
    return null;
  }
  const s = String(raw).trim();
  if (!s || /^(na|n\/a|nil|none|-|--)$/i.test(s)) return null;

  // ISO / YYYY-MM-DD (or with time)
  let m = s.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/);
  if (m) return iso(+m[1], +m[2], +m[3]);

  // 12-Aug-2025 / 12 Aug 25 / 12.August.2025
  m = s.match(/^(\d{1,2})[\s\-/.]*([A-Za-z]{3,})[\s\-/.,]*(\d{2,4})/);
  if (m) {
    const mo = MONTHS[m[2].slice(0, 4).toLowerCase()] ?? MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mo) return iso(+m[3], mo, +m[1]);
  }

  // Aug 12, 2025 / August 12 2025
  m = s.match(/^([A-Za-z]{3,})[\s\-/.]*(\d{1,2})[\s\-/.,]+(\d{2,4})/);
  if (m) {
    const mo = MONTHS[m[1].slice(0, 4).toLowerCase()] ?? MONTHS[m[1].slice(0, 3).toLowerCase()];
    if (mo) return iso(+m[3], mo, +m[2]);
  }

  // Numeric d/m/y or m/d/y
  m = s.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/);
  if (m) {
    const a = +m[1];
    const b = +m[2];
    const y = +m[3];
    if (a > 12) return iso(y, b, a);
    if (b > 12) return iso(y, a, b);
    return preferMonthFirst ? iso(y, a, b) : iso(y, b, a);
  }

  const parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return iso(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
  }
  return null;
}

const TRUE_WORDS = ["true", "yes", "y", "1", "active", "on", "enabled"];
const FALSE_WORDS = ["false", "no", "n", "0", "inactive", "off", "disabled"];

export function toBoolean(raw: CellValue): boolean | null {
  if (typeof raw === "boolean") return raw;
  const s = String(raw ?? "").trim().toLowerCase();
  if (!s) return null;
  if (TRUE_WORDS.includes(s)) return true;
  if (FALSE_WORDS.includes(s)) return false;
  return null;
}

export function toText(raw: CellValue): string | null {
  if (raw == null) return null;
  if (raw instanceof Date) return toDate(raw);
  const s = String(raw).trim().replace(/\s+/g, " ");
  return s.length ? s : null;
}

/* -------------------- header + type detection -------------------- */

/** Normalise a header for comparison: lowercase, alnum tokens only. */
export function normalizeHeader(h: unknown): string {
  return String(h ?? "")
    .replace(/[\u00A0]/g, " ")
    .toLowerCase()
    .replace(/\(.*?\)/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function headerTokens(h: unknown): string[] {
  return normalizeHeader(h).split(" ").filter(Boolean);
}

export type DetectedType = "number" | "date" | "boolean" | "percent" | "string" | "empty";

/** Sniff the dominant data type of a column from its sample values. */
export function detectColumnType(values: CellValue[]): DetectedType {
  const samples = values.filter((v) => v != null && String(v).trim() !== "").slice(0, 40);
  if (!samples.length) return "empty";
  let num = 0;
  let date = 0;
  let bool = 0;
  let pct = 0;
  for (const v of samples) {
    if (String(v).includes("%")) pct++;
    if (toBoolean(v) != null) bool++;
    if (toDate(v) != null && !/^\d+(\.\d+)?$/.test(String(v).trim())) date++;
    else if (toNumber(v) != null) num++;
  }
  const n = samples.length;
  if (pct / n > 0.6) return "percent";
  if (date / n > 0.7) return "date";
  if (bool / n > 0.8) return "boolean";
  if (num / n > 0.7) return "number";
  return "string";
}
