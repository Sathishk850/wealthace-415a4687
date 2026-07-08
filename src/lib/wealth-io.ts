/**
 * Generic CSV / XLSX / JSON / PDF import + export helpers for the Wealth module.
 */
import { toast } from "sonner";
import {
  REPORT_THEME,
  REPORT_TABLE_STYLES,
  drawReportFooter,
  drawReportHeader,
} from "@/lib/report-theme";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeName(name: string) {
  return name.replace(/[^a-z0-9-_]+/gi, "_");
}

function csvCell(s: unknown) {
  const v = s == null ? "" : String(s);
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export type Column<T> = { key: keyof T | string; label: string; get?: (row: T) => unknown };

/** Convert a column list + rows into a CSV string. */
export function toCsv<T>(cols: Column<T>[], rows: T[]) {
  const header = cols.map((c) => csvCell(c.label)).join(",");
  const body = rows
    .map((r) =>
      cols
        .map((c) => csvCell(c.get ? c.get(r) : (r as any)[c.key as string]))
        .join(","),
    )
    .join("\n");
  return header + "\n" + body;
}

export function exportCsv<T>(name: string, cols: Column<T>[], rows: T[]) {
  const csv = toCsv(cols, rows);
  downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${safeName(name)}.csv`);
}

export async function exportXlsx<T>(name: string, cols: Column<T>[], rows: T[]) {
  const XLSX = await import("xlsx");
  const aoa: any[][] = [cols.map((c) => c.label)];
  for (const r of rows) {
    aoa.push(cols.map((c) => (c.get ? c.get(r) : (r as any)[c.key as string]) ?? ""));
  }
  const ws = XLSX.utils.aoa_to_sheet(aoa);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, name.slice(0, 28) || "Sheet1");
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([out], { type: "application/octet-stream" }),
    `${safeName(name)}.xlsx`,
  );
}

export function exportJson<T>(name: string, rows: T[]) {
  downloadBlob(
    new Blob([JSON.stringify(rows, null, 2)], { type: "application/json" }),
    `${safeName(name)}.json`,
  );
}

export async function exportPdf<T>(
  name: string,
  cols: Column<T>[],
  rows: T[],
  meta?: { subtitle?: string; footer?: string },
) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "landscape" });
  const generated = new Date().toLocaleString();
  const startY = drawReportHeader(doc, {
    title: name,
    subtitle: meta?.subtitle ?? `Generated ${generated}`,
  });
  autoTable(doc, {
    startY,
    head: [cols.map((c) => c.label)],
    body: rows.map((r) =>
      cols.map((c) => {
        const v = c.get ? c.get(r) : (r as any)[c.key as string];
        return v == null ? "" : String(v);
      }),
    ),
    margin: { left: REPORT_THEME.layout.marginX, right: REPORT_THEME.layout.marginX, bottom: REPORT_THEME.layout.footerHeight + 12 },
    ...REPORT_TABLE_STYLES,
  });
  drawReportFooter(doc, meta?.footer ? { note: meta.footer } : undefined);
  doc.save(`${safeName(name)}.pdf`);
}

/** Parse a CSV file into rows of { [header]: string }. */
async function parseCsvFile(file: File): Promise<Record<string, string>[]> {
  const text = await file.text();
  // Simple CSV parser supporting quoted fields.
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
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") {
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
  }
  if (cell.length || cur.length) {
    cur.push(cell);
    rows.push(cur);
  }
  const cleaned = rows.filter((r) => r.length && r.some((c) => c.length));
  if (!cleaned.length) return [];
  const headers = cleaned[0].map((h) => h.trim());
  return cleaned.slice(1).map((r) => {
    const obj: Record<string, string> = {};
    headers.forEach((h, idx) => (obj[h] = (r[idx] ?? "").trim()));
    return obj;
  });
}

async function parseXlsxFile(file: File): Promise<Record<string, unknown>[]> {
  const XLSX = await import("xlsx");
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
}

async function parseJsonFile(file: File): Promise<unknown[]> {
  const text = await file.text();
  const data = JSON.parse(text);
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") return [data];
  return [];
}

/**
 * Open a file picker and parse the chosen file (CSV/XLSX/JSON).
 * Returns array of plain row objects keyed by header label.
 */
export function pickAndParse(): Promise<Record<string, unknown>[] | null> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,.xlsx,.xls,.json";
    input.onchange = async () => {
      const f = input.files?.[0];
      if (!f) return resolve(null);
      try {
        const ext = (f.name.split(".").pop() || "").toLowerCase();
        if (ext === "json") resolve((await parseJsonFile(f)) as any);
        else if (ext === "xlsx" || ext === "xls") resolve(await parseXlsxFile(f));
        else resolve((await parseCsvFile(f)) as any);
      } catch (e: any) {
        toast.error(e?.message || "Failed to parse file");
        resolve(null);
      }
    };
    input.click();
  });
}