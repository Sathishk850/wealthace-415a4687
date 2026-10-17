import { expect, test } from 'bun:test';
import { depositValue, maturityReminderStage, valueDepositHolding } from './deposit-value';
const terms = { principal: 100000, interestRate: 8, startDate: '2025-01-01', maturityDate: '2026-01-01', compounding: 'quarterly' };
test('FD compound value follows principal × (1+r/n)^(n*t)', () => {
  expect(depositValue(terms, new Date('2026-01-01')).value).toBeCloseTo(108243.216, 3);
});
test('simple interest uses principal × (1+r*t)', () => {
  expect(depositValue({ ...terms, compounding: 'simple' }, new Date('2026-01-01')).value).toBe(108000);
});
test('deposits freeze at maturity', () => {
  expect(depositValue(terms, new Date('2027-06-01'))).toEqual(depositValue(terms, new Date('2026-01-01')));
});
test('RD grows only when a monthly instalment is due and defaults to quarterly', () => {
  const rd = { ...terms, kind: 'rd', installmentAmount: 5000, installmentDay: 15, maturityDate: '2027-01-01', compounding: null };
  const result = depositValue(rd, new Date('2025-07-15'));
  expect(result.installmentsPaid).toBe(7);
  expect(result.totalInstallments).toBe(24);
  expect(result.invested).toBe(35000);
  expect(depositValue(rd, new Date('2025-07-14')).invested).toBe(30000);
  expect(result.value).toBeCloseTo([181,150,122,91,61,30,0].reduce((s,d) => s+5000*1.02**(4*d/365),0), 5);
});
test('RD day 31 clamps to end of February', () => {
  expect(depositValue({ ...terms, kind: 'rd', installmentAmount: 1000, installmentDay: 31 }, new Date('2025-02-28')).invested).toBe(2000);
});
test('maturity reminders fire only seven days before and on the day', () => {
  expect(maturityReminderStage('2026-10-24', new Date('2026-10-17'))).toBe('seven_days');
  expect(maturityReminderStage('2026-10-17', new Date('2026-10-17'))).toBe('maturity_day');
  expect(maturityReminderStage('2026-10-18', new Date('2026-10-17'))).toBeNull();
  expect(maturityReminderStage('2026-10-16', new Date('2026-10-17'))).toBeNull();
});
test('missing interest rate or start date preserves manual investment values', () => {
  const holding = { category: 'Fixed Deposit', quantity: 1, avg_price: 100000, current_price: 101234, current_value: 101234, invested_value: 100000, purchase_date: '2025-01-01' };
  expect(valueDepositHolding(holding)).toEqual(holding);
  const withoutStart = { ...holding, purchase_date: null, interest_rate: 8 };
  expect(valueDepositHolding(withoutStart)).toEqual(withoutStart);
});
test('shared deposit valuation recomputes invested value, total value and per-unit price', () => {
  const holding = { category: 'Fixed Deposit', quantity: 2, avg_price: 50000, current_price: 50000, current_value: 100000, invested_value: 100000, purchase_date: '2025-01-01', maturity_date: '2026-01-01', interest_rate: 8, compounding_frequency: 'quarterly' };
  expect(valueDepositHolding(holding, new Date('2026-01-01'))).toMatchObject({ invested_value: 100000 });
  expect(valueDepositHolding(holding, new Date('2026-01-01')).current_value).toBeCloseTo(108243.216, 3);
  expect(valueDepositHolding(holding, new Date('2026-01-01')).current_price).toBeCloseTo(54121.608, 3);
});