import { createFileRoute } from "@tanstack/react-router";
import * as React from "react";
import { useMemo, useState } from "react";
import {
  FileText,
  Bell,
  Calculator,
  Sparkles,
  TrendingUp,
  Landmark,
  PiggyBank,
  LineChart,
  Target,
  Wallet,
  Banknote,
  Building2,
  Coins,
  Percent,
  ArrowDownUp,
  CalendarClock,
  type LucideIcon,
} from "lucide-react";
import { PageHeader, ModuleCard } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/_app/tools")({
  head: () => ({
    meta: [
      { title: "Tools · FinVista" },
      { name: "description", content: "Reports, reminders, financial calculators and AI insights." },
    ],
  }),
  component: Tools,
});

function Tools() {
  return (
    <>
      <PageHeader
        title="Tools"
        description="Reports, reminders, financial calculators and AI insights."
      />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ModuleCard title="Reports" description="All modules · export & import" icon={FileText} />
        <ModuleCard title="Reminders" description="SIP, EMI, loan, credit card, subscriptions" icon={Bell} />
        <ModuleCard title="Fin Calculators" description="12 calculators for every plan" icon={Calculator} />
        <ModuleCard title="AI Insights" description="Personalised tips powered by AI" icon={Sparkles} />
      </div>

      <section className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-[var(--text-main)]">Financial Calculators</h2>
            <p className="text-sm text-[var(--text-muted)]">
              Plan investments, loans, retirement and more.
            </p>
          </div>
        </div>
        <FinCalculators />
      </section>
    </>
  );
}

/* ---------------- Calculators ---------------- */

const fmt = (n: number) =>
  isFinite(n)
    ? n.toLocaleString("en-IN", { maximumFractionDigits: 0, style: "currency", currency: "INR" })
    : "—";
const fmtN = (n: number, d = 2) =>
  isFinite(n) ? n.toLocaleString("en-IN", { maximumFractionDigits: d }) : "—";

type CalcDef = {
  id: string;
  title: string;
  desc: string;
  icon: LucideIcon;
  render: () => React.ReactNode;
};

function FinCalculators() {
  const calcs: CalcDef[] = [
    { id: "sip", title: "SIP Calculator", desc: "Monthly investment growth", icon: TrendingUp, render: () => <SIPCalc /> },
    { id: "emi", title: "EMI Calculator", desc: "Loan EMI & interest", icon: Landmark, render: () => <EMICalc /> },
    { id: "inflation", title: "Inflation Calculator", desc: "Future value of money", icon: ArrowDownUp, render: () => <InflationCalc /> },
    { id: "lumpsum", title: "Lumpsum Calculator", desc: "One-time investment growth", icon: PiggyBank, render: () => <LumpsumCalc /> },
    { id: "cagr", title: "CAGR Calculator", desc: "Annual growth rate", icon: LineChart, render: () => <CAGRCalc /> },
    { id: "swp", title: "SWP Calculator", desc: "Systematic withdrawals", icon: Wallet, render: () => <SWPCalc /> },
    { id: "fd", title: "FD Calculator", desc: "Fixed deposit maturity", icon: Banknote, render: () => <FDCalc /> },
    { id: "rd", title: "RD Calculator", desc: "Recurring deposit maturity", icon: Coins, render: () => <RDCalc /> },
    { id: "ppf", title: "PPF Calculator", desc: "15-year PPF corpus", icon: Building2, render: () => <PPFCalc /> },
    { id: "retirement", title: "Retirement Calculator", desc: "Corpus you need", icon: CalendarClock, render: () => <RetirementCalc /> },
    { id: "goal", title: "Goal Planner", desc: "SIP to reach a goal", icon: Target, render: () => <GoalCalc /> },
    { id: "xirr", title: "XIRR Calculator", desc: "Irregular cashflow returns", icon: Percent, render: () => <XIRRCalc /> },
  ];

  const [active, setActive] = useState(calcs[0].id);

  return (
    <Tabs value={active} onValueChange={setActive} className="w-full">
      <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 bg-transparent p-0">
        {calcs.map((c) => {
          const Icon = c.icon;
          return (
            <TabsTrigger
              key={c.id}
              value={c.id}
              className="glass-card flex items-center gap-2 rounded-lg border border-[var(--border)] px-3 py-2 text-xs data-[state=active]:border-[var(--primary)] data-[state=active]:text-[var(--primary)] data-[state=active]:shadow-[0_0_0_1px_var(--primary)]"
            >
              <Icon className="h-3.5 w-3.5" />
              {c.title.replace(" Calculator", "")}
            </TabsTrigger>
          );
        })}
      </TabsList>
      {calcs.map((c) => (
        <TabsContent key={c.id} value={c.id} className="mt-4">
          <Card className="glass-card border-[var(--border)] p-5">
            <div className="mb-4 flex items-center gap-3">
              <div className="rounded-lg bg-[var(--primary)]/10 p-2 text-[var(--primary)]">
                <c.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-[var(--text-main)]">{c.title}</h3>
                <p className="text-xs text-[var(--text-muted)]">{c.desc}</p>
              </div>
            </div>
            {c.render()}
          </Card>
        </TabsContent>
      ))}
    </Tabs>
  );
}

