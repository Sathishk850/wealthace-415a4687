/**
 * Browser-side PDF table extraction.
 *
 * Uses pdf.js to pull positioned text items from every page and groups them
 * into rows (by y position) and columns (by x gaps), producing a plain
 * `string[][]` grid that the CSV/XLSX import pipelines already understand.
 */

let pdfjsPromise: Promise<any> | null = null;

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = (async () => {
      const pdfjs: any = await import("pdfjs-dist/build/pdf.mjs");
      const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
      return pdfjs;
    })();
  }
  return pdfjsPromise;
}

type Item = { text: string; x: number; y: number };

/** Extract a row/cell grid out of a PDF file. */
export async function pdfToGrid(
  file: File | ArrayBuffer,
  password?: string,
): Promise<string[][]> {
  const pdfjs = await getPdfjs();
  const data = file instanceof ArrayBuffer ? file : await file.arrayBuffer();
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(data),
    ...(password ? { password } : {}),
  }).promise;

  const grid: string[][] = [];

  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const content = await page.getTextContent();
    const items: Item[] = content.items
      .filter((it: any) => typeof it.str === "string" && it.str.trim().length)
      .map((it: any) => ({
        text: String(it.str).trim(),
        x: it.transform[4] as number,
        y: it.transform[5] as number,
      }));

    // Group by y (rows) with a small tolerance for baseline jitter.
    const buckets: { y: number; items: Item[] }[] = [];
    for (const it of items) {
      const bucket = buckets.find((b) => Math.abs(b.y - it.y) <= 3);
      if (bucket) bucket.items.push(it);
      else buckets.push({ y: it.y, items: [it] });
    }
    buckets.sort((a, b) => b.y - a.y);

    for (const bucket of buckets) {
      const sorted = bucket.items.sort((a, b) => a.x - b.x);
      const cells: string[] = [];
      let curr = "";
      let prevEnd: number | null = null;
      for (const it of sorted) {
        const gap = prevEnd == null ? 0 : it.x - prevEnd;
        if (prevEnd != null && gap > 6) {
          cells.push(curr.trim());
          curr = it.text;
        } else {
          curr = curr ? `${curr} ${it.text}` : it.text;
        }
        prevEnd = it.x + it.text.length * 4.6;
      }
      if (curr.trim()) cells.push(curr.trim());
      if (cells.length) grid.push(cells);
    }
  }

  return grid;
}

/**
 * Convert a PDF into row objects keyed by the detected header labels.
 * The header is the first row whose cell count matches the most common
 * cell count in the document (works for statement/report style tables).
 */
export async function pdfToObjects(file: File): Promise<Record<string, string>[]> {
  const grid = await pdfToGrid(file);
  if (!grid.length) return [];

  const counts = new Map<number, number>();
  for (const row of grid) counts.set(row.length, (counts.get(row.length) ?? 0) + 1);
  let width = 0;
  let best = 0;
  for (const [len, n] of counts) {
    if (len > 1 && n > best) {
      best = n;
      width = len;
    }
  }
  if (!width) return [];

  const headerIdx = grid.findIndex((r) => r.length === width);
  if (headerIdx < 0) return [];
  const headers = grid[headerIdx]!.map((h, i) => h || `Column ${i + 1}`);

  return grid
    .slice(headerIdx + 1)
    .filter((r) => r.length === width)
    .map((r) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = r[i] ?? ""));
      return obj;
    });
}
