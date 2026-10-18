import { expect, test } from 'bun:test';
import { sweepQResultAlerts } from './q-result-alerts.server';

function fixture({ enabled = true, failInsert = false } = {}) {
  const claims = new Set(), notifications = [];
  const tables = {
    wealth_investments: [{ user_id: 'owner', identifier: 'HDFCBANK.NS', identifier_type: 'stock_in', status: 'active' }],
    user_watchlist: ['AXISBANK', 'ICICIBANK', 'YESBANK'].map(symbol => ({ user_id: 'owner', symbol: `${symbol}.NS`, category: 'stock_in' })),
    notification_preferences: [{ user_id: 'owner', channels: { in_app: true, push: true }, per_type: { 'alert:q_results': enabled } }],
  };
  const admin = { from(table) {
    let op = 'read', values = [], filter = {}, column;
    const query = {
      select(col) { column = col; return query; },
      in(key, rows) { filter[key] = rows; return query; },
      eq(key, value) { filter[key] = value; return query; },
      upsert(rows) { op = 'claim'; values = rows; return query; },
      insert(row) { op = 'insert'; values = [row]; return query; },
      delete() { op = 'delete'; return query; },
      then(resolve, reject) {
        try {
          const key = row => [row.user_id, row.symbol, row.result_date, row.slot, row.channel].join(':');
          let result = {data: [], error: null};
          if (op === 'read') result.data = tables[table] ?? [];
          if (op === 'claim') {
            result.data = values.filter(row => {
              const id = key(row); if (claims.has(id)) return false;
              claims.add(id); return true;
            }).map(row => ({symbol: row.symbol}));
          }
          if (op === 'insert') {
            if (failInsert) result.error = new Error('Unavailable');
            else notifications.push(...values);
          }
          if (op === 'delete') for (const symbol of filter.symbol ?? []) claims.delete(key({...filter, symbol}));
          return Promise.resolve(result).then(resolve, reject);
        } catch (error) { return Promise.reject(error).then(resolve, reject); }
      },
    };
    return query;
  }};
  const rows = ['AXISBANK','HDFCBANK','ICICIBANK','YESBANK'].map(symbol => ({symbol, name: symbol, date: '2026-10-17', market: 'India'}));
  const dependencies = {
    fetchCalendar: async () => ({rows, today: '2026-10-16', horizon: '2026-10-23', indiaAvailable: true, usAvailable: true}),
    sendPush: async () => ({sent: 1, failed: 0}),
  };
  return {admin, claims, notifications, dependencies};
}

test('four companies group once per slot and channel, with the holding first and high push priority', async () => {
  const f = fixture(), pushes = [];
  f.dependencies.sendPush = async (_, __, payload) => { pushes.push(payload); return {sent: 1, failed: 0}; };
  const evening = new Date('2026-10-16T12:30:00Z');
  expect(await sweepQResultAlerts(f.admin, evening, f.dependencies)).toEqual({created: 1, pushed: 1});
  expect(await sweepQResultAlerts(f.admin, evening, f.dependencies)).toEqual({created: 0, pushed: 0});
  expect(f.notifications[0].metadata.symbols).toEqual(['HDFCBANK','AXISBANK','ICICIBANK','YESBANK']);
  expect(f.notifications[0].priority).toBe('high');
  expect(f.notifications[0].metadata.holding_rank).toBe(0);
  expect(pushes[0].priority).toBe('high');
  expect(await sweepQResultAlerts(f.admin, new Date('2026-10-17T02:30:00Z'), f.dependencies)).toEqual({created: 1, pushed: 1});
  expect(f.notifications.map(row => row.metadata.slot)).toEqual(['evening', 'morning']);
});
test('Q result alert toggle off prevents all channel claims and deliveries', async () => {
  const f = fixture({enabled: false});
  expect(await sweepQResultAlerts(f.admin, new Date('2026-10-16T12:30:00Z'), f.dependencies)).toEqual({created: 0, pushed: 0});
  expect(f.claims.size).toBe(0);
});
test('unsent push releases all grouped push claims without duplicating successful in-app delivery', async () => {
  const f = fixture();
  f.dependencies.sendPush = async () => ({sent: 0, failed: 0});
  const now = new Date('2026-10-16T12:30:00Z');
  expect(await sweepQResultAlerts(f.admin, now, f.dependencies)).toEqual({created: 1, pushed: 0});
  expect(f.claims.size).toBe(4);
  f.dependencies.sendPush = async () => ({sent: 1, failed: 0});
  expect(await sweepQResultAlerts(f.admin, now, f.dependencies)).toEqual({created: 0, pushed: 1});
  expect(f.notifications).toHaveLength(1);
  expect(f.claims.size).toBe(8);
});
test('failed grouped in-app insert releases every company claim', async () => {
  const f = fixture({failInsert: true});
  expect(await sweepQResultAlerts(f.admin, new Date('2026-10-16T12:30:00Z'), f.dependencies)).toEqual({created: 0, pushed: 1});
  expect([...f.claims].every(key => key.endsWith(':push'))).toBe(true);
  expect(f.claims.size).toBe(4);
});