/**
 * Pure helpers for the Expense Scanner: map OCR output onto the app's existing
 * expense categories, payment modes / payment accounts, and detect possible
 * duplicates. No side effects, no network, no logging.
 */

import type { Category, Transaction } from "@/lib/money-api";
import type { PaymentAccount, PaymentAccountType } from "@/lib/payment-accounts-api";
import {
  classifyCategory,
  type CategoryGuess,
  type CorrectionMap,
} from "@/lib/import/categorize";
import type { ScanFields } from "@/lib/expense-scan.functions";

export type MatchConfidence = "high" | "medium" | "low" | "none";

/* ------------------------------- CATEGORY ------------------------------- */

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Resolve a category from the OCR hints using the app's existing merchant
 * classifier, then map the resulting name onto one of the user's own
 * expense categories. Never creates a category.
 */
export function matchCategory(
  fields: ScanFields,
  categories: Category[],
  learned?: Map<string, string>,
): { categoryId: string | null; confidence: MatchConfidence; label: string | null } {
  const expenseCats = categories.filter((c) => c.kind === "expense");
  const byName = new Map(expenseCats.map((c) => [norm(c.name), c]));

  const candidates: { name: string; confidence: MatchConfidence }[] = [];

  // 1) Direct hints from the document.
  for (const hint of [fields.subcategory_hint, fields.category_hint]) {
    if (hint) candidates.push({ name: hint, confidence: "medium" });
  }

  // 2) The app's own merchant classifier (brand / keyword / learned rules).
  const text = [fields.merchant, fields.description, fields.notes]
    .filter(Boolean)
    .join(" ");
  if (text) {
    const res: ClassifyResult = classifyMerchant(text, "expense", learned);
    if (res.category) {
      const conf: MatchConfidence =
        res.confidence === "high" ? "high" : res.confidence === "medium" ? "medium" : "low";
      candidates.unshift({ name: res.category, confidence: conf });
    }
  }

  for (const c of candidates) {
    const exact = byName.get(norm(c.name));
    if (exact) return { categoryId: exact.id, confidence: c.confidence, label: exact.name };
  }
  // Loose containment as a last resort — always low confidence.
  for (const c of candidates) {
    const key = norm(c.name);
    const hit = expenseCats.find(
      (cat) => norm(cat.name).includes(key) || key.includes(norm(cat.name)),
    );
    if (hit) return { categoryId: hit.id, confidence: "low", label: hit.name };
  }

  const label = candidates[0]?.name ?? null;
  return { categoryId: null, confidence: "none", label };
}

/* ---------------------------- PAYMENT / ACCOUNT ---------------------------- */

/** Map a free-text payment method from a receipt onto an app payment mode. */
export function matchPaymentMode(raw: string | null): string | null {
  if (!raw) return null;
  const t = norm(raw);
  if (/\bcash\b|by cash|cash paid/.test(t)) return "cash";
  if (/upi|gpay|google pay|phonepe|paytm upi|bhim|qr/.test(t)) return "upi";
  if (/credit card|creditcard|\bcc\b|visa credit|master credit|rupay credit/.test(t))
    return "credit_card";
  if (/debit card|debitcard|\bdc\b|atm card/.test(t)) return "debit_card";
  if (/wallet|paytm wallet|amazon pay|mobikwik|freecharge/.test(t)) return "wallet";
  if (/net banking|netbanking|internet banking/.test(t)) return "net_banking";
  if (/neft|rtgs|imps|bank transfer|account transfer/.test(t)) return "bank_transfer";
  if (/cheque|check no/.test(t)) return "cheque";
  if (/auto debit|ecs|mandate/.test(t)) return "auto_debit";
  if (/\bcard\b/.test(t)) return "credit_card";
  return null;
}

const typesForMode: Record<string, PaymentAccountType[]> = {
  cash: ["cash"],
  upi: ["bank", "upi"],
  credit_card: ["credit_card"],
  debit_card: ["bank", "debit_card"],
  wallet: ["wallet"],
  net_banking: ["bank"],
  bank_transfer: ["bank"],
  cheque: ["bank"],
  auto_debit: ["bank"],
};

/**
 * Suggest one of the user's existing payment accounts. Returns null when it
 * cannot be identified — the UI then shows "Select account". Never invents one.
 */
