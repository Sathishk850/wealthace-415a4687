/**
 * Shared readers for the metadata the Add Investment form stores as
 * "Label: value" lines inside a holding's notes (Sector, Segment, Platform,
 * Classification, Country). Keeping them here means every view resolves the
 * same value from the same place.
 */

export function noteField(notes: string | null | undefined, label: string): string | null {
  if (!notes) return null;
  const re = new RegExp(`^\\s*${label}\\s*:\\s*(.+)$`, "i");
  for (const line of notes.split(/\r?\n/)) {
    const m = line.match(re);
    if (m && m[1].trim()) return m[1].trim();
  }
  return null;
}

export const sectorFromNotes = (n: string | null | undefined) => noteField(n, "Sector");
export const segmentFromNotes = (n: string | null | undefined) => noteField(n, "Segment");
export const platformFromNotes = (n: string | null | undefined) => noteField(n, "Platform");
export const classificationFromNotes = (n: string | null | undefined) =>
  noteField(n, "Classification");

/** Market-cap band from the classification captured on the Add form. */
export function marketCapBand(input: {
  sub_category?: string | null;
  notes?: string | null;
}): string | null {
  const s = `${input.sub_category ?? ""} ${classificationFromNotes(input.notes) ?? ""}`.toLowerCase();
  if (s.includes("large")) return "Large Cap";
  if (s.includes("mid")) return "Mid Cap";
  if (s.includes("small")) return "Small Cap";
  if (s.includes("multi")) return "Multi Cap";
  if (s.includes("flexi")) return "Flexi Cap";
  return null;
}
