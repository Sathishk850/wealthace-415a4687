// Insights & reminders — one place that decides what the user should look at.
//
// Two guarantees the app relies on:
//   1. Insights refresh at least daily, AND instantly whenever any module's
//      data changes (we key the sweep on a fingerprint of live module data).
//   2. Reminders are re-derived on every login and keep resurfacing while
//      unread (the server sweep dedupes, so nothing is duplicated).

import { useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { sweepAlerts } from "@/lib/alerts.functions";
import type { Notification } from "@/lib/notifications-api";
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
import { useTransactions, type Transaction } from "@/lib/money-api";
import { useGoals, type Goal } from "@/lib/planner-api";
import { computeNetWorth } from "@/lib/networth";

export const DAY_MS = 86400000;

/* ------------------------------------------------------------------ *
 * Insight derivation                                                  *
 * ------------------------------------------------------------------ */

export type InsightTone = "positive" | "warning" | "critical" | "neutral";

const TONE_ORDER: Record<InsightTone, number> = {
  critical: 0,
  warning: 1,
  positive: 2,
  neutral: 3,
};


export type Insight = {
  id: string;
  title: string;
  body: string;
  tone: InsightTone;
  link?: string;
  linkLabel?: string;
};

function inr(n: number) {
  return "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
}
function pct(n: number) {
  return `${n >= 0 ? "" : "-"}${Math.abs(n).toFixed(1)}%`;
}
function monthKey(iso: string) {
  return iso.slice(0, 7);
}

export function computeInsights(input: {
  assets: Asset[];
  investments: Investment[];
  accounts: Account[];
  liabilities: Liability[];
  transactions: Transaction[];
  goals: Goal[];
}): Insight[] {
  const { assets, investments, accounts, liabilities, transactions, goals } = input;
  const out: Insight[] = [];
  const nw = computeNetWorth({ assets, investments, accounts, liabilities });

  /* --- Cash flow: this month vs last month --- */
  const now = new Date();
  const thisKey = now.toISOString().slice(0, 7);
  const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevKey = prev.toISOString().slice(0, 7);
  const sum = (key: string, kind: Transaction["kind"]) =>
    transactions
      .filter((t) => monthKey(t.occurred_on) === key && t.kind === kind)
      .reduce((s, t) => s + (Number(t.amount) || 0), 0);

  const income = sum(thisKey, "income");
  const expense = sum(thisKey, "expense");
  const lastExpense = sum(prevKey, "expense");

  if (income > 0) {
    const rate = ((income - expense) / income) * 100;
    out.push({
      id: "savings-rate",
      title: `Savings rate ${pct(rate)} this month`,
      body:
        rate >= 20
          ? `You kept ${inr(income - expense)} of ${inr(income)} income. Anything above 20% builds wealth quickly.`
          : rate >= 0
            ? `You kept ${inr(income - expense)} of ${inr(income)} income. Aim for 20% to stay on track.`
            : `You spent ${inr(expense - income)} more than you earned this month.`,
      tone: rate >= 20 ? "positive" : rate >= 0 ? "warning" : "critical",
      link: "/money",
      linkLabel: "Review spending",
    });
  }

  if (lastExpense > 0 && expense > 0) {
    const delta = ((expense - lastExpense) / lastExpense) * 100;
    if (Math.abs(delta) >= 15) {
      out.push({
        id: "spend-trend",
        title: `Spending ${delta > 0 ? "up" : "down"} ${pct(Math.abs(delta))} vs last month`,
        body: `${inr(expense)} so far this month against ${inr(lastExpense)} last month.`,
        tone: delta > 0 ? "warning" : "positive",
        link: "/money",
        linkLabel: "See transactions",
      });
    }
  }

  /* --- Top expense category (by merchant when categories are absent) --- */
  const byMerchant = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind !== "expense" || monthKey(t.occurred_on) !== thisKey) continue;
    const key = (t.merchant || "Uncategorised").trim() || "Uncategorised";
    byMerchant.set(key, (byMerchant.get(key) ?? 0) + (Number(t.amount) || 0));
  }
  const top = [...byMerchant.entries()].sort((a, b) => b[1] - a[1])[0];
  if (top && expense > 0) {
    out.push({
      id: "top-spend",
      title: `${top[0]} is your biggest spend this month`,
      body: `${inr(top[1])} — ${((top[1] / expense) * 100).toFixed(0)}% of this month's expenses.`,
      tone: "neutral",
      link: "/money",
      linkLabel: "See transactions",
    });
  }

  /* --- Portfolio concentration --- */
  const byClass = new Map<string, number>();
  let portfolio = 0;
  for (const i of investments) {
    if ((i.status ?? "active") !== "active") continue;
    const v = Number(i.current_value ?? i.invested_value ?? 0);
    if (!Number.isFinite(v) || v <= 0) continue;
    const key = String(i.category ?? "Other");
    byClass.set(key, (byClass.get(key) ?? 0) + v);
    portfolio += v;
  }
  if (portfolio > 0) {
    const worst = [...byClass.entries()].sort((a, b) => b[1] - a[1])[0]!;
    const share = (worst[1] / portfolio) * 100;
    if (share >= 50) {
      out.push({
        id: "concentration",
        title: `${worst[0]} is ${share.toFixed(0)}% of your portfolio`,
        body: "High concentration raises risk. Consider spreading new investments across other asset classes.",
        tone: share >= 70 ? "critical" : "warning",
        link: "/wealth",
        linkLabel: "Open portfolio",
      });
    }
  }

  /* --- Debt load --- */
  if (nw.totalAssets > 0 && nw.liabilitiesTotal > 0) {
    const ratio = (nw.liabilitiesTotal / nw.totalAssets) * 100;
    out.push({
      id: "debt-ratio",
      title: `Debt is ${ratio.toFixed(0)}% of your assets`,
      body:
        ratio >= 50
          ? `${inr(nw.liabilitiesTotal)} outstanding against ${inr(nw.totalAssets)} of assets. Prioritise the highest-interest loan.`
          : `${inr(nw.liabilitiesTotal)} outstanding against ${inr(nw.totalAssets)} of assets — a comfortable level.`,
      tone: ratio >= 50 ? "critical" : ratio >= 30 ? "warning" : "positive",
      link: "/wealth",
      linkLabel: "Open liabilities",
    });
  }

  /* --- Emergency buffer --- */
  const cash = nw.cashTotal;
  const monthlyBurn =
    lastExpense > 0 && expense > 0 ? (lastExpense + expense) / 2 : expense || lastExpense;
  if (monthlyBurn > 0) {
    const months = cash / monthlyBurn;
    out.push({
      id: "emergency-buffer",
      title: `${months.toFixed(1)} months of expenses in cash`,
      body:
        months >= 6
          ? `${inr(cash)} liquid covers you comfortably.`
          : `${inr(cash)} liquid. Six months of expenses (${inr(monthlyBurn * 6)}) is the usual target.`,
      tone: months >= 6 ? "positive" : months >= 3 ? "warning" : "critical",
      link: "/wealth",
      linkLabel: "Open accounts",
    });
  }

  /* --- Goals off track --- */
  for (const g of goals) {
    const target = Number(g.target_amount) || 0;
    if (target <= 0) continue;
    const saved = Number(g.saved_amount) || 0;
    const progress = (saved / target) * 100;
    if (!g.target_date) continue;
    const monthsLeft = Math.max(
      0,
      (new Date(g.target_date).getTime() - now.getTime()) / (30 * DAY_MS),
    );
    const needed = monthsLeft > 0 ? (target - saved) / monthsLeft : target - saved;
    if (needed <= 0) continue;
    const contributing = Number(g.monthly_contribution) || 0;
    if (contributing >= needed) continue;
    out.push({
      id: `goal-${g.id}`,
      title: `"${g.name}" needs ${inr(needed)}/month`,
      body: `${progress.toFixed(0)}% funded, contributing ${inr(contributing)}/month. Increase by ${inr(
        needed - contributing,
      )} to hit the target date.`,
      tone: "warning",
      link: "/planner",
      linkLabel: "Open planner",
    });
  }

  return out.sort((a, b) => TONE_ORDER[a.tone] - TONE_ORDER[b.tone]);
}

