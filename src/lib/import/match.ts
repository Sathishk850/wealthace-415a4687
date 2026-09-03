/**
 * Universal Import Engine — intelligent column matching.
 *
 * Scores every (canonical field × source column) pair using:
 *  1. exact canonical key match
 *  2. normalized header / label match
 *  3. known aliases & synonyms
 *  4. token overlap + fuzzy string similarity
 *  5. detected data-type compatibility
 *  6. report context (module signals) and per-module rules
 */
import { normalizeHeader, headerTokens } from "./coerce";
import type { CanonicalField, ImportSchema } from "./schemas";
import type { ParsedFile, RawColumn } from "./parse";

export type MappingConfidence = "high" | "medium" | "low" | "none";

export type FieldMapping = {
  field: CanonicalField;
  /** Source column header, or null when unmapped. */
  source: string | null;
  score: number;
  confidence: MappingConfidence;
  reason: string;
  /** true when the user explicitly picked/confirmed this mapping. */
  confirmed: boolean;
};

export type MappingPlan = {
  schema: ImportSchema;
  mappings: FieldMapping[];
  unmappedColumns: string[];
  /** Extra source columns the user opted to keep as notes. */
  needsConfirmation: string[];
  missingRequired: string[];
};

/* ----------------------------- similarity ----------------------------- */

function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  const m = a.length;
  const n = b.length;
  if (!m || !n) return Math.max(m, n);
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function similarity(a: string, b: string): number {
  if (!a || !b) return 0;
  const dist = levenshtein(a, b);
  return 1 - dist / Math.max(a.length, b.length);
}

function tokenOverlap(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0;
  const setB = new Set(b);
  const hits = a.filter((t) => setB.has(t)).length;
  return hits / Math.max(a.length, b.length);
}

function typeCompatible(field: CanonicalField, col: RawColumn): number {
  const t = col.type;
  if (t === "empty") return -0.05;
  switch (field.type) {
    case "number":
      return t === "number" ? 0.12 : t === "percent" ? 0.02 : t === "string" ? -0.18 : -0.25;
    case "percent":
      return t === "percent" ? 0.15 : t === "number" ? 0.08 : -0.2;
    case "date":
      return t === "date" ? 0.18 : -0.3;
    case "boolean":
      return t === "boolean" ? 0.15 : -0.1;
    case "currency":
      return t === "string" ? 0.05 : 0;
    default:
      return t === "string" ? 0.08 : t === "date" ? -0.05 : -0.06;
  }
}

/** Score a single field/column pair. Returns [score, reason]. */
function scorePair(field: CanonicalField, col: RawColumn): [number, string] {
  const nHeader = col.normalized;
  const nKey = normalizeHeader(field.key);
  const nLabel = normalizeHeader(field.label);
  let base = 0;
  let reason = "";

  if (nHeader === nKey) {
    base = 1;
    reason = "exact field key";
  } else if (nHeader === nLabel) {
    base = 0.98;
    reason = "exact label";
  } else {
    const aliases = field.aliases.map(normalizeHeader);
    if (aliases.includes(nHeader)) {
      base = 0.94;
      reason = "known alias";
    } else {
      const contained = aliases.find((a) => a && (nHeader.includes(a) || a.includes(nHeader)));
      if (contained) {
        base = 0.82;
        reason = `alias match “${contained}”`;
      } else {
        const hTokens = headerTokens(col.header);
        let best = 0;
        let bestAlias = "";
        for (const a of [nKey, nLabel, ...aliases]) {
          const s = Math.max(similarity(nHeader, a), tokenOverlap(hTokens, a.split(" ")) * 0.9);
          if (s > best) {
            best = s;
            bestAlias = a;
          }
        }
        base = best * 0.78;
        reason = best > 0.5 ? `similar to “${bestAlias}”` : "weak name similarity";
      }
    }
  }

  const typeBonus = typeCompatible(field, col);
  const emptyPenalty = col.emptyRatio > 0.9 ? -0.15 : 0;
  const score = Math.max(0, Math.min(1, base + typeBonus + emptyPenalty));
  if (typeBonus > 0.1) reason += `, ${col.type} data`;
  return [score, reason];
}

function confidenceOf(score: number): MappingConfidence {
  if (score >= 0.8) return "high";
  if (score >= 0.55) return "medium";
  if (score >= 0.35) return "low";
  return "none";
}

/* -------------------------- module detection -------------------------- */

/** Rank the candidate schemas for a parsed file. */
export function detectSchema(parsed: ParsedFile, schemas: ImportSchema[]) {
  const haystack = [
    ...parsed.columns.map((c) => c.normalized),
    normalizeHeader(parsed.fileName),
    ...parsed.preamble.map(normalizeHeader),
  ].join(" ");
  return schemas
    .map((schema) => {
      const signalHits = schema.signals.filter((s) => haystack.includes(normalizeHeader(s))).length;
      const plan = buildMappingPlan(parsed, schema);
      const mapped = plan.mappings.filter((m) => m.source && m.confidence !== "none");
      const requiredMapped = plan.mappings.filter(
        (m) => m.field.required && m.source && m.confidence !== "none",
      ).length;
      const requiredTotal = schema.fields.filter((f) => f.required).length || 1;
      const score =
        (requiredMapped / requiredTotal) * 3 +
        mapped.reduce((s, m) => s + m.score, 0) / Math.max(1, schema.fields.length) +
        signalHits * 0.35;
      return { schema, score, plan };
    })
    .sort((a, b) => b.score - a.score);
}

