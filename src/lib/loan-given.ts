export const RECURRING_ASSET_CATEGORIES = ['PPF', 'NPS', 'SSY', 'EPF'];

export function isRecurringAsset(category: string) {
  return RECURRING_ASSET_CATEGORIES.some(c => category.toUpperCase().includes(c));
}

export function assetFundingAmount(input: { id?: string; category: string; current_value: number; paid_from_account_id?: string | null }) {
  return !input.id && input.paid_from_account_id && !isRecurringAsset(input.category)
    ? Math.max(0, input.current_value) : 0;
}

export function loanSummary(principal: number | null, repayments: { amount: number }[]) {
  const lent = principal ?? 0;
  const repaid = repayments.reduce((sum, row) => sum + row.amount, 0);
  return { lent, repaid, outstanding: Math.max(0, lent - repaid), percent: lent > 0 ? Math.min(100, repaid / lent * 100) : 0 };
}