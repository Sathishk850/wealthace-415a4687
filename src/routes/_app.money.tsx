import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  TrendingUp,
  TrendingDown,
  ArrowLeftRight,
  LineChart,
  Plus,
  Upload,
  Download,
} from "lucide-react";
import { PageHeader, StatCard } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/money")({
  head: () => ({
    meta: [
      { title: "Money · FinVista" },
      { name: "description", content: "Track cashflow, income, expenses and every transaction." },
    ],
  }),
  component: Money,
});

const tabs = [
  { id: "cashflow", label: "Cashflow", icon: LineChart },
  { id: "income", label: "Income", icon: TrendingUp },
  { id: "expenses", label: "Expenses", icon: TrendingDown },
  { id: "transactions", label: "Transactions", icon: ArrowLeftRight },
];

function Money() {
  const [active, setActive] = useState("cashflow");

  return (
    <>
      <PageHeader
        title="Money"
        description="Cashflow, income, expenses and transactions."
        actions={
          active === "transactions" ? (
            <>
              <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:border-mint/40">
                <Upload className="h-3.5 w-3.5" /> Import
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-surface px-3 py-2 text-xs font-semibold text-foreground hover:border-mint/40">
                <Download className="h-3.5 w-3.5" /> Export
              </button>
              <button className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-mint-foreground">
                <Plus className="h-3.5 w-3.5" /> Add
              </button>
            </>
          ) : (
            <button className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-mint-foreground">
              <Plus className="h-3.5 w-3.5" /> Add
            </button>
          )
        }
      />

      <Tabs value={active} onValueChange={setActive} className="w-full">
        <TabsList className="mb-6 grid w-full grid-cols-4 rounded-xl border border-border bg-surface p-1.5 sm:w-auto sm:grid-cols-none sm:justify-start">
          {tabs.map((t) => (
            <TabsTrigger
              key={t.id}
              value={t.id}
              className="inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground data-[state=active]:bg-mint data-[state=active]:text-mint-foreground sm:text-sm"
            >
              <t.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{t.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="cashflow" className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Total Income" value="₹ 2,85,000" delta="+12% this month" tone="positive" />
            <StatCard label="Total Expenses" value="₹ 1,42,500" delta="-4% this month" tone="negative" />
            <StatCard label="Net Cashflow" value="₹ 1,42,500" delta="₹ 23k vs last month" tone="mint" />
            <StatCard label="Savings Rate" value="50%" delta="On track" tone="mint" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 text-sm font-semibold text-foreground">Income vs Expense</div>
            <div className="h-64 rounded-xl bg-surface/50" />
          </div>
        </TabsContent>

        <TabsContent value="income" className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Salary" value="₹ 2,40,000" tone="default" />
            <StatCard label="Business" value="₹ 35,000" tone="default" />
            <StatCard label="Dividends" value="₹ 4,250" tone="mint" />
            <StatCard label="Other" value="₹ 5,750" tone="default" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 text-sm font-semibold text-foreground">Income Sources</div>
            <div className="h-64 rounded-xl bg-surface/50" />
          </div>
        </TabsContent>

        <TabsContent value="expenses" className="space-y-5">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label="Rent / EMI" value="₹ 45,000" tone="negative" />
            <StatCard label="Food & Dining" value="₹ 18,500" tone="default" />
            <StatCard label="Bills & Utilities" value="₹ 12,400" tone="default" />
            <StatCard label="Travel" value="₹ 8,200" tone="default" />
          </div>
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 text-sm font-semibold text-foreground">Expense Breakdown</div>
            <div className="h-64 rounded-xl bg-surface/50" />
          </div>
        </TabsContent>

        <TabsContent value="transactions" className="space-y-5">
          <div className="overflow-hidden rounded-2xl border border-border bg-card">
            <ul className="divide-y divide-border">
              {transactions.map((r, i) => (
                <li key={i} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-foreground">{r.t}</div>
                    <div className="text-xs text-muted-foreground">
                      {r.d} · <span className="text-mint/80">{r.c}</span>
                    </div>
                  </div>
                  <div className={`shrink-0 text-sm font-semibold ${r.pos ? "text-success" : "text-foreground"}`}>
                    {r.a}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </TabsContent>
      </Tabs>
    </>
  );
}

const transactions = [
  { d: "Today", t: "Salary credit", c: "Income", a: "+₹ 2,40,000", pos: true },
  { d: "Today", t: "Zomato", c: "Food", a: "-₹ 482", pos: false },
  { d: "Yesterday", t: "HDFC SIP - Nifty 50", c: "Investment", a: "-₹ 15,000", pos: false },
  { d: "Yesterday", t: "Electricity bill", c: "Bills", a: "-₹ 2,140", pos: false },
  { d: "2d ago", t: "Dividend - INFY", c: "Income", a: "+₹ 1,250", pos: true },
  { d: "3d ago", t: "Uber", c: "Travel", a: "-₹ 318", pos: false },
];