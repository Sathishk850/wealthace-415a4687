/**
 * FinVista Premium Light Theme — shared brand tokens for exported reports
 * (PDF, XLSX print layout). Reports ALWAYS render in this light theme
 * regardless of the app's runtime theme (light / dark / system).
 */

export const REPORT_THEME = {
  brand: {
    name: "FinVista",
    tagline: "Direct Your Wealth",
  },
  color: {
    background: [255, 255, 255] as [number, number, number],
    surfaceAlt: [247, 250, 252] as [number, number, number],
    primary: [33, 219, 210] as [number, number, number],       // #21DBD2 mint
    primaryDeep: [15, 118, 110] as [number, number, number],   // deep mint for on-white text
    primaryInk: [15, 23, 42] as [number, number, number],
    secondary: [14, 165, 233] as [number, number, number],
    accent: [22, 163, 74] as [number, number, number],
    heading: [13, 34, 50] as [number, number, number],
    body: [15, 23, 42] as [number, number, number],
    muted: [100, 116, 139] as [number, number, number],
    border: [216, 228, 236] as [number, number, number],
    softBorder: [230, 238, 244] as [number, number, number],
    totalsBg: [225, 250, 248] as [number, number, number],
    cardBg: [255, 255, 255] as [number, number, number],
    kpiIconBg: [223, 248, 246] as [number, number, number],
  },
  chartPalette: [
    "#21DBD2",
    "#0EA5E9",
    "#16A34A",
    "#F59E0B",
    "#DC2626",
    "#9B5DE5",
  ] as const,
  hex: {
    primary: "FF21DBD2",
    primaryDeep: "FF0F766E",
    primaryInk: "FF0F172A",
    heading: "FF0D2232",
    surfaceAlt: "FFF7FAFC",
    border: "FFD8E4EC",
    totalsBg: "FFE1FAF8",
    white: "FFFFFFFF",
  },
  layout: {
    marginX: 36,
    marginY: 40,
    headerHeight: 86,
    footerHeight: 32,
    radius: 6,
  },
  font: { family: "helvetica" },
} as const;

type JsPDFLike = any;

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}

/**
 * Load the official FinVista fingerprint mark once and cache it as a
 * PNG data URL so jsPDF can embed it via addImage. Resolves to null when
 * the network fetch fails so the header falls back to the text tile.
 */
import brandMarkAsset from "@/assets/finvista-mark.png.asset.json";

