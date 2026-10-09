/** Six calendar months ending at the selected month, including zero-activity months. */
export function monthlyCashflow(
  transactions: readonly { occurred_on: string; kind: string; amount: number; is_transfer?: boolean }[],
  endMonth: Date,
) {
  const months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date(endMonth.getFullYear(), endMonth.getMonth() - 5 + i, 1);
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-IN", { month: "short", year: "2-digit" }),
      income: 0,
      expense: 0,
      net: 0,
      count: 0,
    };
  });
  const byMonth = new Map(months.map((month) => [month.key, month]));
  for (const tx of transactions) {
    if (tx.is_transfer) continue;
    const month = byMonth.get(tx.occurred_on.slice(0, 7));
    if (!month || (tx.kind !== "income" && tx.kind !== "expense")) continue;
    const amount = Number(tx.amount);
    if (!Number.isFinite(amount)) continue;
    month[tx.kind] += amount;
    month.net = month.income - month.expense;
    month.count++;
  }
  return months;
}

/** Rank actual gains/losses by rupee P&L, not percentage return. */
export function holdingPerformers<T extends { id: string; name: string; inv: number; cur: number }>(
  holdings: readonly T[],
) {
  const ranked = holdings
    .filter((h) => Number.isFinite(h.inv) && h.inv > 0 && Number.isFinite(h.cur) && h.cur >= 0)
    .map((h) => ({ ...h, pnl: h.cur - h.inv, pnlPct: ((h.cur - h.inv) / h.inv) * 100 }))
    .sort((a, b) => b.pnl - a.pnl);
  return {
    ranked,
    gainers: ranked.filter((h) => h.pnl > 0).slice(0, 3),
    losers: ranked.filter((h) => h.pnl < 0).reverse().slice(0, 3),
  };
}