import { createClient } from "@supabase/supabase-js";

const CASH_TYPES = ["savings", "current", "wallet", "cash", "bank"];
const inactive = (s: unknown) => ["closed", "sold", "inactive", "matured"].includes(String(s ?? "active").toLowerCase());
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

export async function runSnapshotCron(): Promise<{ snapped: number; skipped: number }> {
  const supabase = createClient(process.env["SUPABASE_URL"]!, process.env["SUPABASE_SERVICE_ROLE_KEY"]!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const dow = now.getUTCDay();
  const dom = now.getUTCDate();

  const { data: prefs, error } = await supabase
    .from("snapshot_preferences")
    .select("user_id, frequency")
    .eq("enabled", true);
  if (error) throw error;

  let snapped = 0, skipped = 0;
  for (const pref of prefs ?? []) {
    const due = (pref.frequency === "weekly" && dow === 0) || (pref.frequency === "monthly" && dom === 1);
    if (!due) { skipped++; continue; }
    const uid = pref.user_id as string;

    const { count } = await supabase
      .from("wealth_snapshots")
      .select("id", { count: "exact", head: true })
      .eq("user_id", uid)
      .eq("snapshot_date", today);
    if ((count ?? 0) > 0) { skipped++; continue; }

    const [inv, ass, liab, acc] = await Promise.all([
      supabase.from("wealth_investments").select("current_value, invested_value, status").eq("user_id", uid),
      supabase.from("wealth_assets").select("current_value, status").eq("user_id", uid),
      supabase.from("wealth_liabilities").select("outstanding, status").eq("user_id", uid),
      supabase.from("wealth_accounts").select("balance, account_type, status").eq("user_id", uid),
    ]);
    const investments = (inv.data ?? []).filter((r) => !inactive(r.status)).reduce((s, r) => s + num(r.current_value ?? r.invested_value), 0);
    const assets = (ass.data ?? []).filter((r) => !inactive(r.status)).reduce((s, r) => s + num(r.current_value), 0);
    const cash = (acc.data ?? [])
      .filter((r) => !inactive(r.status) && CASH_TYPES.includes(String(r.account_type ?? "").toLowerCase()))
      .reduce((s, r) => s + num(r.balance), 0);
    const liabilities = (liab.data ?? []).filter((r) => !inactive(r.status)).reduce((s, r) => s + num(r.outstanding), 0);
    const total = investments + assets + cash;
    if (total === 0 && liabilities === 0) { skipped++; continue; }

    const { error: insErr } = await supabase.from("wealth_snapshots").insert({
      user_id: uid,
      snapshot_date: today,
      net_worth: total - liabilities,
      assets_total: total,
      liabilities_total: liabilities,
      investments_total: investments,
      savings_total: cash,
    });
    if (insErr) { skipped++; continue; }
    snapped++;
  }
  return { snapped, skipped };
}
