export type CategoryRule = {
  id: string;
  user_id: string;
  keywords: string[];
  category_id: string;
  kind: "income" | "expense";
  created_at: string;
  updated_at: string;
};

/** Pure: case-insensitive partial match of merchant against rule keywords. */
export function applyRules(
  merchant: string,
  rules: Pick<CategoryRule, "keywords" | "category_id" | "kind">[],
  kind: "income" | "expense",
): string | null {
  const m = (merchant ?? "").toLowerCase();
  if (!m.trim()) return null;
  for (const rule of rules) {
    if (rule.kind !== kind) continue;
    if (rule.keywords.some((kw) => kw && m.includes(kw.toLowerCase()))) return rule.category_id;
  }
  return null;
}

/** Pure: fill category only for uncategorised rows; never overrides. */
export function applyRulesToTransactions<
  T extends { merchant: string; kind: "income" | "expense"; category_id: string | null },
>(transactions: T[], rules: Pick<CategoryRule, "keywords" | "category_id" | "kind">[]): T[] {
  return transactions.map((tx) => {
    if (tx.category_id) return tx;
    const matched = applyRules(tx.merchant, rules, tx.kind);
    return matched ? { ...tx, category_id: matched } : tx;
  });
}
