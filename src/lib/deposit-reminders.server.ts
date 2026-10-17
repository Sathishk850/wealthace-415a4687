import { depositKind, holdingDepositValue, maturityReminderStage } from './deposit-value';
import type { DepositHolding } from './deposit-value';

/** Both the signed-in sweep and hourly delivery worker use the same channel keys. */
export async function enqueueDepositMaturity(client: any, row: DepositHolding & { id: string; name: string; user_id: string; status: string }, now: Date, email: string | null) {
  const stage = maturityReminderStage(row.maturity_date, now);
  if (!stage || !depositKind(row.category, row.sub_category, row.deposit_kind) || !['active', 'matured'].includes(row.status)) return { created: 0, queued: 0 };
  const { data: prefs, error: prefsError } = await client.from('notification_preferences').select('channels,per_type').eq('user_id', row.user_id).maybeSingle();
  if (prefsError) throw prefsError;
  const override = prefs?.per_type?.maturity ?? {};
  const wantInApp = override.in_app ?? prefs?.channels?.in_app ?? true;
  const wantEmail = override.email ?? prefs?.channels?.email ?? true;
  const key = `${row.id}:${row.maturity_date}:${stage}`;
  const title = `${row.category} ${stage === 'seven_days' ? 'matures in 7 days' : 'matures today'}: ${row.name}`;
  const deposit = holdingDepositValue(row, now);
  const value = deposit?.maturityValue ?? row.current_value ?? row.invested_value ?? 0;
  const body = `Maturity value ₹${Math.round(value).toLocaleString('en-IN')}. Plan reinvestment or withdrawal.`;
  let created = 0; let queued = 0;
  if (wantInApp) {
    const { error } = await client.from('notifications').insert({
      user_id: row.user_id, title, body, category: 'reminder', priority: 'normal', link: '/wealth',
      metadata: { deposit_maturity_key: key, kind: 'maturity', investment_id: row.id, due_date: row.maturity_date, due_days: stage === 'seven_days' ? 7 : 0 },
    });
    if (error && error.code !== '23505') throw error;
    if (!error) created++;
  }
  // Channel dedupe is independent: disabled bell never suppresses an email.
  if (wantEmail && email) {
    const { error } = await client.from('notification_delivery_log').insert({
      user_id: row.user_id, channel: 'email', template: 'reminder.due', recipient: email,
      subject: title, payload: { deposit_maturity_key: key, body, investment_id: row.id, maturity_date: row.maturity_date, stage },
      status: 'pending', related_kind: 'investment_maturity', related_id: row.id, scheduled_for: now.toISOString(),
    });
    if (error && error.code !== '23505') throw error;
    if (!error) queued++;
  }
  return { created, queued };
}