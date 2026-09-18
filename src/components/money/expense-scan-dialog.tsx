/**
 * Scan Expense — a faster way to create an expense from a receipt, bill,
 * invoice or payment confirmation. Nothing here replaces the manual Add
 * Transaction flow; on confirm it simply hands the extracted values to the
 * existing transaction dialog.
 */

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Camera,
  FileText,
  ImageIcon,
  Loader2,
  RotateCcw,
  ScanLine,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DatePicker } from "@/components/ui/date-picker";
import { formatDate } from "@/lib/date-format";
import { scanReceipt, type ScanFields } from "@/lib/expense-scan.functions";
import {
  buildNote,
  findDuplicates,
  matchCategory,
  matchPaymentAccount,
  matchPaymentMode,
  type DuplicateMatch,
} from "@/lib/expense-scan-match";
import { useCategories, useTransactions, type Category } from "@/lib/money-api";
import {
  accountTypesForMode,
  formatAccountLabel,
  paymentModeLabel,
  PAYMENT_MODES,
  usePaymentAccounts,
} from "@/lib/payment-accounts-api";
import { loadCategoryCorrections, type CorrectionMap } from "@/lib/import/categorize";

const MAX_BYTES = 15 * 1024 * 1024;

export type ScanHandoff = {
  amount: string;
  date: string;
  merchant: string;
  categoryId: string;
  note: string;
  paymentMode: string | null;
  paymentAccountId: string | null;
  receiptFile: File | null;
};

type Stage = "pick" | "reading" | "review" | "error";

function readAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(String(fr.result));
    fr.onerror = () => reject(new Error("READ_FAILED"));
    fr.readAsDataURL(file);
  });
}

const FRIENDLY: Record<string, string> = {
  AI_NOT_CONFIGURED:
    "The reader isn't available right now. You can still add this expense manually.",
  AI_CREDITS:
    "Scanning is temporarily unavailable because the workspace is out of AI credits.",
  AI_BUSY: "Too many scans at once — please try again in a moment.",
  UNSUPPORTED_FILE: "Please choose a photo (JPG, PNG, HEIC) or a PDF.",
  UNREADABLE_DOCUMENT:
    "We couldn't read this file. Try a clearer, well-lit photo — or add it manually.",
  READ_FAILED: "That file couldn't be opened. Please try another one.",
  TOO_LARGE: "That file is larger than 15 MB. Please use a smaller photo or PDF.",
};

