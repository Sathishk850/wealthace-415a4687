import type { GeneratedReport, ReportSection } from "@/lib/notifications-api";

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

  doc.setFontSize(18);
  doc.text(report.name, 40, 50);
  doc.setFontSize(10);
  doc.setTextColor(120);
  const period = report.snapshot.period;
  const periodLabel = period.start && period.end ? `${period.start} → ${period.end}` : "All time";
  doc.text(`${periodLabel}  ·  Generated ${new Date(report.generated_at).toLocaleString()}`, 40, 68);

  let y = 90;
  for (const sec of report.snapshot.sections) {
    if (y > 720) { doc.addPage(); y = 50; }
    doc.setTextColor(20);
    doc.setFontSize(13);
    doc.text(sec.title, 40, y);
    y += 14;
    if (sec.summary.length) {
      doc.setFontSize(9);
      doc.setTextColor(120);
      doc.text(sec.summary.map((s) => `${s.label}: ${s.value}`).join("   "), 40, y);
      y += 12;
    }
    autoTable(doc, {
      startY: y + 4,
      head: [sec.columns],
      body: (sec.rows.length ? sec.rows : [["—"]]).map((r) => r.map((c) => String(c))),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [13, 34, 50], textColor: 220 },
      margin: { left: 40, right: 40 },
      tableWidth: pageW - 80,
    });
    // @ts-ignore — autotable attaches lastAutoTable to doc
    y = (doc as any).lastAutoTable.finalY + 24;
  }
  doc.save(`${safeName(report.name)}.pdf`);
}