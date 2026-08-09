// Net worth — single source of truth.
//
// Every surface (Dashboard KPI, Net Worth page, snapshots, reports) derives
// net worth from `computeNetWorth` so the number can never disagree between
// modules. Snapshot read/write hooks live here too.

import { useEffect, useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  useAccounts,
  useAssets,
  useInvestments,
  useLiabilities,
  type Account,
  type Asset,
  type Investment,
  type Liability,
} from "@/lib/wealth-api";

const num = (n: unknown) => {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
};

const isActive = (status: unknown) => {
  const s = String(status ?? "active").toLowerCase();
  return s !== "closed" && s !== "sold" && s !== "inactive" && s !== "matured";
};

/** Bank/wallet account types that represent spendable cash. */
const CASH_TYPES = ["savings", "current", "wallet", "cash", "bank"];

export type NetWorthBreakdown = {
  /** Physical / other assets (property, gold, vehicles …). */
  assetsTotal: number;
  /** Market value of the investment portfolio. */
  investmentsTotal: number;
  /** Cash held in bank / wallet accounts. */
  cashTotal: number;
  /** assetsTotal + investmentsTotal + cashTotal */
  totalAssets: number;
  /** Outstanding across loans, EMIs and credit cards. */
  liabilitiesTotal: number;
  /** totalAssets − liabilitiesTotal */
  netWorth: number;
  counts: { assets: number; investments: number; accounts: number; liabilities: number };
};

/**
 * Pure net-worth calculator. Callers pass whatever they already have loaded;
 * omitted collections simply contribute zero.
 */
export function computeNetWorth(input: {
  assets?: Asset[];
  investments?: Investment[];
  accounts?: Account[];
  liabilities?: Liability[];
}): NetWorthBreakdown {
  const assets = input.assets ?? [];
  const investments = input.investments ?? [];
  const accounts = input.accounts ?? [];
  const liabilities = input.liabilities ?? [];

  const assetsTotal = assets
    .filter((a) => isActive(a.status))
    .reduce((s, a) => s + num(a.current_value), 0);

  const investmentsTotal = investments
    .filter((i) => isActive(i.status))
    .reduce((s, i) => s + num(i.current_value ?? i.invested_value), 0);

  const cashTotal = accounts
    .filter((a) => isActive(a.status))
    .filter((a) => CASH_TYPES.includes(String(a.account_type ?? "").toLowerCase()))
    .reduce((s, a) => s + num(a.balance), 0);

  const liabilitiesTotal = liabilities
    .filter((l) => isActive(l.status))
    .reduce((s, l) => s + num(l.outstanding), 0);

  const totalAssets = assetsTotal + investmentsTotal + cashTotal;

  return {
    assetsTotal,
    investmentsTotal,
    cashTotal,
    totalAssets,
    liabilitiesTotal,
    netWorth: totalAssets - liabilitiesTotal,
    counts: {
      assets: assets.length,
      investments: investments.length,
      accounts: accounts.length,
      liabilities: liabilities.length,
    },
  };
}

/** Loads every contributing collection and returns the live breakdown. */
export function useNetWorth() {
  const assetsQ = useAssets();
  const investmentsQ = useInvestments();
  const accountsQ = useAccounts();
  const liabilitiesQ = useLiabilities();

  const assets = assetsQ.data ?? [];
  const investments = investmentsQ.data ?? [];
  const accounts = accountsQ.data ?? [];
  const liabilities = liabilitiesQ.data ?? [];

  const breakdown = useMemo(
    () => computeNetWorth({ assets, investments, accounts, liabilities }),
    [assets, investments, accounts, liabilities],
  );

  return {
    ...breakdown,
    isLoading:
      assetsQ.isLoading || investmentsQ.isLoading || accountsQ.isLoading || liabilitiesQ.isLoading,
  };
}

/* ------------------------------------------------------------------ */
/* Snapshots                                                           */
/* ------------------------------------------------------------------ */

export type Snapshot = {
  id: string;
  snapshot_date: string;
  net_worth: number;
  assets_total: number;
  liabilities_total: number;
  investments_total: number;
  savings_total: number;
};

export const snapshotKeys = { all: ["wealth", "snapshots"] as const };

