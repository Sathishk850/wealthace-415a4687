/**
 * Universal Import Engine — TARGET layer.
 *
 * Maps a canonical module to the table it lands in, the query keys to
 * invalidate, and the row builder that turns canonical values into an insert
 * payload. No schema changes: every payload only uses existing columns.
 */
export type ImportModule =
  | "investments"
  | "investment_txns"
  | "transactions"
  | "assets"
  | "liabilities"
  | "insurance"
  | "accounts"
  | "family";

export type ImportTarget = {
  table: string;
  /** Query key prefixes to invalidate after a successful import. */
  invalidate: string[][];
  /** Canonical keys used for duplicate detection against existing rows. */
  dedupeSelect: string[];
  /** Build the insert payload from canonical values. */
  build: (v: Record<string, unknown>, ctx: { userId: string; today: string }) => Record<string, unknown>;
};

const num = (v: unknown, fallback: number | null = null) =>
  typeof v === "number" && Number.isFinite(v) ? v : fallback;
const str = (v: unknown) => {
  const s = v == null ? "" : String(v).trim();
  return s === "" ? null : s;
};
/** Map any spelling of a trade side onto the stored "buy" / "sell" values. */
export function normalizeTxnType(v: unknown): "buy" | "sell" {
  const s = String(v ?? "").toLowerCase();
  if (/sell|sale|sold|redeem|redemption|withdraw|debit|switch out|exit|s$/.test(s.trim())) return "sell";
  return "buy";
}

const bool = (v: unknown) => v === true || v === "true";

export const IMPORT_TARGETS: Record<ImportModule, ImportTarget> = {
  investments: {
    table: "wealth_investments",
    invalidate: [["wealth", "investments"]],
    dedupeSelect: ["name", "symbol", "quantity"],
    build: (v, { userId, today }) => ({
      user_id: userId,
      name: str(v.name) ?? "Unnamed",
      symbol: str(v.symbol),
      category: str(v.category) ?? "Others",
      sub_category: str(v.sub_category),
      quantity: num(v.quantity, 0),
      avg_price: num(v.avg_price, 0),
      current_price: num(v.current_price, 0) || num(v.avg_price, 0),
      purchase_date: str(v.purchase_date),
      currency: str(v.currency) ?? "INR",
      is_sip: bool(v.is_sip),
      sip_amount: num(v.sip_amount),
      sip_frequency: str(v.sip_frequency),
      sip_next_date: str(v.sip_next_date),
      status: str(v.status) ?? "active",
      notes: str(v.notes),
      last_updated: today,
    }),
  },
  investment_txns: {
    table: "wealth_investment_txns",
    invalidate: [["wealth", "investments"], ["wealth", "investment-txns"]],
    dedupeSelect: ["occurred_on", "quantity", "price"],
    build: (v, { userId }) => {
      const qty = Math.abs(num(v.quantity, 0) ?? 0);
      const price = Math.abs(num(v.price, 0) ?? 0);
      return {
        user_id: userId,
        investment_id: (v.__investment_id as string | null) ?? null,
        txn_type: normalizeTxnType(v.txn_type),
        quantity: qty,
        price,
        amount: Math.abs(num(v.amount, 0) ?? 0) || qty * price,
        occurred_on: str(v.occurred_on),
        notes: str(v.notes),
      };
    },
  },
  transactions: {
    table: "money_transactions",
    invalidate: [["money", "transactions"], ["money", "budgets"], ["money", "categories"]],
    dedupeSelect: ["occurred_on", "amount", "merchant"],
    build: (v, { userId }) => ({
      user_id: userId,
      kind: v.kind === "income" ? "income" : "expense",
      amount: Math.abs(num(v.amount, 0) ?? 0),
      occurred_on: str(v.occurred_on),
      merchant: str(v.merchant) ?? "Imported",
      category_id: (v.__category_id as string | null) ?? null,
      note: str(v.note),
    }),
  },
  assets: {
    table: "wealth_assets",
    invalidate: [["wealth", "assets"]],
    dedupeSelect: ["name", "current_value"],
    build: (v, { userId, today }) => ({
      user_id: userId,
      name: str(v.name) ?? "Unnamed",
      category: str(v.category) ?? "Others",
      sub_category: str(v.sub_category),
      current_value: num(v.current_value, 0),
      purchase_value: num(v.purchase_value),
      purchase_date: str(v.purchase_date),
      quantity: num(v.quantity),
      unit: str(v.unit),
      location: str(v.location),
      status: str(v.status) ?? "active",
      notes: str(v.notes),
      last_updated: today,
    }),
  },
  liabilities: {
    table: "wealth_liabilities",
    invalidate: [["wealth", "liabilities"]],
    dedupeSelect: ["name", "outstanding"],
    build: (v, { userId }) => ({
      user_id: userId,
      name: str(v.name) ?? "Unnamed",
      category: str(v.category) ?? "Others",
      lender: str(v.lender),
      outstanding: num(v.outstanding, 0),
      principal: num(v.principal),
      emi: num(v.emi),
      interest_rate: num(v.interest_rate),
      tenure_months: num(v.tenure_months) == null ? null : Math.round(num(v.tenure_months, 0) as number),
      start_date: str(v.start_date),
      end_date: str(v.end_date),
      due_date: str(v.due_date),
      status: str(v.status) ?? "active",
      notes: str(v.notes),
    }),
  },
  insurance: {
    table: "wealth_insurance",
    invalidate: [["wealth", "insurance"]],
    dedupeSelect: ["policy_name", "policy_number"],
    build: (v, { userId }) => ({
      user_id: userId,
      policy_name: str(v.policy_name) ?? "Unnamed",
      policy_number: str(v.policy_number),
      policy_type: str(v.policy_type) ?? "Other",
      provider: str(v.provider),
      coverage_amount: num(v.coverage_amount, 0),
      premium_amount: num(v.premium_amount),
      premium_frequency: str(v.premium_frequency),
      start_date: str(v.start_date),
      renewal_date: str(v.renewal_date),
      end_date: str(v.end_date),
      status: str(v.status) ?? "active",
      notes: str(v.notes),
    }),
  },
  accounts: {
    table: "wealth_accounts",
    invalidate: [["wealth", "accounts"]],
    dedupeSelect: ["name", "account_number_masked"],
    build: (v, { userId }) => ({
      user_id: userId,
      name: str(v.name) ?? "Unnamed",
      account_type: str(v.account_type) ?? "Bank Account",
      provider: str(v.provider),
      account_number_masked: str(v.account_number_masked),
      ifsc: str(v.ifsc),
      balance: num(v.balance, 0),
      currency: str(v.currency) ?? "INR",
      status: str(v.status) ?? "active",
      notes: str(v.notes),
    }),
  },
  family: {
    table: "wealth_family_members",
    invalidate: [["wealth", "family"]],
    dedupeSelect: ["name", "relationship"],
    build: (v, { userId }) => ({
      user_id: userId,
      name: str(v.name) ?? "Unnamed",
      relationship: str(v.relationship) ?? "Other",
      date_of_birth: str(v.date_of_birth),
      gender: str(v.gender),
      is_dependent: bool(v.is_dependent),
      is_nominee: bool(v.is_nominee),
      pan: str(v.pan),
      email: str(v.email),
      phone: str(v.phone),
      notes: str(v.notes),
    }),
  },
};
