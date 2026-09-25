import { useCallback, useRef, useState } from "react";
import { Upload, CheckCircle2, Loader2, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { detectBroker, type BrokerRow } from "@/lib/import/broker-parsers";
import { useBulkInsertInvestments, type InvestmentInput } from "@/lib/wealth-api";
import { toast } from "sonner";

async function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, unknown>[] }> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "xlsx" || ext === "xls") {
    const XLSX = await import("xlsx");
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];
    const aoa = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" }) as unknown[][];
    const headers = (aoa[0] ?? []).map(String);
    const rows = aoa.slice(1).map((r) => {
      const obj: Record<string, unknown> = {};
      headers.forEach((h, i) => { obj[h] = (r as unknown[])[i] ?? ""; });
      return obj;
    });
    return { headers, rows };
  }
  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (!lines.length) return { headers: [], rows: [] };
  const split = (line: string): string[] => {
    const out: string[] = []; let cell = ""; let inQ = false;
    for (const c of line) {
      if (inQ) { if (c === '"') inQ = false; else cell += c; }
      else if (c === '"') inQ = true;
      else if (c === ",") { out.push(cell.trim()); cell = ""; }
      else cell += c;
    }
    out.push(cell.trim()); return out;
  };
  const headers = split(lines[0]);
  const rows = lines.slice(1).map((l) => {
    const cells = split(l);
    const obj: Record<string, unknown> = {};
    headers.forEach((h, i) => { obj[h] = cells[i] ?? ""; });
    return obj;
  });
  return { headers, rows };
}

type Props = { open: boolean; onOpenChange: (v: boolean) => void };

export function BrokerImportModal({ open, onOpenChange }: Props) {
  const [dragging, setDragging] = useState(false);
  const [broker, setBroker] = useState<string | null>(null);
  const [preview, setPreview] = useState<BrokerRow[]>([]);
  const [allRows, setAllRows] = useState<BrokerRow[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const insertMut = useBulkInsertInvestments();

  const reset = () => { setBroker(null); setPreview([]); setAllRows([]); setFileName(null); };

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    try {
      const { headers, rows } = await parseFile(file);
      const detection = detectBroker(headers);
      if (!detection.matched) {
        toast.error("Could not detect the broker from this file. Check the format and try again.");
        setLoading(false); return;
      }
      const parsed = detection.parse(rows).filter((r) => (r.quantity ?? 0) > 0 && r.name);
      if (!parsed.length) { toast.error("No valid holdings found in this file."); setLoading(false); return; }
      setBroker(detection.broker);
      setPreview(parsed.slice(0, 5));
      setAllRows(parsed);
      setFileName(file.name);
    } catch (e: unknown) {
      toast.error((e as Error)?.message ?? "Failed to parse file");
    }
    setLoading(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0]; if (file) void handleFile(file);
  }, [handleFile]);

  const handleImport = async () => {
    if (!allRows.length) return;
    const inputs: InvestmentInput[] = allRows.map(
      ({ _broker: _b, _isin: _i, invested_value: _iv, current_value: _cv, ...rest }) => rest,
    );
    try {
      await insertMut.mutateAsync(inputs);
      onOpenChange(false); reset();
    } catch {
      /* toast shown by mutation */
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="sm:max-w-[620px]">
        <DialogHeader>
          <DialogTitle>Import Holdings from Broker</DialogTitle>
          <DialogDescription>
            Supports 5paisa, Kuvera, Dhan, MFCentral CAS, and Zerodha Kite exports (CSV or Excel).
          </DialogDescription>
        </DialogHeader>

        {!allRows.length ? (
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => fileRef.current?.click()}
            className={cn(
              "flex cursor-pointer select-none flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed py-12 transition-colors",
              dragging ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground",
            )}
          >
            <input
              ref={fileRef} type="file" accept=".csv,.xlsx,.xls" className="sr-only"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFile(f); e.target.value = ""; }}
            />
            {loading
              ? <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              : <Upload className="h-8 w-8 text-muted-foreground" />}
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Drop your broker export here</p>
              <p className="mt-0.5 text-xs text-muted-foreground">or click to browse — CSV or Excel</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                <CheckCircle2 className="h-4 w-4 shrink-0 text-primary" />
                <span className="text-xs font-semibold text-primary">Detected: {broker}</span>
                <span className="ml-1 text-xs text-muted-foreground">· {allRows.length} holdings</span>
              </div>
              <button
                type="button"
                onClick={reset}
                aria-label="Choose another file"
                className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="truncate text-xs text-muted-foreground">File: {fileName}</p>

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead className="bg-muted/50 text-[10px] uppercase tracking-wide text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 text-left">Name</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Avg Price</th>
                    <th className="px-3 py-2 text-right">Cur. Value</th>
                    <th className="px-3 py-2 text-left">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {preview.map((r, i) => (
                    <tr key={i} className="hover:bg-muted/30">
                      <td className="max-w-[160px] truncate px-3 py-2 font-medium text-foreground">{r.name}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.quantity}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {(r.avg_price ?? 0) > 0
                          ? `₹${(r.avg_price ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {(r.current_value ?? 0) > 0
                          ? `₹${(r.current_value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
                          : "—"}
                      </td>
                      <td className="px-3 py-2 text-muted-foreground">{r.category}</td>
                    </tr>
                  ))}
                  {allRows.length > 5 && (
                    <tr>
                      <td colSpan={5} className="px-3 py-2 text-center text-muted-foreground">
                        … and {allRows.length - 5} more
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Holdings will be added to Wealth → Investments. Duplicates are not merged automatically — review after import.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => { reset(); onOpenChange(false); }}>Cancel</Button>
          {allRows.length > 0 && (
            <Button onClick={() => void handleImport()} disabled={insertMut.isPending}>
              {insertMut.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              {insertMut.isPending ? "Importing…" : `Import ${allRows.length} Holdings`}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
