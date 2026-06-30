import { createFileRoute } from "@tanstack/react-router";
import {
  TrendingUp,
  Plus,
  Info,
  Percent,
  Wallet,
  ArrowDownRight,
  PiggyBank,
  CalendarDays,
  CalendarRange,
  Activity,
  Layers,
  Pencil,
  Trash2,
  Search,
  Loader2,
  Inbox,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TextTabs } from "@/components/text-tabs";
import { supabase } from "@/integrations/supabase/client";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useMemo, useState } from "react";
import { ClearButton } from "@/components/clear-button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Category,
  Kind,
  PALETTE,
  Transaction,
  currentMonthKey,
  formatDateLabel,
  formatMonthLabel,
  inr,
  inrCompact,
  monthKey,
  todayIso,
  useBudgets,
  useCategories,
  useDeleteBudget,
  useDeleteCategory,
  useDeleteTransaction,
  useTransactions,
  useUpsertBudget,
  useUpsertCategory,
  useUpsertTransaction,
} from "@/lib/money-api";

export const Route = createFileRoute("/_app/money")({
  head: () => ({
    meta: [
      { title: "Money · FinTrack" },
      { name: "description", content: "Track cashflow, income, expenses and every transaction." },
    ],
  }),
  component: Money,
});

const tabs = ["Overview", "Income", "Expenses", "Transactions", "Budgets"] as const;
type Tab = (typeof tabs)[number];

function ChartCard({
  title,
  subtitle,
  children,
  className = "",
  action,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-5 ${className}`}>
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <div>
          <div className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
            {title}
            <Info className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          {subtitle && (
            <div className="mt-0.5 text-xs text-muted-foreground">{subtitle}</div>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  delta,
  tone = "mint",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: { pct: number; label: string } | null;
  tone?: "positive" | "negative" | "mint" | "violet";
}) {
  const palette: Record<string, { bg: string; fg: string }> = {
    positive: { bg: "bg-success/15", fg: "text-success" },
    negative: { bg: "bg-destructive/15", fg: "text-destructive" },
    mint: { bg: "bg-mint/15", fg: "text-mint" },
    violet: { bg: "bg-[#A78BFA]/15", fg: "text-[#A78BFA]" },
  };
  const p = palette[tone];
  const up = (delta?.pct ?? 0) >= 0;
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full ${p.bg} ${p.fg}`}>
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 font-display text-2xl font-bold tracking-tight text-foreground">
            {value}
          </div>
        </div>
      </div>
      {delta && (
        <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
          <span>{delta.label}</span>
          <span className={`font-semibold ${up ? "text-success" : "text-destructive"}`}>
            {up ? "↑" : "↓"} {Math.abs(delta.pct).toFixed(1)}%
          </span>
        </div>
      )}
    </div>
  );
}

