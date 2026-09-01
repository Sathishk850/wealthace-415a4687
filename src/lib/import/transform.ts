/**
 * Universal Import Engine — NORMALIZATION layer.
 *
 * Turns raw rows + a confirmed mapping plan into canonical rows for a module,
 * validating every value and flagging duplicates, invalid rows, suspicious
 * mappings and currency mismatches. Module schemas are untouched: the output
 * is a plain canonical object the module's own bulk-insert API accepts.
 */
import { detectCurrency, toBoolean, toDate, toNumber, toPercent, toText } from "./coerce";
import { classifyCategory, type CategoryConfidence, type CorrectionMap } from "./categorize";
import { classifySecurity } from "./classify-security";
import type { CanonicalField } from "./schemas";
import type { MappingPlan } from "./match";
import type { ParsedFile } from "./parse";


export type IssueLevel = "error" | "warning";
export type RowIssue = { level: IssueLevel; field?: string; message: string };

export type TransformedRow = {
  index: number;
  /** Canonical values, keyed by canonical field key. */
  values: Record<string, unknown>;
  raw: Record<string, unknown>;
  issues: RowIssue[];
  duplicate: "file" | "existing" | null;
  include: boolean;
  /** Transactions only: category proposed by the shared classifier. */
  categorySuggestion?: { category: string; confidence: CategoryConfidence; applied: boolean } | null;
};

export type TransformSummary = {
  total: number;
  valid: number;
  invalid: number;
  duplicates: number;
  /** Rows silently dropped as non-data (e.g. statement filler lines). */
  skipped: number;
  currencies: string[];
  planIssues: RowIssue[];
};

export type TransformResult = { rows: TransformedRow[]; summary: TransformSummary; skipped: number };


const KIND_EXPENSE = ["expense", "debit", "dr", "withdrawal", "paid", "out", "spend", "payment", "purchase"];
const KIND_INCOME = ["income", "credit", "cr", "deposit", "received", "in", "salary", "refund"];

/**
 * Turn a raw bank narration into a readable merchant label: drop channel
 * prefixes, long reference numbers, VPA suffixes and trailing pipe segments.
 */