export function useSnapshots() {
  return useQuery({
    queryKey: snapshotKeys.all,
    queryFn: async (): Promise<Snapshot[]> => {
      const { data, error } = await supabase
        .from("wealth_snapshots")
        .select("*")
        .order("snapshot_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((r) => ({
        id: r.id,
        snapshot_date: r.snapshot_date,
        net_worth: num(r.net_worth),
        assets_total: num(r.assets_total),
        liabilities_total: num(r.liabilities_total),
        investments_total: num(r.investments_total),
        savings_total: num(r.savings_total),
      }));
    },
  });
}

export type SnapshotInput = Omit<Snapshot, "id" | "snapshot_date"> & { snapshot_date?: string };

/**
 * Writes today's snapshot. Idempotent per day: an existing row for the same
 * date is updated rather than duplicated, so a manual "Snap" and the daily
 * automatic capture can never both land.
 */
export function useCreateSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: SnapshotInput) => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const date = payload.snapshot_date ?? new Date().toISOString().slice(0, 10);
      const row = {
        user_id: u.user.id,
        snapshot_date: date,
        net_worth: payload.net_worth,
        assets_total: payload.assets_total,
        liabilities_total: payload.liabilities_total,
        investments_total: payload.investments_total,
        savings_total: payload.savings_total,
      };
      const { data: existing } = await supabase
        .from("wealth_snapshots")
        .select("id")
        .eq("snapshot_date", date)
        .limit(1)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from("wealth_snapshots")
          .update(row)
          .eq("id", existing.id);
        if (error) throw error;
        return;
      }
      const { error } = await supabase.from("wealth_snapshots").insert(row);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Snapshot saved");
      qc.invalidateQueries({ queryKey: snapshotKeys.all });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to save snapshot"),
  });
}

/**
 * Captures one snapshot per calendar day automatically. Called from the
 * dashboard once data has loaded, so history accrues without user action even
 * if the hourly server worker has not run yet.
 */
export function useDailySnapshotCapture(breakdown: NetWorthBreakdown, enabled: boolean) {
  const snapsQ = useSnapshots();
  const create = useCreateSnapshot();
  const snaps = snapsQ.data;
  const { netWorth, totalAssets, liabilitiesTotal, investmentsTotal, cashTotal } = breakdown;

  useEffect(() => {
    if (!enabled || !snaps) return;
    if (totalAssets + liabilitiesTotal <= 0) return;
    const today = new Date().toISOString().slice(0, 10);
    if (snaps.some((s) => s.snapshot_date === today)) return;
    if (captureInFlight.has(today)) return;
    captureInFlight.add(today);
    create.mutate(
      {
        net_worth: netWorth,
        assets_total: totalAssets,
        liabilities_total: liabilitiesTotal,
        investments_total: investmentsTotal,
        savings_total: cashTotal,
      },
      { onSettled: () => captureInFlight.delete(today) },
    );
    // `create` is a stable mutation object from React Query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, snaps, netWorth, totalAssets, liabilitiesTotal, investmentsTotal, cashTotal]);
}

const captureInFlight = new Set<string>();


/** Month-over-month trend stats derived from snapshot history. */
export function snapshotTrend(snaps: Snapshot[]) {
  if (snaps.length === 0) {
    return { changeMonth: 0, changeMonthPct: 0, best: null, worst: null, hasHistory: false };
  }
  const last = snaps[snaps.length - 1]!;
  const monthAgoIso = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
  const ref = [...snaps].reverse().find((s) => s.snapshot_date <= monthAgoIso) ?? snaps[0]!;
  const changeMonth = last.net_worth - ref.net_worth;
  const changeMonthPct = ref.net_worth !== 0 ? (changeMonth / Math.abs(ref.net_worth)) * 100 : 0;

  let best: { date: string; delta: number } | null = null;
  let worst: { date: string; delta: number } | null = null;
  for (let i = 1; i < snaps.length; i += 1) {
    const delta = snaps[i]!.net_worth - snaps[i - 1]!.net_worth;
    const entry = { date: snaps[i]!.snapshot_date, delta };
    if (!best || delta > best.delta) best = entry;
    if (!worst || delta < worst.delta) worst = entry;
  }
  return {
    changeMonth,
    changeMonthPct: Number.isFinite(changeMonthPct) ? changeMonthPct : 0,
    best,
    worst,
    hasHistory: snaps.length >= 2,
  };
}
