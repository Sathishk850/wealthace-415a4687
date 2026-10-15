import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useInvestments, useAssets, useAccounts } from "@/lib/wealth-api";

// Default target allocation (user-editable in a future phase)
const DEFAULT_TARGETS: Record<string, number> = {
  Equity: 55,
  Debt: 20,
  "Real Estate": 10,
  Commodities: 10,
  "Cash & Savings": 5,
  Alternatives: 0,
};

/** Read the NPS three-way split (Equity/Debt/Alternative %) from holding notes. */
function parseNpsSplit(
  notes: string | null | undefined,
): { equity: number; debt: number; alt: number } | null {
  if (!notes) return null;
  const grab = (label: string) => {
    const m = notes.match(new RegExp(`^\\s*${label}\\s*:\\s*([0-9.]+)%`, "im"));
    return m ? Number(m[1]) : null;
  };
  const e = grab("NPS Equity");
  const d = grab("NPS Debt");
  const a = grab("NPS Alternative");
  if (e != null || d != null || a != null)
    return { equity: e ?? 0, debt: d ?? Math.max(0, 100 - (e ?? 0) - (a ?? 0)), alt: a ?? 0 };
  // Legacy fallback: single "Equity allocation: X%" line.
  const legacy = grab("Equity allocation");
  if (legacy != null) return { equity: legacy, debt: Math.max(0, 100 - legacy), alt: 0 };
  return null;
}

// Map investment/asset category → allocation bucket
function toBucket(category: string | null | undefined): string {
  const c = (category ?? "").toLowerCase();
  if (
    c.includes("equity") ||
    c.includes("stock") ||
    c.includes("mf") ||
    c.includes("mutual") ||
    c.includes("etf")
  )
    return "Equity";
  if (
    c.includes("debt") ||
    c.includes("bond") ||
    c.includes("fd") ||
    c.includes("ppf") ||
    c.includes("nps") ||
    c.includes("epf")
  )
    return "Debt";
  if (c.includes("real estate") || c.includes("property") || c.includes("land")) return "Real Estate";
  if (c.includes("gold") || c.includes("silver") || c.includes("commodit")) return "Commodities";
  return "Cash & Savings";
}

const BUCKET_COLOURS: Record<string, string> = {
  Equity: "#3b82f6",
  Debt: "#10b981",
  "Real Estate": "#f97316",
  Commodities: "#eab308",
  "Cash & Savings": "#6b7280",
  Alternatives: "#D4537E",
};