/* ---------------- Shared field ---------------- */
function Field({
  label,
  value,
  onChange,
  suffix,
  step = "any",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  step?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-[var(--text-muted)]">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step={step}
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
          className="bg-[var(--bg-primary)]/40"
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--text-muted)]">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function Result({ items }: { items: { label: string; value: string; primary?: boolean }[] }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-3">
      {items.map((it) => (
        <div
          key={it.label}
          className={`rounded-lg border p-3 ${
            it.primary
              ? "border-[var(--primary)]/40 bg-[var(--primary)]/10"
              : "border-[var(--border)] bg-[var(--bg-primary)]/30"
          }`}
        >
          <div className="text-[11px] uppercase tracking-wide text-[var(--text-muted)]">{it.label}</div>
          <div className={`mt-1 text-lg font-semibold ${it.primary ? "text-[var(--primary)]" : "text-[var(--text-main)]"}`}>
            {it.value}
          </div>
        </div>
      ))}
    </div>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>;
}

/* ---------------- Individual Calculators ---------------- */

function SIPCalc() {
  const [amt, setAmt] = useState(10000);
  const [rate, setRate] = useState(12);
  const [yrs, setYrs] = useState(10);
  const { invested, future, gain } = useMemo(() => {
    const n = yrs * 12;
    const i = rate / 100 / 12;
    const fv = amt * ((Math.pow(1 + i, n) - 1) / i) * (1 + i);
    const inv = amt * n;
    return { invested: inv, future: fv, gain: fv - inv };
  }, [amt, rate, yrs]);
  return (
    <>
      <Grid>
        <Field label="Monthly Investment" value={amt} onChange={setAmt} suffix="₹" />
        <Field label="Expected Return" value={rate} onChange={setRate} suffix="% p.a." />
        <Field label="Tenure" value={yrs} onChange={setYrs} suffix="yrs" />
      </Grid>
      <Result
        items={[
          { label: "Invested", value: fmt(invested) },
          { label: "Est. Returns", value: fmt(gain) },
          { label: "Future Value", value: fmt(future), primary: true },
        ]}
      />
    </>
  );
}

