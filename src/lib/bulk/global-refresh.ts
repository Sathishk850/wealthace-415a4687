import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

/**
 * Global data refresh.
 *
 * The database is the single source of truth: after any create / update /
 * delete / import / buy / sell / transfer / bulk action we invalidate every
 * cached query so all dependent modules (Dashboard, Wealth, Money, Planner,
 * Reports, Insights, Holdings, charts, KPIs, Net Worth, allocations, Top
 * Holdings, Financial Score, Goals, …) recompute from fresh server data.
 */
export function refreshAll(qc: {
  invalidateQueries: (filters?: unknown) => Promise<void> | void;
}) {
  return qc.invalidateQueries();
}

export function useGlobalRefresh() {
  const qc = useQueryClient();
  return useCallback(() => qc.invalidateQueries(), [qc]);
}
