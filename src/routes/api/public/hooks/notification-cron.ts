import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

/**
 * Hourly cron worker for the notification & report delivery system.
 *
 * - Scans due reminders, creates in-app notifications, enqueues email deliveries.
 * - Scans due scheduled reports, creates in-app notifications, enqueues email
 *   deliveries (one per recipient × format) and advances next_run_at.
 * - Email rows are written with status='pending'. When an email domain is
 *   verified, swap the stub in `dispatchPending()` to a real sender — no other
 *   code needs to change.
 *
 * Called by pg_cron with header `apikey: <publishable_key>`.
 */
export const Route = createFileRoute("/api/public/hooks/notification-cron")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apikey = request.headers.get("apikey");
        const publishable = process.env.SUPABASE_PUBLISHABLE_KEY;
        if (!publishable || apikey !== publishable) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401, headers: { "Content-Type": "application/json" },
          });
        }

        const url = process.env.SUPABASE_URL!;
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
        const admin = createClient(url, serviceKey, {
          auth: { autoRefreshToken: false, persistSession: false },
        });

        const now = new Date();
        const today = now.toISOString().slice(0, 10);

        const result = {
          reminders_processed: 0,
          notifications_created: 0,
          deliveries_enqueued: 0,
          schedules_processed: 0,
          dispatch_attempted: 0,
          dispatch_sent: 0,
        };

        /* ===== 1. Due reminders ===== */
        const { data: reminders } = await admin
          .from("tools_reminders")
          .select("*")
          .eq("status", "upcoming")
          .eq("notify_enabled", true)
          .lte("due_date", today);

        for (const r of reminders ?? []) {
          result.reminders_processed += 1;
          const userId = (r as any).user_id as string;
          const dueDays = Math.round(
            (new Date((r as any).due_date + "T00:00:00").getTime() - now.getTime()) / 86400000,
          );
          const dueLabel = dueDays < 0 ? `${-dueDays}d overdue` : dueDays === 0 ? "due today" : `due in ${dueDays}d`;
          const title = `${(r as any).title} ${dueLabel}`;
          const body = `Amount: ₹${Number((r as any).amount).toLocaleString("en-IN")}`;

          // Dedupe: skip if a notification for this reminder+due_date already exists
          const { count } = await admin
            .from("notifications")
            .select("id", { head: true, count: "exact" })
            .eq("user_id", userId)
            .eq("category", "reminder")
            .contains("metadata", { reminder_id: (r as any).id, due_date: (r as any).due_date });

          if ((count ?? 0) > 0) continue;

          // Preferences gate
          const prefs = await loadPrefs(admin, userId);
          const typeOverride = (prefs?.per_type ?? {})[(r as any).kind] ?? {};
          const wantInApp = typeOverride.in_app ?? prefs?.channels?.in_app ?? true;
          const wantEmail = typeOverride.email ?? prefs?.channels?.email ?? true;

          if (wantInApp) {
            await admin.from("notifications").insert({
              user_id: userId,
              title, body,
              category: "reminder",
              priority: dueDays < 0 ? "high" : "normal",
              link: "/tools",
              metadata: { reminder_id: (r as any).id, due_date: (r as any).due_date, kind: (r as any).kind },
            });
            result.notifications_created += 1;
          }
          if (wantEmail) {
            const email = await lookupEmail(admin, userId);
            await admin.from("notification_delivery_log").insert({
              user_id: userId,
              channel: "email",
              template: "reminder.due",
              recipient: email,
              subject: title,
              payload: { reminder: r, body },
              status: "pending",
              related_kind: "reminder",
              related_id: (r as any).id,
              scheduled_for: now.toISOString(),
            });
            result.deliveries_enqueued += 1;
          }
        }

        /* ===== 2. Scheduled reports ===== */
        const { data: schedules } = await admin
          .from("scheduled_reports")
          .select("*")
          .eq("active", true)
          .lte("next_run_at", now.toISOString());

        for (const s of schedules ?? []) {
          result.schedules_processed += 1;
          const userId = (s as any).user_id as string;
          const prefs = await loadPrefs(admin, userId);
          const reportChans = prefs?.reports ?? { in_app: true, email: true };
          const wantInApp = ((s as any).channels?.in_app ?? reportChans.in_app) ?? true;
          const wantEmail = ((s as any).channels?.email ?? reportChans.email) ?? true;

          // Build snapshot + store the generated report so users can download
          // PDF/Excel/CSV from the in-app Report Center immediately, even
          // before email delivery is enabled.
          const { snapshot, summary, period } = await buildReportSnapshot(admin, userId, s as any, now);
          const { data: generated } = await admin
            .from("generated_reports")
            .insert({
              user_id: userId,
              schedule_id: (s as any).id,
              name: (s as any).name,
              report_keys: (s as any).report_keys ?? [],
              formats: ((s as any).formats ?? ["pdf", "xlsx", "csv"]),
              frequency: (s as any).frequency,
              period_start: period.start,
              period_end: period.end,
              snapshot,
              summary,
              status: "ready",
              email_status: wantEmail ? "pending" : "skipped",
            })
            .select("id")
            .single();
          const generatedId = (generated as any)?.id as string | undefined;

          if (wantInApp) {
            await admin.from("notifications").insert({
              user_id: userId,
              title: `Report ready: ${(s as any).name}`,
              body: `${((s as any).report_keys ?? []).length} section(s) ready to download as PDF, Excel or CSV.`,
              category: "report",
              priority: "normal",
              link: generatedId ? `/reports/${generatedId}` : "/reports",
              metadata: {
                schedule_id: (s as any).id,
                generated_report_id: generatedId,
                run_at: now.toISOString(),
              },
            });
            result.notifications_created += 1;
          }

          if (wantEmail) {
            const accountEmail = await lookupEmail(admin, userId);
            const recipients = (((s as any).recipients as string[]) ?? []).length > 0
              ? ((s as any).recipients as string[])
              : accountEmail ? [accountEmail] : [];
            for (const to of recipients) {
              for (const fmt of ((s as any).formats as string[]) ?? ["pdf"]) {
                await admin.from("notification_delivery_log").insert({
                  user_id: userId,
                  channel: "email",
                  template: "report.scheduled",
                  recipient: to,
                  subject: `${(s as any).name} — ${(s as any).frequency} report`,
                  payload: {
                    schedule_id: (s as any).id,
                    schedule_name: (s as any).name,
                    report_keys: (s as any).report_keys,
                    format: fmt,
                    date_range: (s as any).date_range,
                    cc: (s as any).cc,
                    bcc: (s as any).bcc,
                    include_ai_insights: (s as any).include_ai_insights,
                    generated_report_id: generatedId,
                  },
                  status: "pending",
                  related_kind: "scheduled_report",
                  related_id: (s as any).id,
                  scheduled_for: now.toISOString(),
                });
                result.deliveries_enqueued += 1;
              }
            }
          }

          // Advance next_run_at
          const next = advance(new Date(), (s as any).frequency);
          await admin.from("scheduled_reports").update({
            last_run_at: now.toISOString(),
            last_status: "queued",
            next_run_at: next.toISOString(),
          }).eq("id", (s as any).id);
        }

        /* ===== 3. Dispatch pending email rows ===== */
        // STUB: until a sender domain is verified, mark a clear status so the UI
        // can show "Awaiting domain". When email is wired, this loop will call
        // the email sender and set status='sent' or status='failed'.
        const emailReady = !!process.env.EMAIL_SENDER_READY; // flip via env once domain verified
        const { data: pending } = await admin
          .from("notification_delivery_log")
          .select("*")
          .eq("status", "pending")
          .eq("channel", "email")
          .limit(100);

        for (const d of pending ?? []) {
          result.dispatch_attempted += 1;
          if (!emailReady) {
            // Keep status='pending' and just bump attempts + last_error
            await admin.from("notification_delivery_log").update({
              attempts: ((d as any).attempts ?? 0) + 1,
              last_error: "Awaiting verified sender domain",
            }).eq("id", (d as any).id);
            continue;
          }
          // TODO: real email send — when ready, call the sender here and:
          //   on success → status='sent', sent_at=now
          //   on failure → status='failed' (or 'retrying' if attempts < 5)
          await admin.from("notification_delivery_log").update({
            status: "sent",
            sent_at: new Date().toISOString(),
            attempts: ((d as any).attempts ?? 0) + 1,
          }).eq("id", (d as any).id);
          result.dispatch_sent += 1;
        }

        return new Response(JSON.stringify({ ok: true, ...result }), {
          headers: { "Content-Type": "application/json" },
        });
      },

      GET: async () =>
        new Response(JSON.stringify({ ok: true, hint: "POST to run" }), {
          headers: { "Content-Type": "application/json" },
        }),
    },
  },
});

