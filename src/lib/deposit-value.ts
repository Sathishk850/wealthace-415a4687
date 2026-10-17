export type DepositTerms = {
  principal: number;
  interestRate: number;
  startDate: string;
  maturityDate?: string | null;
  compounding?: string | null;
  kind?: string | null;
  installmentAmount?: number | null;
  installmentDay?: number | null;
};
const DAY = 86400000;
function date(iso: string | null | undefined) {
  if (!iso) return null;
  const d = new Date(iso.slice(0, 10) + 'T00:00:00Z');
  return Number.isFinite(d.getTime()) ? d : null;
}
function growth(principal: number, rate: number, days: number, frequency: string) {
  const years = Math.max(0, days) / 365;
  if (frequency === 'simple' || frequency === 'at_maturity') return principal * (1 + rate * years);
  const n = ({ monthly: 12, quarterly: 4, half_yearly: 2, yearly: 1 } as Record<string, number>)[frequency] ?? 4;
  return principal * (1 + rate / n) ** (n * years);
}
/** UTC calendar dates, Actual/365 accrual; instalments accrue individually. */
export function depositValue(terms: DepositTerms, asOf = new Date()) {
  const start = date(terms.startDate);
  const maturity = date(terms.maturityDate);
  const today = date(asOf.toISOString());
  if (!start || !today || !Number.isFinite(terms.interestRate) || terms.interestRate < 0 || (maturity && maturity < start)) return null;
  const end = maturity && maturity < today ? maturity : today;
  const frequency = terms.compounding || 'quarterly';
  const rate = terms.interestRate / 100;
  const accrue = (p: number, from: Date, to: Date) => growth(p, rate, (to.getTime() - from.getTime()) / DAY, frequency);
  let invested = terms.principal;
  let value = accrue(invested, start, end);
  let maturityValue = accrue(invested, start, maturity ?? end);
  let installmentsPaid = 0;
  let totalInstallments = 0;
  if (terms.kind === 'rd') {
    invested = 0; value = 0; maturityValue = 0;
    const amount = Math.max(0, terms.installmentAmount ?? 0);
    const day = Math.max(1, Math.min(31, terms.installmentDay ?? start.getUTCDate()));
    const limit = maturity ?? end;
    for (let month = start.getUTCMonth(), year = start.getUTCFullYear(); ; month++) {
      const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
      const due = new Date(Date.UTC(year, month, Math.min(day, lastDay)));
      if (due > limit) break;
      if (due < start) continue;
      // A payment on maturity day earns no interest, but is still an elapsed instalment.
      totalInstallments++;
      maturityValue += accrue(amount, due, limit);
      if (due <= end) { installmentsPaid++; invested += amount; value += accrue(amount, due, end); }
    }
  } else if (end < start) { invested = 0; value = 0; }
  return { invested, value, maturityValue, installmentsPaid, totalInstallments, matured: !!maturity && today >= maturity };
}
export function depositKind(category?: string | null, subCategory?: string | null, kind?: string | null) {
  if (kind === 'fd' || kind === 'rd' || kind === 'bond') return kind;
  if (/recurring deposit|\brd\b/i.test(subCategory ?? '') || category === 'Recurring Deposit') return 'rd';
  if (category === 'Fixed Deposit') return 'fd';
  if (category === 'Bonds') return 'bond';
  return null;
}
export function maturityDays(maturity?: string | null, asOf = new Date()) {
  const d = date(maturity); const today = date(asOf.toISOString());
  return d && today ? Math.round((d.getTime() - today.getTime()) / DAY) : null;
}
export function maturityReminderStage(maturity?: string | null, asOf = new Date()) {
  const days = maturityDays(maturity, asOf);
  return days === 7 ? 'seven_days' : days === 0 ? 'maturity_day' : null;
}
export type DepositHolding = {
  category: string; sub_category?: string | null; deposit_kind?: string | null;
  interest_rate?: number | null; compounding_frequency?: string | null;
  rd_installment_amount?: number | null; rd_installment_day?: number | null;
  purchase_date?: string | null; maturity_date?: string | null;
  quantity: number; avg_price: number; current_price: number;
  current_value?: number | null; invested_value?: number | null;
};
export function holdingDepositValue(inv: DepositHolding, asOf = new Date()) {
  const kind = depositKind(inv.category, inv.sub_category, inv.deposit_kind);
  if (!kind || inv.interest_rate == null || !inv.purchase_date) return null;
  return depositValue({ principal: inv.quantity * inv.avg_price, interestRate: Number(inv.interest_rate),
    startDate: inv.purchase_date, maturityDate: inv.maturity_date,
    compounding: inv.compounding_frequency, kind,
    installmentAmount: inv.rd_installment_amount, installmentDay: inv.rd_installment_day }, asOf);
}
export function valueDepositHolding<T extends DepositHolding>(inv: T, asOf = new Date()): T {
  const result = holdingDepositValue(inv, asOf);
  if (!result) return inv;
  return { ...inv, invested_value: result.invested, current_value: result.value,
    current_price: inv.quantity > 0 ? result.value / inv.quantity : 0 };
}