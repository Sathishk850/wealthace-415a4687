import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { fetchResultsCalendar } from "./results-calendar.server";
import { resultBatches, resultChannels, resultKey, resultSlot, tagResults } from "./results";
import { sendPushToUser } from "./push.server";

/** Called only by the already authenticated notification worker, never by browser code. */
export async function sweepQResultAlerts(admin: SupabaseClient<Database>, now = new Date()) {
  const slot = resultSlot(now);
  if (!slot) return { created: 0, pushed: 0 };
  const calendar = await fetchResultsCalendar(now.getTime());
  const [inv, wl, preferences] = await Promise.all([
    admin.from("wealth_investments").select("user_id, identifier, symbol, identifier_type, status").in("identifier_type", ["stock_in", "stock_us"]),
    admin.from("user_watchlist").select("user_id, symbol, market, category"),
    admin.from("notification_preferences").select("user_id, channels, per_type"),
  ]);
  if (inv.error || wl.error || preferences.error) throw new Error("Couldn't load Q Result alert recipients");
  const users = new Map<string, { holdings: Set<string>; watchlist: Set<string> }>();
  const owner = (id: string) => {
    const found = users.get(id);
    if (found) return found;
    const item = { holdings: new Set<string>(), watchlist: new Set<string>() };
    users.set(id, item); return item;
  };
  for (const r of inv.data ?? []) {
    const symbol = r.identifier || r.symbol;
    if (symbol && (!r.status || r.status === "active")) owner(r.user_id).holdings.add(`${r.identifier_type === "stock_us" ? "US" : "India"}:${resultKey(symbol)}`);
  }
  for (const r of wl.data ?? []) {
    if (!r.symbol || r.symbol.startsWith("^") || r.symbol.includes("=")) continue;
    const market = /\.(NS|BO)$/i.test(r.symbol) || /^(india|in|nse|bse)$/i.test(r.market ?? "") || r.category === "stock_in" ? "India" : "US";
    owner(r.user_id).watchlist.add(`${market}:${resultKey(r.symbol)}`);
  }
  let created = 0, pushed = 0;
  for (const [userId, symbols] of users) {
    const pref = preferences.data?.find(p => p.user_id === userId);
    const channels = resultChannels(pref ? { channels: pref.channels as Record<string, boolean>, per_type: pref.per_type as Record<string, unknown> } : null);
    // These alerts are always high priority and intentionally bypass existing quiet hours.
    const rows = tagResults(calendar.rows, symbols.holdings, symbols.watchlist, calendar.today, calendar.horizon).filter(r => r.source !== "market" && r.date === slot.date);
    for (const channel of ["in_app", "push"] as const) {
      if (!channels[channel] || !rows.length) continue;
      const { data: claims, error } = await admin.from("q_result_alert_log").upsert(
        rows.map(r => ({ user_id: userId, symbol: r.symbol, result_date: r.date, slot: slot.slot, channel })),
        { onConflict: "user_id,symbol,result_date,slot,channel", ignoreDuplicates: true },
      ).select("symbol");
      if (error) throw error;
      const claimed = new Set(claims?.map(c => c.symbol));
      for (const batch of resultBatches(rows.filter(r => claimed.has(r.symbol)))) {
        const title = `Q Result ${slot.slot === "evening" ? "tomorrow" : "today"}: ${batch.length === 1 ? batch[0].name : `${batch.length} companies`}`;
        const body = batch.map(r => `${r.name} (${r.source === "watchlist" ? "watchlist" : "holding"})`).join(", ");
        const metadata = { kind: "q_result", result_date: slot.date, slot: slot.slot, symbols: batch.map(r => r.symbol), holding_rank: batch.some(r => r.source !== "watchlist") ? 0 : 1 };
        try {
          if (channel === "in_app") {
            const { error: insertError } = await admin.from("notifications").insert({ user_id: userId, title, body, category: "reminder", priority: "high", link: "/events", metadata });
            if (insertError) throw insertError;
            created++;
          } else {
            const sent = await sendPushToUser(admin, userId, { title, body, priority: "high", tag: `q-result:${slot.date}:${slot.slot}:${batch.map(r => r.symbol).join("-")}`, url: "/events" });
            pushed += sent.sent;
            if (sent.failed && !sent.sent) throw new Error("Q Result push delivery failed");
          }
        } catch (e) {
          // Release unsuccessful channel claims so a retry can deliver without duplicating successful channels.
          await admin.from("q_result_alert_log").delete().eq("user_id", userId).eq("result_date", slot.date).eq("slot", slot.slot).eq("channel", channel).in("symbol", batch.map(r => r.symbol));
          console.warn("[q-results] delivery failed", String(e));
        }
      }
    }
  }
  return { created, pushed };
}