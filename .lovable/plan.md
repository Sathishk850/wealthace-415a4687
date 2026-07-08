
# FinVista Report Engine — Premium Redesign

## Goal
Ship a single reusable "Report Engine" that renders every export (PDF, Excel print layout, browser print) as a premium banking-style FinVista statement matching the reference image. CSV stays raw.

## Scope
- Presentation only. Do NOT touch auth, APIs, DB, business logic, calculations, filters, or which fields get exported.
- Applies to all current PDF/XLSX exporters:
  - `src/lib/report-export.ts` (scheduled Report Center exports)
  - `src/lib/wealth-io.ts` (per-view exports: assets, liabilities, insurance, investments, accounts, family, financial calculator, tools)
- Reuse and extend the existing FinVista Premium Light Theme in `src/lib/report-theme.ts`.

## Deliverables

### 1. New master engine — `src/lib/report-engine.ts`
Single source of truth. Public surface:

```ts
type ReportKPI = { label: string; value: string; sub?: string; accent?: boolean };
type ReportChart =
  | { type: "donut" | "pie"; title: string; slices: { label: string; value: number; color?: string }[] }
  | { type: "line" | "bar"; title: string; xLabels: string[]; series: { name: string; data: number[]; color?: string }[]; yLabel?: string };
type ReportTable = {
  title?: string;
  columns: { key: string; label: string; align?: "left" | "right" | "center"; format?: "currency" | "date" | "text" | "number" }[];
  rows: (string | number)[][];
  totals?: (string | number)[];
};
type ReportDoc = {
  name: string;                 // e.g. "Expense Report"
  reportId: string;             // e.g. "EXP000125" (auto if missing)
  period?: { start?: string; end?: string; label?: string };
  currency?: { code: string; symbol: string };
  filters?: { label: string; value: string }[];
  kpis?: ReportKPI[];
  charts?: ReportChart[];
  tables: ReportTable[];
  notes?: string[];
  sensitive?: boolean;          // adds "Confidential" to footer
  orientation?: "portrait" | "landscape" | "auto";
  category?: "expense" | "income" | "investment" | "networth" | "tax" | "transactions" | "assets" | "liabilities" | "insurance" | "budget" | "goal" | "generic";
};

type ExportOptions = {
  format: "pdf" | "xlsx" | "csv";
  paper?: "a4" | "letter";
  orientation?: "auto" | "portrait" | "landscape";
  includeSummary?: boolean;
  includeCharts?: boolean;
  includeNotes?: boolean;
  includeFilters?: boolean;
  filename?: string;
};

export async function exportReport(doc: ReportDoc, opts: ExportOptions): Promise<void>;
export function buildFilename(doc: ReportDoc, opts: ExportOptions): string;
export function autoOrientation(category, override): "portrait" | "landscape";
```

Internally handles:
- **Header** (every page): FV logo mark + `FinVista / Direct Your Wealth` left, centered wordmark, right-side `Generated On` + `Report ID`, thin divider.
- **Report info block**: title, period, currency, filters chips.
- **KPI cards**: white cards with soft shadow, mint icon badge, label + big value + optional sub.
- **Charts**: donut/pie/line/bar drawn directly on the jsPDF canvas using the FinVista chart palette (`REPORT_THEME.chartPalette`). No random colors, no page splits — measure height and page-break before drawing.
- **Tables** via `jspdf-autotable`: brand-colored header, white text, zebra rows, right-aligned currency, `didParseCell` for currency/date formatting, `showHead: 'everyPage'`, `rowPageBreak: 'avoid'`, totals row styled with mint-tint background.
- **Notes** block (bulleted with mint check icons) on relevant pages.
- **Disclaimer + Closing** (`FINVISTA / DIRECT YOUR WEALTH`, centered) ONLY on the final page.
- **Footer** every page: `Page X of Y` left, `© <year> FinVista` (or `• Confidential` when `sensitive`) right.
- **Smart layout**: measure content, expand vertical rhythm when it fits one page, otherwise paginate cleanly.
- **Auto orientation** by category (expense/income/budget/goal/insurance/financial score → portrait; transactions/investments/portfolio/assets/liabilities/net worth history/tax → landscape). Manual override wins.
- **Metadata**: `doc.setProperties({ title, author: "FinVista", creator: "FinVista", subject: "Personal Finance Report" })`.
- **Filename**: `FinVista_<Name>_<ISO>[_to_<ISO>].<ext>`, spaces → underscores.
- **XLSX print layout**: reuse SheetJS with FinVista header row styling, page setup (orientation, fit-to-width), print title rows so table headers repeat.
- **CSV**: raw only, no styling.

### 2. New export dialog — `src/components/reports/export-dialog.tsx`
Reusable modal used by every export entry point. Fields:
- Format (PDF / Excel / CSV)
- Paper Size (A4 default, Letter)
- Orientation (Auto / Portrait / Landscape) — auto shows the resolved orientation as a hint
- Toggles: Summary Cards, Charts (PDF-only, disabled otherwise), Notes, Applied Filters
- Editable filename (pre-filled from `buildFilename`)
- Remembers last choices per-user via existing `user-payment-prefs`-style pattern → new `src/lib/user-report-prefs-api.ts` (localStorage first, sync later — but out of scope: use `localStorage` keyed by user id for now, matches existing patterns).

Exposes: `openExportDialog(doc): Promise<ExportOptions | null>` helper or `<ExportReportDialog doc={doc} onConfirm={...} />`.

### 3. Rewire existing callers
- `src/lib/report-export.ts` → adapt `GeneratedReport.snapshot` sections into `ReportDoc` (map summary → kpis, rows → table). Delegate PDF+XLSX to the engine. Keep `exportReportCSV` raw (already fine).
- `src/lib/wealth-io.ts` → same adaptation for wealth exports; keep CSV/JSON paths untouched, route PDF+XLSX through engine.
- `src/routes/_app.reports.$id.tsx`, `_app.reports.index.tsx`, and each wealth view button → open the new export dialog instead of triggering an immediate download.

### 4. Extend `src/lib/report-theme.ts`
Add `drawKpiCards`, `drawDonut`, `drawPieBar` helpers, `drawClosing`, updated `drawReportHeader` to match the reference (left logo mark + wordmark, centered wordmark, right meta), and `drawReportFooter` variant with confidential support. Keep colors as-is (already brand-correct).

## Non-Goals
- No changes to which reports exist, what data they compute, filters, or scheduling.
- No new "Report ID" persistence — generate deterministically from report key + generated_at (e.g. `EXP` + zero-padded hash), stable per snapshot.
- No server-side PDF rendering — everything remains client-side jsPDF/SheetJS.
- No Excel styling beyond what SheetJS community build supports (header fill + bold + print setup + repeat rows).

## Verification
- `tsgo` clean build.
- Manually export one report of each category (expense list, transactions, net worth, wealth view) via Playwright, screenshot each page, and visually confirm: header/footer on every page, KPI cards render, chart colors match palette, table zebra + right-aligned currency, closing block only on last page, filename matches convention.

## Risks / Notes
- jsPDF chart drawing is manual; keep charts small and simple (donut with legend, single-series line, grouped bar) to stay reliable across page sizes.
- Reference image shows a landscape "Expense Report" — per spec rules, expense is portrait; we honor the spec, not the mock, but keep the visual language identical.
