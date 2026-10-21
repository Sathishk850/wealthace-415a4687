import { expect, test } from 'bun:test';
import { assetFundingAmount, loanSummary } from './loan-given';

test('Loan Given tracks principal less repayments with cleared zero', () => {
  expect(loanSummary(10000, [{ amount: 2500 }])).toEqual({ lent: 10000, repaid: 2500, outstanding: 7500, percent: 25 });
  expect(loanSummary(10000, [{ amount: 10000 }]).outstanding).toBe(0);
});
test('deleting a repayment restores outstanding', () => {
  expect(loanSummary(10000, [{ amount: 2500 }, { amount: 1000 }]).outstanding).toBe(6500);
  expect(loanSummary(10000, [{ amount: 2500 }]).outstanding).toBe(7500);
});
test('lending more increases outstanding without erasing repayments', () => {
  expect(loanSummary(12000, [{ amount: 2500 }]).outstanding).toBe(9500);
});
test('asset funding deducts current value only on creation', () => {
  const input = { category: 'Property', current_value: 5000, paid_from_account_id: 'account' };
  expect(assetFundingAmount(input)).toBe(5000);
  expect(assetFundingAmount({ ...input, id: 'existing' })).toBe(0);
  expect(assetFundingAmount({ ...input, paid_from_account_id: null })).toBe(0);
});
for (const category of ['PPF', 'NPS', 'SSY', 'EPF']) {
  test(`${category} never deducts funding`, () => {
    expect(assetFundingAmount({ category, current_value: 5000, paid_from_account_id: 'account' })).toBe(0);
  });
}