let brandMarkPromise: Promise<string | null> | null = null;
export function loadBrandMark(): Promise<string | null> {
  if (brandMarkPromise) return brandMarkPromise;
  brandMarkPromise = (async () => {
    try {
      const res = await fetch(brandMarkAsset.url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onloadend = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  })();
  return brandMarkPromise;
}
export const BRAND_MARK_ASPECT = 462 / 582; // width / height of the fingerprint png

/**
 * Premium banking-style header. Left: FV mark + wordmark. Center: FINVISTA
 * / DIRECT YOUR WEALTH. Right: Generated On + Report ID. Thin brand divider.
 * Backwards compatible: `title` / `subtitle` still supported for older callers.
 */
export function drawReportHeader(
  doc: JsPDFLike,
  opts: {
    title?: string;
    subtitle?: string;
    generatedOn?: string;
    reportId?: string;
    brandMark?: string | null;
  },
) {
  const { color, layout, brand, font } = REPORT_THEME;
  const pageW = doc.internal.pageSize.getWidth();
  const x = layout.marginX;
  const top = layout.marginY - 20;

  // Left brand mark — official FinVista fingerprint logo when available,
  // otherwise fall back to the mint "FV" tile.
  const markSize = 32;
  if (opts.brandMark) {
    const w = markSize * BRAND_MARK_ASPECT;
    doc.addImage(opts.brandMark, "PNG", x, top - 1, w, markSize, undefined, "FAST");
  } else {
    doc.setFillColor(...color.primary);
    doc.roundedRect(x, top, markSize, markSize, 5, 5, "F");
    doc.setFont(font.family, "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("FV", x + markSize / 2, top + markSize / 2 + 5, { align: "center" });
  }
  const markW = opts.brandMark ? markSize * BRAND_MARK_ASPECT : markSize;

  // Left wordmark
  doc.setFont(font.family, "bold");
  doc.setFontSize(15);
  doc.setTextColor(...color.heading);
  doc.text(brand.name, x + markW + 10, top + 12);
  doc.setFont(font.family, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...color.muted);
  doc.text(brand.tagline, x + markW + 10, top + 23);

  // Center wordmark
  doc.setFont(font.family, "bold");
  doc.setFontSize(20);
  doc.setTextColor(...color.primaryDeep);
  doc.text("FINVISTA", pageW / 2, top + 14, { align: "center" });
  doc.setFont(font.family, "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(...color.muted);
  doc.text("DIRECT  YOUR  WEALTH", pageW / 2, top + 25, {
    align: "center",
    charSpace: 1.4,
  });

  // Right meta
  const rightX = pageW - layout.marginX;
  doc.setFont(font.family, "normal");
  doc.setFontSize(8);
  const gen = opts.generatedOn ?? new Date().toLocaleString();
  doc.setTextColor(...color.muted);
  doc.text("Generated On", rightX - 128, top + 10);
  doc.text(":", rightX - 80, top + 10);
  doc.setFont(font.family, "bold");
  doc.setTextColor(...color.heading);
  doc.text(gen, rightX, top + 10, { align: "right" });
  if (opts.reportId) {
    doc.setFont(font.family, "normal");
    doc.setTextColor(...color.muted);
    doc.text("Report ID", rightX - 128, top + 22);
    doc.text(":", rightX - 80, top + 22);
    doc.setFont(font.family, "bold");
    doc.setTextColor(...color.heading);
    doc.text(opts.reportId, rightX, top + 22, { align: "right" });
  }

  // Divider
  const dividerY = top + markSize + 8;
  doc.setDrawColor(...color.primary);
  doc.setLineWidth(0.6);
  doc.line(x, dividerY, pageW - layout.marginX, dividerY);

  let cursor = dividerY + 16;

  // Backwards-compat: some callers still pass title/subtitle to header.
  if (opts.title) {
    doc.setFont(font.family, "bold");
    doc.setFontSize(16);
    doc.setTextColor(...color.heading);
    doc.text(opts.title, x, cursor + 4);
    cursor += 18;
    if (opts.subtitle) {
      doc.setFont(font.family, "normal");
      doc.setFontSize(9);
      doc.setTextColor(...color.muted);
      doc.text(opts.subtitle, x, cursor);
      cursor += 12;
    }
    cursor += 4;
  }

  return cursor;
}

/**
 * Footer: Page X of Y left, © YEAR FinVista (+ optional Confidential) right.
 * Never contains app version, build number, or "All Rights Reserved".
 */
export function drawReportFooter(
  doc: JsPDFLike,
  opts?: { sensitive?: boolean; note?: string },
) {
  const { color, layout, brand, font } = REPORT_THEME;
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const total = doc.internal.getNumberOfPages();
  const year = new Date().getFullYear();
  const rightText = opts?.sensitive
    ? `© ${year} ${brand.name} • Confidential`
    : `© ${year} ${brand.name}`;
  for (let p = 1; p <= total; p++) {
    doc.setPage(p);
    const y = pageH - layout.footerHeight + 10;
    doc.setDrawColor(...color.softBorder);
    doc.setLineWidth(0.5);
    doc.line(layout.marginX, y - 10, pageW - layout.marginX, y - 10);
    doc.setFont(font.family, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...color.muted);
    doc.text(`Page ${p} of ${total}`, layout.marginX, y);
    if (opts?.note) {
      doc.text(opts.note, pageW / 2, y, { align: "center" });
    }
    doc.text(rightText, pageW - layout.marginX, y, { align: "right" });
  }
}

/** Report info block: title, period, currency, filters. */
export function drawReportInfo(
  doc: JsPDFLike,
  y: number,
  opts: {
    title: string;
    period?: { start?: string; end?: string; label?: string };
    currency?: { code: string; symbol: string };
    filters?: { label: string; value: string }[];
  },
) {
  const { color, layout, font } = REPORT_THEME;
  doc.setFont(font.family, "bold");
  doc.setFontSize(22);
  doc.setTextColor(...color.heading);
  doc.text(opts.title, layout.marginX, y + 6);
  let cursor = y + 26;
  const rows: { label: string; value: string }[] = [];
  if (opts.period) {
    const label = opts.period.label
      ? opts.period.label
      : opts.period.start && opts.period.end
        ? `${opts.period.start} – ${opts.period.end}`
        : "All time";
    rows.push({ label: "Report Period", value: label });
  }
  if (opts.currency) {
    rows.push({
      label: "Currency",
      value: `${opts.currency.code} (${opts.currency.symbol})`,
    });
  }
  if (opts.filters && opts.filters.length) {
    rows.push({
      label: "Filters",
      value: opts.filters.map((f) => `${f.label}: ${f.value}`).join("  |  "),
    });
  }
  doc.setFontSize(9);
  for (const r of rows) {
    doc.setFont(font.family, "normal");
    doc.setTextColor(...color.muted);
    doc.text(r.label, layout.marginX, cursor);
    doc.setFont(font.family, "bold");
    doc.setTextColor(...color.heading);
    doc.text(`:  ${r.value}`, layout.marginX + 78, cursor);
    cursor += 13;
  }
  return cursor + 4;
}

/** KPI card grid. Auto-wraps rows. */
export function drawKpiCards(
  doc: JsPDFLike,
  y: number,
  kpis: { label: string; value: string; sub?: string }[],
  opts?: { columns?: number },
) {
  if (!kpis.length) return y;
  const { color, layout, font } = REPORT_THEME;
  const pageW = doc.internal.pageSize.getWidth();
  const availW = pageW - layout.marginX * 2;
  const cols = Math.min(
    opts?.columns ?? Math.min(kpis.length, 4),
    kpis.length,
  );
  const gap = 10;
  const cardW = (availW - gap * (cols - 1)) / cols;
  const cardH = 58;
  let cursor = y;
  for (let i = 0; i < kpis.length; i++) {
    const col = i % cols;
    if (col === 0 && i > 0) cursor += cardH + gap;
    const cx = layout.marginX + col * (cardW + gap);
    doc.setFillColor(...color.cardBg);
    doc.setDrawColor(...color.softBorder);
    doc.setLineWidth(0.4);
    doc.roundedRect(cx, cursor, cardW, cardH, 4, 4, "FD");
    doc.setFillColor(...color.kpiIconBg);
    doc.roundedRect(cx + 10, cursor + 14, 22, 22, 11, 11, "F");
    doc.setDrawColor(...color.primary);
    doc.setLineWidth(1);
    doc.circle(cx + 21, cursor + 25, 4, "S");
    doc.setFont(font.family, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...color.muted);
    doc.text(kpis[i].label, cx + 40, cursor + 20);
    doc.setFont(font.family, "bold");
    doc.setFontSize(13);
    doc.setTextColor(...color.primaryDeep);
    doc.text(kpis[i].value, cx + 40, cursor + 37);
    if (kpis[i].sub) {
      doc.setFont(font.family, "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(...color.muted);
      doc.text(kpis[i].sub!, cx + 40, cursor + 48);
    }
  }
  return cursor + cardH + 14;
}

/** Notes block. */
export function drawNotes(doc: JsPDFLike, y: number, notes: string[]) {
  if (!notes.length) return y;
  const { color, layout, font } = REPORT_THEME;
  const pageW = doc.internal.pageSize.getWidth();
  const w = pageW - layout.marginX * 2;
  const h = 18 + notes.length * 12;
  doc.setFillColor(250, 253, 253);
  doc.setDrawColor(...color.softBorder);
  doc.setLineWidth(0.4);
  doc.roundedRect(layout.marginX, y, w, h, 4, 4, "FD");
  doc.setFont(font.family, "bold");
  doc.setFontSize(9);
  doc.setTextColor(...color.heading);
  doc.text("Notes", layout.marginX + 10, y + 14);
  doc.setFont(font.family, "normal");
  doc.setFontSize(8.5);
  notes.forEach((n, i) => {
    doc.setTextColor(...color.primaryDeep);
    doc.text("\u2713", layout.marginX + 10, y + 28 + i * 12);
    doc.setTextColor(...color.body);
    doc.text(n, layout.marginX + 22, y + 28 + i * 12);
  });
  return y + h + 12;
}

/** Disclaimer paragraph (wrapped). */
export function drawDisclaimer(doc: JsPDFLike, y: number, text: string) {
  const { color, layout, font } = REPORT_THEME;
  const pageW = doc.internal.pageSize.getWidth();
  const w = pageW - layout.marginX * 2;
  doc.setFont(font.family, "bold");
  doc.setFontSize(8);
  doc.setTextColor(...color.heading);
  doc.text("Disclaimer", layout.marginX, y);
  doc.setFont(font.family, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...color.muted);
  const lines = doc.splitTextToSize(text, w) as string[];
  doc.text(lines, layout.marginX, y + 12);
  return y + 12 + lines.length * 10;
}

/** Closing block: divider + centered FINVISTA / DIRECT YOUR WEALTH. */
export function drawClosing(doc: JsPDFLike, y: number) {
  const { color, layout, font } = REPORT_THEME;
  const pageW = doc.internal.pageSize.getWidth();
  doc.setDrawColor(...color.softBorder);
  doc.setLineWidth(0.5);
  doc.line(layout.marginX + 60, y, pageW - layout.marginX - 60, y);
  doc.setFont(font.family, "bold");
  doc.setFontSize(16);
  doc.setTextColor(...color.primaryDeep);
  doc.text("FINVISTA", pageW / 2, y + 22, { align: "center" });
  doc.setFont(font.family, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...color.muted);
  doc.text("DIRECT  YOUR  WEALTH", pageW / 2, y + 34, {
    align: "center",
    charSpace: 1.4,
  });
  return y + 44;
}

/** Donut chart with legend. */
export function drawDonut(
  doc: JsPDFLike,
  y: number,
  opts: {
    title: string;
    slices: { label: string; value: number; color?: string }[];
    width?: number;
  },
) {
  const { color, layout, font, chartPalette } = REPORT_THEME;
  const pageW = doc.internal.pageSize.getWidth();
  const w = opts.width ?? pageW - layout.marginX * 2;
  const h = 160;
  doc.setFillColor(...color.cardBg);
  doc.setDrawColor(...color.softBorder);
  doc.setLineWidth(0.4);
  doc.roundedRect(layout.marginX, y, w, h, 4, 4, "FD");
  doc.setFont(font.family, "bold");
  doc.setFontSize(10);
  doc.setTextColor(...color.heading);
  doc.text(opts.title, layout.marginX + 12, y + 16);

  const cx = layout.marginX + 80;
  const cy = y + 90;
  const rOuter = 48;
  const rInner = 28;
  const total = opts.slices.reduce((a, b) => a + (b.value || 0), 0) || 1;

  let start = -Math.PI / 2;
  opts.slices.forEach((s, i) => {
    const sweep = ((s.value || 0) / total) * Math.PI * 2;
    const rgb = hexToRgb(s.color ?? chartPalette[i % chartPalette.length]);
    doc.setFillColor(...rgb);
    const steps = Math.max(6, Math.ceil((sweep / (Math.PI * 2)) * 96));
    for (let k = 0; k < steps; k++) {
      const a1 = start + (sweep * k) / steps;
      const a2 = start + (sweep * (k + 1)) / steps;
      const x1 = cx + Math.cos(a1) * rOuter;
      const y1 = cy + Math.sin(a1) * rOuter;
      const x2 = cx + Math.cos(a2) * rOuter;
      const y2 = cy + Math.sin(a2) * rOuter;
      doc.triangle(cx, cy, x1, y1, x2, y2, "F");
    }
    start += sweep;
  });
  doc.setFillColor(255, 255, 255);
  doc.circle(cx, cy, rInner, "F");
  doc.setFont(font.family, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...color.muted);
  doc.text("Total", cx, cy - 3, { align: "center" });
  doc.setFont(font.family, "bold");
  doc.setFontSize(10);
  doc.setTextColor(...color.primaryDeep);
  doc.text(total.toLocaleString(), cx, cy + 9, { align: "center" });

  const lx = cx + rOuter + 26;
  let ly = y + 40;
  opts.slices.slice(0, 8).forEach((s, i) => {
    const rgb = hexToRgb(s.color ?? chartPalette[i % chartPalette.length]);
    doc.setFillColor(...rgb);
    doc.circle(lx + 4, ly - 3, 3.2, "F");
    doc.setFont(font.family, "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(...color.body);
    const pct = ((s.value / total) * 100).toFixed(1);
    doc.text(s.label, lx + 14, ly);
    doc.setTextColor(...color.muted);
    doc.text(`${s.value.toLocaleString()}  (${pct}%)`, lx + 130, ly);
    ly += 14;
  });
  return y + h + 14;
}

/** Shared jspdf-autotable style bundle in FinVista brand. */
export const REPORT_TABLE_STYLES = {
  styles: {
    font: REPORT_THEME.font.family,
    fontSize: 9,
    cellPadding: 6,
    textColor: REPORT_THEME.color.body,
    lineColor: REPORT_THEME.color.softBorder,
    lineWidth: 0.2,
    overflow: "linebreak" as const,
    valign: "middle" as const,
  },
  headStyles: {
    fillColor: REPORT_THEME.color.primaryDeep,
    textColor: [255, 255, 255] as [number, number, number],
    fontStyle: "bold" as const,
    halign: "left" as const,
    fontSize: 9,
    cellPadding: 7,
  },
  alternateRowStyles: {
    fillColor: REPORT_THEME.color.surfaceAlt,
  },
  footStyles: {
    fillColor: REPORT_THEME.color.totalsBg,
    textColor: REPORT_THEME.color.heading,
    fontStyle: "bold" as const,
  },
  showHead: "everyPage" as const,
  rowPageBreak: "avoid" as const,
};