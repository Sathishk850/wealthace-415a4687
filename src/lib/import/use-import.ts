/**
 * Universal Import Engine — PERSISTENCE layer.
 *
 * Fetches existing rows for duplicate detection and commits reviewed rows in
 * chunks. Uses each module's own table and columns; no schema changes.
 */
import { useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { IMPORT_TARGETS, type ImportModule } from "./targets";
import type { TransformedRow } from "./transform";

const CHUNK = 200;

async function currentUserId() {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) throw new Error("Please sign in to import data.");
  return data.user.id;
}

/** Existing rows (canonical-shaped) for the module, used for dedupe. */
export async function fetchExistingRows(module: ImportModule) {
  const target = IMPORT_TARGETS[module];
  const cols = target.dedupeSelect.filter((c) => !c.startsWith("__"));
  const { data, error } = await supabase
    .from(target.table as any)
    .select(cols.join(","))
    .limit(5000);
  if (error) return [];
  return (data ?? []) as unknown as Record<string, unknown>[];
}

/** Resolve/create money categories for transaction imports. */
async function resolveCategories(rows: Record<string, unknown>[], userId: string) {
  const names = Array.from(
    new Set(
      rows
        .map((v) => String(v.category ?? "").trim())
        .filter((n) => n.length > 0)
        .map((n) => n),
    ),
  );
  const { data } = await supabase.from("money_categories").select("id,name");
  const byName = new Map<string, string>();
  for (const c of (data ?? []) as { id: string; name: string }[]) {
    byName.set(c.name.trim().toLowerCase(), c.id);
  }
  const missing = names.filter((n) => !byName.has(n.toLowerCase()));
  if (missing.length) {
    const { data: created } = await supabase
      .from("money_categories")
      .insert(
        missing.map((name) => ({
          user_id: userId,
          name,
          kind: "expense",
          color: "#14B8A6",
          icon: "tag",
        })),
      )
      .select("id,name");
    for (const c of (created ?? []) as { id: string; name: string }[]) {
      byName.set(c.name.trim().toLowerCase(), c.id);
    }
  }
  for (const v of rows) {
    const key = String(v.category ?? "").trim().toLowerCase();
    v.__category_id = key ? byName.get(key) ?? null : null;
  }
}

/** Resolve canonical `investment` text onto an existing holding id. */
async function resolveInvestments(rows: Record<string, unknown>[]) {
  const { data } = await supabase.from("wealth_investments").select("id,name,symbol,identifier");
  const byKey = new Map<string, string>();
  for (const r of (data ?? []) as { id: string; name: string | null; symbol: string | null; identifier: string | null }[]) {
    for (const k of [r.name, r.symbol, r.identifier]) {
      const key = String(k ?? "").trim().toLowerCase();
      if (key && !byKey.has(key)) byKey.set(key, r.id);
    }
  }
  for (const v of rows) {
    const key = String(v.investment ?? "").trim().toLowerCase();
    v.__investment_id = key ? byKey.get(key) ?? null : null;
  }
}

export type ImportOutcome = { inserted: number; skipped: number; failed: number; errors: string[] };

export function useImportCommit() {
  const qc = useQueryClient();
  const [isPending, setPending] = useState(false);
  const [progress, setProgress] = useState(0);

  const commit = useCallback(
    async (module: ImportModule, rows: TransformedRow[]): Promise<ImportOutcome> => {
      const target = IMPORT_TARGETS[module];
      const selected = rows.filter((r) => r.include);
      const skipped = rows.length - selected.length;
      if (!selected.length) return { inserted: 0, skipped, failed: 0, errors: [] };

      setPending(true);
      setProgress(0);
      try {
        const userId = await currentUserId();
        const today = new Date().toISOString().slice(0, 10);
        const values = selected.map((r) => ({ ...r.values }));
        if (module === "transactions") await resolveCategories(values, userId);
        let unmatched = 0;
        const unmatchedErrors: string[] = [];
        let rowsToCommit = values;
        if (module === "investment_txns") {
          await resolveInvestments(values);
          rowsToCommit = values.filter((v) => v.__investment_id);
          unmatched = values.length - rowsToCommit.length;
          if (unmatched) {
            unmatchedErrors.push(
              `${unmatched} row(s) skipped — no matching holding found. Add the holding first, then re-import.`,
            );
          }
        }

        const payload = rowsToCommit.map((v) => target.build(v, { userId, today }));
        let inserted = 0;
        let failed = unmatched;
        const errors: string[] = [...unmatchedErrors];

        if (!payload.length) {
          for (const key of target.invalidate) qc.invalidateQueries({ queryKey: key });
          return { inserted: 0, skipped, failed, errors };
        }

        for (let i = 0; i < payload.length; i += CHUNK) {
          const chunk = payload.slice(i, i + CHUNK);
          const { data, error } = await supabase
            .from(target.table as any)
            .insert(chunk as any)
            .select("id");
          if (error) {
            failed += chunk.length;
            if (errors.length < 3) errors.push(error.message);
          } else {
            inserted += (data ?? []).length || chunk.length;
          }
          setProgress(Math.round(Math.min(1, (i + chunk.length) / payload.length) * 100));
        }

        for (const key of target.invalidate) qc.invalidateQueries({ queryKey: key });
        return { inserted, skipped, failed, errors };
      } finally {
        setPending(false);
      }
    },
    [qc],
  );

  return { commit, isPending, progress };
}
