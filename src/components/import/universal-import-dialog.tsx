/**
 * Universal Import Dialog — the review UI on top of the import engine.
 * Steps: Upload → Map columns → Preview & validate → Done.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronLeft,
  FileSpreadsheet,
  Loader2,
  Lock as LockIcon,
  Upload,
  X,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_IMPORT_EXTENSIONS,
  IMPORT_SCHEMAS,
  applySavedMapping,
  buildMappingPlan,
  detectSchema,
  fetchExistingRows,
  getSchema,
  isPasswordError,
  parseImportFile,
  refreshPlan,
  serializeMapping,
  transformRows,
  loadCategoryCorrections,
  saveCategoryCorrections,
  useImportCommit,
  detectProvider,
  IMPORT_TARGETS,
  type ImportModule,
  type MappingPlan,
  type ParsedFile,
  type TransformResult,
  type CorrectionMap,
  type CommitMode,
  type ImportOutcome,
  type DetectedProvider,
} from "@/lib/import";


type Step = "upload" | "map" | "preview" | "done";

const savedKey = (m: string) => `wa-import-mapping:${m}`;

function loadSaved(module: string): Record<string, string> | null {
  try {
    const raw = localStorage.getItem(savedKey(module));
    return raw ? (JSON.parse(raw) as Record<string, string>) : null;
  } catch {
    return null;
  }
}

const confBadge: Record<string, string> = {
  high: "bg-success/15 text-success",
  medium: "bg-amber-500/15 text-amber-500",
  low: "bg-red-500/15 text-red-400",
  none: "bg-muted text-muted-foreground",
};

/** Wealth Ace columns shown in the preview table, per module. */
const PREVIEW_FIELDS: Record<ImportModule, string[]> = {
  investments: ["name", "category", "quantity", "current_value", "avg_price", "invested_value"],
  investment_txns: ["occurred_on", "name", "side", "quantity", "price", "amount"],
  assets: ["name", "category", "current_value", "currency"],
  transactions: ["occurred_on", "merchant", "kind", "category", "amount"],
  liabilities: ["name", "category", "outstanding", "emi", "interest_rate"],
  insurance: ["name", "category", "premium", "sum_assured", "maturity_date"],
  accounts: ["name", "type", "balance", "currency"],
  family: ["name", "relation", "dob"],
};

const PREVIEW_LABELS: Record<string, string> = {
  name: "Name", category: "Type", quantity: "Qty", current_value: "Cur. Value",
  avg_price: "Avg Cost", invested_value: "Invested", occurred_on: "Date",
  merchant: "Description", kind: "Type", amount: "Amount", outstanding: "Outstanding",
  emi: "EMI", interest_rate: "Rate %", premium: "Premium", sum_assured: "Cover",
  maturity_date: "Maturity", balance: "Balance", currency: "Currency",
  type: "Account Type", relation: "Relation", dob: "DOB", side: "Side", price: "Price",
};

const MONEY_KEYS = [
  "current_value", "invested_value", "avg_price", "outstanding", "emi",
  "premium", "sum_assured", "balance", "amount", "price",
];
const DATE_KEYS = ["occurred_on", "maturity_date", "dob"];

function formatPreviewCell(key: string, value: unknown): string {
  if (value == null || value === "") return "—";
  const s = String(value);
  if (MONEY_KEYS.includes(key)) {
    const n = parseFloat(s);
    if (!Number.isNaN(n)) {
      return n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
  }
  if (DATE_KEYS.includes(key)) {
    const d = new Date(s);
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    }
  }
  if (key === "kind") return s === "income" ? "Income ↑" : "Expense ↓";
  return s.length > 30 ? `${s.slice(0, 28)}…` : s;
}


