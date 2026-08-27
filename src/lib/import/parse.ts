/**
 * Universal Import Engine — RAW IMPORT layer.
 *
 * Parses CSV / TSV / XLSX / XLS / JSON / PDF into a raw grid, then detects the
 * real header row inside messy bank/broker reports (title banners, blank
 * rows, footer totals) and returns raw rows exactly as received plus column
 * metadata. Nothing here knows about WealthAce modules.
 */
import { detectColumnType, normalizeHeader, type DetectedType } from "./coerce";

export type RawColumn = {
  index: number;
  header: string;
  normalized: string;
  type: DetectedType;
  samples: string[];
  emptyRatio: number;
};

export type ParsedFile = {
  fileName: string;
  fileType: "csv" | "tsv" | "xlsx" | "json" | "pdf";
  sheetName?: string;
  columns: RawColumn[];
  /** Raw rows keyed by original header label — untouched values. */
  rows: Record<string, unknown>[];
  /** Rows before blank/garbage filtering. */
  totalRows: number;
  skippedRows: number;
  /** Lines above the header row (report title / account banner). */
  preamble: string[];
};

/* ----------------------------- CSV / TSV ----------------------------- */

function splitDelimited(text: string, delimiter: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else inQ = false;
      } else cell += ch;
    } else if (ch === '"') inQ = true;
    else if (ch === delimiter) {
      cur.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      cur.push(cell);
      rows.push(cur);
      cur = [];
      cell = "";
    } else cell += ch;
  }
  if (cell.length || cur.length) {
    cur.push(cell);
    rows.push(cur);
  }
  return rows.map((r) => r.map((c) => c.trim()));
}

function guessDelimiter(text: string): string {
  const sample = text.split(/\r?\n/).slice(0, 20).join("\n");
  const counts: Record<string, number> = {
    ",": (sample.match(/,/g) || []).length,
    "\t": (sample.match(/\t/g) || []).length,
    ";": (sample.match(/;/g) || []).length,
    "|": (sample.match(/\|/g) || []).length,
  };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
}

/* ------------------------- header row detection ------------------------- */

function looksNumeric(v: string) {
  return /^[\s(]*[-+]?[₹$€£]?\s*[\d.,]+\s*%?\)?$/.test(v) && /\d/.test(v);
}

/**
 * Score each of the first rows as a candidate header: mostly non-empty,
 * mostly non-numeric, distinct labels, and a width close to the modal width.
 */
function detectHeaderRow(grid: string[][]): number {
  const widths = new Map<number, number>();
  for (const r of grid) {
    const w = r.filter((c) => c !== "").length;
    if (w > 1) widths.set(w, (widths.get(w) ?? 0) + 1);
  }
  let modal = 0;
  let bestCount = 0;
  for (const [w, n] of widths) {
    if (n > bestCount || (n === bestCount && w > modal)) {
      modal = w;
      bestCount = n;
    }
  }
  let bestIdx = 0;
  let bestScore = -Infinity;
  const limit = Math.min(grid.length, 30);
  for (let i = 0; i < limit; i++) {
    const row = grid[i];
    const filled = row.filter((c) => c !== "");
    if (filled.length < 2) continue;
    const numeric = filled.filter(looksNumeric).length;
    const distinct = new Set(filled.map((c) => c.toLowerCase())).size;
    const score =
      filled.length * 2 -
      numeric * 6 +
      distinct * 1.5 -
      Math.abs(filled.length - modal) * 2 -
      i * 0.6;
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  return bestIdx;
}

function gridToRows(grid: string[][]) {
  const headerIdx = detectHeaderRow(grid);
  const preamble = grid
    .slice(0, headerIdx)
    .map((r) => r.filter(Boolean).join(" · "))
    .filter(Boolean);

  const rawHeaders = grid[headerIdx] ?? [];
  const seen = new Map<string, number>();
  const headers = rawHeaders.map((h, i) => {
    let label = (h || "").replace(/\s+/g, " ").trim() || `Column ${i + 1}`;
    const n = seen.get(label.toLowerCase()) ?? 0;
    seen.set(label.toLowerCase(), n + 1);
    if (n > 0) label = `${label} (${n + 1})`;
    return label;
  });

  const body = grid.slice(headerIdx + 1);
  let skipped = 0;
  const rows: Record<string, unknown>[] = [];
  for (const r of body) {
    const filled = r.filter((c) => String(c ?? "").trim() !== "");
    // Blank rows and single-cell footer/total banners.
    if (filled.length < 2) {
      skipped++;
      continue;
    }
    const joined = filled.join(" ").toLowerCase();
    if (/^(grand )?total\b/.test(joined) || /^(sub ?total|closing balance|opening balance)\b/.test(joined)) {
      skipped++;
      continue;
    }
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => (obj[h] = r[i] ?? ""));
    rows.push(obj);
  }
  return { headers, rows, skipped, preamble, totalRows: body.length };
}