export function cleanBankNarration(input: unknown): string {
  let s = String(input ?? "").replace(/\s+/g, " ").trim();
  if (!s) return "";
  // Channel prefixes, possibly repeated (e.g. "UPI/NEFT-DR-...").
  for (let i = 0; i < 3; i++) {
    s = s.replace(/^(upi|neft|imps|rtgs|pos|atm|ach|ecs|nach|inb|mmt|bil|tpt|chq|cash)[\s\-/:*|]+(dr|cr)?[\s\-/:*|]*/i, "").trim();
  }
  // Trailing pipe/slash separated ref segments.
  s = s.split("|")[0].trim();
  // VPA handles → keep only the readable part.
  s = s.replace(/([a-z0-9._-]+)@[a-z]+/gi, "$1");
  // Long reference numbers.
  s = s.replace(/\b\d{9,}\b/g, " ");
  s = s.replace(/[\-/_*]{2,}/g, " ").replace(/\s{2,}/g, " ").replace(/^[\s\-/*|:]+|[\s\-/*|:]+$/g, "").trim();
  if (s && s === s.toUpperCase()) {
    s = s
      .toLowerCase()
      .split(" ")
      .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");
  }
  return s;
}

/** Parse "1,250.00 Dr" / "500 CR" style amount strings. */
function parseDrCrAmount(raw: unknown): { amount: number; kind: "income" | "expense" } | null {
  const s = String(raw ?? "").trim();
  if (!s) return null;
  const m = /(dr|cr)\b\.?/i.exec(s);
  const num = toNumber(s.replace(/(dr|cr)\b\.?/i, ""));
  if (num == null || !m) return null;
  return { amount: Math.abs(num), kind: m[1].toLowerCase() === "cr" ? "income" : "expense" };
}


function coerce(field: CanonicalField, raw: unknown, preferMonthFirst: boolean) {
  switch (field.type) {
    case "number":
      return toNumber(raw);
    case "percent":
      return toPercent(raw);
    case "date":
      return toDate(raw, preferMonthFirst);
    case "boolean":
      return toBoolean(raw);
    case "currency": {
      const detected = detectCurrency(raw) ?? toText(raw)?.toUpperCase();
      return detected && /^[A-Z]{3}$/.test(detected) ? detected : null;
    }
    default:
      return toText(raw);
  }
}

function dedupeKey(values: Record<string, unknown>, keys: string[]) {
  return keys
    .map((k) => String(values[k] ?? "").trim().toLowerCase())
    .join("|");
}

export function transformRows(
  parsed: ParsedFile,
  plan: MappingPlan,
  opts: {
    /** Existing module rows (canonical-shaped) used for duplicate detection. */
    existing?: Record<string, unknown>[];
    /** Interpret ambiguous numeric dates as MM/DD/YYYY. */
    preferMonthFirst?: boolean;
    /** Learned per-user merchant→category corrections (transactions). */
    corrections?: CorrectionMap;
  } = {},
): TransformResult {
  const { schema, mappings } = plan;
  const preferMonthFirst = !!opts.preferMonthFirst;
  const active = mappings.filter((m) => m.source);
  const planIssues: RowIssue[] = [];
  const currencies = new Set<string>();

  const rows: TransformedRow[] = [];
  let skippedRows = 0;
  parsed.rows.forEach((raw, index) => {
    const values: Record<string, unknown> = {};
    const issues: RowIssue[] = [];
    let skipRow = false;
    let categorySuggestion: TransformedRow["categorySuggestion"] = null;


    for (const m of active) {
      const rawVal = raw[m.source as string];
      const val = coerce(m.field, rawVal, preferMonthFirst);
      const hadInput = rawVal != null && String(rawVal).trim() !== "";
      if (val == null && hadInput) {
        issues.push({
          level: m.field.required ? "error" : "warning",
          field: m.field.key,
          message: `${m.field.label}: could not read “${String(rawVal).slice(0, 24)}” as ${m.field.type}`,
        });
      }
      if (val != null) values[m.field.key] = val;
      if (m.field.type === "currency" && typeof val === "string") currencies.add(val);
      else {
        const cur = detectCurrency(rawVal);
        if (cur) currencies.add(cur);
      }
    }

    // Fallbacks for absent / blank optional fields.
    for (const m of mappings) {
      if (values[m.field.key] == null && m.field.fallback !== undefined) {
        values[m.field.key] = m.field.fallback;
      }
    }

    // Module-aware normalisation.
    if (schema.module === "transactions") {
      const debit = typeof values.debit === "number" ? Math.abs(values.debit) : null;
      const credit = typeof values.credit === "number" ? Math.abs(values.credit) : null;

      // Statement filler lines: no date and no money column at all.
      const hasMoney = values.amount != null || debit != null || credit != null || String(values.raw_amount ?? "").trim() !== "";
      if (values.occurred_on == null && !hasMoney) {
        skippedRows++;
        skipRow = true;
      }

      let derivedKind: "income" | "expense" | null = null;
      // Split debit/credit columns → amount + kind. A mapped-but-zero amount
      // (ledger exports print 0.00 in the unused column) counts as absent.
      if (values.amount === 0 && (debit || credit)) values.amount = null;
      if (values.amount == null && (debit != null || credit != null)) {
        if (credit != null && credit > 0) {
          values.amount = credit;
          derivedKind = "income";
        } else if (debit != null && debit > 0) {
          values.amount = debit;
          derivedKind = "expense";
        }
      }
      // "1,250.00 Dr" style single column.
      if (values.amount == null && values.raw_amount != null) {
        const drcr = parseDrCrAmount(values.raw_amount);
        if (drcr) {
          values.amount = drcr.amount;
          derivedKind = drcr.kind;
        }
      }

      const rawKind = String(values.kind ?? "").toLowerCase();
      let kind: "income" | "expense" | null = null;
      if (KIND_INCOME.some((w) => rawKind === w || rawKind.includes(w))) kind = "income";
      if (KIND_EXPENSE.some((w) => rawKind === w || rawKind.includes(w))) kind = "expense";
      const amt = typeof values.amount === "number" ? values.amount : null;
      if (!kind && amt != null) kind = amt < 0 ? "expense" : "income";
      const sourceHeader = (active.find((m) => m.field.key === "amount")?.source ?? "").toLowerCase();
      if (/debit|withdraw/.test(sourceHeader)) kind = "expense";
      else if (/credit|deposit/.test(sourceHeader)) kind = "income";
      if (derivedKind) kind = derivedKind;
      values.kind = kind ?? "expense";
      if (typeof values.amount === "number") values.amount = Math.abs(values.amount as number);

      // Readable merchant label from raw bank narrations.
      if (typeof values.merchant === "string") {
        const cleaned = cleanBankNarration(values.merchant);
        if (cleaned) values.merchant = cleaned;
      }

      // Merchant → category classification (only when the file gave no category).
      const givenCategory = String(values.category ?? "").trim();
      if (!givenCategory) {

        const text = [values.merchant, values.note, raw.__raw]
          .map((v) => (v == null ? "" : String(v)))
          .join(" ");
        const guess = classifyCategory(text, values.kind as "income" | "expense", opts.corrections);
        if (guess.category) {
          const applied = guess.confidence === "high";
          if (applied) values.category = guess.category;
          categorySuggestion = { category: guess.category, confidence: guess.confidence, applied };
          if (guess.confidence === "low") {
            issues.push({
              level: "warning",
              field: "category",
              message: `Category needs review — “${guess.category}” is only a weak match`,
            });
          }
        }
      }
    }

    if (schema.module === "investment_txns") {
      const qty = Number(values.quantity ?? 0);
      const price = Number(values.price ?? 0);
      if (values.amount == null && qty && price) values.amount = qty * price;
      if (!price && qty && typeof values.amount === "number") values.price = (values.amount as number) / qty;
      if (typeof values.quantity === "number") values.quantity = Math.abs(values.quantity as number);
      if (typeof values.price === "number") values.price = Math.abs(values.price as number);
    }

    if (schema.module === "investments") {
      const qty = Number(values.quantity ?? 0);
      const avg = Number(values.avg_price ?? 0);
      const cur = Number(values.current_price ?? 0);
      if (values.invested_value == null && qty && avg) values.invested_value = qty * avg;
      if (values.current_value == null && qty && cur) values.current_value = qty * cur;
      // Back-fill prices from totals when only values were provided.
      if (!avg && qty && typeof values.invested_value === "number") {
        values.avg_price = (values.invested_value as number) / qty;
      }
      if (!cur && qty && typeof values.current_value === "number") {
        values.current_price = (values.current_value as number) / qty;
      }

      // Asset-class inference when the file gave nothing useful.
      const given = String(values.category ?? "").trim().toLowerCase();
      if (!given || given === "others" || given === "other" || given === "equity") {
        const guess = classifySecurity({
          name: values.name as string | undefined,
          symbol: (values.symbol ?? values.isin) as string | undefined,
          isin: values.isin as string | undefined,
        });
        if (guess) {
          values.category = guess.category;
          if (guess.sub_category && !values.sub_category) values.sub_category = guess.sub_category;
          if (guess.confidence === "low") {
            issues.push({
              level: "warning",
              field: "category",
              message: `Asset class guessed as “${guess.category}” (${guess.reason}) — please review`,
            });
          }
        }
      }
    }


    // Required-field + sanity validation.
    for (const m of mappings) {
      const f = m.field;
      const v = values[f.key];
      if (f.required && (v == null || v === "")) {
        issues.push({ level: "error", field: f.key, message: `${f.label} is required but empty` });
        continue;
      }
      if (typeof v === "number") {
        if (!Number.isFinite(v)) {
          issues.push({ level: "error", field: f.key, message: `${f.label} is not a valid number` });
        } else {
          if (f.min != null && v < f.min) {
            issues.push({ level: "warning", field: f.key, message: `${f.label} (${v}) is below the expected minimum` });
          }
          if (f.max != null && v > f.max) {
            issues.push({ level: "warning", field: f.key, message: `${f.label} (${v}) looks unusually large — check the mapping` });
          }
        }
      }
      if (f.type === "date" && typeof v === "string") {
        const y = Number(v.slice(0, 4));
        if (y < 1950 || y > 2100) {
          issues.push({ level: "warning", field: f.key, message: `${f.label} (${v}) looks out of range` });
        }
      }
    }

    if (skipRow) return;

    rows.push({
      index,
      values,
      raw,
      issues,
      duplicate: null,
      include: !issues.some((i) => i.level === "error"),
      categorySuggestion,
    });
  });

  /* ----- duplicate detection: within file and against existing rows ----- */
  const keys = schema.dedupeKeys.length ? schema.dedupeKeys : [schema.fields[0].key];
  const existingKeys = new Set((opts.existing ?? []).map((r) => dedupeKey(r, keys)));
  const seen = new Set<string>();
  for (const row of rows) {
    const k = dedupeKey(row.values, keys);
    if (!k.replace(/\|/g, "")) continue;
    if (existingKeys.has(k)) {
      row.duplicate = "existing";
      row.include = false;
      row.issues.push({ level: "warning", message: "Looks like a record you already have" });
    } else if (seen.has(k)) {
      row.duplicate = "file";
      row.include = false;
      row.issues.push({ level: "warning", message: "Duplicate row within this file" });
    }
    seen.add(k);
  }

  /* ----- plan-level checks: suspicious mappings, currency mismatch ----- */
  for (const m of active) {
    if (m.field.type !== "number" && m.field.type !== "percent") continue;
    const parsedCount = rows.filter((r) => typeof r.values[m.field.key] === "number").length;
    if (rows.length >= 3 && parsedCount / rows.length < 0.5) {
      planIssues.push({
        level: "warning",
        field: m.field.key,
        message: `“${m.source}” → ${m.field.label}: most values are not numeric. This mapping may be wrong.`,
      });
    }
  }
  for (const m of active) {
    if (m.confidence === "low" && !m.confirmed) {
      planIssues.push({
        level: "warning",
        field: m.field.key,
        message: `Low-confidence mapping: “${m.source}” → ${m.field.label}. Please confirm.`,
      });
    }
  }
  for (const key of plan.missingRequired) {
    const f = schema.fields.find((x) => x.key === key);
    planIssues.push({ level: "error", field: key, message: `Required field not detected: ${f?.label ?? key}` });
  }
  if (currencies.size > 1) {
    planIssues.push({
      level: "warning",
      message: `Multiple currencies detected (${[...currencies].join(", ")}). Values are imported as-is without conversion.`,
    });
  }

  return {
    rows,
    skipped: skippedRows,
    summary: {
      total: rows.length,
      valid: rows.filter((r) => !r.issues.some((i) => i.level === "error")).length,
      invalid: rows.filter((r) => r.issues.some((i) => i.level === "error")).length,
      duplicates: rows.filter((r) => r.duplicate).length,
      skipped: skippedRows,
      currencies: [...currencies],
      planIssues,
    },
  };
}