/* ------------------------------------------------------------------ *
 * Live fingerprint — makes insights recompute the moment data changes *
 * ------------------------------------------------------------------ */

function fingerprintOf(rows: { updated_at?: string | null }[]) {
  let latest = "";
  for (const r of rows) {
    const u = r.updated_at ?? "";
    if (u > latest) latest = u;
  }
  return `${rows.length}:${latest}`;
}

export function useInsights() {
  const assetsQ = useAssets();
  const investmentsQ = useInvestments();
  const accountsQ = useAccounts();
  const liabilitiesQ = useLiabilities();
  const txnsQ = useTransactions();
  const goalsQ = useGoals();

  const assets = assetsQ.data ?? [];
  const investments = investmentsQ.data ?? [];
  const accounts = accountsQ.data ?? [];
  const liabilities = liabilitiesQ.data ?? [];
  const transactions = txnsQ.data ?? [];
  const goals = goalsQ.data ?? [];

  const insights = useMemo(
    () => computeInsights({ assets, investments, accounts, liabilities, transactions, goals }),
    [assets, investments, accounts, liabilities, transactions, goals],
  );

  // Changes whenever any module gains, loses, or edits a row.
  const fingerprint = useMemo(
    () =>
      [
        fingerprintOf(assets),
        fingerprintOf(investments),
        fingerprintOf(accounts),
        fingerprintOf(liabilities),
        fingerprintOf(transactions),
        fingerprintOf(goals),
      ].join("|"),
    [assets, investments, accounts, liabilities, transactions, goals],
  );

  const isLoading =
    assetsQ.isLoading ||
    investmentsQ.isLoading ||
    accountsQ.isLoading ||
    liabilitiesQ.isLoading ||
    txnsQ.isLoading ||
    goalsQ.isLoading;

  return { insights, fingerprint, isLoading };
}

