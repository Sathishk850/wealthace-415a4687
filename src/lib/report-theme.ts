/**
 * FinVista Premium Light Theme — shared brand tokens for exported reports
 * (PDF, XLSX print layout, future export formats).
 *
 * Reports must ALWAYS render in this light theme regardless of the app's
 * runtime theme (light / dark / system). Do not read CSS variables here —
 * app theme must never leak into exports.
 */

export const REPORT_THEME = {
  brand: {
    name: "FinVista",
    tagline: "Personal Wealth OS",
  },
  // RGB tuples so jsPDF / jspdf-autotable can consume directly.
  color: {
    background: [255, 255, 255] as [number, number, number],
    surfaceAlt: [247, 250, 252] as [number, number, number], // zebra rows
    primary: [33, 219, 210] as [number, number, number],     // #21DBD2 mint
    primaryInk: [15, 23, 42] as [number, number, number],    // on-primary
    secondary: [14, 165, 233] as [number, number, number],   // #0EA5E9
    accent: [22, 163, 74] as [number, number, number],       // #16A34A
    heading: [13, 34, 50] as [number, number, number],       // deep navy for titles
    body: [15, 23, 42] as [number, number, number],          // #0F172A
    muted: [100, 116, 139] as [number, number, number],      // #64748B
    border: [216, 228, 236] as [number, number, number],     // #D8E4EC
    totalsBg: [225, 250, 248] as [number, number, number],   // mint 10%
  },
  // Aligned with the app's --chart-1..5 tokens so exports match dashboards.
  chartPalette: [
    "#21DBD2",
    "#0EA5E9",
    "#16A34A",
    "#F59E0B",
    "#DC2626",
    "#9B5DE5",
  ] as const,
  // Hex forms for XLSX (ARGB, no '#').
  hex: {
    primary: "FF21DBD2",
    primaryInk: "FF0F172A",
    heading: "FF0D2232",
    surfaceAlt: "FFF7FAFC",
    border: "FFD8E4EC",
    totalsBg: "FFE1FAF8",
    white: "FFFFFFFF",
  },
  layout: {
    marginX: 40,
    marginY: 44,
    headerHeight: 72,
    footerHeight: 28,
    radius: 6,
  },
  font: {
    // jsPDF built-ins — Helvetica reads cleanly in print and matches Inter tone.
    family: "helvetica",
  },
} as const;

type JsPDFLike = {
  internal: { pageSize: { getWidth: () => number; getHeight: () => number }; getNumberOfPages: () => number };
  setPage: (n: number) => void;
  setFont: (family: string, style?: string) => void;
  setFontSize: (size: number) => void;
  setTextColor: (r: number, g?: number, b?: number) => void;
  setDrawColor: (r: number, g?: number, b?: number) => void;
  setFillColor: (r: number, g?: number, b?: number) => void;
  setLineWidth: (w: number) => void;
  rect: (x: number, y: number, w: number, h: number, style?: string) => void;
  line: (x1: number, y1: number, x2: number, y2: number) => void;
  text: (text: string | string[], x: number, y: number, opts?: unknown) => void;
  circle?: (x: number, y: number, r: number, style?: string) => void;
};

/**
 * Draw the FinVista document header on the current page: brand mark + wordmark,
 * report title, subtitle, and an accent divider. Returns the Y-coordinate where
 * body content should begin.
 */
export function drawReportHeader(
  doc: JsPDFLike,
  opts: { title: string; subtitle?: string },
) {
  const { color, layout, brand, font } = REPORT_THEME;
  const pageW = doc.internal.pageSize.getWidth();
  const x = layout.marginX;
  const y = layout.marginY;

  // Brand mark — mint rounded square with white "FV"
  const markSize = 26;
  doc.setFillColor(...color.primary);
  doc.rect(x, y - 18, markSize, markSize, "F");
  doc.setFont(font.family, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...color.primaryInk);
  doc.text("FV", x + markSize / 2, y - 18 + markSize / 2 + 4.5, { align: "center" } as never);

  // Wordmark
  doc.setFont(font.family, "bold");
  doc.setFontSize(15);
  doc.setTextColor(...color.heading);
  doc.text(brand.name, x + markSize + 10, y - 2);
  doc.setFont(font.family, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...color.muted);
  doc.text(brand.tagline, x + markSize + 10, y + 9);

  // Report title (right aligned)
  doc.setFont(font.family, "bold");
  doc.setFontSize(16);
  doc.setTextColor(...color.heading);
  doc.text(opts.title, pageW - layout.marginX, y - 2, { align: "right" } as never);
  if (opts.subtitle) {
    doc.setFont(font.family, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...color.muted);
    doc.text(opts.subtitle, pageW - layout.marginX, y + 11, { align: "right" } as never);
  }

  // Accent divider
  const dividerY = y + 22;
  doc.setDrawColor(...color.border);
  doc.setLineWidth(0.5);
  doc.line(x, dividerY, pageW - layout.marginX, dividerY);
  doc.setDrawColor(...color.primary);
  doc.setLineWidth(1.2);
  doc.line(x, dividerY, x + 60, dividerY);

  return dividerY + 18;
}

/**
 * Draw a consistent footer (brand + page N of M + optional note) on every page.
 * Call after all content has been written.
 */
export function drawReportFooter(doc: JsPDFLike, opts?: { note?: string }) {
  const { color, layout, brand, font } = REPORT_THEME;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = doc.internal.getNumberOfPages();
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const y = pageH - layout.footerHeight + 10;
    doc.setDrawColor(...color.border);
    doc.setLineWidth(0.5);
    doc.line(layout.marginX, y - 10, pageW - layout.marginX, y - 10);
    doc.setFont(font.family, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...color.muted);
    doc.text(`${brand.name} · ${brand.tagline}`, layout.marginX, y);
    if (opts?.note) {
      doc.text(opts.note, pageW / 2, y, { align: "center" } as never);
    }
    doc.text(`Page ${p} of ${total}`, pageW - layout.marginX, y, { align: "right" } as never);
  }
}

/** Shared jspdf-autotable style bundle in FinVista brand. */
export const REPORT_TABLE_STYLES = {
  styles: {
    font: REPORT_THEME.font.family,
    fontSize: 9,
    cellPadding: 5,
    textColor: REPORT_THEME.color.body,
    lineColor: REPORT_THEME.color.border,
    lineWidth: 0.25,
  },
  headStyles: {
    fillColor: REPORT_THEME.color.primary,
    textColor: REPORT_THEME.color.primaryInk,
    fontStyle: "bold" as const,
    halign: "left" as const,
  },
  alternateRowStyles: {
    fillColor: REPORT_THEME.color.surfaceAlt,
  },
  footStyles: {
    fillColor: REPORT_THEME.color.totalsBg,
    textColor: REPORT_THEME.color.heading,
    fontStyle: "bold" as const,
  },
};