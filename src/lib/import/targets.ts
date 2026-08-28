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

/**
 * Optional merge/update support. When the user picks "Update existing / merge"
 * in the commit step, matched rows are UPDATEd instead of inserted.
 */
export type ImportMerge = {
  /** Extra existing columns to fetch (id is always fetched). */
  select: string[];
  /** Ordered match keys derived from an existing DB row (most specific first). */
  rowKeys: (row: Record<string, unknown>) => string[];
  /** Ordered match keys derived from canonical import values. */
  valueKeys: (v: Record<string, unknown>) => string[];
  /** Payload columns that a merge is allowed to overwrite. */
  updatable: string[];
  /** Human description of the match rule, shown in the wizard. */
  describe: string;
};

export type ImportTarget = {
  table: string;
  /** Query key prefixes to invalidate after a successful import. */
  invalidate: string[][];
  /** Canonical keys used for duplicate detection against existing rows. */
  dedupeSelect: string[];
  /** Present when this module supports merge/update commits. */
  merge?: ImportMerge;
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

const key = (...parts: unknown[]) =>
  parts.map((p) => String(p ?? "").trim().toLowerCase()).join("|");

const bool = (v: unknown) => v === true || v === "true";

export const IMPORT_TARGETS: Record<ImportModule, ImportTarget> = {
  investments: {
    table: "wealth_investments",
    invalidate: [["wealth", "investments"]],
    dedupeSelect: ["name", "symbol", "quantity"],
    merge: {
      select: ["name", "symbol", "identifier", "exchange"],
      describe: "Matched by ISIN / symbol + exchange, falling back to instrument name + exchange.",
      rowKeys: (r) => {
        const keys: string[] = [];
        for (const id of [r.symbol, r.identifier]) {
          if (String(id ?? "").trim()) keys.push(key("id", id, r.exchange));
        }
        if (String(r.name ?? "").trim()) keys.push(key("name", r.name, r.exchange));
        return keys;
      },
      valueKeys: (v) => {
        const keys: string[] = [];
        if (String(v.symbol ?? "").trim()) keys.push(key("id", v.symbol, v.exchange));
        if (String(v.name ?? "").trim()) keys.push(key("name", v.name, v.exchange));
        return keys;
      },
      updatable: [
        "quantity", "avg_price", "current_price", "currency", "category", "sub_category",
        "purchase_date", "status", "notes", "last_updated",
      ],
    },
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
    merge: {
      select: ["investment_id", "occurred_on", "txn_type", "quantity", "price"],
      describe: "Matched by holding + date + transaction type.",
      rowKeys: (r) => [key("t", r.investment_id, r.occurred_on, r.txn_type)],
      valueKeys: (v) => [key("t", v.__investment_id, v.occurred_on, normalizeTxnType(v.txn_type))],
      updatable: ["quantity", "price", "amount", "notes"],
    },
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
    merge: {
      select: ["occurred_on", "amount", "merchant", "note"],
      describe: "Matched by reference (note / UTR) when present, otherwise date + amount + description.",
      rowKeys: (r) => {
        const keys: string[] = [];
        if (String(r.note ?? "").trim()) keys.push(key("ref", r.note));
        keys.push(key("dam", r.occurred_on, Math.abs(Number(r.amount ?? 0)), r.merchant));
        return keys;
      },
      valueKeys: (v) => {
        const keys: string[] = [];
        if (String(v.note ?? "").trim()) keys.push(key("ref", v.note));
        keys.push(key("dam", v.occurred_on, Math.abs(Number(v.amount ?? 0)), v.merchant));
        return keys;
      },
      updatable: ["kind", "amount", "occurred_on", "merchant", "category_id", "note"],
    },
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
