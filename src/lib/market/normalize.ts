// Shared price normalization helpers for market data providers.
// Server-safe (no browser globals). Keeps parsing behavior consistent.

/**
 * Normalize a raw numeric field (string | number | unknown) into a finite
 * positive number, or null if it cannot be parsed. Handles:
 *  - leading/trailing whitespace
 *  - thousands separators (US "1,234.56" and EU "1.234,56")
 *  - stray currency glyphs / letters
 *  - NaN / Infinity / zero / negative → null
 */
export function normalizePrice(raw: unknown): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw > 0 ? raw : null;
  }
  if (typeof raw !== "string") return null;
  let s = raw.trim();
  if (!s) return null;
  // Strip anything that isn't digit / separator / sign / exponent
  s = s.replace(/[^\d.,\-+eE]/g, "");
  if (!s) return null;

  const hasDot = s.includes(".");
  const hasComma = s.includes(",");
  if (hasDot && hasComma) {
    // Whichever appears LAST is the decimal separator.
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (hasComma) {
    // Only commas: treat as decimal separator if it looks like "150,50"
    // (single comma, <=3 digits after). Otherwise strip as thousands sep.
    const parts = s.split(",");
    if (parts.length === 2 && parts[1].length <= 3 && !/^\d{3}$/.test(parts[1])) {
      s = parts[0] + "." + parts[1];
    } else {
      s = s.replace(/,/g, "");
    }
  }
  const n = parseFloat(s);
  return Number.isFinite(n) && n > 0 ? n : null;
}

/** Validate a currency code. Returns uppercase 3-letter code or null. */
export function normalizeCurrency(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim().toUpperCase();
  return /^[A-Z]{3}$/.test(s) ? s : null;
}

/** Wrap a fetch with a hard timeout. Rejects with a descriptive error. */
export async function fetchWithTimeout(
  url: string,
  init: RequestInit = {},
  timeoutMs = 15_000,
): Promise<Response> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (err) {
    if ((err as { name?: string })?.name === "AbortError") {
      throw new Error(`Request timed out after ${timeoutMs}ms: ${url}`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