export function matchPaymentAccount(
  fields: ScanFields,
  mode: string | null,
  accounts: PaymentAccount[],
): { accountId: string | null; confidence: MatchConfidence } {
  const active = accounts.filter((a) => a.is_active);
  if (!active.length) return { accountId: null, confidence: "none" };

  const allowed = mode ? (typesForMode[mode] ?? []) : [];
  const pool = allowed.length
    ? active.filter((a) => allowed.includes(a.account_type))
    : active;
  if (!pool.length) return { accountId: null, confidence: "none" };

  // 1) Card / account last four digits — strongest signal.
  const last4 = fields.card_last4?.replace(/\D/g, "").slice(-4) ?? "";
  if (last4.length === 4) {
    const hit = pool.find((a) => (a.last4 ?? "").replace(/\D/g, "").slice(-4) === last4);
    if (hit) return { accountId: hit.id, confidence: "high" };
  }

  // 2) Bank / issuer name mentioned anywhere on the document.
  const hay = norm(
    [fields.payment_method, fields.notes, fields.description, fields.merchant]
      .filter(Boolean)
      .join(" "),
  );
  if (hay) {
    const scored = pool
      .map((a) => {
        const inst = norm(a.institution ?? "");
        const name = norm(a.name);
        let score = 0;
        if (inst && inst.length >= 3 && hay.includes(inst)) score += 2;
        if (name && name.length >= 4 && hay.includes(name)) score += 1;
        return { a, score };
      })
      .filter((s) => s.score > 0)
      .sort((x, y) => y.score - x.score);
    if (scored.length === 1 || (scored.length > 1 && scored[0]!.score > scored[1]!.score))
      return { accountId: scored[0]!.a.id, confidence: "medium" };
  }

  // 3) Cash and single-candidate modes are unambiguous.
  if (mode === "cash") {
    const cash = pool.find((a) => a.account_type === "cash");
    if (cash) return { accountId: cash.id, confidence: "high" };
  }
  if (mode && pool.length === 1) return { accountId: pool[0]!.id, confidence: "medium" };

  const def = pool.find((a) => a.is_default);
  if (mode && def) return { accountId: def.id, confidence: "low" };

  return { accountId: null, confidence: "none" };
}

/* ------------------------------- DUPLICATES ------------------------------- */

export type DuplicateMatch = { txn: Transaction; reason: string };

/**
 * Look for an existing expense that likely represents the same payment:
 * same invoice number in the note, or same merchant + amount within 3 days.
 */
export function findDuplicates(
  input: {
    amount: number | null;
    date: string | null;
    merchant: string | null;
    invoiceNumber?: string | null;
    paymentAccountId?: string | null;
  },
  transactions: Transaction[],
  excludeId?: string,
): DuplicateMatch[] {
  const out: DuplicateMatch[] = [];
  const invoice = input.invoiceNumber ? norm(input.invoiceNumber) : "";
  const merchant = input.merchant ? norm(input.merchant) : "";
  const when = input.date ? new Date(input.date).getTime() : NaN;

  for (const t of transactions) {
    if (t.kind !== "expense" || t.id === excludeId) continue;

    if (invoice && t.note && norm(t.note).includes(invoice)) {
      out.push({ txn: t, reason: "Same invoice / receipt number" });
      continue;
    }
    if (input.amount == null || Math.abs(t.amount - input.amount) > 0.5) continue;
    const dayGap = Number.isNaN(when)
      ? 99
      : Math.abs(new Date(t.occurred_on).getTime() - when) / 86400000;
    if (dayGap > 3) continue;
    if (merchant && norm(t.merchant) && norm(t.merchant) === merchant) {
      out.push({ txn: t, reason: "Same merchant, amount and date" });
      continue;
    }
    if (
      input.paymentAccountId &&
      t.payment_account_id === input.paymentAccountId &&
      dayGap <= 1
    ) {
      out.push({ txn: t, reason: "Same amount, account and date" });
    }
  }
  return out.slice(0, 3);
}

/* -------------------------------- PREFILL -------------------------------- */

export type ScanPrefill = {
  kind: "expense";
  amount: string;
  occurred_on: string;
  merchant: string;
  category_id: string | null;
  note: string;
  payment_mode: string | null;
  payment_account_id: string | null;
  needsReview: string[];
  receiptFile?: File | null;
};

/** Extras that don't have their own column are appended to the note. */
export function buildNote(fields: ScanFields, currencyNote?: string): string {
  const lines: string[] = [];
  if (fields.notes) lines.push(fields.notes);
  if (fields.invoice_number) lines.push(`Invoice: ${fields.invoice_number}`);
  if (fields.tax_amount != null) lines.push(`Tax/GST: ${fields.tax_amount}`);
  if (fields.discount != null) lines.push(`Discount: ${fields.discount}`);
  if (fields.tip != null) lines.push(`Tip/Service: ${fields.tip}`);
  if (fields.card_last4) lines.push(`Card ending ${fields.card_last4}`);
  if (fields.location) lines.push(`Location: ${fields.location}`);
  if (currencyNote) lines.push(currencyNote);
  if (fields.line_items.length) {
    lines.push("Items:");
    for (const it of fields.line_items.slice(0, 20)) {
      const parts = [it.name ?? "Item"];
      if (it.quantity != null) parts.push(`x${it.quantity}`);
      if (it.unit_price != null) parts.push(`@ ${it.unit_price}`);
      if (it.tax != null) parts.push(`tax ${it.tax}`);
      if (it.total != null) parts.push(`= ${it.total}`);
      lines.push(`• ${parts.join(" ")}`);
    }
  }
  return lines.join("\n");
}