export function ExpenseScanDialog({
  open,
  onOpenChange,
  onConfirm,
  onManual,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (v: ScanHandoff) => void;
  onManual: () => void;
}) {
  const [stage, setStage] = useState<Stage>("pick");
  const [errCode, setErrCode] = useState<string>("");
  const [file, setFile] = useState<File | null>(null);
  const [fields, setFields] = useState<ScanFields | null>(null);
  const [confidence, setConfidence] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<string[]>([]);
  const [corrections, setCorrections] = useState<CorrectionMap | undefined>();

  // editable review values
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<string | null>(null);
  const [accountId, setAccountId] = useState<string | null>(null);


  const categoriesQ = useCategories();
  const transactionsQ = useTransactions();
  const accountsQ = usePaymentAccounts();
  const categories: Category[] = categoriesQ.data ?? [];
  const expenseCats = categories.filter((c) => c.kind === "expense");
  const accounts = (accountsQ.data ?? []).filter((a) => a.is_active);

  // Keep "Paid from" consistent with the detected mode (a credit-card receipt
  // should not offer bank accounts), matching the manual form's rules.
  const modeAccounts = useMemo(() => {
    if (!mode) return accounts;
    const types = accountTypesForMode(mode);
    return accounts.filter((a) => types.includes(a.account_type));
  }, [accounts, mode]);

  useEffect(() => {
    if (!open) return;
    setStage("pick");
    setErrCode("");
    setFile(null);
    setFields(null);
    setWarnings([]);
    void loadCategoryCorrections().then(setCorrections).catch(() => undefined);
  }, [open]);

  const duplicates: DuplicateMatch[] = useMemo(() => {
    if (stage !== "review") return [];
    return findDuplicates(
      {
        amount: Number(amount) || null,
        date,
        merchant,
        invoiceNumber: fields?.invoice_number ?? null,
        paymentAccountId: accountId,
      },
      transactionsQ.data ?? [],
    );
  }, [stage, amount, date, merchant, accountId, fields, transactionsQ.data]);

  const handleFile = async (f: File | null | undefined) => {
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setErrCode("TOO_LARGE");
      setStage("error");
      return;
    }
    setFile(f);
    setStage("reading");
    setErrCode("");
    try {
      const dataUrl = await readAsDataUrl(f);
      const res = await scanReceipt({ data: { dataUrl, filename: f.name } });
      // Categories / accounts may still be loading when the scan returns; match
      // against freshly resolved lists so suggestions aren't silently skipped.
      const catList = categories.length
        ? categories
        : ((await categoriesQ.refetch()).data ?? []);
      const accList = (accountsQ.data ?? []).length
        ? (accountsQ.data ?? [])
        : ((await accountsQ.refetch()).data ?? []);
      const cat = matchCategory(res.fields, catList, corrections);
      const m = matchPaymentMode(res.fields.payment_method);
      const acc = matchPaymentAccount(res.fields, m, accList);

      const currencyNote =
        res.fields.currency && res.fields.currency.toUpperCase() !== "INR"
          ? `Original currency: ${res.fields.currency}`
          : undefined;

      setFields(res.fields);
      setConfidence(res.confidence);
      const warns = [...res.warnings];
      if (cat.categoryId == null)
        warns.push("Category couldn't be matched — please choose one.");
      if (!acc.accountId)
        warns.push("Payment account couldn't be identified — please select it.");
      setWarnings(warns);

      setAmount(res.fields.amount != null ? String(res.fields.amount) : "");
      setDate(res.fields.date ?? new Date().toISOString().slice(0, 10));
      setMerchant(res.fields.merchant ?? "");
      setCategoryId(cat.categoryId ?? "");
      setNote(buildNote(res.fields, currencyNote));
      setMode(m);
      setAccountId(acc.accountId);
      setStage("review");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "UNREADABLE_DOCUMENT";
      setErrCode(msg);
      setStage("error");
    }
  };

  const confirm = () => {
    onConfirm({
      amount,
      date,
      merchant,
      categoryId,
      note,
      paymentMode: mode,
      paymentAccountId: accountId,
      receiptFile: file,
    });
    onOpenChange(false);
  };

  const lowFields = Object.entries(confidence)
    .filter(([, v]) => v === "low" || v === "none")
    .map(([k]) => k);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="h-4 w-4 text-mint" /> Scan expense
          </DialogTitle>
          <DialogDescription>
            Take a photo or upload a receipt, bill or invoice — we'll read the details
            for you. You can edit everything before saving.
          </DialogDescription>
        </DialogHeader>

        {stage === "pick" && (
          <div className="grid gap-2 sm:grid-cols-3">
            <SourcePicker
              icon={Camera}
              label="Take photo"
              accept="image/*"
              capture="environment"
              onFile={handleFile}
            />
            <SourcePicker
              icon={ImageIcon}
              label="From gallery"
              accept="image/*"
              onFile={handleFile}
            />
            <SourcePicker
              icon={FileText}
              label="Upload PDF"
              accept="application/pdf,image/*"
              onFile={handleFile}
            />
          </div>
        )}


        {stage === "reading" && (
          <div className="grid place-items-center gap-3 py-10 text-center">
            <Loader2 className="h-6 w-6 animate-spin text-mint" />
            <div className="text-sm font-semibold text-foreground">Reading receipt…</div>
            <div className="text-xs text-muted-foreground">
              This usually takes a few seconds.
            </div>
          </div>
        )}

        {stage === "error" && (
          <div className="grid gap-3">
            <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{FRIENDLY[errCode] ?? FRIENDLY["UNREADABLE_DOCUMENT"]}</span>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => setStage("pick")}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" /> Try another file
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  onOpenChange(false);
                  onManual();
                }}
              >
                Enter manually
              </Button>
            </div>
          </div>
        )}

        {stage === "review" && (
          <div className="grid max-h-[60vh] gap-3 overflow-y-auto pr-1">
            {warnings.length > 0 && (
              <div className="grid gap-1 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
                {warnings.map((w) => (
                  <div key={w} className="flex gap-2">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            )}

            {duplicates.length > 0 && (
              <div className="grid gap-2 rounded-lg border border-amber-500/40 bg-amber-500/5 p-3 text-xs">
                <div className="font-semibold text-amber-200">
                  This may already be recorded
                </div>
                {duplicates.map((d) => (
                  <div
                    key={d.txn.id}
                    className="flex items-center justify-between gap-2 text-muted-foreground"
                  >
                    <span>
                      {d.txn.merchant} · ₹{d.txn.amount.toLocaleString("en-IN")} ·{" "}
                      {formatDate(d.txn.occurred_on)}
                    </span>
                    <span className="shrink-0 text-[10px] uppercase tracking-wide">
                      {d.reason}
                    </span>
                  </div>
                ))}
                <div className="text-muted-foreground">
                  Save anyway if this is a separate payment.
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="scan-amount">
                  Amount (₹){" "}
                  {lowFields.includes("amount") && (
                    <span className="text-amber-300">· check</span>
                  )}
                </Label>
                <Input
                  id="scan-amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="scan-date">Date</Label>
                <DatePicker id="scan-date" value={date} onChange={(v) => setDate(v)} />
              </div>
            </div>

            <div>
              <Label htmlFor="scan-merchant">Merchant</Label>
              <Input
                id="scan-merchant"
                value={merchant}
                onChange={(e) => setMerchant(e.target.value)}
                placeholder="Zomato, Amazon…"
              />
            </div>

            <div>
              <Label>Category</Label>
              <Select
                value={categoryId || "none"}
                onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Uncategorized</SelectItem>
                  {expenseCats.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Payment mode</Label>
                <Select
                  value={mode ?? "none"}
                  onValueChange={(v) => {
                    setMode(v === "none" ? null : v);
                    setAccountId(null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select mode" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select mode</SelectItem>
                    {PAYMENT_MODES.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Paid from</Label>
                <Select
                  value={accountId ?? "none"}
                  onValueChange={(v) => setAccountId(v === "none" ? null : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select account</SelectItem>
                    {modeAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {formatAccountLabel(a)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {mode && modeAccounts.length === 0 && (
                  <div className="mt-1 text-[11px] text-amber-300">
                    No {paymentModeLabel(mode).toLowerCase()} account saved yet — you can add
                    one on the next screen.
                  </div>
                )}
              </div>

            </div>

            {mode && (
              <div className="text-[11px] text-muted-foreground">
                Detected as {paymentModeLabel(mode)}.
              </div>
            )}

            <div>
              <Label htmlFor="scan-note">Note</Label>
              <Textarea
                id="scan-note"
                rows={4}
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {file && (
              <div className="text-[11px] text-muted-foreground">
                Receipt <span className="text-foreground">{file.name}</span> will be
                attached privately to this expense.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {stage === "review" ? (
            <>
              <Button variant="ghost" onClick={() => setStage("pick")}>
                Rescan
              </Button>
              <Button
                className="bg-mint text-[#04121C] hover:brightness-110"
                onClick={confirm}
              >
                Continue
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              onClick={() => {
                onOpenChange(false);
                onManual();
              }}
            >
              Enter manually instead
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * The native file input covers the complete visible control. Mobile browsers
 * therefore receive the tap on the input itself instead of relying on a label
 * forwarding the tap or on a scripted click, both of which can be blocked in
 * dialogs and embedded previews.
 */
function SourcePicker({
  icon: Icon,
  label,
  accept,
  capture,
  onFile,
}: {
  icon: typeof Camera;
  label: string;
  accept: string;
  capture?: "environment" | "user";
  onFile: (f: File | null | undefined) => void | Promise<void>;
}) {
  return (
    <label
      className="relative grid min-h-20 cursor-pointer place-items-center gap-2 overflow-hidden rounded-xl border border-border bg-card px-3 py-6 text-xs font-semibold text-foreground transition hover:border-mint/50 hover:bg-surface focus-within:border-mint/50 focus-within:ring-2 focus-within:ring-mint/60"
    >
      <Icon className="pointer-events-none h-5 w-5 text-mint" aria-hidden="true" />
      <span className="pointer-events-none">{label}</span>
      <input
        type="file"
        accept={accept}
        {...(capture ? { capture } : {})}
        aria-label={label}
        className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
        onChange={(e) => {
          const f = e.target.files?.[0];
          // allow re-picking the same file later
          e.target.value = "";
          void onFile(f);
        }}
      />
    </label>
  );
}
