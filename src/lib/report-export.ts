/**
 * Report Center adapter — turns a stored `GeneratedReport` into a
 * ReportDoc and delegates to the master engine (see report-engine.ts).
 * All PDF/XLSX/CSV exports share the same premium Wealth Ace template.
 */
import type { GeneratedReport, ReportSection } from "@/lib/notifications-api";
import {
  exportReport,
  reportIdFor,
  type ExportOptions,
  type ReportCategory,
  type ReportColumn,
  type ReportDoc,
  type ReportKPI,
  type ReportTable,
} from "@/lib/report-engine";

function detectCategory(name: string, keys: string[]): ReportCategory {
  const hay = `${name} ${keys.join(" ")}`.toLowerCase();
  if (hay.includes("transaction")) return "transactions";
  if (hay.includes("expense")) return "expense";
  if (hay.includes("income")) return "income";
  if (hay.includes("invest")) return "investment";
  if (hay.includes("net worth") || hay.includes("networth")) return "networth";
  if (hay.includes("tax")) return "tax";
  if (hay.includes("asset")) return "assets";
  if (hay.includes("liab")) return "liabilities";
  if (hay.includes("insurance")) return "insurance";
  if (hay.includes("budget")) return "budget";
  if (hay.includes("goal")) return "goal";
  return "generic";
}

function looksNumeric(values: (string | number)[]) {
  let n = 0;
  for (const v of values) {
    if (typeof v === "number") n++;
    else if (typeof v === "string" && v.trim() && /^-?[\d,.\s₹$€£¥%()]+$/.test(v)) n++;
  }
  return values.length > 0 && n / values.length > 0.6;
}

function sectionToTable(sec: ReportSection): ReportTable {
  const columns: ReportColumn[] = sec.columns.map((label, i) => {
    const col = sec.rows.map((r) => r[i]);
    const numeric = looksNumeric(col);
    return {
      key: label,
      label,
      align: numeric ? "right" : "left",
      format: numeric ? "number" : "text",
    };
  });
  return { title: sec.title, columns, rows: sec.rows };
}

export function reportToDoc(report: GeneratedReport): ReportDoc {
  const category = detectCategory(report.name, report.report_keys);
  const kpis: ReportKPI[] = [];
  for (const sec of report.snapshot.sections) {
    for (const s of sec.summary) kpis.push({ label: s.label, value: s.value });
  }
  const tables = report.snapshot.sections.map(sectionToTable);
  const period = report.snapshot.period;
  const doc: ReportDoc = {
    name: report.name,
    category,
    period: {
      start: period?.start ?? undefined,
      end: period?.end ?? undefined,
    },
    kpis: kpis.slice(0, 12),
    tables,
    notes: [
      "Generated using selected filters.",
      "Values as available in your Wealth Ace account at the report generation time.",
    ],
    sensitive: category === "tax",
  };
  doc.reportId = reportIdFor(doc, report.id);
  return doc;
}

/* ============ Backwards-compatible public API ============ */

export async function exportReportCSV(report: GeneratedReport) {
  await exportReport(reportToDoc(report), { format: "csv" } as ExportOptions);
}

export async function exportReportXLSX(report: GeneratedReport) {
  await exportReport(reportToDoc(report), { format: "xlsx" } as ExportOptions);
}

export async function exportReportPDF(report: GeneratedReport) {
  await exportReport(reportToDoc(report), { format: "pdf" } as ExportOptions);
}