function buildColumns(headers: string[], rows: Record<string, unknown>[]): RawColumn[] {
  return headers.map((h, index) => {
    const values = rows.map((r) => r[h]);
    const nonEmpty = values.filter((v) => v != null && String(v).trim() !== "");
    return {
      index,
      header: h,
      normalized: normalizeHeader(h),
      type: detectColumnType(values),
      samples: nonEmpty.slice(0, 4).map((v) => String(v)),
      emptyRatio: values.length ? 1 - nonEmpty.length / values.length : 1,
    };
  });
}

/* ------------------------------- entry ------------------------------- */

/**
 * Parse any supported file into a raw grid.
 * `password` is only used to open encrypted PDF/XLSX files; it is never
 * stored, logged or returned.
 */
export async function parseImportFile(file: File, password?: string): Promise<ParsedFile> {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  const hadPassword = !!password;

  if (ext === "json") {
    const data = JSON.parse(await file.text());
    const arr: Record<string, unknown>[] = Array.isArray(data) ? data : [data];
    const headers = Array.from(new Set(arr.flatMap((r) => Object.keys(r ?? {}))));
    const rows = arr.filter((r) => r && typeof r === "object");
    return {
      fileName: file.name,
      fileType: "json",
      columns: buildColumns(headers, rows),
      rows,
      totalRows: arr.length,
      skippedRows: arr.length - rows.length,
      preamble: [],
    };
  }

  if (ext === "xlsx" || ext === "xls" || ext === "xlsm") {
    if (!hadPassword && (await looksEncryptedWorkbook(file, ext))) {
      throw new ImportPasswordRequiredError(false);
    }
    const XLSX = await import("xlsx");
    let wb: any;
    try {
      wb = XLSX.read(await file.arrayBuffer(), {
        type: "array",
        cellDates: true,
        ...(password ? { password } : {}),
      });
    } catch (e) {
      throw normalizeParseError(e, hadPassword);
    }
    // Pick the sheet with the most usable rows.
    let best = { name: wb.SheetNames[0], grid: [] as string[][] };
    for (const name of wb.SheetNames) {
      const grid = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], {
        header: 1,
        defval: "",
        raw: false,
        blankrows: false,
      }) as unknown as string[][];
      if (grid.length > best.grid.length) best = { name, grid };
    }
    const { headers, rows, skipped, preamble, totalRows } = gridToRows(
      best.grid.map((r) => r.map((c) => (c == null ? "" : String(c).trim()))),
    );
    return {
      fileName: file.name,
      fileType: "xlsx",
      sheetName: best.name,
      columns: buildColumns(headers, rows),
      rows,
      totalRows,
      skippedRows: skipped,
      preamble,
    };
  }

  if (ext === "pdf") {
    const { pdfToGrid } = await import("@/lib/pdf-table");
    let grid: string[][];
    try {
      grid = await pdfToGrid(file, password);
    } catch (e) {
      throw normalizeParseError(e, hadPassword);
    }
    if (!grid.length) throw new Error("No table could be extracted from this PDF.");

    // Keep only rows matching the dominant width so column alignment holds.
    const counts = new Map<number, number>();
    for (const r of grid) counts.set(r.length, (counts.get(r.length) ?? 0) + 1);
    let width = 0;
    let bestN = 0;
    for (const [len, n] of counts) if (len > 1 && n > bestN) ((bestN = n), (width = len));
    const filtered = grid.filter((r) => r.length === width);
    const { headers, rows, skipped, preamble, totalRows } = gridToRows(filtered);
    return {
      fileName: file.name,
      fileType: "pdf",
      columns: buildColumns(headers, rows),
      rows,
      totalRows,
      skippedRows: skipped + (grid.length - filtered.length),
      preamble,
    };
  }

  // CSV / TSV / TXT fallback
  const text = await file.text();
  const delimiter = ext === "tsv" ? "\t" : guessDelimiter(text);
  const grid = splitDelimited(text.replace(/^\uFEFF/, ""), delimiter);
  if (!grid.length) throw new Error("This file appears to be empty.");
  const { headers, rows, skipped, preamble, totalRows } = gridToRows(grid);
  return {
    fileName: file.name,
    fileType: delimiter === "\t" ? "tsv" : "csv",
    columns: buildColumns(headers, rows),
    rows,
    totalRows,
    skippedRows: skipped,
    preamble,
  };
}

export const ACCEPTED_IMPORT_EXTENSIONS = ".csv,.tsv,.txt,.xls,.xlsx,.xlsm,.json,.pdf";
