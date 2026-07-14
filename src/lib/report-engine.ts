/**
 * FinVista Master Report Engine — single source of truth for every export.
 *
 * All PDF and Excel exports (Report Center scheduled reports, Wealth module
 * views, and any future report) route through here so they inherit the same
 * premium banking-style header/footer/theme/tables/KPIs/closing.
 *
 * CSV stays raw and is handled by the individual callers.
 */
import {
  REPORT_THEME,
  REPORT_TABLE_STYLES,
  CLOSING_BLOCK_HEIGHT,
  drawClosing,
  drawDisclaimer,
  drawDonut,
  drawKpiCards,
  drawNotes,
  drawReportFooter,
  drawReportHeader,
  drawReportInfo,
  loadBrandMark,
  measureDisclaimer,
  pdfSafeText,
} from "@/lib/report-theme";

/* ============ Types ============ */

export type ReportKPI = { label: string; value: string; sub?: string };

export type ReportChart = {
  type: "donut" | "pie";
  title: string;
  slices: { label: string; value: number; color?: string }[];
};

export type ReportColumnFormat = "text" | "number" | "currency" | "date";

export type ReportColumn = {
  key: string;
  label: string;
  align?: "left" | "right" | "center";
  format?: ReportColumnFormat;
  width?: number; // hint in %
};

export type ReportTable = {
  title?: string;
  columns: ReportColumn[];
  rows: (string | number)[][];
  totals?: (string | number)[];
};

export type ReportCategory =
  | "expense"
  | "income"
  | "investment"
  | "networth"
  | "tax"
  | "transactions"
  | "assets"
  | "liabilities"
  | "insurance"
  | "budget"
  | "goal"
  | "generic";

export type ReportDoc = {
  name: string;
  reportId?: string;
  category?: ReportCategory;
  period?: { start?: string; end?: string; label?: string };
  currency?: { code: string; symbol: string };
  filters?: { label: string; value: string }[];
  kpis?: ReportKPI[];
  charts?: ReportChart[];
  tables: ReportTable[];
  notes?: string[];
  disclaimer?: string;
  sensitive?: boolean;
};

export type ExportFormat = "pdf" | "xlsx" | "csv";

export type ExportOptions = {
  format: ExportFormat;
  paper?: "a4" | "letter";
  orientation?: "auto" | "portrait" | "landscape";
  includeSummary?: boolean;
  includeCharts?: boolean;
  includeNotes?: boolean;
  includeFilters?: boolean;
  filename?: string;
};

export const DEFAULT_EXPORT_OPTIONS: Required<
  Omit<ExportOptions, "format" | "filename">
> = {
  paper: "a4",
  orientation: "auto",
  includeSummary: true,
  includeCharts: true,
  includeNotes: true,
  includeFilters: true,
};

const DEFAULT_DISCLAIMER =
  "This report is generated automatically from data available in your FinVista account as of the report generation date and time. Please verify the information before using it for financial, taxation or legal purposes.";

const LANDSCAPE_CATS = new Set<ReportCategory>([
  "transactions",
  "investment",
  "assets",
  "liabilities",
  "networth",
  "tax",
]);

/* ============ Helpers ============ */

export function autoOrientation(
  category?: ReportCategory,
  override?: ExportOptions["orientation"],
): "portrait" | "landscape" {
  if (override && override !== "auto") return override;
  if (category && LANDSCAPE_CATS.has(category)) return "landscape";
  return "portrait";
}

export function reportIdFor(doc: ReportDoc, fallbackSeed?: string) {
  if (doc.reportId) return doc.reportId;
  const prefix = (doc.category ?? "rpt").slice(0, 3).toUpperCase();
  const seed = fallbackSeed ?? `${doc.name}-${Date.now()}`;
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return `${prefix}${String(h % 1_000_000).padStart(6, "0")}`;
}

