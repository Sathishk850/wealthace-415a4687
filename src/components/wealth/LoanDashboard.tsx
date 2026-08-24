import { useMemo, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  TrendingDown, Calendar, Banknote, Percent,
  ChevronDown, ChevronUp, Pencil,
} from "lucide-react";
import { inr, type Liability } from "@/lib/wealth-api";
import { cn } from "@/lib/utils";

/* ─── Maths ─────────────────────────────────────────────────── */

interface ScheduleRow {
  month: number;
  label: string;
  emi: number;
  principal: number;
  interest: number;
  balance: number;
}

function buildSchedule(
  outstanding: number,
  emi: number,
  annualRate: number,
  extraPerMonth = 0,
): ScheduleRow[] {
  if (outstanding <= 0 || emi <= 0 || annualRate < 0) return [];
  const r = annualRate / 100 / 12;
  const rows: ScheduleRow[] = [];
  let balance = outstanding;
  const now = new Date();

  for (let m = 1; m <= 600 && balance > 0.5; m++) {
    const interestPmt = r > 0 ? balance * r : 0;
    const principalPmt = Math.min(emi - interestPmt + extraPerMonth, balance);
    if (principalPmt <= 0) break; // emi < interest — loan won't close
    balance = Math.max(0, balance - principalPmt);

    const dt = new Date(now);
    dt.setMonth(dt.getMonth() + m - 1);
    const label = dt.toLocaleDateString("en-IN", { month: "short", year: "2-digit" });

    rows.push({ month: m, label, emi: interestPmt + principalPmt, principal: principalPmt, interest: interestPmt, balance });
  }
  return rows;
}

function totalInterest(schedule: ScheduleRow[]) {
  return schedule.reduce((s, r) => s + r.interest, 0);
}

/* ─── Sub-components ─────────────────────────────────────────── */

