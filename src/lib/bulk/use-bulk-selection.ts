import { useCallback, useEffect, useMemo, useState } from "react";

/**
 * Reusable bulk-selection state for any data table.
 *
 * - Works with filtering / sorting / searching / pagination: pass the currently
 *   visible rows as `rows`; "select all" applies to the visible set.
 * - Selection is pruned automatically when rows disappear after a data refresh,
 *   so the state can never point at deleted records.
 */
export type BulkSelection<T> = {
  selectedIds: string[];
  selectedCount: number;
  selectedRows: T[];
  isSelected: (id: string) => boolean;
  toggle: (id: string, value?: boolean) => void;
  toggleAll: (value: boolean) => void;
  clear: () => void;
  allSelected: boolean;
  someSelected: boolean;
};

export function useBulkSelection<T>(
  rows: T[],
  getId: (row: T) => string,
  /** All ids that exist in the dataset (defaults to visible rows) — used to prune stale selections. */
  allIds?: string[],
): BulkSelection<T> {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const visibleIds = useMemo(() => rows.map(getId), [rows, getId]);
  const universe = useMemo(
    () => new Set(allIds ?? visibleIds),
    [allIds, visibleIds],
  );

  // Keep selection accurate after refreshes / deletions.
  useEffect(() => {
    setSelectedIds((prev) => {
      const next = prev.filter((id) => universe.has(id));
      return next.length === prev.length ? prev : next;
    });
  }, [universe]);

  const selectedSet = useMemo(() => new Set(selectedIds), [selectedIds]);

  const isSelected = useCallback((id: string) => selectedSet.has(id), [selectedSet]);

  const toggle = useCallback((id: string, value?: boolean) => {
    setSelectedIds((prev) => {
      const on = value ?? !prev.includes(id);
      if (on) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((x) => x !== id);
    });
  }, []);

  const toggleAll = useCallback(
    (value: boolean) => {
      setSelectedIds((prev) => {
        if (!value) return prev.filter((id) => !visibleIds.includes(id));
        const merged = new Set(prev);
        visibleIds.forEach((id) => merged.add(id));
        return Array.from(merged);
      });
    },
    [visibleIds],
  );

  const clear = useCallback(() => setSelectedIds([]), []);

  const selectedRows = useMemo(
    () => rows.filter((r) => selectedSet.has(getId(r))),
    [rows, selectedSet, getId],
  );

  const allSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedSet.has(id));
  const someSelected = selectedIds.length > 0;

  return {
    selectedIds,
    selectedCount: selectedIds.length,
    selectedRows,
    isSelected,
    toggle,
    toggleAll,
    clear,
    allSelected,
    someSelected,
  };
}