async function loadPrefs(admin: any, userId: string) {
  const { data } = await admin
    .from("notification_preferences")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return data as
    | {
        channels?: Record<string, boolean>;
        per_type?: Record<string, Record<string, boolean>>;
        reports?: Record<string, boolean>;
      }
    | null;
}

async function lookupEmail(admin: any, userId: string): Promise<string | null> {
  try {
    // service client exposes admin namespace
    const { data } = await admin.auth.admin.getUserById(userId);
    return data?.user?.email ?? null;
  } catch {
    return null;
  }
}

function advance(from: Date, freq: string): Date {
  const d = new Date(from);
  d.setHours(8, 0, 0, 0);
  if (freq === "daily") d.setDate(d.getDate() + 1);
  else if (freq === "weekly") d.setDate(d.getDate() + 7);
  else if (freq === "monthly") d.setMonth(d.getMonth() + 1);
  else if (freq === "quarterly") d.setMonth(d.getMonth() + 3);
  else if (freq === "yearly") d.setFullYear(d.getFullYear() + 1);
  else d.setDate(d.getDate() + 1);
  return d;
}

/* ============ Snapshot builder ============ */

function periodFor(freq: string, range: string, now: Date): { start: string | null; end: string | null } {
  const end = new Date(now);
  const start = new Date(now);
  if (range === "ytd") { start.setMonth(0, 1); start.setHours(0, 0, 0, 0); }
  else if (range === "mtd") { start.setDate(1); start.setHours(0, 0, 0, 0); }
  else if (range === "all") return { start: null, end: null };
  else {
    // last_period
    if (freq === "daily") start.setDate(start.getDate() - 1);
    else if (freq === "weekly") start.setDate(start.getDate() - 7);
    else if (freq === "monthly") start.setMonth(start.getMonth() - 1);
    else if (freq === "quarterly") start.setMonth(start.getMonth() - 3);
    else if (freq === "yearly") start.setFullYear(start.getFullYear() - 1);
    else start.setDate(start.getDate() - 30);
  }
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

const REPORT_TITLES: Record<string, string> = {
  "net-worth": "Net Worth", assets: "Assets", liabilities: "Liabilities",
  investments: "Investments", insurance: "Insurance", accounts: "Accounts",
  family: "Family", income: "Income", expense: "Expense", transactions: "Transactions",
  cashflow: "Cash Flow", budget: "Budget vs Actual", goals: "Goals", retirement: "Retirement",
};

async function buildReportSnapshot(admin: any, userId: string, schedule: any, now: Date) {
  const period = periodFor(schedule.frequency, schedule.date_range ?? "last_period", now);
  const keys: string[] = schedule.report_keys ?? [];
  const sections: any[] = [];
  const summary: Record<string, number> = {};

  const inrFmt = (n: number) => "₹" + Math.round(n).toLocaleString("en-IN");

  for (const key of keys) {
    const title = REPORT_TITLES[key] ?? key;
    try {
      if (["transactions", "income", "expense", "cashflow"].includes(key)) {
        let q = admin.from("money_transactions").select("*").eq("user_id", userId).order("occurred_on", { ascending: false });
        if (period.start) q = q.gte("occurred_on", period.start);
        if (period.end) q = q.lte("occurred_on", period.end);
        if (key === "income") q = q.eq("kind", "income");
        if (key === "expense") q = q.eq("kind", "expense");
        const { data: rows } = await q;
        const list = (rows ?? []) as any[];
        if (key === "cashflow") {
          const byMonth: Record<string, { inc: number; exp: number }> = {};
          for (const r of list) {
            const m = r.occurred_on.slice(0, 7);
            byMonth[m] ||= { inc: 0, exp: 0 };
            if (r.kind === "income") byMonth[m].inc += Number(r.amount);
            else byMonth[m].exp += Number(r.amount);
          }
          const monthRows = Object.entries(byMonth).sort(([a], [b]) => a.localeCompare(b))
            .map(([m, v]) => [m, inrFmt(v.inc), inrFmt(v.exp), inrFmt(v.inc - v.exp)]);
          const totIn = list.filter(r => r.kind === "income").reduce((s, r) => s + Number(r.amount), 0);
          const totEx = list.filter(r => r.kind === "expense").reduce((s, r) => s + Number(r.amount), 0);
          sections.push({
            key, title, columns: ["Month", "Income", "Expense", "Net"], rows: monthRows,
            summary: [
              { label: "Total Income", value: inrFmt(totIn) },
              { label: "Total Expense", value: inrFmt(totEx) },
              { label: "Net", value: inrFmt(totIn - totEx) },
            ],
          });
          summary[key + "_net"] = totIn - totEx;
        } else {
          const total = list.reduce((s, r) => s + Number(r.amount), 0);
          sections.push({
            key, title,
            columns: ["Date", "Merchant", "Type", "Amount", "Note"],
            rows: list.map((r) => [r.occurred_on, r.merchant, r.kind, inrFmt(Number(r.amount)), r.note ?? ""]),
            summary: [
              { label: "Entries", value: String(list.length) },
              { label: "Total", value: inrFmt(total) },
            ],
          });
          summary[key + "_total"] = total;
        }
      } else if (key === "budget") {
        const { data: budgets } = await admin.from("money_budgets").select("*, money_categories(name)").eq("user_id", userId);
        const list = (budgets ?? []) as any[];
        sections.push({
          key, title,
          columns: ["Category", "Month", "Limit"],
          rows: list.map((b) => [b.money_categories?.name ?? "—", b.period_month, inrFmt(Number(b.amount_limit))]),
          summary: [{ label: "Budgets", value: String(list.length) }],
        });
      } else if (key === "goals") {
        const { data: goals } = await admin.from("planner_goals").select("*").eq("user_id", userId);
        const list = (goals ?? []) as any[];
        sections.push({
          key, title,
          columns: ["Goal", "Target", "Saved", "Progress %", "Target Date"],
          rows: list.map((g) => [
            g.name, inrFmt(Number(g.target_amount)), inrFmt(Number(g.saved_amount)),
            Number(g.target_amount) > 0 ? Math.round((Number(g.saved_amount) / Number(g.target_amount)) * 100) + "%" : "—",
            g.target_date ?? "—",
          ]),
          summary: [{ label: "Active Goals", value: String(list.length) }],
        });
      } else if (key === "retirement") {
        const { data: settings } = await admin.from("planner_settings").select("*").eq("user_id", userId).maybeSingle();
        const s = settings as any;
        sections.push({
          key, title,
          columns: ["Metric", "Value"],
          rows: s ? [
            ["Current Age", String(s.current_age ?? "—")],
            ["Retirement Age", String(s.retirement_age ?? "—")],
            ["Monthly SIP", inrFmt(Number(s.monthly_sip ?? 0))],
            ["Target Corpus", inrFmt(Number(s.target_corpus ?? 0))],
          ] : [["—", "No retirement plan configured"]],
          summary: [],
        });
      } else {
        sections.push({
          key, title,
          columns: ["Note"],
          rows: [["Connect this module to populate the report."]],
          summary: [],
        });
      }
    } catch (e: any) {
      sections.push({ key, title, columns: ["Error"], rows: [[e?.message ?? "Failed"]], summary: [] });
    }
  }

  return {
    snapshot: { sections, period, generated_at: now.toISOString(), schedule_name: schedule.name },
    summary,
    period,
  };
}