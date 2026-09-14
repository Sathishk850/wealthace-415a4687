import { useMemo, useState } from "react";
import { Globe, X } from "lucide-react";
import { useInvestments, useAssets, useAccounts, inrCompact } from "@/lib/wealth-api";
import { AllocationTargetCard } from "./AllocationTargetCard";
import { cn } from "@/lib/utils";

const R_COLOR: Record<string, string> = {
  India: "#22d3ee", "United States": "#3b82f6", Europe: "#8b5cf6",
  "Emerging Markets": "#f59e0b", Global: "#10b981", Other: "#6b7280",
};
const R_FLAG: Record<string, string> = {
  India: "🇮🇳", "United States": "🇺🇸", Europe: "🇪🇺",
  "Emerging Markets": "🌏", Global: "🌐", Other: "🌍",
};
const R_ORDER = ["India","United States","Europe","Emerging Markets","Global","Other"];

function geoFromNotes(n: string | null | undefined) {
  const m = (n ?? "").match(/Geography:\s*([^\n]+)/i);
  const r = m?.[1]?.trim() ?? "India";
  return r === "US" || r === "USA" ? "United States" : r;
}

export function AllocationView() {
  const invQ = useInvestments(), assQ = useAssets(), accQ = useAccounts();
  const [view, setView] = useState<"region"|"currency">("region");
  const [sel, setSel] = useState<string|null>(null);

  const { regionMap, currencyMap, total, holdings } = useMemo(() => {
    const regionMap = new Map<string,number>();
    const currencyMap = new Map<string,number>();
    const holdings = new Map<string,{name:string;value:number;type:string}[]>();
    let total = 0;
    const add = (geo:string, ccy:string, v:number, name:string, type:string) => {
      if (!isFinite(v)||v<=0) return;
      regionMap.set(geo,(regionMap.get(geo)??0)+v);
      currencyMap.set(ccy,(currencyMap.get(ccy)??0)+v);
      const arr = holdings.get(geo)??[]; arr.push({name,value:v,type}); holdings.set(geo,arr);
      total += v;
    };
    for (const i of invQ.data??[]) {
      if ((i.status??"active")!=="active") continue;
      add(geoFromNotes(i.notes), i.currency??"INR", Number(i.current_value??0), i.name, i.category??"Investment");
    }
    for (const a of assQ.data??[]) add("India","INR",Number(a.current_value??0),a.name,a.category??"Asset");
    for (const a of accQ.data??[]) add("India","INR",Number(a.balance??0),a.name??"Account","Account");
    return { regionMap, currencyMap, total, holdings };
  }, [invQ.data, assQ.data, accQ.data]);

  const regions = useMemo(()=>[...regionMap.entries()].sort((a,b)=>{
    const oa=R_ORDER.indexOf(a[0]),ob=R_ORDER.indexOf(b[0]);
    if(oa!==-1&&ob!==-1) return oa-ob; if(oa!==-1) return -1; if(ob!==-1) return 1; return b[1]-a[1];
  }),[regionMap]);

  const currencies = useMemo(()=>[...currencyMap.entries()].sort((a,b)=>b[1]-a[1]),[currencyMap]);

  const RAD=60, CIRC=2*Math.PI*RAD;
  let cum=0;
  const segs = regions.map(([r,v])=>{
    const pct=total>0?v/total:0, dash=pct*CIRC, off=CIRC*(1-cum);
    cum+=pct; return {r,v,pct,dash,off};
  });

  const selHoldings = sel ? (holdings.get(sel)??[]).sort((a,b)=>b.value-a.value) : [];

  return (
    <div className="space-y-5">
      <AllocationTargetCard />

      <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Globe className="h-4 w-4 text-mint" />
            <h3 className="text-sm font-semibold text-foreground">Geography</h3>
            <span className="rounded-full bg-mint/10 px-2 py-0.5 text-[10px] font-semibold text-mint">{regions.length} regions</span>
          </div>
          <div className="flex gap-1 rounded-xl border border-border bg-surface p-0.5">
            {(["region","currency"] as const).map(v=>(
              <button key={v} onClick={()=>setView(v)} className={cn("rounded-lg px-3 py-1 text-[11px] font-semibold capitalize transition-colors", view===v?"bg-mint text-mint-foreground":"text-muted-foreground hover:text-foreground")}>{v}</button>
            ))}
          </div>
        </div>

        {invQ.isLoading ? <div className="h-40 animate-pulse rounded-xl bg-surface" /> :
         total===0 ? <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">Add investments to see geography breakdown.</div> :
         view==="region" ? (
          <>
            <div className="flex flex-wrap items-center gap-6">
              <div className="relative shrink-0">
                <svg width="148" height="148" viewBox="0 0 148 148" className="-rotate-90">
                  <circle cx="74" cy="74" r={RAD} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="20"/>
                  {segs.map(s=>(
                    <circle key={s.r} cx="74" cy="74" r={RAD} fill="none"
                      stroke={R_COLOR[s.r]??"#6b7280"}
                      strokeWidth={sel===s.r?26:20}
                      strokeDasharray={`${s.dash} ${CIRC-s.dash}`}
                      strokeDashoffset={s.off}
                      className="cursor-pointer transition-all"
                      onClick={()=>setSel(sel===s.r?null:s.r)}/>
                  ))}
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-sm font-bold text-foreground">{inrCompact(total)}</span>
                  <span className="text-[10px] text-muted-foreground">Total</span>
                </div>
              </div>
              <div className="flex flex-col gap-1.5 flex-1 min-w-[160px]">
                {segs.map(s=>(
                  <button key={s.r} onClick={()=>setSel(sel===s.r?null:s.r)}
                    className={cn("flex items-center justify-between rounded-lg px-2 py-1.5 text-left transition-colors",sel===s.r?"bg-mint/10":"hover:bg-surface")}>
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{background:R_COLOR[s.r]??"#6b7280"}}/>
                      <span className="text-xs text-foreground">{R_FLAG[s.r]??""} {s.r}</span>
                    </div>
                    <div className="text-right ml-3">
                      <div className="text-xs font-semibold">{(s.pct*100).toFixed(1)}%</div>
                      <div className="text-[10px] text-muted-foreground">{inrCompact(s.v)}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
            {sel && (
              <div className="rounded-xl border border-border bg-surface p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-foreground">{R_FLAG[sel]??""} {sel} — {selHoldings.length} holdings</span>
                  <button onClick={()=>setSel(null)}><X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground"/></button>
                </div>
                <div className="space-y-1 max-h-52 overflow-y-auto">
                  {selHoldings.map((h,i)=>(
                    <div key={i} className="flex items-center justify-between py-1 border-b border-border/30 last:border-0">
                      <div><div className="text-xs font-medium text-foreground truncate max-w-[180px]">{h.name}</div><div className="text-[10px] text-muted-foreground">{h.type}</div></div>
                      <div className="text-right ml-3"><div className="text-xs font-semibold">{inrCompact(h.value)}</div><div className="text-[10px] text-muted-foreground">{total>0?((h.value/total)*100).toFixed(1):0}%</div></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="space-y-2">
            {currencies.map(([ccy,v])=>{
              const pct=total>0?(v/total)*100:0;
              return (
                <div key={ccy} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{ccy}</span>
                    <span className="text-muted-foreground">{pct.toFixed(1)}% · {inrCompact(v)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface">
                    <div className="h-full rounded-full bg-mint transition-all" style={{width:`${pct}%`}}/>
                  </div>
                </div>
              );
            })}
            <p className="text-[10px] text-muted-foreground pt-1">Values shown in holding currency.</p>
          </div>
        )}
      </div>
    </div>
  );
}