function StatCard({ label, value, sub, accent }: { label: string; value: string; sub?: string; accent?: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface-2/40 px-3 py-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={cn("mt-0.5 text-base font-bold tabular-nums", accent ?? "text-foreground")}>{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

const MINT = "#22d3ee";
const GOLD = "#f59e0b";

function PayoffChart({ schedule }: { schedule: ScheduleRow[] }) {
  const data = schedule.filter((_, i) => i % Math.max(1, Math.floor(schedule.length / 48)) === 0 || i === schedule.length - 1);
  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="balGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={MINT} stopOpacity={0.25} />
            <stop offset="95%" stopColor={MINT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#6B7280" }} interval="preserveStartEnd" />
        <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 9, fill: "#6B7280" }} width={52} />
        <Tooltip
          contentStyle={{ background: "#0d2233", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }}
          formatter={(v: number) => inr(v)}
          labelStyle={{ color: "#9CA3AF" }}
        />
        <Area type="monotone" dataKey="balance" name="Balance" stroke={MINT} fill="url(#balGrad)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function CompareChart({ base, prepay }: { base: ScheduleRow[]; prepay: ScheduleRow[] }) {
  const len = Math.max(base.length, prepay.length);
  const step = Math.max(1, Math.floor(len / 36));
  const data = Array.from({ length: Math.ceil(base.length / step) }, (_, i) => {
    const bi = i * step;
    const pi = i * step;
    return {
      label: base[bi]?.label ?? "",
      original: base[bi]?.balance ?? 0,
      prepaid: prepay[pi]?.balance ?? 0,
    };
  });
  return (
    <ResponsiveContainer width="100%" height={160}>
      <AreaChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="orig" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6B7280" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6B7280" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="prep" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={MINT} stopOpacity={0.25} />
            <stop offset="95%" stopColor={MINT} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
        <XAxis dataKey="label" tick={{ fontSize: 9, fill: "#6B7280" }} interval="preserveStartEnd" />
        <YAxis tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}K`} tick={{ fontSize: 9, fill: "#6B7280" }} width={52} />
        <Tooltip contentStyle={{ background: "#0d2233", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 11 }} formatter={(v: number) => inr(v)} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        <Area type="monotone" dataKey="original" name="Without prepayment" stroke="#6B7280" fill="url(#orig)" strokeWidth={1.5} dot={false} />
        <Area type="monotone" dataKey="prepaid" name="With prepayment" stroke={MINT} fill="url(#prep)" strokeWidth={2} dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

function ScheduleTable({ schedule }: { schedule: ScheduleRow[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? schedule : schedule.slice(0, 12);
  return (
    <div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full min-w-[480px] text-xs">
          <thead className="bg-surface-2/60">
            <tr className="border-b border-border text-[10px] uppercase tracking-wider text-muted-foreground">
              <th className="px-3 py-2 text-left">Month</th>
              <th className="px-3 py-2 text-right">EMI</th>
              <th className="px-3 py-2 text-right">Principal</th>
              <th className="px-3 py-2 text-right">Interest</th>
              <th className="px-3 py-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.month} className="border-b border-border/40 last:border-0 hover:bg-white/[0.02]">
                <td className="px-3 py-2 text-muted-foreground">{r.label}</td>
                <td className="px-3 py-2 text-right tabular-nums">{inr(r.emi)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-mint">{inr(r.principal)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-amber-400">{inr(r.interest)}</td>
                <td className="px-3 py-2 text-right tabular-nums font-medium">{inr(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {schedule.length > 12 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-mint hover:opacity-80"
        >
          {expanded ? <><ChevronUp className="h-3 w-3" /> Show less</> : <><ChevronDown className="h-3 w-3" /> Show all {schedule.length} months</>}
        </button>
      )}
    </div>
  );
}

function PrepaymentCalc({ outstanding, emi, annualRate }: { outstanding: number; emi: number; annualRate: number }) {
  const [extra, setExtra] = useState(0);
  const base = useMemo(() => buildSchedule(outstanding, emi, annualRate, 0), [outstanding, emi, annualRate]);
  const prepay = useMemo(() => buildSchedule(outstanding, emi, annualRate, extra), [outstanding, emi, annualRate, extra]);

  const baseTotalInt = totalInterest(base);
  const prepayTotalInt = totalInterest(prepay);
  const interestSaved = baseTotalInt - prepayTotalInt;
  const monthsSaved = base.length - prepay.length;

  const inp = "w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-mint/40";

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-muted-foreground mb-1">
          Extra payment per month (₹)
        </label>
        <input
          type="number"
          min={0}
          step={500}
          className={inp}
          placeholder="e.g. 5000"
          value={extra || ""}
          onChange={(e) => setExtra(Math.max(0, Number(e.target.value) || 0))}
        />
        <input
          type="range"
          min={0}
          max={Math.round(emi * 2)}
          step={500}
          value={extra}
          onChange={(e) => setExtra(Number(e.target.value))}
          className="mt-2 w-full accent-mint"
        />
      </div>

      {extra > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatCard label="New Tenure" value={`${prepay.length} mo`} sub={`was ${base.length} mo`} accent="text-mint" />
            <StatCard label="Months Saved" value={`${monthsSaved} mo`} sub={monthsSaved > 0 ? `${(monthsSaved / 12).toFixed(1)} yrs` : "—"} accent="text-emerald-400" />
            <StatCard label="Interest Saved" value={inr(interestSaved)} accent="text-emerald-400" />
            <StatCard label="Total Interest (new)" value={inr(prepayTotalInt)} sub={`was ${inr(baseTotalInt)}`} />
          </div>
          <div>
            <div className="mb-2 text-xs font-medium text-muted-foreground">Balance comparison</div>
            <CompareChart base={base} prepay={prepay} />
          </div>
        </>
      )}

      {extra === 0 && (
        <div className="rounded-xl border border-border bg-surface-2/30 p-4 text-center text-xs text-muted-foreground">
          Enter an extra monthly payment above to see how much interest and time you save.
        </div>
      )}
    </div>
  );
}

/* ─── Main component ─────────────────────────────────────────── */

type DashTab = "overview" | "schedule" | "prepayment";

interface Props {
  liability: Liability | null;
  onClose: () => void;
  onEdit: (l: Liability) => void;
}

export function LoanDashboard({ liability, onClose, onEdit }: Props) {
  const l = liability;
  const [tab, setTab] = useState<DashTab>("overview");

  const schedule = useMemo(
    () =>
      l && l.outstanding > 0 && l.emi && l.interest_rate != null
        ? buildSchedule(l.outstanding, l.emi, l.interest_rate)
        : [],
    [l],
  );

  const principalPaid = l ? Math.max(0, (l.principal ?? 0) - l.outstanding) : 0;
  const totalInt = totalInterest(schedule);
  const monthsLeft = schedule.length;
  const paidPct = l && l.principal ? (principalPaid / l.principal) * 100 : 0;

  const TABS: { key: DashTab; label: string }[] = [
    { key: "overview", label: "Overview" },
    { key: "schedule", label: "Schedule" },
    { key: "prepayment", label: "Prepayment" },
  ];

  return (
    <Sheet open={!!l} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="right" className="flex w-full flex-col overflow-y-auto sm:max-w-xl">
        {l ? (
          <>
            <SheetHeader className="border-b border-border pb-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <SheetTitle className="text-base font-bold">{l.name}</SheetTitle>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {l.category}{l.lender ? ` · ${l.lender}` : ""}
                  </div>
                </div>
                <button
                  onClick={() => onEdit(l)}
                  className="flex shrink-0 items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:border-mint/40 hover:text-mint"
                >
                  <Pencil className="h-3 w-3" /> Edit
                </button>
              </div>
            </SheetHeader>

            {/* Key stats */}
            <div className="grid grid-cols-2 gap-2 py-4">
              <StatCard label="Outstanding" value={inr(l.outstanding)} accent="text-rose-400" />
              <StatCard label="Principal Paid" value={inr(principalPaid)} sub={`${paidPct.toFixed(1)}% done`} accent="text-mint" />
              <StatCard label="Total Interest" value={schedule.length ? inr(totalInt) : "—"} sub="over loan life" />
              <StatCard label="Months Remaining" value={monthsLeft ? `${monthsLeft} mo` : "—"} sub={monthsLeft ? `${(monthsLeft / 12).toFixed(1)} yrs` : undefined} />
            </div>

            {/* Progress bar */}
            {l.principal ? (
              <div className="mb-4">
                <div className="mb-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>Repaid {paidPct.toFixed(1)}%</span>
                  <span>{inr(l.outstanding)} remaining</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-mint transition-all"
                    style={{ width: `${Math.min(100, paidPct)}%` }}
                  />
                </div>
              </div>
            ) : null}

            {/* Tab bar */}
            <div className="mb-4 flex gap-1 rounded-xl border border-border bg-surface-2/30 p-1">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors",
                    tab === t.key
                      ? "bg-mint text-[#04121C]"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            {tab === "overview" && (
              <div className="space-y-4">
                {schedule.length > 0 ? (
                  <>
                    <div>
                      <div className="mb-2 text-xs font-medium text-muted-foreground">Balance payoff</div>
                      <PayoffChart schedule={schedule} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-xl border border-border bg-surface-2/40 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">EMI breakdown</div>
                        {(() => {
                          const r = (l.interest_rate ?? 0) / 100 / 12;
                          const intPart = l.outstanding * r;
                          const prinPart = (l.emi ?? 0) - intPart;
                          return (
                            <div className="space-y-1.5">
                              <div className="flex justify-between text-xs">
                                <span className="text-mint">Principal</span>
                                <span className="font-medium">{inr(Math.max(0, prinPart))}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span className="text-amber-400">Interest</span>
                                <span className="font-medium">{inr(intPart)}</span>
                              </div>
                              <div className="flex justify-between border-t border-border pt-1.5 text-xs font-semibold">
                                <span>Total EMI</span>
                                <span>{inr(l.emi ?? 0)}</span>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                      <div className="rounded-xl border border-border bg-surface-2/40 p-3">
                        <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">Loan details</div>
                        <div className="space-y-1.5 text-xs">
                          <div className="flex justify-between"><span className="text-muted-foreground">Rate</span><span>{l.interest_rate?.toFixed(2) ?? "—"}%</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Tenure</span><span>{l.tenure_months ? `${l.tenure_months} mo` : "—"}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Started</span><span>{l.start_date ? new Date(l.start_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}</span></div>
                          <div className="flex justify-between"><span className="text-muted-foreground">Ends</span><span>{l.end_date ? new Date(l.end_date).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : schedule.length ? new Date(Date.now() + schedule.length * 30.44 * 86400000).toLocaleDateString("en-IN", { month: "short", year: "numeric" }) : "—"}</span></div>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-border bg-surface-2/30 p-6 text-center text-xs text-muted-foreground">
                    Add EMI and interest rate to see the payoff chart.
                  </div>
                )}
              </div>
            )}

            {tab === "schedule" && (
              schedule.length > 0
                ? <ScheduleTable schedule={schedule} />
                : <div className="rounded-xl border border-border p-6 text-center text-xs text-muted-foreground">Add EMI and interest rate to see the amortisation schedule.</div>
            )}

            {tab === "prepayment" && (
              l.emi && l.interest_rate != null
                ? <PrepaymentCalc outstanding={l.outstanding} emi={l.emi} annualRate={l.interest_rate} />
                : <div className="rounded-xl border border-border p-6 text-center text-xs text-muted-foreground">Add EMI and interest rate to use the prepayment calculator.</div>
            )}
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
