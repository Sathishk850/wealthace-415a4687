import { supabase } from "@/integrations/supabase/client";

export interface BudgetAlertInput {
  categoryName: string;
  categoryId: string;
  spent: number;
  limit: number;
  pct: number;
  monthKey: string; // "YYYY-MM"
}

const DEDUP_KEY = (categoryId: string, pct: number, monthKey: string) =>
  `wa-budget-alert:${categoryId}:${pct >= 100 ? "exceeded" : "at_risk"}:${monthKey}`;

/**
 * Fires an in-app notification for each budget that has crossed 80% or 100%.
 * Deduplicated via localStorage so it only fires once per threshold per month.
 */
export async function fireBudgetAlerts(budgets: BudgetAlertInput[]): Promise<void> {
  const { data: authData } = await supabase.auth.getUser();
  const userId = authData?.user?.id;
  if (!userId) return;

  for (const b of budgets) {
    // Only fire when a real budget limit exists for the month
    if (!b.limit || b.limit <= 0) continue;
    if (b.pct < 80) continue;

    const threshold = b.pct >= 100 ? 100 : 80;
    const dedupKey = DEDUP_KEY(b.categoryId, threshold, b.monthKey);

    // Already fired this threshold this month
    if (localStorage.getItem(dedupKey)) continue;

    // DB-level dedupe: one alert per category/threshold/month across devices
    try {
      const { count } = await supabase
        .from("notifications")
        .select("id", { head: true, count: "exact" })
        .eq("category", "reminder")
        .contains("metadata", {
          kind: "budget",
          reference_id: b.categoryId,
          threshold,
          month: b.monthKey,
        });
      if ((count ?? 0) > 0) {
        localStorage.setItem(dedupKey, "1");
        continue;
      }
    } catch {
      // fall through — localStorage dedupe still applies
    }

    const isExceeded = threshold === 100;
    const title = isExceeded
      ? `Budget exceeded: ${b.categoryName}`
      : `Budget at risk: ${b.categoryName}`;
    const body = isExceeded
      ? `You've spent ${inrFmt(b.spent)} of your ${inrFmt(b.limit)} budget (${b.pct}%). Consider reviewing your spending.`
      : `You've used ${b.pct}% of your ${b.categoryName} budget (${inrFmt(b.spent)} of ${inrFmt(b.limit)}).`;

    try {
      await supabase.from("notifications").insert({
        user_id: userId,
        category: "reminder",
        priority: isExceeded ? "high" : "normal",
        title,
        body,
        link: "/money?tab=Budgets",
        metadata: {
          kind: "budget",
          reference_type: "budget",
          reference_id: b.categoryId,
          threshold,
          month: b.monthKey,
        },
      });

      // Mark as fired so we don't repeat until next month
      localStorage.setItem(dedupKey, "1");
    } catch {
      // Non-critical — silently ignore if notifications table has different schema
    }
  }
}

function inrFmt(n: number): string {
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(0)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}