function inr(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function AllocationTargetCard({ className }: { className?: string }) {
  const investmentsQ = useInvestments();
  const assetsQ = useAssets();
  const accountsQ = useAccounts();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [subTargets, setSubTargets] = useState<Record<string, Record<string, number>>>({});
  const [subDirty, setSubDirty] = useState(false);
  const [savingSub, setSavingSub] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("profiles")
        .select("sub_allocation_targets")
        .eq("user_id", u.user.id)
        .maybeSingle();
      const v = data?.sub_allocation_targets;
      if (!cancelled && v && typeof v === "object" && !Array.isArray(v))
        setSubTargets(v as Record<string, Record<string, number>>);
    })();
    return () => { cancelled = true; };
  }, []);

  const saveSubTargets = async () => {
    setSavingSub(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .update({ sub_allocation_targets: subTargets })
        .eq("user_id", u.user.id);
      if (error) throw error;
      setSubDirty(false);
      toast.success("Sub-targets saved");
    } catch (e: any) {
      toast.error(e.message || "Failed to save sub-targets");
    } finally {
      setSavingSub(false);
    }
  };

  // Sub-category values within each bucket (by holding category label)
  const subValues = useMemo(() => {
    const out: Record<string, Record<string, number>> = {};
    const add = (bucket: string, label: string, v: number) => {
      out[bucket] ??= {};
      out[bucket]![label] = (out[bucket]![label] ?? 0) + v;
    };
    for (const inv of investmentsQ.data ?? []) {
      if ((inv.status ?? "active") !== "active") continue;
      const v = Number(inv.current_value ?? inv.invested_value ?? 0);
      if (!Number.isFinite(v) || v <= 0) continue;
      if ((inv.category ?? "").toLowerCase() === "nps") continue;
      add(toBucket(inv.category), subLabel(inv.category), v);
    }
    for (const a of assetsQ.data ?? []) {
      const v = Number(a.current_value ?? 0);
      if (!Number.isFinite(v) || v <= 0) continue;
      add(toBucket(a.category), subLabel(a.category), v);
    }
    return out;
  }, [investmentsQ.data, assetsQ.data]);

  const { buckets, total, offCount } = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of Object.keys(DEFAULT_TARGETS)) map.set(b, 0);

    for (const inv of investmentsQ.data ?? []) {
      if ((inv.status ?? "active") !== "active") continue;
      const v = Number(inv.current_value ?? inv.invested_value ?? 0);
      if (!Number.isFinite(v) || v <= 0) continue;
      // NPS corpus is split across Equity / Debt / Alternatives by the saved
      // allocation percentages; without a split it counts as Debt.
      if ((inv.category ?? "").toLowerCase() === "nps") {
        const split = parseNpsSplit(inv.notes);
        if (split) {
          map.set("Equity", (map.get("Equity") ?? 0) + (v * split.equity) / 100);
          map.set("Debt", (map.get("Debt") ?? 0) + (v * split.debt) / 100);
          map.set("Alternatives", (map.get("Alternatives") ?? 0) + (v * split.alt) / 100);
        } else {
          map.set("Debt", (map.get("Debt") ?? 0) + v);
        }
        continue;
      }
      const b = toBucket(inv.category);
      map.set(b, (map.get(b) ?? 0) + v);
    }
    for (const a of assetsQ.data ?? []) {
      const v = Number(a.current_value ?? 0);
      if (!Number.isFinite(v) || v <= 0) continue;
      const b = toBucket(a.category);
      map.set(b, (map.get(b) ?? 0) + v);
    }
    for (const acc of accountsQ.data ?? []) {
      const v = Number(acc.balance ?? 0);
      if (!Number.isFinite(v) || v <= 0) continue;
      map.set("Cash & Savings", (map.get("Cash & Savings") ?? 0) + v);
    }

    const totalVal = [...map.values()].reduce((s, v) => s + v, 0);
    const rows = Object.keys(DEFAULT_TARGETS).map((name) => {
      const actual = map.get(name) ?? 0;
      const actualPct = totalVal > 0 ? (actual / totalVal) * 100 : 0;
      const target = DEFAULT_TARGETS[name] ?? 0;
      const gap = actualPct - target;
      const tgtVal = totalVal * (target / 100);
      const gapVal = actual - tgtVal;
      return { name, actual, actualPct, target, tgtVal, gapVal, gap };
    });
    return { buckets: rows, total: totalVal, offCount: rows.filter((b) => Math.abs(b.gap) > 5).length };
  }, [investmentsQ.data, assetsQ.data, accountsQ.data]);

  const isLoading = investmentsQ.isLoading || assetsQ.isLoading || accountsQ.isLoading;

  const RADIUS = 56;
  const CIRC = 2 * Math.PI * RADIUS;
  let cumPct = 0;
  const segments = buckets
    .filter((b) => b.actualPct > 0)
    .map((b) => {
      const dash = (b.actualPct / 100) * CIRC;
      const offset = CIRC - (cumPct * CIRC) / 100;
      cumPct += b.actualPct;
      return { ...b, dash, offset };
    });

  const insightTip = useMemo(() => {
    if (total === 0) return { tone: "positive" as const, text: "Add holdings to see allocation guidance." };
    if (offCount === 0) return { tone: "positive" as const, text: "Your allocation is well-balanced." };
    const worst = [...buckets].sort((a, b) => Math.abs(b.gap) - Math.abs(a.gap))[0]!;
    if (worst.gap > 0)
      return {
        tone: "warning" as const,
        text: `${worst.name} is ${worst.gap.toFixed(1)}% over target. Consider redirecting new contributions to underweight categories.`,
      };
    return {
      tone: "warning" as const,
      text: `${worst.name} is ${Math.abs(worst.gap).toFixed(1)}% below target (${inr(Math.abs(worst.gapVal))} to add). Rebalance gradually to avoid market-timing risk.`,
    };
  }, [buckets, offCount, total]);

  if (isLoading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-muted/40" />
        <div className="h-48 animate-pulse rounded bg-muted/40" />
      </Card>
    );
  }

  return (
    <Card className={cn("p-6", className)}>
      <h3 className="mb-1 text-sm font-semibold text-foreground">Current Allocation</h3>

      {offCount > 0 ? (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Needs rebalancing — {offCount} {offCount === 1 ? "category is" : "categories are"} off by over 5%.
        </div>
      ) : (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
          Allocation is on target.
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-6">
        <div className="relative shrink-0">
          <svg width="136" height="136" viewBox="0 0 136 136" className="-rotate-90">
            <circle cx="68" cy="68" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
            {total === 0 ? (
              <circle cx="68" cy="68" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="18" />
            ) : (
              segments.map((s) => (
                <circle
                  key={s.name}
                  cx="68"
                  cy="68"
                  r={RADIUS}
                  fill="none"
                  stroke={BUCKET_COLOURS[s.name] ?? "#888"}
                  strokeWidth="18"
                  strokeDasharray={`${s.dash} ${CIRC - s.dash}`}
                  strokeDashoffset={s.offset}
                  strokeLinecap="butt"
                />
              ))
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold text-foreground">{inr(total)}</span>
            <span className="text-[10px] text-muted-foreground">Total</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {buckets
            .filter((b) => b.actual > 0)
            .map((b) => (
              <div key={b.name} className="flex items-center gap-2 text-xs">
                <span
                  className="h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: BUCKET_COLOURS[b.name] }}
                />
                <span className="w-28 text-muted-foreground">{b.name}</span>
                <span className="w-10 text-right font-semibold text-foreground">{b.actualPct.toFixed(1)}%</span>
                <span className="text-muted-foreground">{inr(b.actual)}</span>
              </div>
            ))}
        </div>
      </div>

      <div
        className={cn(
          "mb-4 rounded-lg border px-3 py-2 text-xs leading-relaxed",
          insightTip.tone === "positive"
            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
            : "border-amber-500/30 bg-amber-500/10 text-amber-300",
        )}
      >
        💡 {insightTip.text}
      </div>

      <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Target vs Actual</h4>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-xs">
          <thead>
            <tr className="border-b border-border text-left text-[10px] uppercase tracking-wide text-muted-foreground">
              <th className="pb-2 pr-3">Category</th>
              <th className="pb-2 pr-3 text-right">Actual</th>
              <th className="pb-2 pr-3 text-right">Cur Val</th>
              <th className="pb-2 pr-3 text-right">Target</th>
              <th className="pb-2 pr-3 text-right">Tgt Val</th>
              <th className="pb-2 pr-3 text-right">Gap</th>
              <th className="pb-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {buckets.flatMap((b) => {
              const isExpanded = expanded === b.name;
              const over = b.gap > 0;
              const offTarget = Math.abs(b.gap) > 5;
              const rows = [
                <tr
                  key={b.name}
                  className="cursor-pointer border-b border-border/40 hover:bg-muted/30"
                  onClick={() => setExpanded(isExpanded ? null : b.name)}
                >
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-1.5">
                      {b.actual > 0 ? (
                        <ChevronDown
                          className={cn(
                            "h-3 w-3 text-muted-foreground transition-transform",
                            isExpanded ? "rotate-0" : "-rotate-90",
                          )}
                        />
                      ) : (
                        <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0" />
                      )}
                      <span className="h-2 w-2 rounded-full" style={{ background: BUCKET_COLOURS[b.name] }} />
                      <span className="font-medium text-foreground">{b.name}</span>
                    </div>
                  </td>
                  <td className="py-2.5 pr-3 text-right font-semibold text-foreground">{b.actualPct.toFixed(1)}%</td>
                  <td className="py-2.5 pr-3 text-right text-muted-foreground">{inr(b.actual)}</td>
                  <td className="py-2.5 pr-3 text-right text-muted-foreground">{b.target}%</td>
                  <td className="py-2.5 pr-3 text-right text-muted-foreground">{inr(b.tgtVal)}</td>
                  <td className="py-2.5 pr-3 text-right">
                    {offTarget ? (
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 font-semibold",
                          over ? "bg-red-500/15 text-red-400" : "bg-emerald-500/15 text-emerald-400",
                        )}
                      >
                        {over ? "+" : ""}
                        {b.gap.toFixed(1)}%
                      </span>
                    ) : (
                      <span className="text-muted-foreground">~</span>
                    )}
                  </td>
                  <td className="py-2.5 text-right">
                    {offTarget ? (
                      <span className={cn("font-semibold", over ? "text-orange-400" : "text-cyan-400")}>
                        {over ? (
                          <span className="flex items-center justify-end gap-1">
                            <TrendingDown className="h-3 w-3" />
                            Reduce {inr(Math.abs(b.gapVal))}
                          </span>
                        ) : (
                          <span className="flex items-center justify-end gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Add {inr(Math.abs(b.gapVal))}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span className="text-muted-foreground">On target</span>
                    )}
                  </td>
                </tr>,
              ];
              if (isExpanded && b.actual > 0) {
                rows.push(
                  <tr key={`${b.name}-exp`} className="border-b border-border/20">
                    <td colSpan={7} className="bg-muted/20 px-6 py-2 text-[11px] text-muted-foreground">
                      <div className="mb-3">{b.gap > 0
                        ? `This category is ${b.gap.toFixed(1)}% above target. Redirect future contributions to underweight categories rather than selling — reduces tax impact.`
                        : b.gap < 0
                          ? `This category is ${Math.abs(b.gap).toFixed(1)}% below target. Add ${inr(Math.abs(b.gapVal))} through SIPs or lump-sum to bring it in line.`
                          : "This category is on target — no action needed."}</div>
                      <SubTargetEditor
                        assetClass={b.name}
                        values={subValues[b.name] ?? {}}
                        subTargets={subTargets[b.name] ?? {}}
                        onChange={(updated) => {
                          setSubTargets((prev) => ({ ...prev, [b.name]: updated }));
                          setSubDirty(true);
                        }}
                      />
                    </td>
                  </tr>,
                );
              }
              return rows;
            })}
          </tbody>
        </table>
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        {subDirty && <span className="text-[11px] text-muted-foreground">Unsaved sub-target changes</span>}
        <Button size="sm" onClick={saveSubTargets} disabled={!subDirty || savingSub}>
          {savingSub ? "Saving…" : "Save sub-targets"}
        </Button>
      </div>
    </Card>
  );
}

