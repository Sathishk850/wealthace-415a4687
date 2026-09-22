import { useMemo } from "react";
import { useAssets, useInvestments, useAccounts } from "@/lib/wealth-api";
import {
  ALLOCATION_CATEGORIES,
  ALLOCATION_COLORS,
  classifyHolding,
  type AllocationCategory,
} from "@/lib/allocation-classifier";

export type AllocationHolding = { id: string; name: string; type: string; currentValue: number };

export type AllocationSlice = {
  category: AllocationCategory;
  currentValue: number; // full precision
  percentage: number; // full precision — round only when displaying
  color: string;
  holdings: AllocationHolding[];
};

type Bucket = { total: number; holdings: AllocationHolding[] };

/**
 * Canonical allocation data for the dashboard. Built from asset-side holdings
 * only — investments, manual assets and accounts. Liabilities are never part
 * of these queries, so nothing needs filtering out.
 */
export function useAllocationData() {
  const invQ = useInvestments();
  const assetQ = useAssets();
  const accQ = useAccounts();

  const isLoading = invQ.isLoading || assetQ.isLoading || accQ.isLoading;
  const error = invQ.error ?? assetQ.error ?? accQ.error ?? null;

  const rows = useMemo(() => {
    const out: {
      id: string;
      name: string;
      type: string;
      category: string | null;
      sub_category: string | null;
      current_value: number;
    }[] = [];

    for (const i of invQ.data ?? []) {
      if ((i.status ?? "active") !== "active") continue;
      out.push({
        id: i.id,
        name: i.name ?? i.symbol ?? "Unknown",
        type: i.category ?? "",
        category: i.category ?? null,
        sub_category: i.sub_category ?? null,
        current_value: Number(i.current_value ?? 0),
      });
    }
    for (const a of assetQ.data ?? []) {
      if ((a.status ?? "active") !== "active") continue;
      out.push({
        id: a.id,
        name: a.name ?? "Unknown",
        type: String(a.category ?? ""),
        category: String(a.category ?? ""),
        sub_category: a.sub_category ?? null,
        current_value: Number(a.current_value ?? 0),
      });
    }
    for (const acc of accQ.data ?? []) {
      out.push({
        id: acc.id,
        name: acc.name ?? "Account",
        type: "savings-account",
        category: "Cash & Savings",
        sub_category: null,
        current_value: Number(acc.balance ?? 0),
      });
    }
    return out;
  }, [invQ.data, assetQ.data, accQ.data]);

  const slices = useMemo<AllocationSlice[]>(() => {
    if (!rows.length) return [];

    const buckets = ALLOCATION_CATEGORIES.reduce(
      (acc, c) => {
        acc[c] = { total: 0, holdings: [] };
        return acc;
      },
      {} as Record<AllocationCategory, Bucket>,
    );

    for (const h of rows) {
      const cv = Number.isFinite(h.current_value) ? h.current_value : 0;
      if (cv <= 0) continue; // missing or zero — never fabricate a value
      const cat = classifyHolding({
        asset_type: h.type,
        category: h.category,
        sub_category: h.sub_category,
        name: h.name,
      });
      buckets[cat].total += cv;
      buckets[cat].holdings.push({ id: h.id, name: h.name, type: h.type, currentValue: cv });
    }

    const total = ALLOCATION_CATEGORIES.reduce((s, c) => s + buckets[c].total, 0);
    if (total === 0) return [];

    return ALLOCATION_CATEGORIES.filter((c) => buckets[c].total > 0)
      .map<AllocationSlice>((c) => ({
        category: c,
        currentValue: buckets[c].total,
        percentage: (buckets[c].total / total) * 100,
        color: ALLOCATION_COLORS[c],
        holdings: [...buckets[c].holdings].sort((a, z) => z.currentValue - a.currentValue),
      }))
      .sort((a, z) => z.currentValue - a.currentValue);
  }, [rows]);

  const totalAllocatable = useMemo(
    () => slices.reduce((s, sl) => s + sl.currentValue, 0),
    [slices],
  );

  return { slices, totalAllocatable, isLoading, error };
}