function isoDate(s?: string | null) {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function safeName(s: string) {
  return s.replace(/\s+/g, "_").replace(/[^a-zA-Z0-9-_]+/g, "");
}

export function buildFilename(doc: ReportDoc, opts: ExportOptions): string {
  if (opts.filename && opts.filename.trim()) {
    const base = opts.filename.trim().replace(/\.[^.]+$/, "");
    return `${safeName(base)}.${opts.format}`;
  }
  const parts: string[] = ["FinVista", safeName(doc.name)];
  if (doc.period?.start && doc.period?.end) {
    parts.push(isoDate(doc.period.start), "to", isoDate(doc.period.end));
  } else if (doc.period?.start) {
    parts.push(isoDate(doc.period.start));
  } else {
    const t = new Date();
    parts.push(
      `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(
        t.getDate(),
      ).padStart(2, "0")}`,
    );
  }
  return `${parts.join("_")}.${opts.format}`;
}

function alignFor(col: ReportColumn): "left" | "right" | "center" {
  if (col.align) return col.align;
  if (col.format === "currency" || col.format === "number") return "right";
  return "left";
}

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

/* ============ PDF ============ */

export async function renderReportPdf(doc: ReportDoc, opts: ExportOptions) {
  const merged = { ...DEFAULT_EXPORT_OPTIONS, ...opts };
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const orientation = autoOrientation(doc.category, merged.orientation);
  const pdf = new jsPDF({
    unit: "pt",
    format: merged.paper === "letter" ? "letter" : "a4",
    orientation,
  });

  pdf.setProperties({
    title: doc.name,
    author: "FinVista",
    creator: "FinVista",
    subject: "Personal Finance Report",
    keywords: ["FinVista", doc.category ?? "report", doc.name].join(","),
  });

  const reportId = reportIdFor(doc);
  const generatedOn = new Date().toLocaleString();
  const { layout } = REPORT_THEME;
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const bodyBottom = pageH - layout.footerHeight - 8;

  const brandMark = await loadBrandMark();
  const drawHeader = () =>
    drawReportHeader(pdf, { generatedOn, reportId, brandMark });

  let y = drawHeader();
  y = drawReportInfo(pdf, y, {
    title: doc.name,
    period: doc.period,
    currency: doc.currency,
    filters: merged.includeFilters ? doc.filters : undefined,
  });

  const ensureSpace = (needed: number) => {
    if (y + needed > bodyBottom) {
      pdf.addPage();
      y = drawHeader();
    }
  };

  if (merged.includeSummary && doc.kpis?.length) {
    ensureSpace(80);
    y = drawKpiCards(pdf, y, doc.kpis);
  }

  if (merged.includeCharts && doc.charts?.length) {
    for (const ch of doc.charts) {
      ensureSpace(180);
      y = drawDonut(pdf, y, ch);
    }
  }

  for (const table of doc.tables) {
    if (table.title) {
      ensureSpace(28);
      pdf.setFont(REPORT_THEME.font.family, "bold");
      pdf.setFontSize(11);
      pdf.setTextColor(...REPORT_THEME.color.heading);
      pdf.text(pdfSafeText(table.title), layout.marginX, y + 4);
      y += 14;
    }
    const head = [table.columns.map((c) => pdfSafeText(c.label))];
    const body = table.rows.length
      ? table.rows.map((r) => r.map((c) => pdfSafeText(c)))
      : [table.columns.map(() => "—")];
    const foot = table.totals
      ? [table.totals.map((c) => pdfSafeText(c))]
      : undefined;
    const columnStyles: Record<number, { halign: "left" | "right" | "center" }> = {};
    table.columns.forEach((c, i) => {
      columnStyles[i] = { halign: alignFor(c) };
    });

    autoTable(pdf, {
      startY: y,
      head,
      body,
      foot,
      margin: {
        left: layout.marginX,
        right: layout.marginX,
        top: layout.marginY + 12,
        bottom: layout.footerHeight + 12,
      },
      tableWidth: pageW - layout.marginX * 2,
      ...REPORT_TABLE_STYLES,
      columnStyles,
      didDrawPage: () => {
        // Redraw header on any autoTable-inserted page.
        drawHeader();
      },
    });
    // @ts-ignore autotable attaches lastAutoTable
    y = (pdf as any).lastAutoTable.finalY + 12;
  }

  if (merged.includeNotes && doc.notes?.length) {
    const needed = 22 + doc.notes.length * 12;
    ensureSpace(needed);
    y = drawNotes(pdf, y, doc.notes);
  }

  // Tail (disclaimer + closing) rendered ONLY on the last page. Measure the
  // block, then anchor it just above the footer so short reports don't have
  // a floating closing marker in the middle of the page. The gap between
  // disclaimer and closing is intentionally tight (6pt) per spec.
  const disclaimer = doc.disclaimer ?? DEFAULT_DISCLAIMER;
  const disclaimerH = measureDisclaimer(pdf, disclaimer);
  const tailGap = 6;
  const tailH = disclaimerH + tailGap + CLOSING_BLOCK_HEIGHT;
  const minGapAboveTail = 14;
  if (y + minGapAboveTail + tailH > bodyBottom) {
    pdf.addPage();
    y = drawHeader();
  }
  const tailY = Math.max(y + minGapAboveTail, bodyBottom - tailH);
  const afterDisclaimer = drawDisclaimer(pdf, tailY, disclaimer);
  drawClosing(pdf, afterDisclaimer + tailGap);

  drawReportFooter(pdf, { sensitive: doc.sensitive });


  const filename = buildFilename(doc, { ...opts, format: "pdf" });
  pdf.save(filename);
}

/* ============ XLSX ============ */

export async function renderReportXlsx(doc: ReportDoc, opts: ExportOptions) {
  const merged = { ...DEFAULT_EXPORT_OPTIONS, ...opts };
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  wb.Props = {
    Title: doc.name,
    Author: "FinVista",
    Company: "FinVista",
    Subject: "Personal Finance Report",
    CreatedDate: new Date(),
  };

  const meta: any[][] = [
    ["FinVista", "Direct Your Wealth"],
    [doc.name],
  ];
  if (doc.period) {
    const p = doc.period.label
      ? doc.period.label
      : doc.period.start && doc.period.end
        ? `${doc.period.start} to ${doc.period.end}`
        : "All time";
    meta.push(["Report Period", p]);
  }
  if (doc.currency) meta.push(["Currency", `${doc.currency.code} (${doc.currency.symbol})`]);
  if (doc.reportId) meta.push(["Report ID", doc.reportId]);
  meta.push(["Generated On", new Date().toLocaleString()]);
  if (merged.includeFilters && doc.filters?.length) {
    meta.push([]);
    meta.push(["Applied Filters"]);
    doc.filters.forEach((f) => meta.push([f.label, f.value]));
  }
  if (merged.includeSummary && doc.kpis?.length) {
    meta.push([]);
    meta.push(["Summary"]);
    doc.kpis.forEach((k) =>
      meta.push([k.label, k.value, k.sub ?? ""].filter(Boolean) as string[]),
    );
  }
  const overview = XLSX.utils.aoa_to_sheet(meta);
  // Header styling on first two rows
  const brandCell = overview["A1"];
  if (brandCell)
    brandCell.s = {
      font: { bold: true, color: { rgb: "0F766E" }, sz: 16 },
    };
  const titleCell = overview["A2"];
  if (titleCell)
    titleCell.s = {
      font: { bold: true, color: { rgb: "0D2232" }, sz: 14 },
    };
  overview["!cols"] = [{ wch: 22 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, overview, "Overview");

  doc.tables.forEach((table, idx) => {
    const aoa: any[][] = [];
    if (table.title) aoa.push([table.title]);
    aoa.push(table.columns.map((c) => c.label));
    for (const row of table.rows) aoa.push(row.slice());
    if (table.totals) aoa.push(table.totals.slice());
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const headerRow = table.title ? 1 : 0;
    for (let c = 0; c < table.columns.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRow, c });
      if (ws[addr])
        ws[addr].s = {
          font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
          fill: { fgColor: { rgb: "0F766E" } },
          alignment: { horizontal: "left", vertical: "center" },
        };
    }
    // Column widths + print layout
    ws["!cols"] = table.columns.map(() => ({ wch: 18 }));
    ws["!pageSetup"] = {
      orientation: autoOrientation(doc.category, merged.orientation),
      paperSize: merged.paper === "letter" ? 1 : 9,
      fitToWidth: 1,
      fitToHeight: 0,
    } as any;
    // Repeat header row on every printed page
    (ws as any)["!print"] = { area: undefined, titles: `${headerRow + 1}:${headerRow + 1}` };
    const sheetName = (table.title || `Data ${idx + 1}`).slice(0, 28);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  });

  if (merged.includeNotes && (doc.notes?.length || doc.disclaimer)) {
    const notesAoa: any[][] = [["Notes"]];
    (doc.notes ?? []).forEach((n) => notesAoa.push([`• ${n}`]));
    notesAoa.push([]);
    notesAoa.push(["Disclaimer"]);
    notesAoa.push([doc.disclaimer ?? DEFAULT_DISCLAIMER]);
    const ws = XLSX.utils.aoa_to_sheet(notesAoa);
    ws["!cols"] = [{ wch: 100 }];
    XLSX.utils.book_append_sheet(wb, ws, "Notes");
  }

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(
    new Blob([out], { type: "application/octet-stream" }),
    buildFilename(doc, { ...opts, format: "xlsx" }),
  );
}

