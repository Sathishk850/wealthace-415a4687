/**
 * Central user-facing date formatters. FinVista standardises all displayed
 * dates to DD/MM/YYYY. Storage/ISO values are unchanged — only presentation.
 *
 * Sorting and filtering must continue to use raw ISO/Date values; only pass
 * strings through these helpers at the render/export boundary.
 */

function toDate(input: Date | string | number | null | undefined): Date | null {
  if (input == null || input === "") return null;
  const d = input instanceof Date ? input : new Date(input);
  return isNaN(d.getTime()) ? null : d;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** DD/MM/YYYY */
export function formatDate(input: Date | string | number | null | undefined): string {
  const d = toDate(input);
  if (!d) return "";
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

/** DD/MM/YYYY HH:mm */
export function formatDateTime(input: Date | string | number | null | undefined): string {
  const d = toDate(input);
  if (!d) return "";
  return `${formatDate(d)} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** DD Mon YYYY (e.g. 09 Jul 2026) — for compact chips/labels. */
export function formatDateShort(input: Date | string | number | null | undefined): string {
  const d = toDate(input);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