/* ------------------------------------------------------------------ *
 * Reminder sweep — daily + on data change                             *
 * ------------------------------------------------------------------ */

/** Bucketed day stamp so the sweep re-runs at least once every 24 hours. */
function dayStamp() {
  return Math.floor(Date.now() / DAY_MS);
}

export function useAlertSweep(fingerprint: string, enabled = true) {
  const qc = useQueryClient();
  const sweep = useServerFn(sweepAlerts);

  return useQuery({
    queryKey: ["alerts-sweep", dayStamp(), fingerprint] as const,
    enabled,
    staleTime: DAY_MS,
    gcTime: DAY_MS,
    // Belt and braces: if the tab stays open past midnight, refetch anyway.
    refetchInterval: DAY_MS,
    retry: 1,
    queryFn: async () => {
      const res = await sweep({ data: undefined });
      await qc.invalidateQueries({ queryKey: ["notifications"] });
      return res;
    },
  });
}

/* ------------------------------------------------------------------ *
 * Reminder feed                                                       *
 * ------------------------------------------------------------------ */

export type ReminderFilter = "all" | "pending" | "completed";

const PRIORITY_RANK: Record<Notification["priority"], number> = {
  urgent: 3,
  high: 2,
  normal: 1,
  low: 0,
};

export function useReminderFeed(limit = 200) {
  return useQuery({
    queryKey: ["notifications", "reminder-feed", limit] as const,
    queryFn: async (): Promise<Notification[]> => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("category", "reminder")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      const rows = (data ?? []) as unknown as Notification[];
      return rows.sort(
        (a, b) =>
          Number(!!a.read_at) - Number(!!b.read_at) ||
          PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority] ||
          b.created_at.localeCompare(a.created_at),
      );
    },
  });
}

export function filterReminders(rows: Notification[], filter: ReminderFilter) {
  if (filter === "pending") return rows.filter((r) => !r.read_at);
  if (filter === "completed") return rows.filter((r) => !!r.read_at);
  return rows;
}

export function isHighPriority(n: Notification) {
  return n.priority === "high" || n.priority === "urgent";
}
