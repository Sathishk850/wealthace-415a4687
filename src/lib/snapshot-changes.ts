export type ItemKind = 'investment' | 'asset' | 'account' | 'liability';
export type SnapshotItem = { id: string; name: string; kind: ItemKind; category: string; value: number; quantity?: number | null; price?: number | null };
type Position = { id: string; name: string; category?: string; account_type?: string; status?: string; current_value?: number | null; invested_value?: number | null; outstanding?: number; balance?: number; quantity?: number | null; current_price?: number; created_at?: string; updated_at?: string };
export type ActivityTxn = { id: string; investment_id: string; txn_type: string; quantity: number; price: number; amount: number; occurred_on: string; created_at: string };
export type ChangeRow = { id: string; name: string; category: string; label: string; before: number | null; after: number | null; delta: number | null; detail?: string; date?: string; events?: ActivityTxn[] };
type Totals = { assets_total: number; investments_total: number; savings_total: number; liabilities_total: number };
const kinds: ItemKind[] = ['investment', 'asset', 'account', 'liability'];
const active = (s?: string) => !['closed','sold','inactive','matured'].includes((s ?? 'active').toLowerCase());
const cash = (s?: string) => ['savings','current','wallet','cash','bank'].includes((s ?? '').toLowerCase());
export function snapshotItems(positions: Record<ItemKind, Position[]>): SnapshotItem[] {
 return kinds.flatMap(kind => positions[kind].filter(p => active(p.status) && (kind !== 'account' || cash(p.account_type))).map(p => ({
  id:p.id,name:p.name,kind,category:p.category ?? p.account_type ?? 'Other',
  value:Number(kind === 'liability' ? p.outstanding ?? 0 : kind === 'account' ? p.balance ?? 0 : p.current_value ?? p.invested_value ?? 0),
  ...(p.quantity != null ? {quantity:Number(p.quantity)} : {}), ...(p.current_price != null ? {price:Number(p.current_price)} : {}),
 }))).sort((a,b) => `${a.kind}:${a.id}`.localeCompare(`${b.kind}:${b.id}`));
}
export function parseSnapshotItems(value: unknown): SnapshotItem[] | null {
 if (!Array.isArray(value)) return null;
 return value.filter((p): p is SnapshotItem => !!p && typeof p === 'object' && typeof p.id === 'string' && typeof p.name === 'string' && kinds.includes(p.kind) && Number.isFinite(p.value));
}
export function activityWindow(previous: {created_at?: string | null; updated_at?: string | null; snapshot_date: string}, current: {created_at?: string | null; updated_at?: string | null; snapshot_date: string}, latest: boolean) {
 const time = (s: typeof previous) => Date.parse(s.created_at ?? s.updated_at ?? `${s.snapshot_date}T23:59:59.999Z`);
 return { start: time(previous), end: latest ? Date.now() : time(current) };
}
export function snapshotChangeGroups(previous: Totals, current: Totals, before: SnapshotItem[] | null, after: SnapshotItem[] | null, positions: Record<ItemKind, Position[]>, txns: ActivityTxn[], window: {start:number;end:number}) {
 const exact = before !== null && after !== null;
 const within = (iso?: string) => { const t = iso ? Date.parse(iso) : NaN; return t > window.start && t <= window.end; };
 // Transaction dates are date-only: include their calendar date in the capture window.
 const events = txns.filter(t => { const day = t.occurred_on.slice(0,10); return day >= new Date(window.start).toISOString().slice(0,10) && day <= new Date(window.end).toISOString().slice(0,10); });
 const target = (s: Totals, kind: ItemKind) => kind === 'investment' ? s.investments_total : kind === 'account' ? s.savings_total : kind === 'liability' ? s.liabilities_total : s.assets_total-s.investments_total-s.savings_total;
 return {exact, groups:kinds.map(kind => {
  const rows: ChangeRow[] = [];
  if (exact) {
   const old = new Map(before.filter(p=>p.kind===kind).map(p=>[p.id,p]));
   const next = new Map(after.filter(p=>p.kind===kind).map(p=>[p.id,p]));
   for (const id of new Set([...old.keys(),...next.keys()])) {
    const a=old.get(id), b=next.get(id), p=b??a;
    if (!p) continue;
    const delta=(b?.value??0)-(a?.value??0);
    const itemEvents=kind==='investment'?events.filter(t=>t.investment_id===id):[];
    if (Math.abs(delta)<0.005 && a?.quantity===b?.quantity && !itemEvents.length) continue;
    const qty=(b?.quantity??0)-(a?.quantity??0);
    const label=!a ? (kind==='investment'?'New holding added':'Added') : !b ? (kind==='liability'?'Closed':'Sold / redeemed / removed') : kind==='investment' ? qty>0?'Bought more / SIP instalment':qty<0?'Sold / redeemed':'Market value changed' : kind==='liability'?'Outstanding updated / payment':kind==='account'?'Balance changed':'Value updated';
    rows.push({id,name:p.name,category:p.category,label,before:a?.value??0,after:b?.value??0,delta,detail:kind==='investment'&&a?.quantity!=null&&b?.quantity!=null?`Units ${a.quantity} → ${b.quantity}`:undefined,events:itemEvents});
   }
  } else {
   for (const p of positions[kind]) {
    if (kind==='account'&&!cash(p.account_type)) continue;
    const added=within(p.created_at), updated=within(p.updated_at);
    const itemEvents=kind==='investment'?events.filter(t=>t.investment_id===p.id):[];
    if (!added&&!updated&&!itemEvents.length) continue;
    const value=Number(kind==='liability'?p.outstanding??0:kind==='account'?p.balance??0:p.current_value??p.invested_value??0);
    const closed=!active(p.status);
    const eventDelta=itemEvents.reduce((s,t)=>s+(t.txn_type==='sell'?-1:1)*Number(t.amount),0);
    rows.push({id:p.id,name:p.name,category:p.category??p.account_type??'Other',label:closed?(kind==='liability'?'Closed':'Sold / redeemed / removed'):added?(kind==='investment'?'New holding added':'Added'):itemEvents.length?'Bought / sold / SIP activity':kind==='liability'?'Outstanding updated / EMI activity':kind==='account'?'Balance updated':'Value updated',before:added?0:null,after:closed?0:value,delta:added&&!closed?value:itemEvents.length?eventDelta:null,date:added?p.created_at:p.updated_at,events:itemEvents,detail:!added&&!itemEvents.length?'Previous value was not recorded':itemEvents.length?'Transaction amounts; not an exact market-value change':undefined});
   }
   // A deleted holding may still have transaction history.
   if(kind==='investment') for(const t of events.filter(t=>!positions.investment.some(p=>p.id===t.investment_id))) rows.push({id:t.id,name:'Removed holding',category:'Investment',label:t.txn_type==='sell'?'Sold / redeemed':'Bought / SIP activity',before:null,after:null,delta:(t.txn_type==='sell'?-1:1)*Number(t.amount),events:[t],detail:'Holding name no longer available'});
  }
  rows.sort((a,b)=>Math.abs(b.delta??0)-Math.abs(a.delta??0));
  const total=target(current,kind)-target(previous,kind);
  const residual=total-rows.reduce((s,r)=>s+(r.delta??0),0);
  return {kind,rows,total,residual};
 })};
}
