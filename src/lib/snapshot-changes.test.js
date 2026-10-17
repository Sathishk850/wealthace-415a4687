import { test, expect } from 'bun:test';
import { snapshotChangeGroups, snapshotItems } from './snapshot-changes';
const positions={investment:[],asset:[],account:[],liability:[]};
const totals={assets_total:100,investments_total:100,savings_total:0,liabilities_total:50};
const item=(id,kind,value,quantity=1)=>({id,name:id,kind,category:'Test',value,quantity});
const window={start:Date.parse('2026-10-13T12:00:00Z'),end:Date.parse('2026-10-17T12:00:00Z')};
test('exact item diffs identify added holdings, purchases and closed loans',()=>{
 const before=[item('fund','investment',100,1),item('loan','liability',50)];
 const after=[item('fund','investment',120,2),item('fd','investment',40)];
 const result=snapshotChangeGroups(totals,{...totals,assets_total:160,investments_total:160,liabilities_total:0},before,after,positions,[],window);
 expect(result.exact).toBe(true);
 expect(result.groups[0].rows.map(r=>[r.name,r.delta,r.label])).toEqual([['fd',40,'New holding added'],['fund',20,'Bought more / SIP instalment']]);
 expect(result.groups[3].rows[0]).toMatchObject({name:'loan',delta:-50,label:'Closed',before:50,after:0});
 expect(result.groups[0].residual).toBe(0);
});
test('each group reconciles item impacts and unattributed changes to recorded totals',()=>{
 const result=snapshotChangeGroups(totals,{assets_total:135,investments_total:120,savings_total:10,liabilities_total:30},[item('fund','investment',100)],[item('fund','investment',115)],positions,[],window);
 expect(result.groups.map(g=>g.total)).toEqual([20,5,10,-20]);
 expect(result.groups[0].residual).toBe(5);
 for(const g of result.groups) expect(g.rows.reduce((s,r)=>s+(r.delta??0),0)+g.residual).toBe(g.total);
});
test('legacy loan closure is identified without inventing the previous outstanding',()=>{
 const p={...positions,liability:[{id:'loan',name:'Loan',category:'Personal Loan',outstanding:0,status:'closed',updated_at:'2026-10-15T12:00:00Z'}]};
 const result=snapshotChangeGroups(totals,totals,null,null,p,[],window);
 expect(result.exact).toBe(false);
 expect(result.groups[3].rows[0]).toMatchObject({label:'Closed',delta:null,before:null,after:0});
});
test('captured items exclude closed liabilities and non-cash accounts',()=>{
 const result=snapshotItems({...positions,liability:[{id:'loan',name:'Loan',outstanding:100,status:'closed'}],account:[{id:'cash',name:'Cash',balance:20,account_type:'cash'},{id:'credit',name:'Card',balance:40,account_type:'credit_card'}]});
 expect(result.map(p=>[p.id,p.value])).toEqual([['cash',20]]);
});
