import { useMemo } from "react";
import { ShieldCheck } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAccounts, useInvestments, useLiabilities } from "@/lib/wealth-api";
import { useTransactions } from "@/lib/money-api";
import { useGoals } from "@/lib/planner-api";
import { useNetWorth } from "@/lib/networth";
import { cn } from "@/lib/utils";

type Line = { label: string; pts: number | null; max: number };

const n = (v: unknown) => {
  const x = Number(v);
  return Number.isFinite(x) ? x : 0;
};

function grade(score: number) {
  if (score >= 80) return { label: "Excellent", color: "#10b981" };
  if (score >= 60) return { label: "Good", color: "#14b8a6" };
  if (score >= 40) return { label: "Fair", color: "#eab308" };
  return { label: "Needs Attention", color: "#f97316" };
}

export function HealthScoreCard({ className }: { className?: string }) {
  const accountsQ = useAccounts();
  const investmentsQ = useInvestments();
  const liabilitiesQ = useLiabilities();
  const txnsQ = useTransactions();
  const goalsQ = useGoals();
  const nw = useNetWorth();

  const { score, lines } = useMemo(() => {
    const txns = (txnsQ.data ?? []) as Array<{ kind: string; amount: number; occurred_on: string }>;
    const now = new Date();
    const monthKey = now.toISOString().slice(0, 7);
    const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10);

    // Savings rate — current month
    let inc = 0, exp = 0, exp3 = 0;
    for (const t of txns) {
      const amt = n(t.amount);
      if (t.occurred_on?.startsWith(monthKey)) {
        if (t.kind === "income") inc += amt;
        else if (t.kind === "expense") exp += amt;
      }
      if (t.kind === "expense" && t.occurred_on >= threeMonthsAgo && !t.occurred_on.startsWith(monthKey)) exp3 += amt;
    }
    const savingsRate = inc > 0 ? ((inc - exp) / inc) * 100 : null;

    // Emergency fund months
    const avgMonthlyExp = exp3 > 0 ? exp3 / 3 : exp;
    const efBalance = (accountsQ.data ?? [])
      .filter((a) => (a as { is_emergency_fund?: boolean }).is_emergency_fund)
      .reduce((s, a) => s + n(a.balance), 0);
    const efMonths = avgMonthlyExp > 0 ? efBalance / avgMonthlyExp : null;

    const highDebt = (liabilitiesQ.data ?? []).filter(
      (l) => String(l.status ?? "active") === "active" && n(l.interest_rate) > 18,
    ).length;
    const hasInv = (investmentsQ.data ?? []).some((i) => String(i.status ?? "active") === "active");
    const goals = goalsQ.data ?? [];
    const goalOnTrack = goals.some((g) => n(g.target_amount) > 0 && n(g.saved_amount) / n(g.target_amount) >= 0.5);

    const out: Line[] = [
      {
        label: efMonths == null ? "Emergency fund — no expense history yet" : `Emergency fund ${efMonths.toFixed(1)} months — target 3`,
        pts: efMonths == null ? null : Math.min(25, (efMonths / 3) * 25),
        max: 25,
      },
      {
        label: savingsRate == null ? "Savings rate — no income this month" : `Savings rate ${savingsRate.toFixed(0)}% — target 20%`,
        pts: savingsRate == null ? null : Math.max(0, Math.min(20, savingsRate)),
        max: 20,
      },
      { label: highDebt === 0 ? "No high-interest debt" : `${highDebt} high-interest loan(s) above 18%`, pts: Math.max(0, 15 - highDebt * 5), max: 15 },
      { label: hasInv ? "Investments tracked" : "No investments tracked", pts: hasInv ? 15 : 0, max: 15 },
      { label: nw.netWorth > 0 ? "Positive net worth" : "Net worth not positive", pts: nw.netWorth > 0 ? 10 : 0, max: 10 },
      { label: goalOnTrack ? "A goal is at least 50% funded" : "No goal at 50% yet", pts: goalOnTrack ? 10 : 0, max: 10 },
      // Insurance isn't loaded on the dashboard — skipped rather than guessed.
      { label: "Insurance cover — not checked here", pts: null, max: 5 },
    ];
    const scored = out.filter((l) => l.pts != null);
    const got = scored.reduce((s, l) => s + (l.pts ?? 0), 0);
    const max = scored.reduce((s, l) => s + l.max, 0);
    return { score: max > 0 ? Math.round((got / max) * 100) : 0, lines: out };
  }, [txnsQ.data, accountsQ.data, liabilitiesQ.data, investmentsQ.data, goalsQ.data, nw.netWorth]);

  const g = grade(score);
  const loading = nw.isLoading || txnsQ.isLoading || goalsQ.isLoading;

  return (
    <Card className={cn("p-6", className)}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">Financial Health</h3>
        </div>
        <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ color: g.color, background: `${g.color}1f` }}>
          {g.label}
        </span>
      </div>

      <div className="mt-4 flex items-center gap-5">
        <div
          className="grid h-24 w-24 shrink-0 place-items-center rounded-full"
          style={{ background: `conic-gradient(${g.color} ${score * 3.6}deg, var(--muted) 0deg)` }}
        >
          <div className="grid h-[80px] w-[80px] place-items-center rounded-full bg-card">
            <div className="text-center">
              <span className="text-2xl font-bold tabular-nums text-foreground">{loading ? "—" : score}</span>
              <span className="text-xs text-muted-foreground">/100</span>
            </div>
          </div>
        </div>
        <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
          {lines.map((l) => {
            const icon = l.pts == null ? "➖" : l.pts >= l.max ? "✅" : l.pts > 0 ? "⚠️" : "❌";
            return (
              <li key={l.label} className="flex gap-1.5 text-muted-foreground">
                <span>{icon}</span>
                <span className="min-w-0 flex-1">{l.label}</span>
                <span className="tabular-nums text-foreground">
                  {l.pts == null ? "—" : `${Math.round(l.pts)}/${l.max}`}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">Recalculates on each visit</p>
    </Card>
  );
}