export function UniversalImportDialog({
  open,
  onOpenChange,
  module,
  lockModule = true,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  module: ImportModule;
  /** When false the user may switch the detected target module. */
  lockModule?: boolean;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { commit, isPending, progress } = useImportCommit();

  const [step, setStep] = useState<Step>("upload");
  const [busy, setBusy] = useState(false);
  const [parsed, setParsed] = useState<ParsedFile | null>(null);
  const [target, setTarget] = useState<ImportModule>(module);
  const [plan, setPlan] = useState<MappingPlan | null>(null);
  const [existing, setExisting] = useState<Record<string, unknown>[]>([]);
  const [monthFirst, setMonthFirst] = useState(false);
  const [rememberMapping, setRememberMapping] = useState(true);
  /** Commit strategy chosen in the review step. */
  const [commitMode, setCommitMode] = useState<CommitMode>("insert");
  const [result, setResult] = useState<TransformResult | null>(null);
  const [outcome, setOutcome] = useState<ImportOutcome | null>(null);
  /** Encrypted file awaiting a password (kept in memory only). */
  const [lockedFile, setLockedFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  /** Learned per-user merchant→category corrections (transactions only). */
  const [corrections, setCorrections] = useState<CorrectionMap>(new Map());
  /** Broker / bank guessed from the file itself (display only). */
  const [detectedProvider, setDetectedProvider] = useState<DetectedProvider | null>(null);

  const reset = useCallback(() => {
    setStep("upload");
    setParsed(null);
    setPlan(null);
    setResult(null);
    setOutcome(null);
    setTarget(module);
    setMonthFirst(false);
    setLockedFile(null);
    setPassword("");
    setPasswordError(null);
    setCorrections(new Map());
    setDetectedProvider(null);
  }, [module]);


  const close = (v: boolean) => {
    onOpenChange(v);
    if (!v) setTimeout(reset, 200);
  };

  const buildPlanFor = useCallback((p: ParsedFile, mod: ImportModule) => {
    const schema = getSchema(mod)!;
    let next = buildMappingPlan(p, schema);
    const saved = loadSaved(mod);
    if (saved) next = applySavedMapping(next, saved, p.columns.map((c) => c.header));
    return next;
  }, []);

  /**
   * Parse a file. `pwd` is only passed through to the parser for encrypted
   * PDF/XLSX files — it is never stored, logged or sent anywhere.
   */
  const handleFile = async (file: File, pwd?: string) => {
    setBusy(true);
    try {
      const p = await parseImportFile(file, pwd);
      if (!p.rows.length) throw new Error("No data rows were found in this file.");
      setParsed(p);

      // Unlocked successfully — drop the password and the pending file.
      setPassword("");
      setLockedFile(null);
      setPasswordError(null);

      let mod = module;
      if (!lockModule) {
        const ranked = detectSchema(p, IMPORT_SCHEMAS);
        if (ranked[0]) mod = ranked[0].schema.module as ImportModule;
      }
      setTarget(mod);
      const next = buildPlanFor(p, mod);
      setPlan(next);
      const provider = detectProvider(p);
      setDetectedProvider(provider);
      const rows = await fetchExistingRows(mod);
      setExisting(rows);
      const corrs: CorrectionMap =
        mod === "transactions" ? await loadCategoryCorrections() : new Map();
      setCorrections(corrs);

      const allRequiredMapped = next.missingRequired.length === 0;
      const needsReview = next.mappings.some(
        (m) => m.field.required && (m.confidence === "low" || m.confidence === "none"),
      );

      if (allRequiredMapped && !needsReview) {
        const tr = transformRows(p, next, {
          existing: rows,
          preferMonthFirst: false,
          corrections: corrs,
        });
        setResult(tr);
        setStep("preview");
        const label = (getSchema(mod)?.label ?? "records").toLowerCase();
        toast.success(
          provider
            ? `${provider.name} format detected — ${tr.summary.total} ${label} auto-mapped`
            : `${tr.summary.total} ${label} ready to review`,
        );
      } else {
        setStep("map");
      }

    } catch (e) {
      if (isPasswordError(e)) {
        setLockedFile(file);
        setPassword("");
        setPasswordError(e.message);
      } else {
        setLockedFile(null);
        setPassword("");
        setPasswordError(null);
        toast.error((e as Error).message || "Could not read this file");
      }
    } finally {
      setBusy(false);
    }
  };


  const setMapping = (fieldKey: string, source: string | null) => {
    if (!plan || !parsed) return;
    const mappings = plan.mappings.map((m) =>
      m.field.key === fieldKey
        ? { ...m, source, confirmed: true, confidence: (source ? "high" : "none") as any, score: source ? 1 : 0, reason: "chosen by you" }
        : m,
    );
    setPlan(refreshPlan({ ...plan, mappings }, parsed.columns.map((c) => c.header)));
  };

  const goPreview = () => {
    if (!parsed || !plan) return;
    if (plan.missingRequired.length) {
      toast.error("Map every required field before continuing.");
      return;
    }
    setResult(transformRows(parsed, plan, { existing, preferMonthFirst: monthFirst, corrections }));
    setStep("preview");
  };

  const previewCols = useMemo(() => {
    const keys = PREVIEW_FIELDS[target] ?? [];
    return keys.filter((k) =>
      result?.rows.some((r) => r.values[k] != null && r.values[k] !== ""),
    );
  }, [target, result]);


  const includedCount = result?.rows.filter((r) => r.include).length ?? 0;

  /** Merge rule description for the active module (absent → merge unsupported). */
  const mergeInfo = IMPORT_TARGETS[target]?.merge?.describe ?? null;

  /**
   * Merge mode acts on rows that duplicate existing data, so re-include rows
   * that were excluded purely because they matched an existing record.
   */
  const enableMerge = () => {
    setCommitMode("merge");
    setResult((prev) =>
      prev
        ? {
            ...prev,
            rows: prev.rows.map((r) =>
              r.duplicate === "existing" && !r.issues.some((i) => i.level === "error")
                ? { ...r, include: true }
                : r,
            ),
          }
        : prev,
    );
  };

  const doCommit = async () => {
    if (!result || !plan) return;
    if (target === "transactions") {
      void saveCategoryCorrections(
        result.rows
          .filter((r) => r.include && r.values.category && r.values.merchant)
          .map((r) => ({
            merchant: String(r.values.merchant),
            kind: (r.values.kind === "income" ? "income" : "expense") as "income" | "expense",
            category: String(r.values.category),
          })),
      );
    }
    const out = await commit(target, result.rows, commitMode);
    if (rememberMapping) {
      try {
        localStorage.setItem(savedKey(target), JSON.stringify(serializeMapping(plan)));
      } catch { /* storage unavailable */ }
    }
    setOutcome(out);
    setStep("done");
    if (out.failed) toast.error(`${out.failed} rows could not be saved`);
    else toast.success(`Imported ${out.inserted} record${out.inserted === 1 ? "" : "s"}`);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">
            Import {getSchema(target)?.label ?? "data"}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === "upload" && "Drop any broker or bank export — columns are detected automatically."}
            {step === "map" && "Check how your columns map to Wealth Ace fields. Adjust anything that looks off."}
            {step === "preview" && "Review the cleaned rows. Duplicates and invalid rows are excluded by default."}
            {step === "done" && "Import complete."}
          </DialogDescription>
        </DialogHeader>

        {/* Stepper */}
        <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          {(["upload", "map", "preview", "done"] as Step[]).map((s, i) => {
            const jumped = s === "map" && step !== "map" && step !== "upload";
            return (
              <span
                key={s}
                className={cn(
                  "rounded-full px-2 py-0.5 capitalize transition-colors",
                  step === s
                    ? "bg-mint text-mint-foreground font-semibold"
                    : jumped
                      ? "bg-muted text-muted-foreground/40 line-through"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {i + 1}. {s === "map" ? "map columns" : s}
                {jumped && " (auto)"}
              </span>
            );
          })}
        </div>


        <div className="flex-1 overflow-y-auto pr-1">
          {/* ---------------- UPLOAD ---------------- */}
          {step === "upload" && lockedFile && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!password || busy) return;
                void handleFile(lockedFile, password);
              }}
              className="grid place-items-center gap-3 rounded-2xl border border-dashed border-amber-500/40 bg-card p-10 text-center"
            >
              {busy ? (
                <Loader2 className="h-8 w-8 animate-spin text-mint" />
              ) : (
                <LockIcon className="h-8 w-8 text-amber-500" />
              )}
              <p className="text-sm font-medium text-foreground">
                {lockedFile.name} is password protected
              </p>
              <p className="text-xs text-muted-foreground">
                {passwordError ?? "Enter the password to unlock this file."} The password is used
                once to read the file and is never saved.
              </p>
              <input
                type="password"
                autoFocus
                autoComplete="off"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="File password"
                aria-label="File password"
                className="w-56 rounded-xl border border-border bg-surface px-3 py-2 text-center text-sm text-foreground outline-none focus:border-mint/50"
              />
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setLockedFile(null);
                    setPassword("");
                    setPasswordError(null);
                  }}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-semibold text-muted-foreground disabled:opacity-50"
                >
                  Choose another file
                </button>
                <button
                  type="submit"
                  disabled={busy || !password}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-4 py-2 text-xs font-semibold text-mint-foreground disabled:opacity-50"
                >
                  <LockIcon className="h-3.5 w-3.5" /> Unlock &amp; continue
                </button>
              </div>
            </form>
          )}

          {step === "upload" && !lockedFile && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files?.[0];
                if (f) void handleFile(f);
              }}
              className="grid place-items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-10 text-center"
            >
              {busy ? (
                <Loader2 className="h-8 w-8 animate-spin text-mint" />
              ) : (
                <FileSpreadsheet className="h-8 w-8 text-mint" />
              )}
              <p className="text-sm font-medium text-foreground">
                {busy ? "Reading your file…" : "Drop a file here, or choose one"}
              </p>
              <p className="text-xs text-muted-foreground">
                Supported: CSV · TSV · XLSX · XLS · JSON · PDF — password-protected PDF/Excel files
                are supported too
              </p>
              <input
                ref={fileRef}
                type="file"
                className="hidden"
                accept={ACCEPTED_IMPORT_EXTENSIONS}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (f) void handleFile(f);
                }}
              />
              <button
                disabled={busy}
                onClick={() => fileRef.current?.click()}
                className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-mint px-4 py-2 text-xs font-semibold text-mint-foreground disabled:opacity-50"
              >
                <Upload className="h-3.5 w-3.5" /> Choose File
              </button>
            </div>
          )}


          {/* ---------------- MAP ---------------- */}
          {step === "map" && parsed && plan && (
            <div className="space-y-3">
              <div className="rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{parsed.fileName}</span>
                {parsed.sheetName ? ` · sheet “${parsed.sheetName}”` : ""} · {parsed.rows.length} rows ·{" "}
                {parsed.columns.length} columns
                {parsed.skippedRows ? ` · ${parsed.skippedRows} blank/total rows skipped` : ""}
              </div>

              {detectedProvider && (
                <div
                  className={cn(
                    "flex items-start gap-2 rounded-xl border px-3 py-2 text-xs",
                    detectedProvider.confidence === "high"
                      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : detectedProvider.confidence === "medium"
                        ? "border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400"
                        : "border-border bg-surface text-muted-foreground",
                  )}
                >
                  <FileSpreadsheet className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>
                    Looks like a <span className="font-semibold">{detectedProvider.name}</span>{" "}
                    {detectedProvider.kind.toLowerCase()}
                    {detectedProvider.confidence === "high"
                      ? " — column mapping pre-filled accordingly."
                      : " — please double-check the mapping below."}
                  </span>
                </div>
              )}



              {!lockModule && (
                <label className="flex items-center gap-2 text-xs">
                  <span className="text-muted-foreground">Import into</span>
                  <select
                    value={target}
                    onChange={(e) => {
                      setCommitMode("insert");
                      const mod = e.target.value as ImportModule;
                      setTarget(mod);
                      setPlan(buildPlanFor(parsed, mod));
                      void fetchExistingRows(mod).then(setExisting);
                    }}
                    className="rounded-lg border border-border bg-surface px-2 py-1 text-xs"
                  >
                    {IMPORT_SCHEMAS.map((s) => (
                      <option key={s.module} value={s.module}>
                        {s.label}
                      </option>
                    ))}
                  </select>
                </label>
              )}

              <div className="overflow-hidden rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-surface text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">Wealth Ace field</th>
                      <th className="px-3 py-2 text-left font-medium">Your column</th>
                      <th className="px-3 py-2 text-left font-medium">Match</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {plan.mappings.map((m) => (
                      <tr key={m.field.key} className={cn(m.field.required && !m.source && "bg-red-500/5")}>
                        <td className="px-3 py-2">
                          <span className="font-medium text-foreground">{m.field.label}</span>
                          {m.field.required && <span className="ml-1 text-red-400">*</span>}
                          <span className="ml-1 text-muted-foreground">({m.field.type})</span>
                        </td>
                        <td className="px-3 py-2">
                          <select
                            value={m.source ?? ""}
                            onChange={(e) => setMapping(m.field.key, e.target.value || null)}
                            className="w-full max-w-[220px] rounded-lg border border-border bg-surface px-2 py-1"
                          >
                            <option value="">— not imported —</option>
                            {parsed.columns.map((c) => (
                              <option key={c.header} value={c.header}>
                                {c.header}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="px-3 py-2">
                          <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize", confBadge[m.confidence])}>
                            {m.confidence}
                          </span>
                          <div className="mt-0.5 text-[10px] text-muted-foreground">{m.reason}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {plan.unmappedColumns.length > 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Ignored columns: {plan.unmappedColumns.join(", ")}
                </p>
              )}

              {mergeInfo && (
                <div className="space-y-2 rounded-2xl border border-border bg-card p-3">
                  <p className="text-xs font-semibold text-foreground">How should these rows be saved?</p>
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="radio"
                      className="mt-0.5"
                      checked={commitMode === "insert"}
                      onChange={() => setCommitMode("insert")}
                    />
                    <span>
                      <span className="font-medium text-foreground">Add as new</span> — every included row is inserted;
                      duplicates stay flagged and excluded.
                    </span>
                  </label>
                  <label className="flex items-start gap-2 text-xs text-muted-foreground">
                    <input
                      type="radio"
                      className="mt-0.5"
                      checked={commitMode === "merge"}
                      onChange={() => enableMerge()}
                    />
                    <span>
                      <span className="font-medium text-foreground">Update existing / merge</span> — {mergeInfo}
                      {" "}Rows with no match are added as new.
                    </span>
                  </label>
                </div>
              )}

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={monthFirst} onChange={(e) => setMonthFirst(e.target.checked)} />
                Dates in this file are US style (MM/DD/YYYY)
              </label>
            </div>
          )}

          {/* ---------------- PREVIEW ---------------- */}
          {step === "preview" && result && (
            <div className="space-y-3">
              {/* Provider + auto-mapping banner */}
              <div className="flex items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 py-2">
                <div className="flex min-w-0 items-center gap-2 text-xs">
                  {detectedProvider ? (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                      <span className="truncate text-muted-foreground">
                        <span className="font-medium text-foreground">{detectedProvider.name}</span>{" "}
                        format detected — {detectedProvider.kind.toLowerCase()}
                      </span>
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <span className="text-muted-foreground">Columns auto-mapped</span>
                    </>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setStep("map")}
                  className="shrink-0 text-[11px] text-mint underline underline-offset-2 hover:no-underline"
                >
                  Adjust mapping
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {[
                  { label: "Rows", value: result.summary.total },
                  { label: "Ready", value: includedCount },
                  { label: "Duplicates", value: result.summary.duplicates },
                  { label: "Invalid", value: result.summary.invalid },
                ].map((k) => (
                  <div key={k.label} className="rounded-xl border border-border bg-card px-3 py-2">
                    <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{k.label}</div>
                    <div
                      className={cn(
                        "text-sm font-semibold",
                        k.label === "Invalid" && k.value > 0
                          ? "text-destructive"
                          : k.label === "Ready"
                            ? "text-success"
                            : "text-foreground",
                      )}
                    >
                      {k.value}
                    </div>
                  </div>
                ))}
              </div>

              {result.summary.planIssues.length > 0 && (
                <ul className="space-y-1 rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 text-[11px]">
                  {result.summary.planIssues.slice(0, 4).map((i, idx) => (
                    <li key={idx} className="flex gap-1.5">
                      <AlertTriangle className="mt-0.5 h-3 w-3 shrink-0 text-amber-500" />
                      <span className={i.level === "error" ? "text-red-400" : "text-foreground"}>{i.message}</span>
                    </li>
                  ))}
                </ul>
              )}

              {mergeInfo && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2 text-xs">
                  <span className="shrink-0 text-muted-foreground">Import mode:</span>
                  {(["insert", "merge"] as CommitMode[]).map((m) => (
                    <label key={m} className="flex cursor-pointer items-center gap-1.5">
                      <input
                        type="radio"
                        checked={commitMode === m}
                        onChange={() => (m === "merge" ? enableMerge() : setCommitMode("insert"))}
                      />
                      <span className={commitMode === m ? "font-medium text-foreground" : "text-muted-foreground"}>
                        {m === "insert" ? "Add new" : "Update existing"}
                      </span>
                    </label>
                  ))}
                </div>
              )}

              <div className="overflow-auto rounded-xl border border-border">
                <table className="w-full text-xs">
                  <thead className="bg-surface text-muted-foreground">
                    <tr>
                      <th className="w-8 px-2 py-2 text-left">
                        <input
                          type="checkbox"
                          aria-label="Select all rows"
                          checked={result.rows.length > 0 && result.rows.every((r) => r.include)}
                          onChange={(e) =>
                            setResult({
                              ...result,
                              rows: result.rows.map((r) => ({ ...r, include: e.target.checked })),
                            })
                          }
                        />
                      </th>
                      {previewCols.map((k) => (
                        <th key={k} className="whitespace-nowrap px-2 py-2 text-left text-xs font-medium">
                          {PREVIEW_LABELS[k] ?? k}
                        </th>
                      ))}
                      <th className="px-2 py-2 text-left text-xs font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {result.rows.slice(0, 100).map((r) => (
                      <tr key={r.index} className={cn(!r.include && "opacity-50")}>
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            aria-label={`Include row ${r.index + 1}`}
                            checked={r.include}
                            onChange={(e) =>
                              setResult({
                                ...result,
                                rows: result.rows.map((x) =>
                                  x.index === r.index ? { ...x, include: e.target.checked } : x,
                                ),
                              })
                            }
                          />
                        </td>
                        {previewCols.map((k) => (
                          <td key={k} className="whitespace-nowrap px-2 py-1.5 text-xs text-foreground">
                            {formatPreviewCell(k, r.values[k])}
                          </td>
                        ))}
                        <td className="px-2 py-1.5 text-[10px]">
                          {r.duplicate ? (
                            <span className="rounded-full bg-amber-500/15 px-1.5 py-0.5 text-amber-500">duplicate</span>
                          ) : !r.include ? (
                            <span className="rounded-full bg-red-500/15 px-1.5 py-0.5 text-red-400">invalid</span>
                          ) : (
                            <span className="rounded-full bg-success/15 px-1.5 py-0.5 text-success">✓ ready</span>
                          )}
                          {r.categorySuggestion && !r.categorySuggestion.applied && (
                            <button
                              type="button"
                              onClick={() =>
                                setResult({
                                  ...result,
                                  rows: result.rows.map((x) =>
                                    x.index === r.index
                                      ? {
                                          ...x,
                                          values: { ...x.values, category: r.categorySuggestion!.category },
                                          categorySuggestion: { ...r.categorySuggestion!, applied: true },
                                        }
                                      : x,
                                  ),
                                })
                              }
                              className="ml-1 rounded-full bg-primary/15 px-1.5 py-0.5 text-primary hover:bg-primary/25"
                              title="Apply this suggested category"
                            >
                              use “{r.categorySuggestion.category}”
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.rows.length > 100 && (
                <p className="text-[11px] text-muted-foreground">
                  Showing first 100 of {result.rows.length} rows — all {includedCount} selected rows will be imported.
                </p>
              )}

              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <input type="checkbox" checked={rememberMapping} onChange={(e) => setRememberMapping(e.target.checked)} />
                Remember this column mapping for next time
              </label>
              {isPending && (
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-mint transition-all" style={{ width: `${progress}%` }} />
                </div>
              )}
            </div>
          )}


          {/* ---------------- DONE ---------------- */}
          {step === "done" && outcome && (
            <div className="grid place-items-center gap-2 rounded-2xl border border-border bg-card p-10 text-center">
              <CheckCircle2 className="h-8 w-8 text-success" />
              <p className="text-sm font-semibold text-foreground">
                {outcome.inserted} record{outcome.inserted === 1 ? "" : "s"} imported
                {outcome.updated ? ` · ${outcome.updated} updated` : ""}
              </p>
              <p className="text-xs text-muted-foreground">
                {outcome.skipped} skipped (duplicates or invalid)
                {outcome.failed ? ` · ${outcome.failed} failed` : ""}
              </p>
              {outcome.errors.slice(0, 2).map((e, i) => (
                <p key={i} className="text-[11px] text-red-400">{e}</p>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          {step === "map" && (
            <>
              <button onClick={() => setStep("upload")} className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold">
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button onClick={goPreview} className="inline-flex items-center gap-1 rounded-xl bg-mint px-4 py-2 text-xs font-semibold text-mint-foreground">
                Continue <Check className="h-3.5 w-3.5" />
              </button>
            </>
          )}
          {step === "preview" && (
            <>
              <button onClick={() => setStep("map")} className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold">
                <ChevronLeft className="h-3.5 w-3.5" /> Back
              </button>
              <button
                disabled={isPending || includedCount === 0}
                onClick={doCommit}
                className="inline-flex items-center gap-1 rounded-xl bg-mint px-4 py-2 text-xs font-semibold text-mint-foreground disabled:opacity-50"
              >
                {isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
                Import {includedCount} row{includedCount === 1 ? "" : "s"}
              </button>
            </>
          )}
          {(step === "upload" || step === "done") && (
            <button onClick={() => close(false)} className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold">
              <X className="h-3.5 w-3.5" /> {step === "done" ? "Close" : "Cancel"}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