/* --------------------------- mapping planning --------------------------- */

/**
 * Greedy best-match assignment: highest scoring (field, column) pairs win, and
 * each source column is used at most once (except intentional reuse of a
 * column by fields that stay unmapped otherwise).
 */
export function buildMappingPlan(parsed: ParsedFile, schema: ImportSchema): MappingPlan {
  type Cand = { field: CanonicalField; col: RawColumn; score: number; reason: string };
  const cands: Cand[] = [];
  for (const field of schema.fields) {
    for (const col of parsed.columns) {
      const [score, reason] = scorePair(field, col);
      if (score >= 0.35) cands.push({ field, col, score, reason });
    }
  }
  cands.sort((a, b) => b.score - a.score);

  const usedCols = new Set<string>();
  const assigned = new Map<string, Cand>();
  for (const c of cands) {
    if (assigned.has(c.field.key) || usedCols.has(c.col.header)) continue;
    assigned.set(c.field.key, c);
    usedCols.add(c.col.header);
  }

  const mappings: FieldMapping[] = schema.fields.map((field) => {
    const c = assigned.get(field.key);
    if (!c) {
      return {
        field,
        source: null,
        score: 0,
        confidence: "none" as MappingConfidence,
        reason: "no matching column detected",
        confirmed: false,
      };
    }
    const confidence = confidenceOf(c.score);
    return {
      field,
      source: c.col.header,
      score: Number(c.score.toFixed(3)),
      confidence,
      reason: c.reason,
      confirmed: confidence === "high",
    };
  });

  return {
    schema,
    mappings,
    unmappedColumns: parsed.columns.filter((c) => !usedCols.has(c.header)).map((c) => c.header),
    needsConfirmation: mappings
      .filter((m) => m.source && (m.confidence === "medium" || m.confidence === "low"))
      .map((m) => m.field.key),
    missingRequired: computeMissingRequired(schema, mappings),
  };
}

/** Re-derive plan metadata after the user edits mappings. */
export function refreshPlan(plan: MappingPlan, allColumns: string[]): MappingPlan {
  const used = new Set(plan.mappings.map((m) => m.source).filter(Boolean) as string[]);
  return {
    ...plan,
    unmappedColumns: allColumns.filter((c) => !used.has(c)),
    needsConfirmation: plan.mappings
      .filter((m) => m.source && !m.confirmed && m.confidence !== "high")
      .map((m) => m.field.key),
    missingRequired: computeMissingRequired(plan.schema, plan.mappings),
  };
}


/* ----------------------- derivable required fields ----------------------- */

/**
 * A required field does not need its own column when the engine can derive it
 * from other mapped columns (broker/bank exports routinely omit one side of a
 * pair). Each entry lists alternative column sets that satisfy the field.
 */
const SATISFIED_BY: Record<string, Record<string, string[][]>> = {
  investments: {
    name: [["symbol"], ["isin"]],

    avg_price: [["invested_value", "quantity"], ["current_price"]],
    current_price: [["current_value", "quantity"], ["avg_price"], ["invested_value", "quantity"]],
    quantity: [["current_value", "current_price"], ["invested_value", "avg_price"]],
    current_value: [["quantity", "current_price"], ["invested_value"]],
    invested_value: [["quantity", "avg_price"], ["current_value"]],
  },
  transactions: {
    amount: [["debit"], ["credit"], ["raw_amount"]],
    merchant: [["note"], ["reference"]],
  },
};

/** Required fields that have neither a mapped column nor a derivable source. */
function computeMissingRequired(schema: ImportSchema, mappings: FieldMapping[]): string[] {
  const mapped = new Set(mappings.filter((m) => m.source).map((m) => m.field.key));
  const rules = SATISFIED_BY[schema.module] ?? {};
  return mappings
    .filter((m) => m.field.required && !m.source)
    .filter((m) => !(rules[m.field.key] ?? []).some((set) => set.every((k) => mapped.has(k))))
    .map((m) => m.field.key);
}

/** Serialise a plan for reuse ("use this mapping next time"). */
export function serializeMapping(plan: MappingPlan): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of plan.mappings) if (m.source) out[m.field.key] = m.source;
  return out;
}

/** Apply a saved mapping (field key → source header) onto a fresh plan. */
export function applySavedMapping(
  plan: MappingPlan,
  saved: Record<string, string>,
  availableColumns: string[],
): MappingPlan {
  const mappings = plan.mappings.map((m) => {
    const src = saved[m.field.key];
    if (src && availableColumns.includes(src)) {
      return { ...m, source: src, confidence: "high" as MappingConfidence, score: 1, reason: "saved mapping", confirmed: true };
    }
    return m;
  });
  return refreshPlan({ ...plan, mappings }, availableColumns);
}
