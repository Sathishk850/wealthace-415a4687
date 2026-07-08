import type { GeneratedReport, ReportSection } from "@/lib/notifications-api";
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

export function exportReportCSV(report: GeneratedReport) {
  const lines: string[] = [];
  for (const sec of report.snapshot.sections) {
    lines.push(`# ${sec.title}`);
    if (sec.summary.length) {
      lines.push(sec.summary.map((s) => `${s.label}: ${s.value}`).join(" | "));
    }
    lines.push(sec.columns.map(csvCell).join(","));
    for (const row of sec.rows) lines.push(row.map((c) => csvCell(String(c))).join(","));
    lines.push("");
  }
  downloadBlob(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }), `${safeName(report.name)}.csv`);
}

function csvCell(s: string) {
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export async function exportReportXLSX(report: GeneratedReport) {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  for (const sec of report.snapshot.sections) {
    const aoa: any[][] = [];
    if (sec.summary.length) {
      aoa.push(sec.summary.map((s) => `${s.label}: ${s.value}`));
      aoa.push([]);
    }
    aoa.push(sec.columns);
    for (const row of sec.rows) aoa.push(row);
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    // FinVista header row styling (basic — SheetJS community build doesn't
    // persist rich styles, but we set cell types cleanly for print layout).
    const headerRowIdx = sec.summary.length ? 2 : 0;
    for (let c = 0; c < sec.columns.length; c++) {
      const addr = XLSX.utils.encode_cell({ r: headerRowIdx, c });
      if (ws[addr]) ws[addr].s = { font: { bold: true, color: { rgb: "0F172A" } }, fill: { fgColor: { rgb: "21DBD2" } } };
    }
    XLSX.utils.book_append_sheet(wb, ws, sec.title.slice(0, 28) || sec.key);
  }
  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  downloadBlob(new Blob([out], { type: "application/octet-stream" }), `${safeName(report.name)}.xlsx`);
}

export async function exportReportPDF(report: GeneratedReport) {
  const { jsPDF } = await import("jspdf");
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const period = report.snapshot.period;
  const periodLabel = period.start && period.end ? `${period.start} → ${period.end}` : "All time";
  const subtitle = `${periodLabel}  ·  Generated ${new Date(report.generated_at).toLocaleString()}`;
  let y = drawReportHeader(doc, { title: report.name, subtitle });

  for (const sec of report.snapshot.sections) {
    if (y > 720) { doc.addPage(); y = drawReportHeader(doc, { title: report.name, subtitle }); }
    doc.setFont(REPORT_THEME.font.family, "bold");
    doc.setFontSize(12);
    doc.setTextColor(...REPORT_THEME.color.heading);
    doc.text(sec.title, REPORT_THEME.layout.marginX, y);
    y += 12;
    if (sec.summary.length) {
      doc.setFont(REPORT_THEME.font.family, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...REPORT_THEME.color.muted);
      doc.text(
        sec.summary.map((s) => `${s.label}: ${s.value}`).join("   "),
        REPORT_THEME.layout.marginX,
        y,
      );
      y += 10;
    }
    autoTable(doc, {
      startY: y + 4,
      head: [sec.columns],
      body: (sec.rows.length ? sec.rows : [["—"]]).map((r) => r.map((c) => String(c))),
      margin: { left: REPORT_THEME.layout.marginX, right: REPORT_THEME.layout.marginX, bottom: REPORT_THEME.layout.footerHeight + 12 },
      tableWidth: pageW - REPORT_THEME.layout.marginX * 2,
      ...REPORT_TABLE_STYLES,
      styles: { ...REPORT_TABLE_STYLES.styles, fontSize: 8, cellPadding: 4 },
    });
    // @ts-ignore — autotable attaches lastAutoTable to doc
    y = (doc as any).lastAutoTable.finalY + 22;
  }
  drawReportFooter(doc);
  doc.save(`${safeName(report.name)}.pdf`);
}