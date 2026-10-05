import { createFileRoute, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { fireBudgetAlerts } from "@/lib/budget-alerts";
import { smartXAxisProps } from "@/lib/chart-axis";
import {
  TrendingUp,
  Plus,
  Info,
  Percent,
  Wallet,
  ArrowDownRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
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
  Upload,
  ScanLine,
  CopyPlus,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { TransferDialog } from "@/components/money/TransferDialog";
import { ArrowLeftRight, LayoutList } from "lucide-react";
import { BulkAddSheet } from "@/components/money/BulkAddSheet";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";

import { TextTabs } from "@/components/text-tabs";
import { useTabParam } from "@/lib/use-tab-param";
import { BankStatementImporter } from "@/components/money/bank-statement-importer";
import {
  ExpenseScanDialog,
  type ScanHandoff,
} from "@/components/money/expense-scan-dialog";
import { supabase } from "@/integrations/supabase/client";

/**
 * Store a scanned receipt privately under {user_id}/{expense_id}/{file} and
 * link it to the expense. A failure here never blocks the saved expense.
 */
async function uploadReceipt(expenseId: string, file: File) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const ext = (file.name.split(".").pop() || "bin").toLowerCase().slice(0, 8);
    const path = `${user.id}/${expenseId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from("receipts")
      .upload(path, file, { contentType: file.type || undefined, upsert: false });
    if (error) throw error;
    await supabase
      .from("money_transactions")
      .update({ receipt_path: path } as never)
      .eq("id", expenseId);
  } catch {
    toast.warning("Expense saved, but the receipt image couldn't be attached.");
  }
}
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePaymentAccounts } from "@/lib/payment-accounts-api";
import { keys as moneyKeys } from "@/lib/money-api";
import { PaymentFields } from "@/components/payment/payment-fields";
import { commitStagedPaymentPreferences } from "@/lib/user-payment-prefs-api";
import { toast } from "sonner";
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
import { DatePicker } from "@/components/ui/date-picker";
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
  Budget,
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
      { title: "Money · Wealth Ace" },
      { name: "description", content: "Track cashflow, income, expenses and every transaction." },
    ],
  }),
  component: Money,
});

const tabs = ["Overview", "Income", "Expenses", "Budgets"] as const;
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
    <div className="rounded-2xl border border-border bg-card p-3 sm:p-4">
      <div className="flex items-start gap-2.5 sm:gap-3">
        <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-full sm:h-11 sm:w-11 ${p.bg} ${p.fg}`}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate text-[11px] text-muted-foreground sm:text-xs">{label}</div>
          <div className="mt-0.5 truncate font-display text-base font-bold tracking-tight text-foreground tabular-nums sm:mt-1 sm:text-2xl">
            {value}
          </div>
        </div>
      </div>

      {delta && (
        <div className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[10px] text-muted-foreground sm:mt-2 sm:gap-2 sm:text-[11px]">
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
  const [tab, setTab] = useTabParam<Tab>("Overview", tabs);
  const [importOpen, setImportOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const moneyQc = useQueryClient();
  const locationHash = useRouterState({ select: (st) => st.location.hash });
  useEffect(() => {
    if (locationHash === "import" || locationHash === "#import") setImportOpen(true);
  }, [locationHash]);
  const [monthOffset, setMonthOffset] = useState(0); // 0 = current month

  const categoriesQ = useCategories();
  const transactionsQ = useTransactions();
  const budgetsQ = useBudgets();

  const categories = categoriesQ.data ?? [];
  const transactions = transactionsQ.data ?? [];
  const budgets = budgetsQ.data ?? [];
  const accountsQ = usePaymentAccounts();
  const accounts = accountsQ.data ?? [];
  const [insightAccount, setInsightAccount] = useState<string>("all");
  useEffect(() => { setInsightAccount("all"); }, [monthOffset]);
  const insightTxns = useMemo(
    () => insightAccount === "all"
      ? transactions
      : transactions.filter((t) => t.payment_account_id === insightAccount),
    [transactions, insightAccount]
  );

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
  // Navigator's month as a date range for the Income/Expenses tables
  const navFrom = iso(activeMonth);
  const navTo = iso(new Date(activeMonth.getFullYear(), activeMonth.getMonth() + 1, 0));

  const prevMonth = useMemo(() => {
    const d = new Date(activeMonth);
    d.setMonth(d.getMonth() - 1);
    return d;
  }, [activeMonth]);
  const prevMonthKey = monthKey(prevMonth);
  const prevMonthLabel = formatMonthLabel(prevMonthKey);

  const inMonth = (iso: string, mk: string) => iso.slice(0, 7) === mk.slice(0, 7);
  const txThisMonth = insightTxns.filter((t) => inMonth(t.occurred_on, activeMonthKey));
  const txPrevMonth = insightTxns.filter((t) => inMonth(t.occurred_on, prevMonthKey));

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

  // Monthly average spend across all recorded months
  const avgMonthlySpend = useMemo(() => {
    const months = new Map<string, number>();
    for (const t of insightTxns) {
      if (t.kind !== "expense") continue;
      const k = t.occurred_on.slice(0, 7);
      months.set(k, (months.get(k) ?? 0) + Number(t.amount || 0));
    }
    if (months.size === 0) return 0;
    let total = 0;
    for (const v of months.values()) total += v;
    return total / months.size;
  }, [insightTxns]);

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

  // Fire in-app budget alerts (deduped via localStorage) when budgets cross thresholds
  useEffect(() => {
    if (!budgetRows.length) return;
    void fireBudgetAlerts(
      budgetRows.map((b) => ({
        categoryName: b.name,
        categoryId: b.category_id,
        spent: b.spent,
        limit: b.amount_limit,
        pct: b.pct,
        monthKey: activeMonthKey.slice(0, 7),
      }))
    );
  }, [budgetRows, activeMonthKey]);

  // top-bar "Add" opens contextual dialog
  const [openTx, setOpenTx] = useState<{ open: boolean; editing?: Transaction; defaultKind?: Kind; prefill?: ScanHandoff }>({ open: false });
  const cloneTx = (tx: Transaction) =>
    setOpenTx({
      open: true,
      defaultKind: tx.kind,
      prefill: {
        amount: String(tx.amount),
        date: todayIso(),
        categoryId: tx.category_id ?? "",
        merchant: tx.merchant,
        note: tx.note ?? "",
        paymentMode: tx.payment_mode ?? null,
        paymentAccountId: tx.payment_account_id ?? null,
      } as any,
    });
  const [openBudget, setOpenBudget] = useState<{ open: boolean; editing?: any }>({ open: false });
  const [scanOpen, setScanOpen] = useState(false);

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
              <span className="min-w-[7.5rem] px-1 text-center tabular-nums">{activeMonthLabel}</span>
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
              onClick={() => setScanOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface"
            >
              <ScanLine className="h-3.5 w-3.5" /> Scan
            </button>
            <button
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface"
            >
              <Upload className="h-3.5 w-3.5" /> Import
            </button>
            <button
              onClick={() => setTransferOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface"
            >
              <ArrowLeftRight className="h-3.5 w-3.5" /> Transfer
            </button>
            <button
              onClick={() => setBulkOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-card px-3 py-2 text-xs font-semibold text-foreground hover:bg-surface"
            >
              <LayoutList className="h-3.5 w-3.5" /> Bulk Add
            </button>
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
          {accounts.length > 1 && (
            <div className="flex items-center gap-2 pb-1">
              <span className="shrink-0 text-xs text-muted-foreground">Filter by account:</span>
              <Select value={insightAccount} onValueChange={setInsightAccount}>
                <SelectTrigger className="h-7 w-44 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {/* KPI cards */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            <KpiCard icon={TrendingUp} label="Total Income" value={inr(income)} delta={{ pct: pctDelta(income, prevIncome), label: deltaLabel }} tone="positive" />
            <KpiCard icon={ArrowDownRight} label="Total Expenses" value={inr(expense)} delta={{ pct: pctDelta(expense, prevExpense), label: deltaLabel }} tone="negative" />
            <KpiCard icon={PiggyBank} label="Net Savings" value={inr(savings)} delta={{ pct: pctDelta(savings, prevSavings), label: deltaLabel }} tone="mint" />
            <KpiCard icon={Percent} label="Savings Rate" value={`${savingsRate.toFixed(2)}%`} delta={{ pct: savingsRate - prevSavingsRate, label: deltaLabel }} tone="violet" />
            <KpiCard icon={Wallet} label="Monthly Avg Spend" value={inr(avgMonthlySpend)} tone="violet" />
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
                <div className="h-32 sm:h-40">
                  <ResponsiveContainer>
                    <AreaChart data={trend} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
                      <defs>
                        <linearGradient id="moneyIncomeGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#14D8CF" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#14D8CF" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="moneyExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.35} />
                          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1C3850" vertical={false} />
                      <XAxis dataKey="d" stroke="#6E8294" fontSize={11} tickLine={false} axisLine={false}  {...smartXAxisProps} />
                      <YAxis stroke="#6E8294" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
                      <Tooltip contentStyle={{ background: "#102634", border: "1px solid #1C3850", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => inr(v)} />
                      <Area
                        type="monotone"
                        dataKey="income"
                        stroke="#14D8CF"
                        strokeWidth={2.5}
                        fill="url(#moneyIncomeGradient)"
                        dot={(props: any) => {
                          const { key, ...rest } = props;
                          if (rest.index !== trend.length - 1) return <g key={key} />;
                          return <circle key={key} cx={rest.cx} cy={rest.cy} r={4} fill="#14D8CF" stroke="none" />;
                        }}
                        activeDot={{ r: 5 }}
                      />
                      <Area
                        type="monotone"
                        dataKey="expense"
                        stroke="#3B82F6"
                        strokeWidth={2.5}
                        fill="url(#moneyExpenseGradient)"
                        dot={(props: any) => {
                          const { key, ...rest } = props;
                          if (rest.index !== trend.length - 1) return <g key={key} />;
                          return <circle key={key} cx={rest.cx} cy={rest.cy} r={4} fill="#3B82F6" stroke="none" />;
                        }}
                        activeDot={{ r: 5 }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </ChartCard>

            <ChartCard title="Expense Breakdown" className="lg:col-span-2">
              {expenseCats.length === 0 ? (
                <EmptyState icon={Inbox} title="No expenses yet" description="Your category split will appear here." />
              ) : (
                <>
                  <div className="grid grid-cols-[96px_minmax(0,1fr)] items-center gap-3 sm:gap-4">
                    <div className="relative h-[96px]">
                      <ResponsiveContainer>
                        <PieChart>
                          <Pie data={expenseCats} dataKey="value" nameKey="name" innerRadius={30} outerRadius={46} paddingAngle={2} stroke="none">

                            {expenseCats.map((s) => <Cell key={s.name} fill={s.color} />)}
                          </Pie>
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-[8px] font-semibold uppercase tracking-wide text-muted-foreground">Total</span>
                        <span className="text-[11px] font-bold leading-tight text-foreground tabular-nums">₹{inrCompact(totalExpense)}</span>
                      </div>
                    </div>
                    <ul className="space-y-1.5 text-xs">
                      {expenseCats.slice(0, 7).map((c) => {
                        const pct = totalExpense > 0
                          ? ((c.value / totalExpense) * 100).toFixed(1)
                          : "0.0";
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
                  {expenseCats[0] && (
                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: expenseCats[0].color }} />
                        <div className="min-w-0">
                          <div className="text-[11px] text-muted-foreground">Top Category</div>
                          <div className="truncate text-xs font-semibold text-foreground">{expenseCats[0].name}</div>
                        </div>
                      </div>
                      <div className="shrink-0 text-right text-xs font-semibold text-foreground tabular-nums">
                        ₹{expenseCats[0].value.toLocaleString("en-IN")}
                        <span className="ml-1.5 font-normal text-muted-foreground">
                          ({totalExpense > 0 ? ((expenseCats[0].value / totalExpense) * 100).toFixed(1) : "0.0"}%)
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </ChartCard>
          </div>

          {/* Bottom row */}
          <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">


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

          {/* All transactions */}
          <div className="mt-5">
            <TransactionsTable
              rows={transactions}
              categories={categories}
              onEdit={(tx) => setOpenTx({ open: true, editing: tx })}
              onClone={cloneTx}
            />
          </div>
        </>
      ) : tab === "Income" ? (
        <TransactionsTable
          rows={transactions.filter((t) => t.kind === "income")}
          categories={categories}
          kindFilter="income"
          onEdit={(tx) => setOpenTx({ open: true, editing: tx })}
          onClone={cloneTx}
          overrideFrom={navFrom}
          overrideTo={navTo}
          overrideLabel={activeMonthLabel}
          resetKey={monthOffset}
        />
      ) : tab === "Expenses" ? (
        <TransactionsTable
          rows={transactions.filter((t) => t.kind === "expense")}
          categories={categories}
          kindFilter="expense"
          onEdit={(tx) => setOpenTx({ open: true, editing: tx })}
          onClone={cloneTx}
          overrideFrom={navFrom}
          overrideTo={navTo}
          overrideLabel={activeMonthLabel}
          resetKey={monthOffset}
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
          allBudgets={budgets}
          transactions={transactions}
          onCopiedLastMonth={() => {}}
        />
      )}

      <ExpenseScanDialog
        open={scanOpen}
        onOpenChange={setScanOpen}
        onManual={() => setOpenTx({ open: true, defaultKind: "expense" })}
        onConfirm={(v) => setOpenTx({ open: true, defaultKind: "expense", prefill: v })}
      />
      <TransactionDialog
        open={openTx.open}
        onOpenChange={(o) => setOpenTx((s) => ({ ...s, open: o }))}
        editing={openTx.editing}
        defaultKind={openTx.defaultKind}
        prefill={openTx.prefill}
        categories={categories}
        transactions={transactions}
      />
      <BudgetDialog
        open={openBudget.open}
        onOpenChange={(o) => setOpenBudget((s) => ({ ...s, open: o }))}
        editing={openBudget.editing}
        expenseCategories={categories.filter((c) => c.kind === "expense")}
        activeMonthKey={activeMonthKey}
        transactions={transactions}
      />
      <BankStatementImporter open={importOpen} onOpenChange={setImportOpen} />
      <TransferDialog
        open={transferOpen}
        onOpenChange={setTransferOpen}
        accounts={accounts.filter((a) => a.is_active)}
        onSuccess={() => moneyQc.invalidateQueries({ queryKey: ["money", "transactions"] })}
      />
      <BulkAddSheet
        open={bulkOpen}
        onOpenChange={setBulkOpen}
        categories={categories}
        accounts={accounts.filter((a) => a.is_active)}
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
 * Period filter helpers
 * ========================================================== */
type PeriodKey = "this_month" | "last_month" | "last_3m" | "last_6m" | "ytd" | "all" | "custom";

const PERIOD_OPTIONS: { value: PeriodKey; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3m", label: "Last 3 months" },
  { value: "last_6m", label: "Last 6 months" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
  { value: "custom", label: "Custom range" },
];

function iso(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function periodRange(
  period: PeriodKey,
  from: string,
  to: string
): { from?: string; to?: string } {
  const now = new Date();
  const startOfMonth = (offset: number) => new Date(now.getFullYear(), now.getMonth() + offset, 1);
  switch (period) {
    case "this_month":
      return { from: iso(startOfMonth(0)), to: iso(new Date(now.getFullYear(), now.getMonth() + 1, 0)) };
    case "last_month":
      return { from: iso(startOfMonth(-1)), to: iso(new Date(now.getFullYear(), now.getMonth(), 0)) };
    case "last_3m":
      return { from: iso(startOfMonth(-2)), to: iso(now) };
    case "last_6m":
      return { from: iso(startOfMonth(-5)), to: iso(now) };
    case "ytd":
      return { from: `${now.getFullYear()}-01-01`, to: iso(now) };
    case "custom":
      return { from: from || undefined, to: to || undefined };
    default:
      return {};
  }
}

type TxSortKey = "date_desc" | "date_asc" | "amount_desc" | "amount_asc" | "desc_asc" | "desc_desc" | "account_asc" | "account_desc";

function SortHeader({
  label,
  sortKey,
  onClick,
  asc,
  desc,
  align = "left",
  className = "",
}: {
  label: string;
  sortKey: TxSortKey;
  onClick: (v: TxSortKey) => void;
  asc: TxSortKey;
  desc: TxSortKey;
  align?: "left" | "right";
  className?: string;
}) {
  const active = sortKey === asc || sortKey === desc;
  const dir: "asc" | "desc" = sortKey === asc ? "asc" : "desc";
  const Arrow = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-4 py-2.5 font-medium ${align === "right" ? "text-right" : "text-left"} ${className}`}>
      <button
        onClick={() => onClick(active && dir === "desc" ? asc : desc)}
        className={`inline-flex items-center gap-1 transition-colors ${active ? "text-mint" : "text-muted-foreground hover:text-foreground"}`}
      >
        {label}
        <Arrow className="h-3 w-3" />
      </button>
    </th>
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
  onClone,
  overrideFrom,
  overrideTo,
  overrideLabel,
  resetKey,
}: {
  rows: Transaction[];
  categories: Category[];
  kindFilter?: Kind;
  onEdit: (tx: Transaction) => void;
  onClone: (tx: Transaction) => void;
  overrideFrom?: string;
  overrideTo?: string;
  overrideLabel?: string;
  resetKey?: number;
}) {
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const isMobile = useIsMobile();
  const [q, setQ] = useState("");
  const [catFilter, setCatFilter] = useState<string>("all");
  const [period, setPeriod] = useState<PeriodKey>("this_month");
  const [periodTouched, setPeriodTouched] = useState(false);
  const [from, setFrom] = useState<string>("");
  const [to, setTo] = useState<string>("");
  const [sort, setSort] = useState<TxSortKey>("date_desc");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const pageSize = isMobile ? 5 : 8;

  // Navigator override: applies while the Period dropdown is left at its default
  const useOverride =
    period === "this_month" && !periodTouched && !!overrideFrom && !!overrideTo;

  // Reset to the default period when the month navigator moves
  useEffect(() => {
    setPeriod("this_month");
    setPeriodTouched(false);
    setPage(1);
  }, [resetKey]);

  useEffect(() => { setSelected(new Set()); }, [period, q, catFilter, from, to, resetKey]);
  useEffect(() => { setTagFilter(null); }, [period, q]);

  const range = useMemo(
    () => (useOverride ? { from: overrideFrom, to: overrideTo } : periodRange(period, from, to)),
    [useOverride, overrideFrom, overrideTo, period, from, to]
  );

  const filtered = useMemo(() => {
    let arr = rows;
    if (catFilter !== "all") arr = arr.filter((r) => r.category_id === catFilter);
    if (range.from) arr = arr.filter((r) => r.occurred_on >= range.from!);
    if (range.to) arr = arr.filter((r) => r.occurred_on <= range.to!);
    const term = q.trim().toLowerCase();
    if (term) {
      arr = arr.filter(
        (r) =>
          r.merchant.toLowerCase().includes(term) ||
          (r.note ?? "").toLowerCase().includes(term) ||
          (r.account ?? "").toLowerCase().includes(term)
      );
    }
    if (tagFilter) arr = arr.filter((t) => (t.tags ?? []).includes(tagFilter));
    const sorted = [...arr];
    sorted.sort((a, b) => {
      switch (sort) {
        case "date_asc":
          return a.occurred_on.localeCompare(b.occurred_on);
        case "amount_desc":
          return b.amount - a.amount;
        case "amount_asc":
          return a.amount - b.amount;
        case "desc_asc":
          return a.merchant.localeCompare(b.merchant);
        case "desc_desc":
          return b.merchant.localeCompare(a.merchant);
        case "account_asc":
          return (a.account ?? "").localeCompare(b.account ?? "");
        case "account_desc":
          return (b.account ?? "").localeCompare(a.account ?? "");
        default:
          return b.occurred_on.localeCompare(a.occurred_on);
      }
    });
    return sorted;
  }, [rows, q, catFilter, sort, range, tagFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  const queryClient = useQueryClient();
  const [confirmDel, setConfirmDel] = useState<Transaction | null>(null);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [bulkDesc, setBulkDesc] = useState("");
  const [bulkSaving, setBulkSaving] = useState(false);
  const saveBulkDesc = async () => {
    const ids = [...selected];
    if (!bulkDesc.trim() || ids.length === 0) return;
    setBulkSaving(true);
    const { error } = await supabase.from("money_transactions").update({ merchant: bulkDesc.trim() }).in("id", ids);
    setBulkSaving(false);
    if (error) { toast.error("Failed to update descriptions"); return; }
    queryClient.invalidateQueries({ queryKey: moneyKeys.transactions });
    setSelected(new Set());
    setBulkEditOpen(false);
    setBulkDesc("");
    toast.success(`Updated ${ids.length} transaction${ids.length > 1 ? "s" : ""}`);
  };
  const pendingDeleteRef = useRef<{ tx: Transaction; timeoutId: ReturnType<typeof setTimeout> } | null>(null);

  const commitDelete = useCallback(async (tx: Transaction) => {
    const { error } = await supabase.from("money_transactions").delete().eq("id", tx.id);
    if (error) {
      toast.error("Failed to delete — please try again");
      queryClient.invalidateQueries({ queryKey: moneyKeys.transactions });
    }
  }, [queryClient]);

  const deleteTransaction = useCallback((tx: Transaction) => {
    if (pendingDeleteRef.current) {
      clearTimeout(pendingDeleteRef.current.timeoutId);
      void commitDelete(pendingDeleteRef.current.tx);
      pendingDeleteRef.current = null;
    }
    queryClient.setQueriesData<Transaction[]>(
      { queryKey: moneyKeys.transactions, exact: false },
      (old) => (old ? old.filter((t) => t.id !== tx.id) : []),
    );
    const toastId = toast(
      <div className="flex w-full items-center justify-between gap-3">
        <span className="text-sm">Deleted <strong className="font-medium">{tx.merchant || "transaction"}</strong></span>
        <button
          type="button"
          className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
          onClick={() => {
            if (pendingDeleteRef.current?.tx.id === tx.id) {
              clearTimeout(pendingDeleteRef.current.timeoutId);
              pendingDeleteRef.current = null;
            }
            toast.dismiss(toastId);
            toast.success("Deletion undone");
            queryClient.invalidateQueries({ queryKey: moneyKeys.transactions });
          }}
        >
          Undo
        </button>
      </div>,
      { duration: 5000 },
    );
    const timeoutId = setTimeout(() => {
      pendingDeleteRef.current = null;
      void commitDelete(tx);
    }, 5000);
    pendingDeleteRef.current = { tx, timeoutId };
  }, [commitDelete, queryClient]);

  useEffect(() => {
    return () => {
      if (pendingDeleteRef.current) {
        clearTimeout(pendingDeleteRef.current.timeoutId);
        void commitDelete(pendingDeleteRef.current.tx);
        pendingDeleteRef.current = null;
      }
    };
  }, [commitDelete]);

  const filteredCats = kindFilter ? categories.filter((c) => c.kind === kindFilter) : categories;

  return (
    <div className="rounded-2xl border border-border bg-card">
      <Dialog open={bulkEditOpen} onOpenChange={(v) => { setBulkEditOpen(v); if (!v) setBulkDesc(""); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Edit description for {selected.size} transaction{selected.size > 1 ? "s" : ""}</DialogTitle>
          </DialogHeader>
          <Input autoFocus value={bulkDesc} onChange={(e) => setBulkDesc(e.target.value)} placeholder="New description" maxLength={120}
            onKeyDown={(e) => { if (e.key === "Enter") void saveBulkDesc(); }} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkEditOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveBulkDesc()} disabled={bulkSaving || !bulkDesc.trim()}>{bulkSaving ? "Updating…" : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <div className="space-y-2 border-b border-border p-3">
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-[180px] flex-1">
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Search</div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(1);
                }}
                placeholder="Search merchant, note…"
                className="h-9 pl-8 text-xs"
              />
            </div>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Period</div>
            <Select value={period} onValueChange={(v) => { setPeriod(v as PeriodKey); setPeriodTouched(true); setPage(1); }}>
              <SelectTrigger className="h-9 w-[150px] text-xs">{useOverride && overrideLabel ? overrideLabel : <SelectValue />}</SelectTrigger>
              <SelectContent>
                {PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Category</div>
            <Select value={catFilter} onValueChange={(v) => { setCatFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-[150px] text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {filteredCats.map((c) => (
                  <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {tagFilter && (
            <div className="flex items-center gap-1.5 self-end pb-1">
              <span className="text-xs text-muted-foreground">Tag:</span>
              <button
                type="button"
                onClick={() => { setTagFilter(null); setPage(1); }}
                className="inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary hover:bg-primary/20"
              >
                {tagFilter}
                <X className="h-3 w-3" />
              </button>
            </div>
          )}
        </div>
        {period === "custom" && (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">From</div>
              <DatePicker value={from} onChange={(v) => { setFrom(v); setPage(1); }} placeholder="Start date" className="h-9 w-[150px] text-xs" />
            </div>
            <div>
              <div className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">To</div>
              <DatePicker value={to} onChange={(v) => { setTo(v); setPage(1); }} placeholder="End date" className="h-9 w-[150px] text-xs" />
            </div>
          </div>
        )}
      </div>

      {selected.size > 0 && (() => {
        const selRows = filtered.filter((r) => selected.has(r.id));
        const income = selRows.filter((r) => r.kind === "income").reduce((s, r) => s + r.amount, 0);
        const expense = selRows.filter((r) => r.kind === "expense").reduce((s, r) => s + r.amount, 0);
        const total = kindFilter ? income + expense : income - expense;
        return (
          <div className="hidden flex-wrap items-center justify-between gap-2 border-b border-border bg-primary/5 px-4 py-2 text-xs md:flex">
            <span className="font-medium text-foreground">{selRows.length} selected</span>
            <div className="flex items-center gap-4">
              {income > 0 && <span className="text-success">+{inrCompact(income)}</span>}
              {expense > 0 && <span className="text-destructive">-{inrCompact(expense)}</span>}
              <span className="font-semibold text-mint">{kindFilter ? "Total" : "Net"}: {inrCompact(total)}</span>
              <button type="button" className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
                onClick={() => setBulkEditOpen(true)}>
                Edit description ({selected.size})
              </button>
              <button onClick={() => setSelected(new Set())} className="text-muted-foreground hover:text-foreground">Clear</button>
            </div>
          </div>
        );
      })()}

      {filtered.length === 0 ? (
        <EmptyState icon={Inbox} title="No transactions found" description={rows.length === 0 ? "Click Add to create your first one." : "Try adjusting your filters."} />
      ) : (
        <>
          {/* Mobile: compact rows, no horizontal scrolling */}
          <ul className="divide-y divide-border md:hidden">
            {pageRows.map((r) => {
              const cat = r.category_id ? catMap.get(r.category_id) : null;
              return (
                <li key={r.id} className="flex items-center gap-2 px-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-foreground">{r.merchant || cat?.name || "—"}{r.is_transfer && (
                          <span className={cn("ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium", r.note?.includes("Rate:") ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground")}>
                            {r.note?.includes("Rate:") ? "FX" : "Transfer"}
                          </span>
                        )}</div>
                    <div className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-muted-foreground">
                      <span>{formatDateLabel(r.occurred_on)}</span>
                      {cat && (
                        <>
                          <span>·</span>
                          <span className="inline-flex items-center gap-1 truncate">
                            <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: cat.color }} />
                            {cat.name}
                          </span>
                        </>
                      )}
                    </div>
                    {(r.tags ?? []).length > 0 && (
                      <div className="mt-0.5 flex flex-wrap gap-1">
                        {(r.tags ?? []).map((tag) => (
                          <button
                            key={tag}
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setTagFilter(tag === tagFilter ? null : tag); setPage(1); }}
                            className={cn(
                              "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                              tagFilter === tag
                                ? "border-primary/40 bg-primary/10 text-primary"
                                : "border-border bg-muted/40 text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                            )}
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className={`shrink-0 text-[13px] font-semibold tabular-nums ${r.kind === "income" ? "text-success" : "text-destructive"}`}>
                    {r.kind === "income" ? "+" : "-"}{inrCompact(r.amount)}
                  </div>
                  <div className="flex shrink-0 items-center">
                    <button onClick={() => onEdit(r)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground active:bg-surface" aria-label="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => onClone(r)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground active:bg-surface" aria-label="Clone transaction" title="Clone transaction">
                      <CopyPlus className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setConfirmDel(r)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground active:bg-destructive/15" aria-label="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>

          <div className="hidden md:block">
            <table className="w-full text-sm">
              <thead className="bg-surface/50 text-xs text-muted-foreground">
                <tr>
                  <th className="w-8 px-2 py-2.5">
                    <input
                      type="checkbox"
                      aria-label="Select all on this page"
                      className="h-3.5 w-3.5 accent-primary"
                      checked={pageRows.length > 0 && pageRows.every((r) => selected.has(r.id))}
                      onChange={(e) => {
                        const next = new Set(selected);
                        pageRows.forEach((r) => (e.target.checked ? next.add(r.id) : next.delete(r.id)));
                        setSelected(next);
                      }}
                    />
                  </th>
                  <SortHeader label="Date" sortKey={sort} onClick={setSort} asc="date_asc" desc="date_desc" />
                  <SortHeader label="Merchant" sortKey={sort} onClick={setSort} asc="desc_asc" desc="desc_desc" />
                  <th className="px-4 py-2.5 text-left font-medium">Category</th>
                  <SortHeader label="Account" sortKey={sort} onClick={setSort} asc="account_asc" desc="account_desc" className="hidden lg:table-cell" />
                  <SortHeader label="Amount" sortKey={sort} onClick={setSort} asc="amount_asc" desc="amount_desc" align="right" />
                  <th className="px-4 py-2.5 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {pageRows.map((r) => {
                  const cat = r.category_id ? catMap.get(r.category_id) : null;
                  return (
                    <tr key={r.id} className={selected.has(r.id) ? "bg-primary/5" : "hover:bg-surface/40"}>
                      <td className="w-8 px-2 py-2.5">
                        <input
                          type="checkbox"
                          aria-label={`Select ${r.merchant}`}
                          className="h-3.5 w-3.5 accent-primary"
                          checked={selected.has(r.id)}
                          onChange={(e) => {
                            const next = new Set(selected);
                            if (e.target.checked) next.add(r.id); else next.delete(r.id);
                            setSelected(next);
                          }}
                        />
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted-foreground">{formatDateLabel(r.occurred_on)}</td>
                      <td className="px-4 py-2.5 text-sm font-medium text-foreground">
                        {r.merchant}
                        {r.is_transfer && (
                          <span className={cn("ml-1 rounded-full px-1.5 py-0.5 text-[9px] font-medium", r.note?.includes("Rate:") ? "bg-primary/15 text-primary" : "bg-muted/60 text-muted-foreground")}>
                            {r.note?.includes("Rate:") ? "FX" : "Transfer"}
                          </span>
                        )}
                        {r.note && <div className="text-[11px] text-muted-foreground">{r.note}</div>}
                        {(r.tags ?? []).length > 0 && (
                          <div className="mt-0.5 flex flex-wrap gap-1">
                            {(r.tags ?? []).map((tag) => (
                              <button
                                key={tag}
                                type="button"
                                onClick={(e) => { e.stopPropagation(); setTagFilter(tag === tagFilter ? null : tag); setPage(1); }}
                                className={cn(
                                  "inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium transition-colors",
                                  tagFilter === tag
                                    ? "border-primary/40 bg-primary/10 text-primary"
                                    : "border-border bg-muted/40 text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                                )}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-xs">
                        {cat ? (
                          <span className="inline-flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full" style={{ background: cat.color }} />
                            {cat.name}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="hidden px-4 py-2.5 text-xs text-muted-foreground lg:table-cell">{r.account ?? "—"}</td>
                      <td className={`whitespace-nowrap px-4 py-2.5 text-right text-sm font-semibold tabular-nums ${r.kind === "income" ? "text-success" : "text-destructive"}`}>
                        {r.kind === "income" ? "+" : "-"}{inrCompact(r.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1">
                          <button onClick={() => onEdit(r)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-foreground" aria-label="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => onClone(r)} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-surface hover:text-mint" aria-label="Clone transaction" title="Clone transaction">
                            <CopyPlus className="h-3.5 w-3.5" />
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
              {confirmDel ? `${confirmDel.merchant} · ${inrCompact(confirmDel.amount)} on ${formatDateLabel(confirmDel.occurred_on)}` : ""}. You can undo for 5 seconds.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!confirmDel) return;
                deleteTransaction(confirmDel);
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
  prefill,
  categories,
  transactions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: Transaction;
  defaultKind?: Kind;
  prefill?: ScanHandoff;
  categories: Category[];
  transactions: Transaction[];
}) {
  const [kind, setKind] = useState<Kind>(editing?.kind ?? defaultKind ?? "expense");
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount) : "");
  const [date, setDate] = useState<string>(editing?.occurred_on ?? todayIso());
  const [categoryId, setCategoryId] = useState<string>(editing?.category_id ?? "");
  const [merchant, setMerchant] = useState<string>(editing?.merchant ?? "");
  const [account, setAccount] = useState<string>(editing?.account ?? "");
  const [note, setNote] = useState<string>(editing?.note ?? "");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>(editing?.tags ?? []);
  const [paymentMode, setPaymentMode] = useState<string | null>(editing?.payment_mode ?? null);
  const [paymentAccountId, setPaymentAccountId] = useState<string | null>(editing?.payment_account_id ?? null);
  const [err, setErr] = useState<string | null>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [amountFlash, setAmountFlash] = useState(false);

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
      const scan = !editing ? prefill : undefined;
      setKind(editing?.kind ?? defaultKind ?? "expense");
      setAmount(editing ? String(editing.amount) : scan?.amount ?? "");
      setDate(editing?.occurred_on ?? scan?.date ?? todayIso());
      setCategoryId(editing?.category_id ?? scan?.categoryId ?? "");
      setMerchant(editing?.merchant ?? scan?.merchant ?? "");
      setAccount(editing?.account ?? "");
      setNote(editing?.note ?? scan?.note ?? "");
      setTags(editing?.tags ?? []);
      setTagInput("");
      setPaymentMode(editing?.payment_mode ?? scan?.paymentMode ?? null);
      setPaymentAccountId(editing?.payment_account_id ?? scan?.paymentAccountId ?? null);
      setReceiptFile(scan?.receiptFile ?? null);
      setErr(null);
      setShowNewCat(false);
      setNewCatName("");
    }
    return null;
  }, [open, editing, defaultKind, prefill]);

  const kindCats = categories.filter((c) => c.kind === kind);

  const merchantSuggestions = useMemo(() => {
    if (!merchant.trim() || merchant.trim().length < 2) return [];
    const term = merchant.trim().toLowerCase();
    const seen = new Set<string>();
    const results: string[] = [];
    for (const t of transactions) {
      const m = t.merchant?.trim();
      if (!m || seen.has(m)) continue;
      seen.add(m);
      if (m.toLowerCase().includes(term) && m !== merchant) results.push(m);
      if (results.length >= 5) break;
    }
    return results;
  }, [merchant, transactions]);
  const presets = kind === "expense" ? EXPENSE_PRESETS : INCOME_PRESETS;
  const existingNames = new Set(kindCats.map((c) => c.name.toLowerCase()));
  const missingPresets = presets.filter((p) => !existingNames.has(p.toLowerCase()));

  const submit = async (keepOpen = false) => {
    setErr(null);
    const n = Number(amount);
    if (!merchant.trim()) return setErr("Merchant / source is required.");
    if (!Number.isFinite(n) || n <= 0) return setErr("Enter a valid positive amount.");
    if (!date) return setErr("Pick a date.");
    if (kind === "expense") {
      if (!paymentMode) return setErr("Payment mode is required.");
      if (!paymentAccountId) return setErr("Paid from account is required.");
    }
    let cat = categoryId || null;
    // Only touch money_categories when the user explicitly picked a preset
    // pseudo-option that isn't already the current value. If the transaction
    // is being edited and the category is unchanged, skip entirely — never
    // insert/upsert on a plain edit save.
    const unchanged = editing && cat === (editing.category_id ?? null);
    if (!unchanged && cat && cat.startsWith("preset:")) {
      const name = cat.slice("preset:".length);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");
        // 1) Reuse an existing matching category before attempting insert.
        //    The unique key is (user_id, kind, lower(name)); do a case-insensitive lookup.
        const { data: existing, error: lookupErr } = await supabase
          .from("money_categories")
          .select("id")
          .eq("user_id", user.id)
          .eq("kind", kind)
          .ilike("name", name)
          .maybeSingle();
        if (lookupErr) throw lookupErr;
        if (existing?.id) {
          cat = existing.id;
        } else {
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
          if (error) {
            // 2) Graceful recovery: another tab / race created it in between.
            if ((error as any).code === "23505") {
              const { data: race } = await supabase
                .from("money_categories")
                .select("id")
                .eq("user_id", user.id)
                .eq("kind", kind)
                .ilike("name", name)
                .maybeSingle();
              if (race?.id) cat = race.id;
              else throw error;
            } else {
              throw error;
            }
          } else {
            cat = data!.id;
          }
        }
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
      const saved = await upsert.mutateAsync({
        id: editing?.id,
        kind,
        amount: n,
        occurred_on: date,
        category_id: cat,
        merchant,
        account,
        note,
        tags: tags ?? [],
        payment_mode: kind === "expense" ? paymentMode : null,
        payment_account_id: kind === "expense" ? paymentAccountId : null,
      });
      if (receiptFile && saved?.id) {
        await uploadReceipt(saved.id, receiptFile);
        setReceiptFile(null);
      }
      if (kind === "expense") void commitStagedPaymentPreferences();
      if (keepOpen && !editing) {
        setAmount("");
        setMerchant("");
        setAccount("");
        setNote("");
        setTags([]);
        setTagInput("");
        setCategoryId("");
        setPaymentMode(null);
        setPaymentAccountId(null);
        setErr(null);
      } else {
        onOpenChange(false);
      }
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
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                onBlur={(e) => {
                  const raw = e.target.value.trim();
                  if (!/[+\-*/%]/.test(raw)) return;
                  if (!/^[\d\s+\-*/.()%]+$/.test(raw)) return;
                  try {
                    const withPct = raw
                      .replace(/(\d+(?:\.\d+)?)\s*([+-])\s*(\d+(?:\.\d+)?)%/g, (_, base, op, pct) => `${base}${op}(${base}*${Number(pct) / 100})`)
                      .replace(/(\d+(?:\.\d+)?)%/g, (_, p) => `(${Number(p) / 100})`);
                    // eslint-disable-next-line no-new-func
                    const result = Function('"use strict"; return (' + withPct + ")")();
                    if (typeof result === "number" && Number.isFinite(result) && result > 0) {
                      setAmount(String(Math.round(result * 100) / 100));
                      setAmountFlash(true);
                      setTimeout(() => setAmountFlash(false), 600);
                    }
                  } catch { /* leave raw value */ }
                }}
                placeholder="e.g. 1200+340 or 1200+18%"
                className={amountFlash ? "border-primary transition-colors duration-300" : "transition-colors duration-300"}
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <DatePicker id="date" value={date} onChange={(v) => setDate(v)} />
            </div>
          </div>

          <div>
            <Label htmlFor="merchant">{kind === "income" ? "Source" : "Merchant"}</Label>
            <div className="relative">
              <Input id="merchant" value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder={kind === "income" ? "Employer, client…" : "Zomato, Amazon…"} autoComplete="off" />
              {merchantSuggestions.length > 0 && (
                <ul className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
                  {merchantSuggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        className="w-full px-3 py-2 text-left text-sm text-foreground hover:bg-muted"
                        onMouseDown={(e) => { e.preventDefault(); setMerchant(s); }}
                      >
                        {s}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
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

          {kind === "income" && (
            <div>
              <Label htmlFor="account">Account (optional)</Label>
              <Input id="account" value={account} onChange={(e) => setAccount(e.target.value)} placeholder="HDFC •••• 5678" />
            </div>
          )}
          {kind === "expense" && (
            <PaymentFields
              compact
              value={{ payment_mode: paymentMode, payment_account_id: paymentAccountId }}
              onChange={(v) => {
                setPaymentMode(v.payment_mode);
                setPaymentAccountId(v.payment_account_id);
              }}
            />
          )}
          <div>
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-muted-foreground">Tags</Label>
            <div
              className="flex min-h-[38px] flex-wrap gap-1 rounded-lg border border-border bg-background p-1.5 cursor-text"
              onClick={() => document.getElementById("tag-input")?.focus()}
            >
              {tags.map((t) => (
                <span key={t} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[11px] font-medium">
                  {t}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); setTags((prev) => prev.filter((x) => x !== t)); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                id="tag-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if ((e.key === "Enter" || e.key === ",") && tagInput.trim()) {
                    e.preventDefault();
                    const t = tagInput.trim().replace(/,+$/, "");
                    if (t && !tags.includes(t)) setTags((prev) => [...prev, t]);
                    setTagInput("");
                  }
                  if (e.key === "Backspace" && !tagInput && tags.length) {
                    setTags((prev) => prev.slice(0, -1));
                  }
                }}
                placeholder={tags.length === 0 ? "Type and press Enter to add tags…" : ""}
                className="min-w-[100px] flex-1 bg-transparent text-[11px] outline-none placeholder:text-muted-foreground py-0.5"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">e.g. travel, tax, reimbursable</p>
          </div>
          {err && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{err}</div>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upsert.isPending}>Cancel</Button>
          {!editing && (
            <Button variant="outline" onClick={() => submit(true)} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving…" : "Save & Add"}
            </Button>
          )}
          <Button
            className="bg-mint text-[#04121C] hover:brightness-110"
            onClick={() => submit(false)}
            disabled={upsert.isPending}
          >
            {upsert.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {upsert.isPending ? "Saving…" : "Save"}
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
  activeMonthKey,
  activeMonthLabel,
  totalBudget,
  totalSpent,
  onEdit,
  allBudgets,
  transactions,
  onCopiedLastMonth,
}: {
  rows: BudgetRow[];
  categories: Category[];
  activeMonthKey: string;
  activeMonthLabel: string;
  totalBudget: number;
  totalSpent: number;
  onEdit: (b: BudgetRow) => void;
  allBudgets: Budget[];
  transactions: Transaction[];
  onCopiedLastMonth: () => void;
}) {
  const delMut = useDeleteBudget();
  const upsertBudget = useUpsertBudget();
  const [confirm, setConfirm] = useState<BudgetRow | null>(null);
  const [copying, setCopying] = useState(false);

  // Burn rate: at current pace, projected spend by end of month
  const daysInMonth = new Date(
    parseInt(activeMonthKey.slice(0, 4)),
    parseInt(activeMonthKey.slice(5, 7)),
    0
  ).getDate();
  const today = new Date();
  const daysElapsed = Math.max(1,
    activeMonthKey.slice(0, 7) === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`
      ? today.getDate()
      : daysInMonth
  );

  // Last month's budgets for copy action
  const lastMonthKey = (() => {
    const d = new Date(activeMonthKey);
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  })();
  const lastMonthBudgets = allBudgets.filter(
    (b) => b.period_month.slice(0, 7) === lastMonthKey.slice(0, 7)
  );
  const currentCatIds = new Set(rows.map((r) => r.category_id));

  const handleCopyLastMonth = async () => {
    const toCopy = lastMonthBudgets.filter((b) => !currentCatIds.has(b.category_id));
    if (!toCopy.length) { toast.info("All last month's budgets are already set for this month."); return; }
    setCopying(true);
    try {
      for (const b of toCopy) {
        await upsertBudget.mutateAsync({
          category_id: b.category_id,
          period_month: activeMonthKey,
          amount_limit: b.amount_limit,
        });
      }
      toast.success(`Copied ${toCopy.length} budget${toCopy.length === 1 ? "" : "s"} from last month`);
      onCopiedLastMonth();
    } catch (e: any) {
      toast.error(e.message || "Copy failed");
    } finally {
      setCopying(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard icon={Layers} label={`Budgets · ${activeMonthLabel}`} value={String(rows.length)} tone="violet" />
        <KpiCard icon={Wallet} label="Total Budget" value={inr(totalBudget)} tone="mint" />
        <KpiCard icon={ArrowDownRight} label="Total Spent" value={inr(totalSpent)} tone="negative" />
      </div>

      {/* Mobile quick stats */}
      <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
        <div className="shrink-0 rounded-xl border border-border bg-card px-3 py-2 text-center">
          <div className="text-[10px] text-muted-foreground">Budget</div>
          <div className="text-sm font-bold text-foreground">{inrCompact(totalBudget)}</div>
        </div>
        <div className="shrink-0 rounded-xl border border-border bg-card px-3 py-2 text-center">
          <div className="text-[10px] text-muted-foreground">Spent</div>
          <div className="text-sm font-bold text-foreground">{inrCompact(totalSpent)}</div>
        </div>
        <div className="shrink-0 rounded-xl border border-border bg-card px-3 py-2 text-center">
          <div className="text-[10px] text-muted-foreground">Remaining</div>
          <div className={cn("text-sm font-bold",
            totalBudget - totalSpent >= 0 ? "text-success" : "text-destructive")}>
            {inrCompact(Math.abs(totalBudget - totalSpent))}
          </div>
        </div>
        <div className="shrink-0 rounded-xl border border-border bg-card px-3 py-2 text-center">
          <div className="text-[10px] text-muted-foreground">At Risk</div>
          <div className={cn("text-sm font-bold",
            rows.filter(r => r.status !== "On Track").length > 0 ? "text-warning" : "text-success")}>
            {rows.filter(r => r.status !== "On Track").length}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="text-sm font-semibold text-foreground">Budgets · {activeMonthLabel}</div>
          <div className="flex items-center gap-2">
            {lastMonthBudgets.length > 0 && (
              <button
                onClick={handleCopyLastMonth}
                disabled={copying}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-mint/40 hover:text-mint disabled:opacity-60"
              >
                {copying ? "Copying…" : "Copy from last month"}
              </button>
            )}
            {categories.length === 0 && <div className="text-xs text-muted-foreground">Create an expense category first.</div>}
          </div>
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
                  <th className="px-4 py-2.5 text-right font-medium">Remaining</th>
                  <th className="px-4 py-2.5 text-left font-medium">Progress</th>
                  <th className="px-4 py-2.5 text-right font-medium hidden lg:table-cell">Projected</th>
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
                      <td className={`px-4 py-3 text-right tabular-nums text-xs font-semibold ${b.amount_limit - b.spent >= 0 ? "text-success" : "text-destructive"}`}>
                        {b.amount_limit - b.spent >= 0 ? "+" : ""}₹{Math.abs(b.amount_limit - b.spent).toLocaleString("en-IN")}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-32 overflow-hidden rounded-full bg-surface">
                            <div className="h-full rounded-full" style={{ width: `${Math.min(b.pct, 100)}%`, background: barColor }} />
                          </div>
                          <span className="text-xs tabular-nums text-muted-foreground">{b.pct}%</span>
                          {b.status === "At Risk" && (
                            <span title="Spending is at 80%+ of budget" className="text-amber-400 text-[10px] font-bold">⚠ 80%</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right hidden lg:table-cell">
                        {(() => {
                          const projected = Math.round((b.spent / daysElapsed) * daysInMonth);
                          const overBy = projected - b.amount_limit;
                          const remaining = b.amount_limit - b.spent;
                          const daysLeft = daysInMonth - daysElapsed;
                          const dailyBudgetLeft = daysLeft > 0 ? remaining / daysLeft : 0;

                          if (b.spent === 0) return <span className="text-xs text-muted-foreground">—</span>;

                          return (
                            <div className="text-right">
                              <div className={cn("text-xs font-medium tabular-nums",
                                overBy > 0 ? "text-destructive" : "text-muted-foreground")}>
                                ₹{projected.toLocaleString("en-IN")}
                                {overBy > 0 && (
                                  <span className="ml-1 text-[10px] text-destructive">
                                    (+₹{overBy.toLocaleString("en-IN")} over)
                                  </span>
                                )}
                              </div>
                              {daysLeft > 0 && remaining > 0 && (
                                <div className="text-[10px] text-muted-foreground">
                                  ₹{Math.round(dailyBudgetLeft).toLocaleString("en-IN")}/day left
                                </div>
                              )}
                            </div>
                          );
                        })()}
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

      <BudgetHistoryChart
        transactions={transactions}
        budgets={allBudgets}
        categories={categories}
      />
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
  transactions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing?: BudgetRow;
  expenseCategories: Category[];
  activeMonthKey: string;
  transactions: Transaction[];
}) {
  const [categoryId, setCategoryId] = useState<string>(editing?.category_id ?? "");
  const [month, setMonth] = useState<string>(editing?.period_month?.slice(0, 7) ?? activeMonthKey.slice(0, 7));
  const [amount, setAmount] = useState<string>(editing ? String(editing.amount_limit) : "");
  const [err, setErr] = useState<string | null>(null);
  const [showNewCat, setShowNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState("");

  useMemo(() => {
    if (open) {
      setCategoryId(editing?.category_id ?? "");
      setMonth(editing?.period_month?.slice(0, 7) ?? activeMonthKey.slice(0, 7));
      setAmount(editing ? String(editing.amount_limit) : "");
      setErr(null);
      setShowNewCat(false);
      setNewCatName("");
    }
    return null;
  }, [open, editing, activeMonthKey]);

  // Auto-fill: average actual spend for selected category across last 3 months
  const suggestion = useMemo(() => {
    if (!categoryId || showNewCat) return null;
    const now = new Date();
    const monthlyTotals = [1, 2, 3].map((i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      return transactions
        .filter((t) => t.kind === "expense" && t.category_id === categoryId && t.occurred_on.slice(0, 7) === mk)
        .reduce((s, t) => s + t.amount, 0);
    });
    const nonZero = monthlyTotals.filter((v) => v > 0);
    if (!nonZero.length) return null;
    return Math.round(nonZero.reduce((a, b) => a + b, 0) / nonZero.length);
  }, [categoryId, showNewCat, transactions]);

  const upsert = useUpsertBudget();
  const upsertCat = useUpsertCategory();
  const qc = useQueryClient();

  const addCategory = async () => {
    const name = newCatName.trim();
    if (!name) return setErr("Enter a category name.");
    setErr(null);
    try {
      const user_id = (await supabase.auth.getUser()).data.user?.id;
      if (!user_id) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("money_categories")
        .insert({
          user_id,
          name,
          kind: "expense",
          color: PALETTE[expenseCategories.length % PALETTE.length],
          icon: "Wallet",
        })
        .select("id")
        .single();
      if (error) {
        if (error.code === "23505") throw new Error("A category with this name already exists.");
        throw error;
      }
      void upsertCat;
      qc.invalidateQueries({ queryKey: ["money", "categories"] });
      setCategoryId(data!.id);
      setShowNewCat(false);
      setNewCatName("");
    } catch (e: any) {
      setErr(e.message || "Failed to add category");
    }
  };

  const submit = async (keepOpen = false) => {
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
      if (keepOpen && !editing) {
        setCategoryId("");
        setAmount("");
        setErr(null);
      } else {
        onOpenChange(false);
      }
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
            <div className="flex items-center justify-between">
              <Label>Category</Label>
              <button
                type="button"
                onClick={() => setShowNewCat((v) => !v)}
                className="text-xs font-medium text-[#21DBD2] hover:underline"
              >
                {showNewCat ? "Cancel" : "+ New category"}
              </button>
            </div>
            {showNewCat ? (
              <div className="mt-1 flex gap-2">
                <Input
                  autoFocus
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Groceries"
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCategory(); } }}
                />
                <Button type="button" onClick={addCategory} disabled={!newCatName.trim()}>
                  Add
                </Button>
              </div>
            ) : (
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
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Month</Label>
              <Input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
            </div>
            <div>
              <Label>Limit (₹)</Label>
              <Input inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="10000" />
              {suggestion != null && !editing && (
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">
                    Suggested <span className="font-semibold text-foreground">₹{suggestion.toLocaleString("en-IN")}</span>
                    <span className="text-muted-foreground"> (avg last 3 months)</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setAmount(String(suggestion))}
                    className="rounded-md border border-mint/40 bg-mint/10 px-2 py-0.5 text-[10px] font-semibold text-mint hover:bg-mint/20"
                  >
                    Use
                  </button>
                </div>
              )}
            </div>
          </div>
          {err && <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">{err}</div>}
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upsert.isPending}>Cancel</Button>
          {!editing && (
            <Button variant="outline" onClick={() => submit(true)} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving…" : "Save & Add"}
            </Button>
          )}
          <Button
            className="bg-mint text-[#04121C] hover:brightness-110"
            onClick={() => submit(false)}
            disabled={upsert.isPending}
          >
            {upsert.isPending && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {upsert.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>

      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
 * Budget History Chart — last 6 months budget vs actual
 * ========================================================== */
function BudgetHistoryChart({
  transactions,
  budgets,
  categories,
}: {
  transactions: Transaction[];
  budgets: Budget[];
  categories: Category[];
}) {
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const data = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1);
      const mk = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const label = d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
      const budgeted = budgets
        .filter((b) => b.period_month.slice(0, 7) === mk)
        .reduce((s, b) => s + b.amount_limit, 0);
      const actual = transactions
        .filter((t) => t.kind === "expense" && t.occurred_on.slice(0, 7) === mk)
        .reduce((s, t) => s + t.amount, 0);
      return { label, budgeted, actual };
    });
  }, [transactions, budgets]);

  const hasBudgetData = data.some((d) => d.budgeted > 0);
  if (!hasBudgetData) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-foreground">Budget vs Actual (last 6 months)</div>
          <div className="mt-0.5 text-xs text-muted-foreground">Aggregate across all budgeted categories</div>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-mint/70" />Budget</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-[#EF4444]/70" />Actual</span>
        </div>
      </div>
      <div className="h-44">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -8, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" stroke="#1C3850" vertical={false} />
            <XAxis dataKey="label" stroke="#6E8294" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis stroke="#6E8294" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${Math.round(v / 1000)}k`} />
            <Tooltip
              contentStyle={{ background: "#102634", border: "1px solid #1C3850", borderRadius: 12, fontSize: 12 }}
              formatter={(v: number, name: string) => [inr(v), name === "budgeted" ? "Budget" : "Actual"]}
              labelStyle={{ color: "#9CA3AF" }}
            />
            <Bar dataKey="budgeted" name="budgeted" fill="#22d3ee" fillOpacity={0.5} radius={[4, 4, 0, 0]} />
            <Bar dataKey="actual" name="actual" fill="#EF4444" fillOpacity={0.7} radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}