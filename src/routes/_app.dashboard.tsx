import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Camera,
  PiggyBank,
  Wallet,
  CreditCard,
  Activity,
} from "lucide-react";
import { Section, StatCard } from "@/components/page-header";
import { DashboardHeader } from "@/components/dashboard-header";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard · FinVista" },
      {
        name: "description",
        content:
          "Your complete personal finance dashboard — net worth, cashflow, allocation and goals at a glance.",
      },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  return (
    <>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <DashboardHeader />
        <button className="inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-mint-foreground transition hover:opacity-90">
          <Camera className="h-4 w-4" />
          <span className="hidden sm:inline">Snap net worth</span>
          <span className="sm:hidden">Snap</span>
        </button>
      </div>

      {/* Net worth hero */}
      <div className="mb-8 overflow-hidden rounded-3xl border border-mint/20 bg-gradient-to-br from-surface via-surface to-mint/5 p-6 md:p-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
          <div className="min-w-0">
            <div className="text-[11px] font-semibold uppercase tracking-[0.2em] text-mint">
              Total net worth
            </div>
            <div className="mt-2 font-display text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
              ₹ 48,72,510
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2 py-0.5 font-semibold text-success">
                <ArrowUpRight className="h-3.5 w-3.5" /> +4.2%
              </span>
              <span className="text-muted-foreground">vs last month</span>
            </div>
          </div>
          <div className="hidden shrink-0 rounded-2xl border border-border bg-background/40 px-4 py-3 text-right sm:block">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Health score
            </div>
            <div className="font-display text-3xl font-bold text-mint">82</div>
            <div className="text-[10px] text-muted-foreground">Excellent</div>
          </div>
        </div>

        <div className="mt-6 h-24 rounded-xl bg-[linear-gradient(180deg,color-mix(in_oklab,var(--mint)_25%,transparent),transparent)] [clip-path:polygon(0_70%,8%_60%,18%_65%,28%_45%,40%_55%,52%_30%,64%_38%,76%_18%,86%_28%,100%_10%,100%_100%,0_100%)]" />
      </div>

      <Section title="Snapshot">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          <StatCard label="Assets" value="₹ 62.3L" delta="+₹ 1.8L" tone="positive" />
          <StatCard label="Liabilities" value="₹ 13.6L" delta="-₹ 22K" tone="positive" />
          <StatCard label="Income" value="₹ 2.4L" delta="+8%" tone="mint" />
          <StatCard label="Expenses" value="₹ 87K" delta="+3%" tone="negative" />
          <StatCard label="Cashflow" value="₹ 1.53L" delta="63% saved" tone="positive" />
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-2">
        <Panel title="Asset allocation" icon={Wallet}>
          <div className="space-y-3">
            {[
              { label: "Equity & MF", pct: 42, color: "var(--mint)" },
              { label: "Real estate", pct: 28, color: "var(--accent)" },
              { label: "Debt / FD", pct: 18, color: "var(--chart-3)" },
              { label: "Gold & alt", pct: 8, color: "var(--chart-4)" },
              { label: "Cash", pct: 4, color: "var(--chart-5)" },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex justify-between text-xs">
                  <span className="text-foreground">{row.label}</span>
                  <span className="text-muted-foreground">{row.pct}%</span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${row.pct}%`, background: row.color }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Expense breakdown" icon={CreditCard}>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              ["Rent", "₹ 28K"],
              ["Food", "₹ 14K"],
              ["EMI", "₹ 18K"],
              ["Bills", "₹ 6K"],
              ["Travel", "₹ 9K"],
              ["Other", "₹ 12K"],
            ].map(([k, v]) => (
              <div
                key={k}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
              >
                <span className="text-muted-foreground">{k}</span>
                <span className="font-semibold text-foreground">{v}</span>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Goal overview" icon={PiggyBank}>
          <div className="space-y-4">
            {[
              { name: "Emergency fund", pct: 92, target: "₹ 6L" },
              { name: "Vacation '26", pct: 48, target: "₹ 2.5L" },
              { name: "Home down payment", pct: 31, target: "₹ 25L" },
            ].map((g) => (
              <div key={g.name}>
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-foreground">{g.name}</span>
                  <span className="text-muted-foreground">
                    {g.pct}% of {g.target}
                  </span>
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-mint to-accent"
                    style={{ width: `${g.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Recent activity" icon={Activity}>
          <ul className="divide-y divide-border">
            {[
              { t: "Salary credit", a: "+₹ 2,40,000", d: "Today", pos: true },
              { t: "HDFC SIP - Nifty 50", a: "-₹ 15,000", d: "Yesterday", pos: false },
              { t: "Swiggy", a: "-₹ 642", d: "Yesterday", pos: false },
              { t: "Dividend - INFY", a: "+₹ 1,250", d: "2d ago", pos: true },
            ].map((tx) => (
              <li key={tx.t} className="flex items-center justify-between py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium text-foreground">{tx.t}</div>
                  <div className="text-xs text-muted-foreground">{tx.d}</div>
                </div>
                <div
                  className={`flex items-center gap-1 font-semibold ${tx.pos ? "text-success" : "text-foreground"}`}
                >
                  {tx.pos ? (
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  ) : (
                    <ArrowDownRight className="h-3.5 w-3.5" />
                  )}
                  {tx.a}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="mb-4 flex items-center gap-2">
        <div className="grid h-8 w-8 place-items-center rounded-lg bg-mint/10 text-mint">
          <Icon className="h-4 w-4" />
        </div>
        <h3 className="font-display text-sm font-semibold text-foreground">{title}</h3>
      </div>
      {children}
    </div>
  );
}