const SUB_LABELS: Record<string, string> = {
  stock_in: "Indian Stocks",
  stock_us: "US Stocks",
  mf: "Mutual Funds",
  mutual_fund: "Mutual Funds",
  etf: "ETFs",
  bond: "Bonds",
  fd: "Fixed Deposits",
  crypto: "Crypto",
};

function subLabel(category: string | null | undefined): string {
  const c = (category ?? "").trim();
  if (!c) return "Other";
  return SUB_LABELS[c.toLowerCase()] ?? c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function SubTargetEditor({
  assetClass,
  values,
  subTargets,
  onChange,
}: {
  assetClass: string;
  values: Record<string, number>;
  subTargets: Record<string, number>;
  onChange: (v: Record<string, number>) => void;
}) {
  const subCats = [...new Set([...Object.keys(values), ...Object.keys(subTargets)])];
  const classTotal = Object.values(values).reduce((s, v) => s + v, 0);
  const total = Object.values(subTargets).reduce((s, v) => s + (Number(v) || 0), 0);
  if (subCats.length === 0) return null;
  return (
    <div className="space-y-2" onClick={(e) => e.stopPropagation()}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        Sub-targets within {assetClass} (total: {total}%
        {total > 0 && total !== 100 ? ` — ${total < 100 ? `needs ${100 - total}% more` : `${total - 100}% over`}` : total === 100 ? " ✓" : ""})
      </p>
      {subCats.map((cat) => {
        const actualPct = classTotal > 0 ? ((values[cat] ?? 0) / classTotal) * 100 : 0;
        const tgt = subTargets[cat] ?? 0;
        const onTrack = Math.abs(actualPct - tgt) <= 5;
        return (
          <div key={cat} className="flex flex-wrap items-center gap-3 text-xs">
            <span className="w-32 text-foreground">{cat}</span>
            <span className="w-20 text-muted-foreground">{actualPct.toFixed(1)}% actual</span>
            <input
              type="number"
              min={0}
              max={100}
              value={subTargets[cat] ?? ""}
              onChange={(e) => {
                const n = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                onChange({ ...subTargets, [cat]: n });
              }}
              placeholder="0"
              className="w-16 rounded-md border border-border bg-background px-2 py-1 text-center text-xs text-foreground"
            />
            <span className="text-muted-foreground">% target</span>
            {tgt > 0 && (
              <span className={onTrack ? "text-success" : "text-warning"}>
                {onTrack
                  ? "On track"
                  : actualPct < tgt
                    ? `${(tgt - actualPct).toFixed(1)}% to go`
                    : `${(actualPct - tgt).toFixed(1)}% over`}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