function EMICalc() {
  const [p, setP] = useState(500000);
  const [r, setR] = useState(9);
  const [y, setY] = useState(5);
  const { emi, total, interest } = useMemo(() => {
    const n = y * 12;
    const i = r / 100 / 12;
    const e = (p * i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
    return { emi: e, total: e * n, interest: e * n - p };
  }, [p, r, y]);
  return (
    <>
      <Grid>
        <Field label="Loan Amount" value={p} onChange={setP} suffix="₹" />
        <Field label="Interest Rate" value={r} onChange={setR} suffix="% p.a." />
        <Field label="Tenure" value={y} onChange={setY} suffix="yrs" />
      </Grid>
      <Result
        items={[
          { label: "Monthly EMI", value: fmt(emi), primary: true },
          { label: "Total Interest", value: fmt(interest) },
          { label: "Total Payment", value: fmt(total) },
        ]}
      />
    </>
  );
}

function InflationCalc() {
  const [pv, setPv] = useState(100000);
  const [rate, setRate] = useState(6);
  const [yrs, setYrs] = useState(10);
  const fv = useMemo(() => pv * Math.pow(1 + rate / 100, yrs), [pv, rate, yrs]);
  return (
    <>
      <Grid>
        <Field label="Current Amount" value={pv} onChange={setPv} suffix="₹" />
        <Field label="Inflation Rate" value={rate} onChange={setRate} suffix="% p.a." />
        <Field label="Years" value={yrs} onChange={setYrs} suffix="yrs" />
      </Grid>
      <Result
        items={[
          { label: "Today's Value", value: fmt(pv) },
          { label: "Future Cost", value: fmt(fv), primary: true },
          { label: "Loss in Value", value: fmt(fv - pv) },
        ]}
      />
    </>
  );
}

function LumpsumCalc() {
  const [p, setP] = useState(100000);
  const [r, setR] = useState(12);
  const [y, setY] = useState(10);
  const fv = useMemo(() => p * Math.pow(1 + r / 100, y), [p, r, y]);
  return (
    <>
      <Grid>
        <Field label="Investment" value={p} onChange={setP} suffix="₹" />
        <Field label="Expected Return" value={r} onChange={setR} suffix="% p.a." />
        <Field label="Tenure" value={y} onChange={setY} suffix="yrs" />
      </Grid>
      <Result
        items={[
          { label: "Invested", value: fmt(p) },
          { label: "Est. Returns", value: fmt(fv - p) },
          { label: "Future Value", value: fmt(fv), primary: true },
        ]}
      />
    </>
  );
}

function CAGRCalc() {
  const [iv, setIv] = useState(100000);
  const [fv, setFv] = useState(200000);
  const [y, setY] = useState(5);
  const cagr = useMemo(() => (Math.pow(fv / iv, 1 / y) - 1) * 100, [iv, fv, y]);
  return (
    <>
      <Grid>
        <Field label="Initial Value" value={iv} onChange={setIv} suffix="₹" />
        <Field label="Final Value" value={fv} onChange={setFv} suffix="₹" />
        <Field label="Duration" value={y} onChange={setY} suffix="yrs" />
      </Grid>
      <Result
        items={[
          { label: "Absolute Gain", value: fmt(fv - iv) },
          { label: "CAGR", value: `${fmtN(cagr)}%`, primary: true },
          { label: "Multiplier", value: `${fmtN(fv / iv)}x` },
        ]}
      />
    </>
  );
}

function SWPCalc() {
  const [corpus, setCorpus] = useState(1000000);
  const [wd, setWd] = useState(10000);
  const [r, setR] = useState(8);
  const [y, setY] = useState(10);
  const { balance, totalWd } = useMemo(() => {
    const n = y * 12;
    const i = r / 100 / 12;
    let bal = corpus;
    for (let k = 0; k < n; k++) {
      bal = bal * (1 + i) - wd;
      if (bal < 0) {
        bal = 0;
        break;
      }
    }
    return { balance: bal, totalWd: wd * n };
  }, [corpus, wd, r, y]);
  return (
    <>
      <Grid>
        <Field label="Total Investment" value={corpus} onChange={setCorpus} suffix="₹" />
        <Field label="Monthly Withdrawal" value={wd} onChange={setWd} suffix="₹" />
        <Field label="Return Rate" value={r} onChange={setR} suffix="% p.a." />
        <Field label="Tenure" value={y} onChange={setY} suffix="yrs" />
      </Grid>
      <Result
        items={[
          { label: "Total Withdrawn", value: fmt(totalWd) },
          { label: "Final Balance", value: fmt(balance), primary: true },
          { label: "Status", value: balance > 0 ? "Corpus survives" : "Depleted" },
        ]}
      />
    </>
  );
}

function FDCalc() {
  const [p, setP] = useState(100000);
  const [r, setR] = useState(7);
  const [y, setY] = useState(5);
  const [n, setN] = useState(4); // compounding/yr
  const m = useMemo(() => p * Math.pow(1 + r / 100 / n, n * y), [p, r, y, n]);
  return (
    <>
      <Grid>
        <Field label="Principal" value={p} onChange={setP} suffix="₹" />
        <Field label="Interest Rate" value={r} onChange={setR} suffix="% p.a." />
        <Field label="Tenure" value={y} onChange={setY} suffix="yrs" />
        <Field label="Compounding /yr" value={n} onChange={setN} suffix="x" />
      </Grid>
      <Result
        items={[
          { label: "Principal", value: fmt(p) },
          { label: "Interest Earned", value: fmt(m - p) },
          { label: "Maturity Value", value: fmt(m), primary: true },
        ]}
      />
    </>
  );
}

function RDCalc() {
  const [amt, setAmt] = useState(5000);
  const [r, setR] = useState(7);
  const [y, setY] = useState(5);
  const { invested, maturity } = useMemo(() => {
    const n = y * 12;
    const i = r / 100 / 4; // quarterly compounding standard
    let M = 0;
    for (let k = 1; k <= n; k++) {
      M += amt * Math.pow(1 + i, (n - k + 1) / 3);
    }
    return { invested: amt * n, maturity: M };
  }, [amt, r, y]);
  return (
    <>
      <Grid>
        <Field label="Monthly Deposit" value={amt} onChange={setAmt} suffix="₹" />
        <Field label="Interest Rate" value={r} onChange={setR} suffix="% p.a." />
        <Field label="Tenure" value={y} onChange={setY} suffix="yrs" />
      </Grid>
      <Result
        items={[
          { label: "Invested", value: fmt(invested) },
          { label: "Interest Earned", value: fmt(maturity - invested) },
          { label: "Maturity Value", value: fmt(maturity), primary: true },
        ]}
      />
    </>
  );
}

function PPFCalc() {
  const [amt, setAmt] = useState(150000);
  const [r, setR] = useState(7.1);
  const [y, setY] = useState(15);
  const { invested, maturity } = useMemo(() => {
    let bal = 0;
    for (let k = 0; k < y; k++) bal = (bal + amt) * (1 + r / 100);
    return { invested: amt * y, maturity: bal };
  }, [amt, r, y]);
  return (
    <>
      <Grid>
        <Field label="Yearly Investment" value={amt} onChange={setAmt} suffix="₹" />
        <Field label="Interest Rate" value={r} onChange={setR} suffix="% p.a." />
        <Field label="Tenure" value={y} onChange={setY} suffix="yrs" />
      </Grid>
      <Result
        items={[
          { label: "Invested", value: fmt(invested) },
          { label: "Interest Earned", value: fmt(maturity - invested) },
          { label: "Maturity Value", value: fmt(maturity), primary: true },
        ]}
      />
    </>
  );
}

function RetirementCalc() {
  const [age, setAge] = useState(30);
  const [retAge, setRetAge] = useState(60);
  const [exp, setExp] = useState(50000); // monthly expense today
  const [inf, setInf] = useState(6);
  const [ret, setRet] = useState(10);
  const [postRet, setPostRet] = useState(7);
  const [years, setYears] = useState(25);
  const { corpus, sip } = useMemo(() => {
    const yrsToRet = Math.max(retAge - age, 1);
    const futureExp = exp * Math.pow(1 + inf / 100, yrsToRet);
    const realRate = (1 + postRet / 100) / (1 + inf / 100) - 1;
    const months = years * 12;
    const rm = realRate / 12;
    const corpus = (futureExp * (1 - Math.pow(1 + rm, -months))) / rm;
    const n = yrsToRet * 12;
    const i = ret / 100 / 12;
    const sip = (corpus * i) / ((Math.pow(1 + i, n) - 1) * (1 + i));
    return { corpus, sip };
  }, [age, retAge, exp, inf, ret, postRet, years]);
  return (
    <>
      <Grid>
        <Field label="Current Age" value={age} onChange={setAge} suffix="yrs" />
        <Field label="Retirement Age" value={retAge} onChange={setRetAge} suffix="yrs" />
        <Field label="Monthly Expense (today)" value={exp} onChange={setExp} suffix="₹" />
        <Field label="Inflation" value={inf} onChange={setInf} suffix="% p.a." />
        <Field label="Pre-Ret Return" value={ret} onChange={setRet} suffix="% p.a." />
        <Field label="Post-Ret Return" value={postRet} onChange={setPostRet} suffix="% p.a." />
        <Field label="Years after Retirement" value={years} onChange={setYears} suffix="yrs" />
      </Grid>
      <Result
        items={[
          { label: "Corpus Needed", value: fmt(corpus), primary: true },
          { label: "Required Monthly SIP", value: fmt(sip) },
          { label: "Years to Retire", value: `${retAge - age} yrs` },
        ]}
      />
    </>
  );
}

function GoalCalc() {
  const [goal, setGoal] = useState(1000000);
  const [y, setY] = useState(10);
  const [r, setR] = useState(12);
  const [inf, setInf] = useState(6);
  const { futureGoal, sip, lumpsum } = useMemo(() => {
    const fg = goal * Math.pow(1 + inf / 100, y);
    const n = y * 12;
    const i = r / 100 / 12;
    const s = (fg * i) / ((Math.pow(1 + i, n) - 1) * (1 + i));
    const lump = fg / Math.pow(1 + r / 100, y);
    return { futureGoal: fg, sip: s, lumpsum: lump };
  }, [goal, y, r, inf]);
  return (
    <>
      <Grid>
        <Field label="Goal Amount (today)" value={goal} onChange={setGoal} suffix="₹" />
        <Field label="Years to Goal" value={y} onChange={setY} suffix="yrs" />
        <Field label="Expected Return" value={r} onChange={setR} suffix="% p.a." />
        <Field label="Inflation" value={inf} onChange={setInf} suffix="% p.a." />
      </Grid>
      <Result
        items={[
          { label: "Inflated Goal", value: fmt(futureGoal) },
          { label: "Monthly SIP Needed", value: fmt(sip), primary: true },
          { label: "Lumpsum Today", value: fmt(lumpsum) },
        ]}
      />
    </>
  );
}

function XIRRCalc() {
  // Simple XIRR with editable rows
  const [rows, setRows] = useState<{ date: string; amount: number }[]>([
    { date: "2023-01-01", amount: -100000 },
    { date: "2023-06-01", amount: -50000 },
    { date: "2024-12-31", amount: 180000 },
  ]);
  const xirr = useMemo(() => computeXIRR(rows), [rows]);

  const update = (idx: number, key: "date" | "amount", val: string) => {
    const next = [...rows];
    if (key === "amount") next[idx].amount = parseFloat(val) || 0;
    else next[idx].date = val;
    setRows(next);
  };

  return (
    <>
      <p className="mb-3 text-xs text-[var(--text-muted)]">
        Enter cashflows (negative = invested, positive = received).
      </p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-end gap-2">
            <div>
              <Label className="text-xs text-[var(--text-muted)]">Date</Label>
              <Input
                type="date"
                value={r.date}
                onChange={(e) => update(i, "date", e.target.value)}
                className="bg-[var(--bg-primary)]/40"
              />
            </div>
            <div>
              <Label className="text-xs text-[var(--text-muted)]">Amount (₹)</Label>
              <Input
                type="number"
                value={r.amount}
                onChange={(e) => update(i, "amount", e.target.value)}
                className="bg-[var(--bg-primary)]/40"
              />
            </div>
            <button
              onClick={() => setRows(rows.filter((_, idx) => idx !== i))}
              className="rounded-md border border-[var(--border)] px-3 py-2 text-xs text-[var(--text-muted)] hover:text-[var(--primary)]"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={() =>
          setRows([...rows, { date: new Date().toISOString().slice(0, 10), amount: 0 }])
        }
        className="mt-3 rounded-md border border-[var(--primary)]/40 bg-[var(--primary)]/10 px-3 py-1.5 text-xs text-[var(--primary)]"
      >
        + Add cashflow
      </button>
      <Result
        items={[
          { label: "Cashflows", value: `${rows.length}` },
          {
            label: "Net",
            value: fmt(rows.reduce((s, r) => s + r.amount, 0)),
          },
          { label: "XIRR", value: isFinite(xirr) ? `${fmtN(xirr * 100)}%` : "—", primary: true },
        ]}
      />
    </>
  );
}

function computeXIRR(rows: { date: string; amount: number }[]): number {
  if (rows.length < 2) return NaN;
  const cf = rows
    .map((r) => ({ t: new Date(r.date).getTime(), a: r.amount }))
    .sort((a, b) => a.t - b.t);
  const t0 = cf[0].t;
  const years = (t: number) => (t - t0) / (1000 * 60 * 60 * 24 * 365);
  const npv = (rate: number) =>
    cf.reduce((s, c) => s + c.a / Math.pow(1 + rate, years(c.t)), 0);
  let lo = -0.9999;
  let hi = 10;
  if (npv(lo) * npv(hi) > 0) return NaN;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    const v = npv(mid);
    if (Math.abs(v) < 1e-4) return mid;
    if (npv(lo) * v < 0) hi = mid;
    else lo = mid;
  }
  return (lo + hi) / 2;
}