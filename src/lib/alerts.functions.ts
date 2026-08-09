// Alert sweep: derives every actionable reminder for the signed-in user and
// materialises it as an unread in-app notification. Runs on every login (and
// hourly via the cron worker), so anything unread keeps resurfacing until the
// user actually reads it.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

type Priority = "low" | "normal" | "high" | "urgent";

const DAY = 86400000;

function todayISO(now: Date) {
  return now.toISOString().slice(0, 10);
}
function addDaysISO(now: Date, n: number) {
  const d = new Date(now);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}
function dayDiff(iso: string, now: Date) {
  return Math.round(
    (new Date(iso.slice(0, 10) + "T00:00:00").getTime() -
      new Date(todayISO(now) + "T00:00:00").getTime()) / DAY,
  );
}
function dueLabel(days: number) {
  return days < 0 ? `${-days}d overdue` : days === 0 ? "due today" : `due in ${days}d`;
}
function inr(n: unknown) {
  return "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");
}

export const sweepAlerts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ created: number; unread: number }> => {
    const supabase = context.supabase;
    const userId = context.userId as string;
    const now = new Date();
    let created = 0;

    /** Insert only when no notification with the same dedupe key exists yet. */
    async function notifyOnce(opts: {
      title: string;
      body: string;
      priority?: Priority;
      link: string;
      dedupe: Record<string, unknown>;
      metadata?: Record<string, unknown>;
    }) {
      const { count } = await supabase
        .from("notifications")
        .select("id", { head: true, count: "exact" })
        .eq("category", "reminder")
        .contains("metadata", opts.dedupe);
      if ((count ?? 0) > 0) return;
      const { error } = await supabase.from("notifications").insert({
        user_id: userId,
        title: opts.title,
        body: opts.body,
        category: "reminder",
        priority: opts.priority ?? "normal",
        link: opts.link,
        metadata: { ...opts.dedupe, ...(opts.metadata ?? {}) } as never,
      });
      if (!error) created += 1;
    }

    /* ---- 1. Manual reminders / bills (tools_reminders) ---- */
    const { data: reminders } = await supabase
      .from("tools_reminders")
      .select("id, title, amount, due_date, kind, status, notify_days_before, notify_enabled")
      .eq("status", "upcoming")
      .lte("due_date", addDaysISO(now, 60));
    for (const r of reminders ?? []) {
      if (r.notify_enabled === false) continue;
      const days = dayDiff(r.due_date, now);
      const lead = Number(r.notify_days_before ?? 1);
      if (days > lead) continue;
      await notifyOnce({
        title: `${r.title} ${dueLabel(days)}`,
        body: r.amount ? `Amount ${inr(r.amount)}` : "Payment upcoming",
        priority: days < 0 ? "high" : "normal",
        link: "/tools",
        dedupe: { reminder_id: r.id, due_date: r.due_date },
        metadata: { kind: r.kind ?? "bill" },
      });
    }

    /* ---- 2. Upcoming / overdue SIP installments ---- */
    const { data: sips } = await supabase
      .from("wealth_investments")
      .select("id, name, sip_amount, sip_next_date, sip_active, status")
      .eq("sip_active", true)
      .not("sip_next_date", "is", null)
      .lte("sip_next_date", addDaysISO(now, 7));
    for (const s of sips ?? []) {
      if ((s.status ?? "active") !== "active") continue;
      const days = dayDiff(s.sip_next_date as string, now);
      await notifyOnce({
        title: `SIP ${dueLabel(days)}: ${s.name}`,
        body: s.sip_amount ? `Installment ${inr(s.sip_amount)}` : "SIP installment upcoming",
        priority: days < 0 ? "high" : "normal",
        link: "/wealth",
        dedupe: { investment_id: s.id, due_date: s.sip_next_date },
        metadata: { kind: "sip" },
      });
    }

    /* ---- 3. Loan EMIs (incl. overdue that were never paid) ---- */
    const { data: liabs } = await supabase
      .from("wealth_liabilities")
      .select("id, name, emi, due_date, status")
      .not("due_date", "is", null)
      .lte("due_date", addDaysISO(now, 7));
    for (const l of liabs ?? []) {
      const status = String(l.status ?? "active");
      if (!["active", "open", "ongoing"].includes(status)) continue;
      const days = dayDiff(l.due_date as string, now);
      await notifyOnce({
        title: `${days < 0 ? "Overdue EMI" : "EMI"} ${dueLabel(days)}: ${l.name}`,
        body: l.emi ? `EMI ${inr(l.emi)}` : "Payment upcoming",
        priority: days < 0 ? "urgent" : "normal",
        link: "/wealth",
        dedupe: { liability_id: l.id, due_date: l.due_date },
        metadata: { kind: days < 0 ? "overdue" : "emi" },
      });
    }

    /* ---- 4. Insurance renewals ---- */
    const { data: policies } = await supabase
      .from("wealth_insurance")
      .select("id, policy_name, premium_amount, renewal_date, status")
      .not("renewal_date", "is", null)
      .lte("renewal_date", addDaysISO(now, 15));
    for (const p of policies ?? []) {
      const status = String(p.status ?? "active");
      if (!["active", "in_force"].includes(status)) continue;
      const days = dayDiff(p.renewal_date as string, now);
      await notifyOnce({
        title: `Policy renewal ${dueLabel(days)}: ${p.policy_name}`,
        body: p.premium_amount ? `Premium ${inr(p.premium_amount)}` : "Renewal upcoming",
        priority: days < 0 ? "urgent" : "normal",
        link: "/wealth",
        dedupe: { insurance_id: p.id, due_date: p.renewal_date },
        metadata: { kind: "insurance" },
      });
    }

    /* ---- 5. Corporate actions on existing holdings ---- */
    const { data: holdings } = await supabase
      .from("wealth_investments")
      .select("id, name, identifier, identifier_type, exchange, status, quantity, current_value")
      .not("identifier", "is", null);
    const active = (holdings ?? []).filter((h) => (h.status ?? "active") === "active");

    const seen = new Set<string>();
    const tradable = active.filter((h) => {
      const t = String(h.identifier_type ?? "");
      if (t === "mf_in" || !h.identifier) return false;
      const key = `${t}:${h.identifier}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    if (tradable.length > 0) {
      const { yahooCorporateActions } = await import("./market/providers/yahoo-actions.server");
      // Cap the fan-out so a login sweep stays fast.
      for (const h of tradable.slice(0, 40)) {
        let actions: { type: string; date: string; detail: string; amount: number | null; ratio: string | null }[] = [];
        try {
          actions = (await yahooCorporateActions({
            identifier_type: h.identifier_type as "stock_in" | "stock_us" | "crypto",
            identifier: h.identifier as string,
            exchange: (h.exchange as string) ?? null,
          })) as typeof actions;
        } catch {
          continue;
        }
        for (const a of actions) {
          if (!a?.date) continue;
          const days = dayDiff(a.date, now);
          // Only alert on actions that are upcoming (next 30d) or just happened (last 7d).
          if (days > 30 || days < -7) continue;
          const what =
            a.type === "dividend"
              ? `Dividend ${a.amount != null ? inr(a.amount) + "/share" : ""}`.trim()
              : a.type === "split"
                ? `Stock split ${a.ratio ?? ""}`.trim()
                : `${a.type.charAt(0).toUpperCase()}${a.type.slice(1)} ${a.ratio ?? ""}`.trim();
          await notifyOnce({
            title: `${what} — ${h.name}`,
            body: a.detail || (days < 0 ? `Ex-date ${a.date.slice(0, 10)}` : `Ex-date ${dueLabel(days)}`),
            priority: "normal",
            link: "/wealth",
            dedupe: { corporate_action: `${h.identifier}:${a.type}:${a.date.slice(0, 10)}` },
            metadata: { kind: "corporate_action", investment_id: h.id },
          });
        }
      }
    }

    /* ---- 6. Rebalance check: any single asset class drifting past 60% ---- */
    const totals = new Map<string, number>();
    let portfolio = 0;
    const { data: allInv } = await supabase
      .from("wealth_investments")
      .select("category, current_value, invested_value, status");
    for (const i of allInv ?? []) {
      if ((i.status ?? "active") !== "active") continue;
      const v = Number(i.current_value ?? i.invested_value ?? 0);

      if (!Number.isFinite(v) || v <= 0) continue;
      const key = String(i.category ?? "Other");
      totals.set(key, (totals.get(key) ?? 0) + v);
      portfolio += v;
    }
    if (portfolio > 0) {
      for (const [cls, val] of totals) {
        const pct = (val / portfolio) * 100;
        if (pct < 60) continue;
        await notifyOnce({
          title: `Rebalance suggested — ${cls} at ${pct.toFixed(0)}%`,
          body: `${cls} is ${pct.toFixed(0)}% of your portfolio. Consider diversifying to reduce concentration risk.`,
          priority: "normal",
          link: "/wealth",
          // One alert per class per month, re-raised while the drift persists.
          dedupe: { rebalance: `${cls}:${now.toISOString().slice(0, 7)}` },
          metadata: { kind: "rebalance" },
        });
      }
    }

    /* ---- 7. Goal reviews (quarterly) + goals falling behind ---- */
    const quarter = `${now.getFullYear()}Q${Math.floor(now.getMonth() / 3) + 1}`;
    const { data: goals } = await supabase
      .from("planner_goals")
      .select("id, name, target_amount, saved_amount, target_date, monthly_contribution");
    for (const g of goals ?? []) {
      const target = Number(g.target_amount ?? 0);
      if (target <= 0) continue;
      const saved = Number(g.saved_amount ?? 0);
      const progress = Math.min(100, (saved / target) * 100);

      await notifyOnce({
        title: `Review goal: ${g.name}`,
        body: `${progress.toFixed(0)}% funded (${inr(saved)} of ${inr(target)}). Check whether your monthly contribution still fits.`,
        priority: "low",
        link: "/planner",
        dedupe: { goal_review: `${g.id}:${quarter}` },
        metadata: { kind: "goal_review" },
      });

      if (!g.target_date) continue;
      const monthsLeft = Math.max(
        0,
        (new Date(String(g.target_date)).getTime() - now.getTime()) / (30 * DAY),
      );
      const shortfall = target - saved;
      if (shortfall <= 0) continue;
      const needed = monthsLeft > 0 ? shortfall / monthsLeft : shortfall;
      const contributing = Number(g.monthly_contribution ?? 0);
      if (contributing >= needed) continue;
      await notifyOnce({
        title: `Goal behind schedule: ${g.name}`,
        body: `Needs ${inr(needed)}/month to land on time — currently ${inr(contributing)}/month.`,
        priority: monthsLeft <= 3 ? "high" : "normal",
        link: "/planner",
        dedupe: { goal_behind: `${g.id}:${now.toISOString().slice(0, 7)}` },
        metadata: { kind: "goal_behind" },
      });
    }

    /* ---- 8. Quarterly investment review ---- */
    if (portfolio > 0) {
      await notifyOnce({
        title: "Quarterly portfolio review due",
        body: `Portfolio value ${inr(portfolio)}. Check performance, allocation drift and any dormant SIPs.`,
        priority: "low",
        link: "/wealth",
        dedupe: { investment_review: quarter },
        metadata: { kind: "investment_review" },
      });
    }

    /* ---- 9. Maturity dates (loans closing, policies maturing) ---- */
    const { data: maturingLiabs } = await supabase
      .from("wealth_liabilities")
      .select("id, name, outstanding, end_date, status")
      .not("end_date", "is", null)
      .lte("end_date", addDaysISO(now, 30));
    for (const l of maturingLiabs ?? []) {
      const status = String(l.status ?? "active");
      if (!["active", "open", "ongoing"].includes(status)) continue;
      const days = dayDiff(l.end_date as string, now);
      if (days < -7) continue;
      await notifyOnce({
        title: `Loan closure ${dueLabel(days)}: ${l.name}`,
        body: `Outstanding ${inr(l.outstanding)}. Confirm the final payment and collect the no-dues certificate.`,
        priority: days <= 7 ? "high" : "normal",
        link: "/wealth",
        dedupe: { liability_maturity: `${l.id}:${l.end_date}` },
        metadata: { kind: "maturity" },
      });
    }

    const { data: maturingPolicies } = await supabase
      .from("wealth_insurance")
      .select("id, policy_name, coverage_amount, end_date, status")
      .not("end_date", "is", null)
      .lte("end_date", addDaysISO(now, 30));
    for (const p of maturingPolicies ?? []) {
      const status = String(p.status ?? "active");
      if (!["active", "in_force"].includes(status)) continue;
      const days = dayDiff(p.end_date as string, now);
      if (days < -7) continue;
      await notifyOnce({
        title: `Policy maturity ${dueLabel(days)}: ${p.policy_name}`,
        body: `Cover ${inr(p.coverage_amount)} ends. Plan the payout or a replacement policy.`,
        priority: days <= 7 ? "high" : "normal",
        link: "/wealth",
        dedupe: { insurance_maturity: `${p.id}:${p.end_date}` },
        metadata: { kind: "maturity" },
      });
    }


    const { count: unread } = await supabase
      .from("notifications")
      .select("id", { head: true, count: "exact" })
      .is("read_at", null);

    return { created, unread: unread ?? 0 };
  });