/* ============ CSV (raw) ============ */

function csvCell(s: unknown) {
  const v = s == null ? "" : String(s);
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g, '""')}"`;
  return v;
}

export function renderReportCsv(doc: ReportDoc, opts: ExportOptions) {
  const lines: string[] = [];
  doc.tables.forEach((table, idx) => {
    if (idx > 0) lines.push("");
    if (table.title) lines.push(`# ${table.title}`);
    lines.push(table.columns.map((c) => csvCell(c.label)).join(","));
    for (const row of table.rows) lines.push(row.map(csvCell).join(","));
    if (table.totals) lines.push(table.totals.map(csvCell).join(","));
  });
  downloadBlob(
    new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }),
    buildFilename(doc, { ...opts, format: "csv" }),
  );
}

/* ============ Public entry ============ */

export async function exportReport(doc: ReportDoc, opts: ExportOptions) {
  if (opts.format === "csv") return renderReportCsv(doc, opts);
  if (opts.format === "xlsx") return renderReportXlsx(doc, opts);
  return renderReportPdf(doc, opts);
}

/* ============ Preferences persistence (local, best-effort) ============ */

const PREF_KEY = "finvista:report-export-prefs:v1";

export function loadExportPrefs(): Partial<ExportOptions> {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(PREF_KEY) : null;
    return raw ? (JSON.parse(raw) as Partial<ExportOptions>) : {};
  } catch {
    return {};
  }
}

export function saveExportPrefs(opts: ExportOptions) {
  try {
    if (typeof localStorage === "undefined") return;
    const { filename: _filename, ...rest } = opts;
    localStorage.setItem(PREF_KEY, JSON.stringify(rest));
  } catch {
    /* ignore */
  }
}