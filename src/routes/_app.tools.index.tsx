import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useMemo, useState } from "react";
import {
  FileText,
  Calculator,
  Sparkles,
  LayoutGrid,
  Download,
  FileSpreadsheet,
  FileDown,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Activity,
  Wallet,
  Target,
  Shield,
  Loader2,
  AlertCircle,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  useTransactions,
  useCategories,
  useBudgets,
  inr,
  formatDateLabel,
  currentMonthKey,
} from "@/lib/money-api";
import { useGoals, usePlannerSettings } from "@/lib/planner-api";
import { FinCalculators } from "./_app.tools.financial-calculator";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/tools/")({
  head: () => ({
    meta: [
      { title: "Tools · FinVista" },
      { name: "description", content: "Reports, financial calculators and AI insights." },
    ],
  }),
  component: ToolsPage,
});

function ToolsPage() {
  const [tab, setTab] = useState("overview");
  return (
    <>
      <PageHeader
        title="Tools"
        description="Reports, financial calculators and AI-powered insights."
      />
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
          {[
            { v: "overview", l: "Overview", i: LayoutGrid },
            { v: "reports", l: "Reports", i: FileText },
            { v: "calculators", l: "Financial Calculators", i: Calculator },
            { v: "insights", l: "AI Insights", i: Sparkles },
          ].map(({ v, l, i: Icon }) => (
            <TabsTrigger
              key={v}
              value={v}
              className="glass-card flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs data-[state=active]:border-[var(--primary)] data-[state=active]:text-[var(--primary)] data-[state=active]:shadow-[0_0_0_1px_var(--primary)]"
            >
              <Icon className="h-3.5 w-3.5" />
              {l}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview" className="mt-4">
          <OverviewView onPick={setTab} />
        </TabsContent>
        <TabsContent value="reports" className="mt-4">
          <ReportsView />
        </TabsContent>
        <TabsContent value="calculators" className="mt-4">
          <FinCalculators />
        </TabsContent>
        <TabsContent value="insights" className="mt-4">
          <InsightsView />
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ---------------- Overview ---------------- */
function OverviewView({ onPick }: { onPick: (v: string) => void }) {
  const tx = useTransactions();
  const goals = useGoals();
  const items: { v: string; title: string; desc: string; icon: LucideIcon }[] = [
    { v: "reports", title: "Reports", desc: "Net worth, income, cashflow, tax — export to PDF, Excel, CSV", icon: FileText },
    { v: "calculators", title: "Financial Calculators", desc: "SIP, EMI, CAGR, XIRR and more", icon: Calculator },
    { v: "insights", title: "AI Insights", desc: "Spending analysis, savings & investment tips", icon: Sparkles },
  ];
  const totalTx = tx.data?.length ?? 0;
  const totalGoals = goals.data?.length ?? 0;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Transactions" value={String(totalTx)} icon={Activity} />
        <MiniStat label="Active Goals" value={String(totalGoals)} icon={Target} />
        <MiniStat label="Reports Available" value="5" icon={FileText} />
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {items.map(({ v, title, desc, icon: Icon }) => (
          <button
            key={v}
            onClick={() => onPick(v)}
            className="group flex items-start gap-4 rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 text-left transition hover:border-[var(--primary)]/40"
          >
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[var(--primary)]/10 text-[var(--primary)]">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[var(--text-main)]">{title}</div>
              <p className="mt-1 text-xs text-[var(--text-muted)]">{desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function MiniStat({ label, value, icon: Icon }: { label: string; value: string; icon: LucideIcon }) {
  return (
    <Card className="glass-card border-[var(--border)] p-4">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
          <div className="mt-1 text-lg font-semibold text-[var(--text-main)]">{value}</div>
        </div>
        <Icon className="h-5 w-5 text-[var(--primary)]" />
      </div>
    </Card>
  );
}

/* ---------------- Reports ---------------- */
type ReportFmt = "pdf" | "excel" | "csv";

type ReportRow = (string | number)[];
type ReportData = { title: string; columns: string[]; rows: ReportRow[]; summary?: { label: string; value: string }[] };

function ReportsView() {
  const tx = useTransactions();
  const cats = useCategories();
  const goals = useGoals();
  const settings = usePlannerSettings();

  const loading = tx.isLoading || cats.isLoading || goals.isLoading || settings.isLoading;
  const error = tx.error || cats.error || goals.error || settings.error;

  const reports = useMemo(() => {
    const transactions = tx.data ?? [];
    const categories = cats.data ?? [];
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const income = transactions.filter((t) => t.kind === "income");
    const expense = transactions.filter((t) => t.kind === "expense");
    const sum = (arr: typeof transactions) => arr.reduce((s, t) => s + Number(t.amount), 0);
    const totalIncome = sum(income);
    const totalExpense = sum(expense);
    const savings = totalIncome - totalExpense;
    const goalsList = goals.data ?? [];
    const totalSaved = goalsList.reduce((s, g) => s + Number(g.saved_amount), 0);
    const totalTarget = goalsList.reduce((s, g) => s + Number(g.target_amount), 0);

    const netWorth: ReportData = {
      title: "Net Worth Report",
      columns: ["Component", "Amount (₹)"],
      rows: [
        ["Cash Savings (Income - Expense)", Math.round(savings)],
        ["Goal Savings", Math.round(totalSaved)],
        ["Planner Corpus", Math.round(settings.data?.current_corpus ?? 0)],
      ],
      summary: [
        { label: "Estimated Net Worth", value: inr(savings + totalSaved + (settings.data?.current_corpus ?? 0)) },
      ],
    };

    const incomeExpense: ReportData = {
      title: "Income & Expense Report",
      columns: ["Date", "Kind", "Category", "Merchant", "Amount (₹)"],
      rows: transactions.map((t) => [
        t.occurred_on,
        t.kind,
        catMap.get(t.category_id ?? "")?.name ?? "Uncategorised",
        t.merchant,
        Number(t.amount),
      ]),
      summary: [
        { label: "Total Income", value: inr(totalIncome) },
        { label: "Total Expense", value: inr(totalExpense) },
        { label: "Net", value: inr(savings) },
      ],
    };

    // monthly cashflow
    const byMonth = new Map<string, { inc: number; exp: number }>();
    for (const t of transactions) {
      const m = t.occurred_on.slice(0, 7);
      const e = byMonth.get(m) ?? { inc: 0, exp: 0 };
      if (t.kind === "income") e.inc += Number(t.amount);
      else e.exp += Number(t.amount);
      byMonth.set(m, e);
    }
    const cashflow: ReportData = {
      title: "Cash Flow Report",
      columns: ["Month", "Income (₹)", "Expense (₹)", "Net (₹)"],
      rows: [...byMonth.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([m, v]) => [m, Math.round(v.inc), Math.round(v.exp), Math.round(v.inc - v.exp)]),
    };

    const investments: ReportData = {
      title: "Investments Report",
      columns: ["Goal", "Type", "Target (₹)", "Saved (₹)", "Monthly SIP (₹)", "Target Date"],
      rows: goalsList.map((g) => [
        g.name,
        g.goal_type,
        Math.round(Number(g.target_amount)),
        Math.round(Number(g.saved_amount)),
        Math.round(Number(g.monthly_contribution)),
        g.target_date ?? "—",
      ]),
      summary: [
        { label: "Total Target", value: inr(totalTarget) },
        { label: "Total Saved", value: inr(totalSaved) },
        { label: "Progress", value: totalTarget > 0 ? `${Math.round((totalSaved / totalTarget) * 100)}%` : "—" },
      ],
    };

    // simple tax estimate (old regime slab, very rough)
    const taxable = Math.max(0, totalIncome - 50000);
    const slabTax = estimateTax(taxable);
    const tax: ReportData = {
      title: "Tax Report (Estimated)",
      columns: ["Component", "Amount (₹)"],
      rows: [
        ["Gross Income", Math.round(totalIncome)],
        ["Standard Deduction", 50000],
        ["Taxable Income", Math.round(taxable)],
        ["Estimated Tax (Old Regime)", Math.round(slabTax)],
      ],
      summary: [{ label: "Estimated Tax", value: inr(slabTax) }],
    };

    return [netWorth, incomeExpense, cashflow, investments, tax];
  }, [tx.data, cats.data, goals.data, settings.data]);

  if (loading)
    return (
      <Card className="glass-card flex items-center justify-center border-[var(--border)] p-10">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
      </Card>
    );

  if (error)
    return (
      <Card className="glass-card border-[var(--border)] p-6">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> Failed to load report data.
        </div>
      </Card>
    );

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {reports.map((r) => (
        <ReportCard key={r.title} report={r} />
      ))}
    </div>
  );
}

function estimateTax(income: number) {
  let tax = 0;
  const slabs: [number, number][] = [
    [250000, 0],
    [250000, 0.05],
    [500000, 0.2],
    [Infinity, 0.3],
  ];
  let remaining = income;
  for (const [size, rate] of slabs) {
    const take = Math.min(remaining, size);
    tax += take * rate;
    remaining -= take;
    if (remaining <= 0) break;
  }
  return tax;
}

function ReportCard({ report }: { report: ReportData }) {
  const exportReport = (fmt: ReportFmt) => {
    try {
      const name = report.title.replace(/\s+/g, "_");
      if (fmt === "csv") {
        const csv = [report.columns, ...report.rows]
          .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(","))
          .join("\n");
        downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${name}.csv`);
      } else if (fmt === "excel") {
        const ws = XLSX.utils.aoa_to_sheet([report.columns, ...report.rows]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Report");
        XLSX.writeFile(wb, `${name}.xlsx`);
      } else {
        const doc = new jsPDF();
        doc.setFontSize(14);
        doc.text(report.title, 14, 16);
        doc.setFontSize(10);
        doc.text(`Generated: ${formatDateLabel(new Date().toISOString().slice(0, 10))}`, 14, 22);
        autoTable(doc, {
          head: [report.columns],
          body: report.rows.map((r) => r.map((c) => String(c))),
          startY: 28,
          styles: { fontSize: 9 },
          headStyles: { fillColor: [0, 206, 177] },
        });
        if (report.summary?.length) {
          const y = (doc as any).lastAutoTable.finalY + 8;
          doc.setFontSize(10);
          report.summary.forEach((s, i) => doc.text(`${s.label}: ${s.value}`, 14, y + i * 6));
        }
        doc.save(`${name}.pdf`);
      }
      toast.success(`${report.title} exported`);
    } catch (e: any) {
      toast.error(e?.message || "Export failed");
    }
  };
  return (
    <Card className="glass-card border-[var(--border)] p-5">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-main)]">{report.title}</h3>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {report.rows.length} {report.rows.length === 1 ? "row" : "rows"}
          </p>
        </div>
        <FileText className="h-4 w-4 text-[var(--primary)]" />
      </div>
      {report.summary && report.summary.length > 0 && (
        <div className="mb-3 grid gap-2 sm:grid-cols-2">
          {report.summary.map((s) => (
            <div key={s.label} className="rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/30 p-2">
              <div className="text-[10px] uppercase tracking-wide text-[var(--text-muted)]">{s.label}</div>
              <div className="text-sm font-semibold text-[var(--text-main)]">{s.value}</div>
            </div>
          ))}
        </div>
      )}
      {report.rows.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--border)] p-4 text-center text-xs text-[var(--text-muted)]">
          No data yet. Add transactions or goals to populate this report.
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportReport("pdf")}>
            <FileDown className="h-3.5 w-3.5" /> PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportReport("excel")}>
            <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
          </Button>
          <Button size="sm" variant="outline" className="gap-1.5" onClick={() => exportReport("csv")}>
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        </div>
      )}
    </Card>
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

/* ---------------- AI Insights ---------------- */
function InsightsView() {
  const tx = useTransactions();
  const cats = useCategories();
  const budgets = useBudgets();
  const goals = useGoals();
  const settings = usePlannerSettings();

  const loading = tx.isLoading || cats.isLoading || budgets.isLoading || goals.isLoading || settings.isLoading;
  const error = tx.error || cats.error || budgets.error || goals.error || settings.error;

  const insights = useMemo(() => buildInsights({
    transactions: tx.data ?? [],
    categories: cats.data ?? [],
    budgets: budgets.data ?? [],
    goals: goals.data ?? [],
    settings: settings.data,
  }), [tx.data, cats.data, budgets.data, goals.data, settings.data]);

  if (loading)
    return (
      <Card className="glass-card flex items-center justify-center border-[var(--border)] p-10">
        <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
      </Card>
    );
  if (error)
    return (
      <Card className="glass-card border-[var(--border)] p-6">
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" /> Failed to compute insights.
        </div>
      </Card>
    );

  if (!insights.hasData) {
    return (
      <Card className="glass-card border-[var(--border)] p-8 text-center">
        <Sparkles className="mx-auto h-8 w-8 text-[var(--primary)]" />
        <h3 className="mt-3 text-sm font-semibold text-[var(--text-main)]">No data to analyse yet</h3>
        <p className="mt-1 text-xs text-[var(--text-muted)]">
          Add transactions, budgets or goals to unlock personalised insights.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        <ScoreCard label="Financial Health Score" value={insights.healthScore} icon={Shield} />
        <ScoreCard label="Savings Rate" value={insights.savingsRate} suffix="%" icon={PiggyBank} />
        <ScoreCard label="Portfolio Health" value={insights.portfolioHealth} icon={Activity} />
      </div>

      <InsightSection title="Spending Analysis" icon={TrendingDown} items={insights.spending} />
      <InsightSection title="Saving Suggestions" icon={PiggyBank} items={insights.savings} />
      <InsightSection title="Investment Insights" icon={TrendingUp} items={insights.investments} />
      <InsightSection title="Personalised Recommendations" icon={Lightbulb} items={insights.recommendations} />
    </div>
  );
}

function ScoreCard({ label, value, suffix, icon: Icon }: { label: string; value: number; suffix?: string; icon: LucideIcon }) {
  const tone = value >= 70 ? "text-[var(--primary)]" : value >= 40 ? "text-amber-400" : "text-destructive";
  return (
    <Card className="glass-card border-[var(--border)] p-4">
      <div className="flex items-center justify-between">
        <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{label}</div>
        <Icon className="h-4 w-4 text-[var(--primary)]" />
      </div>
      <div className={`mt-2 text-2xl font-semibold ${tone}`}>
        {value}
        {suffix ?? ""}
      </div>
      <Progress value={Math.max(0, Math.min(100, value))} className="mt-2 h-1.5" />
    </Card>
  );
}

function InsightSection({
  title,
  icon: Icon,
  items,
}: {
  title: string;
  icon: LucideIcon;
  items: { title: string; detail: string; tone?: "good" | "warn" | "bad" }[];
}) {
  return (
    <Card className="glass-card border-[var(--border)] p-5">
      <div className="mb-3 flex items-center gap-2">
        <Icon className="h-4 w-4 text-[var(--primary)]" />
        <h3 className="text-sm font-semibold text-[var(--text-main)]">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-xs text-[var(--text-muted)]">Nothing notable here. Keep going!</p>
      ) : (
        <ul className="space-y-2">
          {items.map((it, i) => (
            <li
              key={i}
              className="flex items-start gap-3 rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/30 p-3"
            >
              <Badge
                variant="outline"
                className={
                  it.tone === "good"
                    ? "border-[var(--primary)]/40 text-[var(--primary)]"
                    : it.tone === "bad"
                    ? "border-destructive/40 text-destructive"
                    : "border-amber-400/40 text-amber-400"
                }
              >
                {it.tone === "good" ? "Good" : it.tone === "bad" ? "Alert" : "Tip"}
              </Badge>
              <div className="min-w-0">
                <div className="text-sm font-medium text-[var(--text-main)]">{it.title}</div>
                <p className="mt-0.5 text-xs text-[var(--text-muted)]">{it.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

type InsightItem = { title: string; detail: string; tone?: "good" | "warn" | "bad" };

function buildInsights(d: {
  transactions: any[];
  categories: any[];
  budgets: any[];
  goals: any[];
  settings: any;
}) {
  const { transactions, categories, budgets, goals, settings } = d;
  const hasData = transactions.length > 0 || goals.length > 0 || budgets.length > 0;

  const income = transactions.filter((t) => t.kind === "income").reduce((s, t) => s + Number(t.amount), 0);
  const expense = transactions.filter((t) => t.kind === "expense").reduce((s, t) => s + Number(t.amount), 0);
  const savingsRate = income > 0 ? Math.round(((income - expense) / income) * 100) : 0;

  // category spending
  const catMap = new Map(categories.map((c) => [c.id, c]));
  const byCat = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind !== "expense") continue;
    const key = catMap.get(t.category_id)?.name ?? "Uncategorised";
    byCat.set(key, (byCat.get(key) ?? 0) + Number(t.amount));
  }
  const topCats = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);

  // budget breaches
  const month = currentMonthKey();
  const monthExp = new Map<string, number>();
  for (const t of transactions) {
    if (t.kind !== "expense") continue;
    if (t.occurred_on.slice(0, 7) !== month.slice(0, 7)) continue;
    monthExp.set(t.category_id ?? "", (monthExp.get(t.category_id ?? "") ?? 0) + Number(t.amount));
  }
  const budgetBreaches: InsightItem[] = [];
  for (const b of budgets) {
    if (b.period_month.slice(0, 7) !== month.slice(0, 7)) continue;
    const spent = monthExp.get(b.category_id) ?? 0;
    const limit = Number(b.amount_limit);
    const cat = catMap.get(b.category_id)?.name ?? "Category";
    if (spent > limit) {
      budgetBreaches.push({
        title: `${cat} budget exceeded`,
        detail: `Spent ${inr(spent)} of ${inr(limit)} this month.`,
        tone: "bad",
      });
    } else if (spent / limit > 0.8) {
      budgetBreaches.push({
        title: `${cat} nearing budget`,
        detail: `${Math.round((spent / limit) * 100)}% used. ${inr(limit - spent)} remaining.`,
        tone: "warn",
      });
    }
  }

  const spending: InsightItem[] = [];
  if (topCats.length) {
    spending.push({
      title: `Top expense: ${topCats[0][0]}`,
      detail: `${inr(topCats[0][1])} across all time. Consider if it aligns with your goals.`,
      tone: "warn",
    });
  }
  if (topCats.length > 1) {
    const total = [...byCat.values()].reduce((s, n) => s + n, 0);
    const share = total > 0 ? Math.round((topCats[0][1] / total) * 100) : 0;
    spending.push({
      title: `${share}% of spend concentrated`,
      detail: `Your top category accounts for ${share}% of expenses. Diversifying spend can free cash for investing.`,
    });
  }
  spending.push(...budgetBreaches);

  const savings: InsightItem[] = [];
  if (income > 0) {
    if (savingsRate < 20)
      savings.push({
        title: "Boost your savings rate",
        detail: `You're saving ${savingsRate}% of income. Aim for at least 20% — try trimming the top expense category.`,
        tone: "bad",
      });
    else if (savingsRate < 40)
      savings.push({
        title: "Solid savings rate",
        detail: `${savingsRate}% saved. Push toward 40% to accelerate wealth building.`,
        tone: "warn",
      });
    else
      savings.push({
        title: "Excellent savings rate",
        detail: `${savingsRate}% saved — keep deploying surplus into investments.`,
        tone: "good",
      });
  }
  const emergency = goals.find((g) => g.goal_type === "emergency_fund");
  if (!emergency) {
    savings.push({
      title: "Set up an Emergency Fund",
      detail: "Aim for 6× monthly expenses parked in liquid funds before aggressive investing.",
      tone: "warn",
    });
  } else if (Number(emergency.saved_amount) < Number(emergency.target_amount)) {
    const pct = Math.round((Number(emergency.saved_amount) / Math.max(1, Number(emergency.target_amount))) * 100);
    savings.push({
      title: `Emergency fund ${pct}% funded`,
      detail: `Continue contributing ${inr(Number(emergency.monthly_contribution))}/month to fully fund it.`,
    });
  }

  const investments: InsightItem[] = [];
  const monthlySIP = Number(settings?.monthly_sip ?? 0);
  if (monthlySIP === 0) {
    investments.push({
      title: "Start a monthly SIP",
      detail: "Even ₹5,000/month at 12% can grow to ~₹11.5 L in 10 years. Set this up in Planner → Retirement.",
      tone: "warn",
    });
  } else {
    investments.push({
      title: `Monthly SIP: ${inr(monthlySIP)}`,
      detail: "Consider increasing SIP by 10% each year to beat inflation.",
      tone: "good",
    });
  }
  if (goals.length > 0) {
    const lagging = goals.filter((g) => {
      const pct = Number(g.target_amount) > 0 ? Number(g.saved_amount) / Number(g.target_amount) : 0;
      return pct < 0.25;
    });
    if (lagging.length) {
      investments.push({
        title: `${lagging.length} goal${lagging.length > 1 ? "s" : ""} under 25% funded`,
        detail: "Review monthly contributions or extend target dates to stay on track.",
        tone: "warn",
      });
    }
  }

  const recommendations: InsightItem[] = [];
  if (savingsRate < 20)
    recommendations.push({
      title: "Build a budget",
      detail: "Create monthly limits for your top 3 expense categories to lift savings above 20%.",
    });
  if (!settings || Number(settings.current_corpus) === 0)
    recommendations.push({
      title: "Update retirement assumptions",
      detail: "Set current corpus and SIP in Planner so projections reflect reality.",
    });
  if (goals.length === 0)
    recommendations.push({
      title: "Create your first goal",
      detail: "Define a target (vacation, house, education) to give every rupee a job.",
    });
  if (income > 0 && expense / income > 0.9)
    recommendations.push({
      title: "Expenses near income ceiling",
      detail: "Over 90% of income is spent. Review subscriptions and discretionary categories.",
      tone: "bad",
    });

  // scores
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        savingsRate * 0.5 +
          (goals.length ? 20 : 0) +
          (monthlySIP > 0 ? 20 : 0) +
          (emergency ? 10 : 0)
      )
    )
  );
  const portfolioHealth = Math.max(
    0,
    Math.min(
      100,
      Math.round(
        (goals.length ? 30 : 0) +
          (monthlySIP > 0 ? 30 : 0) +
          (Number(settings?.current_corpus ?? 0) > 0 ? 25 : 0) +
          (emergency ? 15 : 0)
      )
    )
  );

  return {
    hasData,
    savingsRate: Math.max(0, Math.min(100, savingsRate)),
    healthScore,
    portfolioHealth,
    spending,
    savings,
    investments,
    recommendations,
  };
}

// keep imports used
void Wallet;
