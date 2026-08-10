import { useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet, AlertTriangle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  buildDrafts,
  parseStatementFile,
  type DetectedBank,
  type ImportDraft,
} from "@/lib/statement-import";
import {
  inr,
  useCategories,
  useTransactions,
  useBulkInsertTransactions,
} from "@/lib/money-api";
import { formatDateShort } from "@/lib/date-format";

type Props = { open: boolean; onOpenChange: (o: boolean) => void };

/**
 * Bank statement importer — upload a CSV/XLSX statement, review the parsed
 * rows (auto-categorised, duplicates pre-unchecked) and import in bulk.
 */
export function BankStatementImporter({ open, onOpenChange }: Props) {
  const cats = useCategories();
  const tx = useTransactions();
  const bulk = useBulkInsertTransactions();
  const fileRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [bank, setBank] = useState<DetectedBank | null>(null);
  const [fileName, setFileName] = useState("");
  const [skipped, setSkipped] = useState(0);
  const [drafts, setDrafts] = useState<ImportDraft[]>([]);

  const reset = () => {
    setDrafts([]);
    setBank(null);
    setFileName("");
    setSkipped(0);
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    try {
      const parsed = await parseStatementFile(file);
      const built = buildDrafts(
        parsed.rows,
        (cats.data ?? []).map((c) => ({ id: c.id, name: c.name, kind: c.kind })),
        (tx.data ?? []).map((t) => ({
          occurred_on: t.occurred_on,
          amount: t.amount,
          kind: t.kind,
        })),
      );
      setBank(parsed.bank);
      setSkipped(parsed.skipped);
      setFileName(file.name);
      setDrafts(built);
    } catch (e: any) {
      toast.error(e?.message ?? "Could not read this statement");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const selected = useMemo(() => drafts.filter((d) => d.include), [drafts]);
  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const d of selected) {
      if (d.kind === "income") income += d.amount;
      else expense += d.amount;
    }
    return { income, expense };
  }, [selected]);
  const dupCount = drafts.filter((d) => d.duplicate).length;
  const uncategorised = selected.filter((d) => !d.category_id).length;

  const update = (i: number, patch: Partial<ImportDraft>) =>
    setDrafts((prev) => prev.map((d, idx) => (idx === i ? { ...d, ...patch } : d)));

  const submit = async () => {
    if (selected.length === 0) return;
    await bulk.mutateAsync(
      selected.map((d) => ({
        kind: d.kind,
        amount: d.amount,
        occurred_on: d.occurred_on,
        category_id: d.category_id,
        merchant: d.merchant,
        note: d.note,
      })),
    );
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="flex max-h-[92vh] max-w-4xl flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle>Import Bank Statement</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel statement from HDFC, SBI, ICICI, Axis, Kotak or any bank with
            Date / Narration / Debit / Credit columns. Rows are auto-categorised and likely
            duplicates are unchecked for you.
          </DialogDescription>
        </DialogHeader>

        {drafts.length === 0 ? (
          <div className="py-4">
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-surface/30 p-10 text-center transition hover:border-mint/50">
              <input
                ref={fileRef}
                type="file"
                accept=".csv,.txt,.tsv,.xls,.xlsx"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void handleFile(f);
                }}
              />
              {busy ? (
                <Loader2 className="h-7 w-7 animate-spin text-mint" />
              ) : (
                <Upload className="h-7 w-7 text-mint" />
              )}
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {busy ? "Reading statement…" : "Choose a statement file"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">CSV, TSV, XLS or XLSX · up to a few thousand rows</p>
              </div>
            </label>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <Badge variant="outline" className="gap-1">
                <FileSpreadsheet className="h-3 w-3" /> {fileName}
              </Badge>
              <Badge variant="outline" className="border-mint/40 text-mint">{bank}</Badge>
              <Badge variant="outline">{drafts.length} rows parsed</Badge>
              <Badge variant="outline">{selected.length} selected</Badge>
              {dupCount > 0 && (
                <Badge variant="outline" className="border-amber-400/40 text-amber-400">
                  <AlertTriangle className="mr-1 h-3 w-3" /> {dupCount} possible duplicates
                </Badge>
              )}
              {skipped > 0 && <Badge variant="outline">{skipped} non-transaction rows skipped</Badge>}
              {uncategorised > 0 && (
                <Badge variant="outline">{uncategorised} uncategorised</Badge>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="ml-auto h-7 text-xs"
                onClick={reset}
              >
                Choose another file
              </Button>
            </div>

            <div className="mt-3 min-h-0 flex-1 overflow-auto rounded-xl border border-border">
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-surface-2/95 backdrop-blur">
                  <tr className="text-left text-muted-foreground">
                    <th className="w-8 p-2"></th>
                    <th className="p-2">Date</th>
                    <th className="p-2">Merchant</th>
                    <th className="p-2">Type</th>
                    <th className="p-2 text-right">Amount</th>
                    <th className="p-2">Category</th>
                  </tr>
                </thead>
                <tbody>
                  {drafts.map((d, i) => {
                    const options = (cats.data ?? []).filter((c) => c.kind === d.kind);
                    return (
                      <tr
                        key={i}
                        className={`border-t border-border/60 ${d.duplicate ? "bg-amber-500/5" : ""}`}
                      >
                        <td className="p-2">
                          <Checkbox
                            checked={d.include}
                            onCheckedChange={(v) => update(i, { include: !!v })}
                          />
                        </td>
                        <td className="whitespace-nowrap p-2 tabular-nums">
                          {formatDateShort(d.occurred_on)}
                        </td>
                        <td className="max-w-[220px] p-2">
                          <div className="truncate font-medium text-foreground">{d.merchant}</div>
                          <div className="truncate text-[10px] text-muted-foreground">{d.raw}</div>
                        </td>
                        <td className="p-2">
                          <span className={d.kind === "income" ? "text-mint" : "text-destructive"}>
                            {d.kind === "income" ? "Income" : "Expense"}
                          </span>
                          {d.duplicate && (
                            <div className="text-[10px] text-amber-400">duplicate?</div>
                          )}
                        </td>
                        <td className="whitespace-nowrap p-2 text-right tabular-nums">
                          {inr(d.amount)}
                        </td>
                        <td className="p-2">
                          <Select
                            value={d.category_id ?? "none"}
                            onValueChange={(v) => update(i, { category_id: v === "none" ? null : v })}
                          >
                            <SelectTrigger className="h-7 w-[150px] text-xs">
                              <SelectValue placeholder="Uncategorised" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Uncategorised</SelectItem>
                              {options.map((c) => (
                                <SelectItem key={c.id} value={c.id}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {d.categoryGuess && !d.category_id && (
                            <div className="mt-0.5 text-[10px] text-muted-foreground">
                              Suggested: {d.categoryGuess}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <DialogFooter className="mt-3 flex-wrap items-center gap-2 sm:justify-between">
              <div className="text-xs text-muted-foreground">
                Importing <span className="text-mint">{inr(totals.income)}</span> income ·{" "}
                <span className="text-destructive">{inr(totals.expense)}</span> expenses
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={bulk.isPending}>
                  Cancel
                </Button>
                <Button onClick={submit} disabled={bulk.isPending || selected.length === 0}>
                  {bulk.isPending ? "Importing…" : `Import ${selected.length}`}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
