import { expect, test } from 'bun:test';
import { istDate, parseNseRows, tagResults, resultBatches, resultSlot, resultChannels } from './results';
import { fetchNseResults } from './results-calendar.server';
test('IST today retains Saturday 17 October and US midnight boundaries', () => {
  expect(istDate(Date.parse('2026-10-16T18:30:00Z'))).toBe('2026-10-17');
  expect(istDate(Date.parse('2026-10-17T18:29:00Z'))).toBe('2026-10-17');
  expect(istDate(Date.parse('2026-10-17T18:30:00Z'))).toBe('2026-10-18');
  expect(tagResults([{symbol:'HDFCBANK',name:'HDFC Bank',date:'2026-10-17',market:'India'}],new Set(),new Set(),'2026-10-17','2026-10-24')).toHaveLength(1);
});
test('both NSE shapes merge by symbol and date, ignoring non-result meetings', () => {
  const rows = parseNseRows([{symbol:'HDFCBANK',purpose:'Financial Results',date:'17-Oct-2026'}, {bm_symbol:'HDFCBANK',bm_purpose:'Results',bm_date:'17-Oct-2026'}, {symbol:'X',purpose:'Dividend',date:'17-Oct-2026'}]);
  expect(rows).toHaveLength(2);
  expect(tagResults(rows,new Set(['India:HDFCBANK']),new Set(),'2026-10-17','2026-10-24')).toEqual([{symbol:'HDFCBANK',name:'HDFCBANK',date:'2026-10-17',market:'India',source:'holding'}]);
});
test('NSE requests explicit dates, sends primed cookies and retries once', async () => {
  let calendarAttempts = 0;
  const fetcher = async (input, options) => {
    const url = String(input);
    if (url === 'https://www.nseindia.com/') return new Response('',{headers:{'set-cookie':'nse_session=test; Path=/'}});
    expect(options.headers.Cookie).toBe('nse_session=test');
    expect(url).toContain('from_date=17-10-2026');
    expect(url).toContain('to_date=24-10-2026');
    if (url.includes('event-calendar') && ++calendarAttempts === 1) return new Response('',{status:403});
    return Response.json([{bm_symbol:'HDFCBANK',bm_purpose:'Financial Results',bm_date:'17-Oct-2026'}]);
  };
  const result = await fetchNseResults('2026-10-17','2026-10-24',fetcher);
  expect(calendarAttempts).toBe(2); expect(result.available).toBe(true); expect(result.rows).toHaveLength(2);
});
test('both failed NSE feeds are marked unavailable instead of silently empty', async () => {
  const result = await fetchNseResults('2026-10-17','2026-10-24',async () => new Response('',{status:403}));
  expect(result.available).toBe(false);
});
test('alert slots are 18 IST before and 08 IST on the result date', () => {
  expect(resultSlot(new Date('2026-10-16T12:30:00Z'))).toEqual({slot:'evening',date:'2026-10-17'});
  expect(resultSlot(new Date('2026-10-17T02:30:00Z'))).toEqual({slot:'morning',date:'2026-10-17'});
  expect(resultSlot(new Date('2026-10-17T01:30:00Z'))).toBeNull();
});
test('more than three companies group together and holdings rank above watchlist', () => {
  const rows = ['watchlist','watchlist','holding','both'].map((source,i) => ({symbol:String(i),name:String(i),date:'2026-10-17',market:'India',source}));
  expect(resultBatches(rows)).toHaveLength(1);
  expect(resultBatches(rows)[0].map(r=>r.source)).toEqual(['holding','both','watchlist','watchlist']);
  expect(resultBatches(rows.slice(0,3))).toHaveLength(3);
});
test('Q alerts default on but respect master toggle and channel preferences', () => {
  expect(resultChannels(null)).toEqual({in_app:true,push:false});
  expect(resultChannels({channels:{in_app:false,push:true}})).toEqual({in_app:false,push:true});
  expect(resultChannels({channels:{in_app:true,push:true},per_type:{'alert:q_results':false}})).toEqual({in_app:false,push:false});
});