function Money() {
  const [tab, setTab] = useState<Tab>("Overview");
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month

  const categoriesQ = useCategories();
  const transactionsQ = useTransactions();
  const budgetsQ = useBudgets();

  const categories = categoriesQ.data ?? [];
  const transactions = transactionsQ.data ?? [];
  const budgets = budgetsQ.data ?? [];

  const catMap = useMemo(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories]
  );

  // active month
  const activeMonth = useMemo(() => {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() + monthOffset);
    return d;
  }, [monthOffset]);
  const activeMonthKey = monthKey(activeMonth);
  const activeMonthLabel = formatMonthLabel(activeMonthKey);

  const prevMonth = useMemo(() => {
    const d = new Date(activeMonth);
    d.setMonth(d.getMonth() - 1);
    return d;
  }, [activeMonth]);
  const prevMonthKey = monthKey(prevMonth);
  const prevMonthLabel = formatMonthLabel(prevMonthKey);

  const inMonth = (iso: string, mk: string) => iso.slice(0, 7) === mk.slice(0, 7);
  const txThisMonth = transactions.filter((t) => inMonth(t.occurred_on, activeMonthKey));
  const txPrevMonth = transactions.filter((t) => inMonth(t.occurred_on, prevMonthKey));

  const sum = (arr: Transaction[], k?: Kind) =>
    arr.filter((t) => !k || t.kind === k).reduce((s, t) => s + t.amount, 0);

  const income = sum(txThisMonth, "income");
  const expense = sum(txThisMonth, "expense");
  const savings = income - expense;
  const savingsRate = income > 0 ? (savings / income) * 100 : 0;

  const prevIncome = sum(txPrevMonth, "income");
  const prevExpense = sum(txPrevMonth, "expense");
  const prevSavings = prevIncome - prevExpense;
  const prevSavingsRate = prevIncome > 0 ? (prevSavings / prevIncome) * 100 : 0;

  const pctDelta = (cur: number, prev: number) =>
    prev === 0 ? (cur === 0 ? 0 : 100) : ((cur - prev) / Math.abs(prev)) * 100;

  const deltaLabel = `vs ${prevMonth.toLocaleString("en-IN", { month: "short", year: "numeric" })}`;

  // Trend across active month (weekly buckets)
  const trend = useMemo(() => {
    const days = new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0).getDate();
    const buckets = [7, 14, 21, 28, days];
    return buckets.map((day) => {
      const upto = new Date(activeMonth.getFullYear(), activeMonth.getMonth(), day);
      const list = txThisMonth.filter((t) => new Date(t.occurred_on) <= upto);
      return {
        d: `${String(day).padStart(2, "0")} ${activeMonth.toLocaleString("en-IN", { month: "short" })}`,
        income: sum(list, "income"),
        expense: sum(list, "expense"),
      };
    });
  }, [activeMonth, txThisMonth]);

  // expense by category for active month
  const expenseCats = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();
    for (const t of txThisMonth) {
      if (t.kind !== "expense") continue;
      const c = t.category_id ? catMap.get(t.category_id) : null;
      const name = c?.name ?? "Uncategorized";
      const color = c?.color ?? "#6E8294";
      const cur = map.get(name);
      if (cur) cur.value += t.amount;
      else map.set(name, { name, value: t.amount, color });
    }
    return [...map.values()].sort((a, b) => b.value - a.value);
  }, [txThisMonth, catMap]);
  const totalExpense = expenseCats.reduce((s, c) => s + c.value, 0);

  // monthly summary
  const summary = useMemo(() => {
    const byDay = new Map<string, number>();
    for (const t of txThisMonth) {
      if (t.kind !== "expense") continue;
      byDay.set(t.occurred_on, (byDay.get(t.occurred_on) ?? 0) + t.amount);
    }
    const entries = [...byDay.entries()];
    const hi = entries.sort((a, b) => b[1] - a[1])[0];
    const lo = entries.sort((a, b) => a[1] - b[1])[0];
    const avg = entries.length ? expense / entries.length : 0;
    const largest = expenseCats[0];
    return [
      {
        label: "Highest Expense Day",
        sub: hi ? formatDateLabel(hi[0]) : "—",
        value: hi ? inr(hi[1]) : "—",
        icon: CalendarDays,
        color: "#EF4444",
      },
      {
        label: "Lowest Expense Day",
        sub: lo ? formatDateLabel(lo[0]) : "—",
        value: lo ? inr(lo[1]) : "—",
        icon: CalendarRange,
        color: "#22C55E",
      },
      {
        label: "Average Daily Expense",
        sub: "",
        value: avg ? inr(avg) : "—",
        icon: Activity,
        color: "#A78BFA",
      },
      {
        label: "Largest Category",
        sub: largest?.name ?? "—",
        value: largest ? inr(largest.value) : "—",
        icon: Layers,
        color: "#3B82F6",
      },
    ];
  }, [txThisMonth, expense, expenseCats]);

  // budgets for active month with spent
  const budgetRows = useMemo(() => {
    return budgets
      .filter((b) => b.period_month.slice(0, 7) === activeMonthKey.slice(0, 7))
      .map((b) => {
        const cat = catMap.get(b.category_id);
        const spent = txThisMonth
          .filter((t) => t.kind === "expense" && t.category_id === b.category_id)
          .reduce((s, t) => s + t.amount, 0);
        const pct = b.amount_limit > 0 ? Math.round((spent / b.amount_limit) * 100) : 0;
        const status =
          pct >= 100 ? "Exceeded" : pct >= 80 ? "At Risk" : "On Track";
        return {
          ...b,
          name: cat?.name ?? "Unknown",
          color: cat?.color ?? "#6E8294",
          spent,
          pct,
          status,
        };
      });
  }, [budgets, txThisMonth, catMap, activeMonthKey]);
  const totalBudget = budgetRows.reduce((s, b) => s + b.amount_limit, 0);
  const totalSpent = budgetRows.reduce((s, b) => s + b.spent, 0);

  // top-bar "Add" opens contextual dialog
  const [openTx, setOpenTx] = useState<{ open: boolean; editing?: Transaction; defaultKind?: Kind }>({ open: false });
  const [openBudget, setOpenBudget] = useState<{ open: boolean; editing?: any }>({ open: false });

  const handleAdd = () => {
    if (tab === "Budgets") setOpenBudget({ open: true });
    else if (tab === "Income") setOpenTx({ open: true, defaultKind: "income" });
    else if (tab === "Expenses") setOpenTx({ open: true, defaultKind: "expense" });
    else setOpenTx({ open: true });
  };

  const loading = categoriesQ.isLoading || transactionsQ.isLoading || budgetsQ.isLoading;
  const error = categoriesQ.error || transactionsQ.error || budgetsQ.error;

  return (
    <>
      <PageHeader
        title="Money"
        description="Track your income, expenses, transactions and cash flow."
        actions={
          <>
            <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-card px-1 py-1 text-xs font-semibold text-foreground">
              <button
                onClick={() => setMonthOffset((m) => m - 1)}
                className="grid h-7 w-7 place-items-center rounded-lg hover:bg-surface"
                aria-label="Previous month"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-[110px] text-center">{activeMonthLabel}</span>
              <button
                onClick={() => setMonthOffset((m) => Math.min(0, m + 1))}
                disabled={monthOffset >= 0}
                className="grid h-7 w-7 place-items-center rounded-lg hover:bg-surface disabled:opacity-40"
                aria-label="Next month"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
            <button
              onClick={handleAdd}
              className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-mint-foreground hover:opacity-90"
            >
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          </>
        }
      />

      {/* Sub tabs */}
      <TextTabs
        className="mb-5"
        items={tabs as unknown as readonly string[]}
        value={tab}
        onChange={(v) => setTab(v as Tab)}
      />

      {error && (
        <div className="mb-4 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
          {(error as Error).message}
        </div>
      )}

      {loading ? (
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading…
        </div>
      ) : tab === "Overview" ? (
        <>
          {/* KPI cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard icon={TrendingUp} label="Total Income" value={inr(income)} delta={{ pct: pctDelta(income, prevIncome), label: deltaLabel }} tone="positive" />
            <KpiCard icon={ArrowDownRight} label="Total Expenses" value={inr(expense)} delta={{ pct: pctDelta(expense, prevExpense), label: deltaLabel }} tone="negative" />
            <KpiCard icon={PiggyBank} label="Net Savings" value={inr(savings)} delta={{ pct: pctDelta(savings, prevSavings), label: deltaLabel }} tone="mint" />
            <KpiCard icon={Percent} label="Savings Rate" value={`${savingsRate.toFixed(2)}%`} delta={{ pct: savingsRate - prevSavingsRate, label: deltaLabel }} tone="violet" />
          </div>

          {/* Trend + Breakdown */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-5">
            <ChartCard
              title="Income vs Expense Trend"
              className="lg:col-span-3"
              subtitle={activeMonthLabel}
              action={
                <div className="flex items-center gap-3 text-xs">
                  <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-mint" />Income</span>
                  <span className="flex items-center gap-1.5 text-muted-foreground"><span className="h-2 w-2 rounded-full bg-[#3B82F6]" />Expenses</span>
                </div>
              }
            >
              {txThisMonth.length === 0 ? (
                <EmptyState icon={Inbox} title="No transactions this month" description="Add income or an expense to see your trend." />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer>
                    <LineChart data={trend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1C3850" vertical={false} />
                      <XAxis dataKey="d" stroke="#6E8294" fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke="#6E8294" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                      <Tooltip contentStyle={{ background: "#102634", border: "1px solid #1C3850", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                      <Line type="monotone" dataKey="income" stroke="#14D8CF" strokeWidth={2.5} dot={{ r: 4, fill: "#14D8CF" }} activeDot={{ r: 5 }} />
                      <Line type="monotone" dataKey="expense" stroke="#3B82F6" strokeWidth={2.5} dot={{ r: 4, fill: "#3B82F6" }} activeDot={{ r: 5 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Expense Breakdown" className="lg:col-span-2">
              {expenseCats.length === 0 ? (
                <EmptyState icon={Inbox} title="No expenses yet" description="Your category split will appear here." />
              ) : (
                <>
                  <div className="grid grid-cols-[150px_minmax(0,1fr)] items-center gap-4">
                    <div className="relative h-[150px]">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={expenseCats} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2} stroke="none">
                            {expenseCats.map((s) => <Cell key={s.name} fill={s.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <ul className="space-y-1.5 text-xs">
                      {expenseCats.slice(0, 7).map((c) => {
                        const pct = ((c.value / totalExpense) * 100).toFixed(1);
                        return (
                          <li key={c.name} className="flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                              <span className="truncate text-foreground">{c.name}</span>
                            </div>
                            <div className="shrink-0 text-muted-foreground tabular-nums">
                              <span className="text-foreground">₹{c.value.toLocaleString("en-IN")}</span>
                              <span className="ml-2">{pct}%</span>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                  <div className="mt-3 border-t border-border pt-3">
                    <div className="text-[11px] text-muted-foreground">Total Expenses</div>
                    <div className="mt-0.5 font-display text-lg font-bold text-foreground">₹{totalExpense.toLocaleString("en-IN")}</div>
                  </div>
                </>
              )}
            </ChartCard>
          </div>

          {/* Bottom row */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-3">
            <ChartCard
              title="Recent Transactions"
              action={<button onClick={() => setTab("Transactions")} className="text-xs font-semibold text-mint hover:underline">View All</button>}
            >
              {transactions.length === 0 ? (
                <EmptyState icon={Inbox} title="No transactions" description="Add your first transaction to get started." />
              ) : (
                <ul className="divide-y divide-border">
                  {transactions.slice(0, 5).map((r) => {
                    const cat = r.category_id ? catMap.get(r.category_id) : null;
                    const color = cat?.color ?? (r.kind === "income" ? "#22C55E" : "#6E8294");
                    return (
                      <li key={r.id} className="flex items-center justify-between gap-3 py-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${color}22`, color }}>
                            <Wallet className="h-4 w-4" />
                          </span>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-medium text-foreground">{r.merchant}</div>
                            <div className="truncate text-xs text-muted-foreground">{cat?.name ?? (r.account ?? "—")}</div>
                          </div>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className={`text-sm font-semibold tabular-nums ${r.kind === "income" ? "text-success" : "text-destructive"}`}>
                            {r.kind === "income" ? "+" : "-"}{inrCompact(r.amount)}
                          </div>
                          <div className="text-[11px] text-muted-foreground">{formatDateLabel(r.occurred_on)}</div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </ChartCard>

            <ChartCard
              title={`Budget Status (${activeMonth.toLocaleString("en-IN", { month: "short" })})`}
              action={<button onClick={() => setTab("Budgets")} className="text-xs font-semibold text-mint hover:underline">View All</button>}
            >
              {budgetRows.length === 0 ? (
                <EmptyState icon={Inbox} title="No budgets set" description="Add a budget for this month." />
              ) : (
                <ul className="space-y-3.5">
                  {budgetRows.map((b) => {
                    const tone = b.status === "On Track" ? "text-success" : b.status === "At Risk" ? "text-warning" : "text-destructive";
                    const barColor = b.status === "Exceeded" ? "#EF4444" : b.status === "At Risk" ? "#F59E0B" : b.color;
                    return (
                      <li key={b.id}>
                        <div className="mb-1.5 flex items-center justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2.5">
                            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: `${b.color}22`, color: b.color }}>
                              <Wallet className="h-4 w-4" />
                            </span>
                            <span className="truncate text-sm font-medium text-foreground">{b.name}</span>
                          </div>
                          <div className="shrink-0 text-xs text-muted-foreground tabular-nums">
                            ₹{b.spent.toLocaleString("en-IN")} / ₹{b.amount_limit.toLocaleString("en-IN")}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(b.pct, 100)}%`, background: barColor }} />
                          </div>
                          <span className="w-9 shrink-0 text-right text-xs font-semibold text-foreground tabular-nums">{b.pct}%</span>
                          <span className={`w-16 shrink-0 text-right text-[11px] font-semibold ${tone}`}>{b.status}</span>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
              {budgetRows.length > 0 && (
                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
                  <div>
                    <div className="text-muted-foreground">Total Budget</div>
                    <div className="mt-0.5 font-display text-base font-bold text-foreground">₹{totalBudget.toLocaleString("en-IN")}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-muted-foreground">Total Spent</div>
                    <div className="mt-0.5 font-display text-base font-bold text-foreground">
                      ₹{totalSpent.toLocaleString("en-IN")}{" "}
                      <span className="text-xs font-medium text-muted-foreground">
                        ({totalBudget > 0 ? Math.round((totalSpent / totalBudget) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Monthly Summary">
              <ul className="divide-y divide-border">
                {summary.map((s) => (
                  <li key={s.label} className="flex items-center justify-between gap-3 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg" style={{ background: `${s.color}22`, color: s.color }}>
                        <s.icon className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-foreground">{s.label}</div>
                        {s.sub && <div className="text-[11px] text-muted-foreground">{s.sub}</div>}
                      </div>
                    </div>
                    <div className="shrink-0 font-display text-base font-bold text-foreground tabular-nums">{s.value}</div>
                  </li>
                ))}
              </ul>
            </ChartCard>
          </div>
        </>
      ) : tab === "Transactions" ? (
        <TransactionsTable
          rows={transactions}
          categories={categories}
          onEdit={(tx) => setOpenTx({ open: true, editing: tx })}
        />
      ) : tab === "Income" ? (
        <TransactionsTable
          rows={transactions.filter((t) => t.kind === "income")}
          categories={categories}
          kindFilter="income"
          onEdit={(tx) => setOpenTx({ open: true, editing: tx })}
        />
      ) : tab === "Expenses" ? (
        <TransactionsTable
          rows={transactions.filter((t) => t.kind === "expense")}
          categories={categories}
          kindFilter="expense"
          onEdit={(tx) => setOpenTx({ open: true, editing: tx })}
        />
      ) : (
        <BudgetsView
          rows={budgetRows}
          categories={categories.filter((c) => c.kind === "expense")}
          activeMonthKey={activeMonthKey}
          activeMonthLabel={activeMonthLabel}
          totalBudget={totalBudget}
          totalSpent={totalSpent}
          onEdit={(b) => setOpenBudget({ open: true, editing: b })}
        />
      )}

      <TransactionDialog
        open={openTx.open}
        onOpenChange={(o) => setOpenTx((s) => ({ ...s, open: o }))}
        editing={openTx.editing}
        defaultKind={openTx.defaultKind}
        categories={categories}
      />
      <BudgetDialog
        open={openBudget.open}
        onOpenChange={(o) => setOpenBudget((s) => ({ ...s, open: o }))}
        editing={openBudget.editing}
        expenseCategories={categories.filter((c) => c.kind === "expense")}
        activeMonthKey={activeMonthKey}
      />
    </>
  );
}

/* ============================================================
 * Empty state
 * ========================================================== */
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-surface text-muted-foreground">
        <Icon className="h-5 w-5" />
      </span>
      <div className="mt-1 text-sm font-semibold text-foreground">{title}</div>
      {description && <div className="max-w-xs text-xs text-muted-foreground">{description}</div>}
      {action}
    </div>
  );
}

/* ============================================================
 * Transactions table (used by Transactions/Income/Expenses tabs)
 * ========================================================== */
function TransactionsTable({
  rows,
  categories,
  kindFilter,
  onEdit,
}: {
  rows: Transaction[];
  categories: Category[];
  kindFilter?: Kind;
  onEdit: (tx: Transaction) => void;
}) {
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [sort, setSort] = useState<"date_desc" | "date_asc" | "amount_desc" | "amount_asc">("date_desc");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const filtered = useMemo(() => {
    let arr = rows;
    if (catFilter !== "all") arr = arr.filter((r) => r.category_id === catFilter);
    const term = q.trim().toLowerCase();
    if (term) {
      arr = arr.filter(
        (r) =>
          r.merchant.toLowerCase().includes(term) ||
          (r.note ?? "").toLowerCase().includes(term) ||
          (r.account ?? "").toLowerCase().includes(term)
      );
    }
    const sorted = [...arr];
    sorted.sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return a.occurred_on.localeCompare(b.occurred_on);
        case "amount_desc":
          return b.amount - a.amount;
        case "amount_asc":
          return a.amount - b.amount;
        default:
          return b.occurred_on.localeCompare(a.occurred_on);
      }
    });
    return sorted;
  }, [rows, q, catFilter, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const delMut = useDeleteTransaction();
  const [confirmDel, setConfirmDel] = useState<Transaction | null>(null);

  const filteredCats = kindFilter ? categories.filter((c) => c.kind === kindFilter) : categories;

  return (
    <div className="rounded-2xl border border-border bg-card">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="Search merchant, note, account…"
            className="h-9 pl-8 text-xs"
          />
        </div>
        <Select value={catFilter} onValueChange={(v) => { setCatFilter(v); setPage(1); }}>
          <SelectTrigger className="h-9 w-[170px] text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {filteredCats.map((c) => (
              <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(v) => setSort(v as any)}>
          <SelectTrigger className="h-9 w-[160px] text-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="date_desc">Newest first</SelectItem>
            <SelectItem value="date_asc">Oldest first</SelectItem>
            <SelectItem value="amount_desc">Amount: high → low</SelectItem>
            <SelectItem value="amount_asc">Amount: low → high</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="No transactions found" description={rows.length === 0 ? "Click Add to create your first one." : "Try adjusting your filters."} />
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Date</th>
                  <th className="px-4 py-2.5 text-left font-medium">Merchant</th>
                  <th className="px-4 py-2.5 text-left font-medium">Category</th>
                  <th className="px-4 py-2.5 text-left font-medium">Account</th>
                  <th className="px-4 py-2.5 text-right font-medium">Amount</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map((r) => {
                  const cat = r.category_id ? catMap.get(r.category_id) : null;
                  return (
                    <tr key={r.id} className="hover:bg-surface/40">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">{formatDateLabel(r.occurred_on)}</td>
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {r.merchant}
                        {r.note && <div className="text-[11px] text-muted-foreground">{r.note}</div>}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {cat ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{r.account ?? "—"}</td>
                      <td className={`whitespace-nowrap px-4 py-3 text-right text-sm font-semibold tabular-nums ${r.kind === "income" ? "text-success" : "text-destructive"}`}>
                        {r.kind === "income" ? "+" : "-"}{inrCompact(r.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => onEdit(r)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground" aria-label="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setConfirmDel(r)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive" aria-label="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border p-3 text-xs text-muted-foreground">
            <div>Showing {(safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, filtered.length)} of {filtered.length}</div>
            <div className="flex items-center gap-1">
              <button disabled={safePage <= 1} onClick={() => setPage((p) => p - 1)} className="grid h-7 w-7 place-items-center rounded-md border border-border hover:bg-surface disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2">Page {safePage} of {totalPages}</span>
              <button disabled={safePage >= totalPages} onClick={() => setPage((p) => p + 1)} className="grid h-7 w-7 place-items-center rounded-md border border-border hover:bg-surface disabled:opacity-40">
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}

      <AlertDialog open={!!confirmDel} onOpenChange={(o) => !o && setConfirmDel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this transaction?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDel ? `${confirmDel.merchant} · ${inrCompact(confirmDel.amount)} on ${formatDateLabel(confirmDel.occurred_on)}` : ""}. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirmDel) return;
                await delMut.mutateAsync(confirmDel.id);
                setConfirmDel(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================================================
 * Transaction add/edit dialog (with inline "new category")
 * ========================================================== */
function TransactionDialog({
  open,
  onOpenChange,
  editing,
  defaultKind,
  categories,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Transaction;
  defaultKind?: Kind;
  categories: Category[];
}) {
  const [kind, setKind] = useState<Kind>(editing?.kind ?? defaultKind ?? "expense");
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : "");
  const [date, setDate] = useState<string>(editing?.occurred_on ?? todayIso());
  const [categoryId, setCategoryId] = useState<string>(editing?.category_id ?? "");
  const [merchant, setMerchant] = useState<string>(editing?.merchant ?? "");
  const [account, setAccount] = useState<string>(editing?.account ?? "");
  const [note, setNote] = useState<string>(editing?.note ?? "");
  const [err, setErr] = useState<string | null>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  const upsert = useUpsertTransaction();
  const upsertCat = useUpsertCategory();

  const EXPENSE_PRESETS = [
    "Rent", "EMI", "Shopping", "Food", "Bills", "Medical",
    "Entertainment", "Subscriptions", "Fuel", "Travel", "Other",
  ];
  const INCOME_PRESETS = [
    "Salary", "Business", "Freelance", "Rental",
    "Dividend", "Interest", "Capital Gain", "Other",
  ];

  // reset when opening
  useMemo(() => {
    if (open) {
      setKind(editing?.kind ?? defaultKind ?? "expense");
      setAmount(editing ? String(editing.amount) : "");
      setDate(editing?.occurred_on ?? todayIso());
      setCategoryId(editing?.category_id ?? "");
      setMerchant(editing?.merchant ?? "");
      setAccount(editing?.account ?? "");
      setNote(editing?.note ?? "");
      setErr(null);
      setShowNewCat(false);
      setNewCatName("");
    }
    return null;
  }, [open, editing, defaultKind]);

  const kindCats = categories.filter((c) => c.kind === kind);
  const presets = kind === "expense" ? EXPENSE_PRESETS : INCOME_PRESETS;
  const existingNames = new Set(kindCats.map((c) => c.name.toLowerCase()));
  const missingPresets = presets.filter((p) => !existingNames.has(p.toLowerCase()));

  const submit = async () => {
    setErr(null);
    const n = Number(amount);
    if (!merchant.trim()) return setErr("Merchant / source is required.");
    if (!Number.isFinite(n) || n <= 0) return setErr("Enter a valid positive amount.");
    if (!date) return setErr("Pick a date.");
    let cat = categoryId || null;
    if (cat && cat.startsWith("preset:")) {
      const name = cat.slice("preset:".length);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        const { data, error } = await supabase
          .from("money_categories")
          .insert({
            user_id: user.id,
            name,
            kind,
            color: PALETTE[(categories.length) % PALETTE.length],
            icon: "Wallet",
          })
          .select("id")
          .single();
        if (error) throw error;
        cat = data!.id;
      } catch (e: any) {
        return setErr(e.message || "Failed to create category");
      }
    }
    if (showNewCat) {
      const name = newCatName.trim();
      if (!name) return setErr("New category name is required.");
      // create then re-fetch isn't ideal — but cache invalidates and we'll just leave categoryId null if not selected
      try {
        await upsertCat.mutateAsync({ name, kind, color: PALETTE[(categories.length) % PALETTE.length], icon: "Wallet" });
      } catch (e: any) {
        return setErr(e.message);
      }
    }
    try {
      await upsert.mutateAsync({
        id: editing?.id,
        kind,
        amount: n,
        occurred_on: date,
        category_id: cat,
        merchant,
        account,
        note,
      });
      onOpenChange(false);
    } catch (e: any) {
      setErr(e.message || "Failed to save");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit transaction" : "Add transaction"}</DialogTitle>
          <DialogDescription>Track income or an expense.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setKind("expense")}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${kind === "expense" ? "border-destructive/40 bg-destructive/10 text-destructive" : "border-border text-muted-foreground"}`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setKind("income")}
              className={`rounded-lg border px-3 py-2 text-sm font-semibold ${kind === "income" ? "border-success/40 bg-success/10 text-success" : "border-border text-muted-foreground"}`}
            >
              Income
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="amount">Amount (₹)</Label>
              <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label htmlFor="merchant">{kind === "income" ? "Source" : "Merchant"}</Label>
            <Input id="merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder={kind === "income" ? "Employer, client…" : "Zomato, Amazon…"} />
          </div>

          <div>
            <Label>{kind === "income" ? "Source" : "Category"}</Label>
            {showNewCat ? (
              <div className="flex gap-2">
                <Input value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder={kind === "income" ? "New source name" : "New category name"} />
                <Button type="button" variant="outline" onClick={() => { setShowNewCat(false); setNewCatName(""); }}>Cancel</Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                  <SelectTrigger className="flex-1"><SelectValue placeholder={kind === "income" ? "Choose source" : "Choose category"} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Uncategorized</SelectItem>
                    {kindCats.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                    {missingPresets.map((p) => (
                      <SelectItem key={`preset:${p}`} value={`preset:${p}`}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={() => setShowNewCat(true)}>+ New</Button>
              </div>
            )}
          </div>

          <div>
            <Label htmlFor="account">Account (optional)</Label>
            <Input id="account" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="HDFC •••• 5678" />
          </div>
          <div>
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          {err && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{err}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <ClearButton
            dirty={!!(amount || merchant || account || note || categoryId)}
            disabled={upsert.isPending}
            onClear={() => {
              setAmount("");
              setDate(todayIso());
              setCategoryId("");
              setMerchant("");
              setAccount("");
              setNote("");
              setErr(null);
            }}
          />
          <Button onClick={submit} disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {editing ? "Save changes" : "Add transaction"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
 * Budgets view (table + add/edit/delete)
 * ========================================================== */
type BudgetRow = {
  id: string;
  category_id: string;
  period_month: string;
  amount_limit: number;
  name: string;
  color: string;
  spent: number;
  pct: number;
  status: string;
};

function BudgetsView({
  rows,
  categories,
  activeMonthLabel,
  totalBudget,
  totalSpent,
  onEdit,
}: {
  rows: BudgetRow[];
  categories: Category[];
  activeMonthKey: string;
  activeMonthLabel: string;
  totalBudget: number;
  totalSpent: number;
  onEdit: (b: BudgetRow) => void;
}) {
  const delMut = useDeleteBudget();
  const [confirm, setConfirm] = useState<BudgetRow | null>(null);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={Layers} label={`Budgets · ${activeMonthLabel}`} value={String(rows.length)} tone="violet" />
        <KpiCard icon={Wallet} label="Total Budget" value={inr(totalBudget)} tone="mint" />
        <KpiCard icon={ArrowDownRight} label="Total Spent" value={inr(totalSpent)} tone="negative" />
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-sm font-semibold text-foreground">Budgets · {activeMonthLabel}</div>
          {categories.length === 0 && <div className="text-xs text-muted-foreground">Create an expense category first.</div>}
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Inbox} title="No budgets for this month" description="Click Add to set a monthly limit for a category." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-surface/50 text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Category</th>
                  <th className="px-4 py-2.5 text-right font-medium">Limit</th>
                  <th className="px-4 py-2.5 text-right font-medium">Spent</th>
                  <th className="px-4 py-2.5 text-left font-medium">Progress</th>
                  <th className="px-4 py-2.5 text-right font-medium">Status</th>
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((b) => {
                  const tone = b.status === "On Track" ? "text-success" : b.status === "At Risk" ? "text-warning" : "text-destructive";
                  const barColor = b.status === "Exceeded" ? "#EF4444" : b.status === "At Risk" ? "#F59E0B" : b.color;
                  return (
                    <tr key={b.id}>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ background: b.color }} />
                          {b.name}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">₹{b.amount_limit.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">₹{b.spent.toLocaleString("en-IN")}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-40 overflow-hidden rounded-full bg-surface">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(b.pct, 100)}%`, background: barColor }} />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">{b.pct}%</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 text-right text-xs font-semibold ${tone}`}>{b.status}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => onEdit(b)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground" aria-label="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setConfirm(b)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive" aria-label="Delete">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertDialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this budget?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirm ? `${confirm.name} · ${inr(confirm.amount_limit)} for ${activeMonthLabel}` : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!confirm) return;
                await delMut.mutateAsync(confirm.id);
                setConfirm(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/* ============================================================
 * Budget add/edit dialog
 * ========================================================== */
function BudgetDialog({
  open,
  onOpenChange,
  editing,
  expenseCategories,
  activeMonthKey,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: BudgetRow;
  expenseCategories: Category[];
  activeMonthKey: string;
}) {
  const [categoryId, setCategoryId] = useState<string>(editing?.category_id ?? "");
  const [month, setMonth] = useState<string>(editing?.period_month?.slice(0, 7) ?? activeMonthKey.slice(0, 7));
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount_limit) : "");
  const [err, setErr] = useState<string | null>(null);

  useMemo(() => {
    if (open) {
      setCategoryId(editing?.category_id ?? "");
      setMonth(editing?.period_month?.slice(0, 7) ?? activeMonthKey.slice(0, 7));
      setAmount(editing ? String(editing.amount_limit) : "");
      setErr(null);
    }
    return null;
  }, [open, editing, activeMonthKey]);

  const upsert = useUpsertBudget();

  const submit = async () => {
    setErr(null);
    const n = Number(amount);
    if (!categoryId) return setErr("Select a category.");
    if (!Number.isFinite(n) || n <= 0) return setErr("Enter a valid positive amount.");
    if (!month) return setErr("Pick a month.");
    try {
      await upsert.mutateAsync({
        id: editing?.id,
        category_id: categoryId,
        period_month: `${month}-01`,
        amount_limit: n,
      });
      onOpenChange(false);
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{editing ? "Edit budget" : "Add budget"}</DialogTitle>
          <DialogDescription>Set a monthly spending limit for an expense category.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Category</Label>
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger><SelectValue placeholder="Choose expense category" /></SelectTrigger>
              <SelectContent>
                {expenseCategories.length === 0 ? (
                  <SelectItem value="__none" disabled>No expense categories yet</SelectItem>
                ) : (
                  expenseCategories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div>
              <Label>Limit (₹)</Label>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" />
            </div>
          </div>
          {err && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{err}</div>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <ClearButton
            dirty={!!(categoryId || amount)}
            disabled={upsert.isPending}
            onClear={() => {
              setCategoryId("");
              setAmount("");
              setErr(null);
            }}
          />
          <Button onClick={submit} disabled={upsert.isPending}>
            {upsert.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {editing ? "Save changes" : "Add budget"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}