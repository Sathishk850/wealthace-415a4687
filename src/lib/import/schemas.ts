/**
 * Universal Import Engine — canonical schema registry.
 *
 * Each WealthAce module declares its own *canonical fields* (name, type,
 * required-ness and a rich alias list). The engine knows nothing about module
 * internals: it only maps arbitrary source columns onto these canonical
 * fields. Module database schemas are never changed to suit an upload.
 */

export type FieldType = "string" | "number" | "date" | "boolean" | "percent" | "currency";

export type CanonicalField = {
  /** Canonical key — matches the module's own input field name. */
  key: string;
  label: string;
  type: FieldType;
  required?: boolean;
  aliases: string[];
  /** Fallback used when the column is absent or blank. */
  fallback?: unknown;
  /** Sanity bounds used by validation (suspicious-value detection). */
  min?: number;
  max?: number;
  hint?: string;
};

export type ImportSchema = {
  /** Stable module key, also used as the saved-mapping scope. */
  module: string;
  label: string;
  description: string;
  /** Words that, when present in headers/filename, suggest this module. */
  signals: string[];
  fields: CanonicalField[];
  /** Keys used to detect duplicate rows within the file / against existing data. */
  dedupeKeys: string[];
};

const MONEY_MAX = 1e13;

export const INVESTMENTS_SCHEMA: ImportSchema = {
  module: "investments",
  label: "Investments & Portfolio",
  description: "Holdings from a broker, mutual fund platform, or portfolio report.",
  signals: ["holding", "portfolio", "isin", "ltp", "cmp", "nav", "folio", "scrip", "security", "units", "avg", "invested"],
  dedupeKeys: ["name", "symbol", "quantity"],
  fields: [
    {
      key: "name",
      label: "Instrument Name",
      type: "string",
      required: true,
      aliases: [
        "name", "instrument name", "instrument", "security name", "security", "scheme name", "scheme",
        "stock name", "company name", "company", "scrip name", "scrip", "particulars", "description",
        "fund name", "asset name", "holding", "holding name", "title",
      ],
    },
    {
      key: "symbol",
      label: "Symbol / ISIN",
      type: "string",
      aliases: ["symbol", "ticker", "ticker symbol", "code", "scrip code", "isin", "isin code", "nse symbol", "bse code", "folio", "folio no", "instrument code"],
    },
    {
      key: "category",
      label: "Category",
      type: "string",
      fallback: "Others",
      aliases: ["category", "asset class", "asset type", "instrument type", "type", "segment", "product", "product type", "scheme category", "class"],
    },
    {
      key: "sub_category",
      label: "Sub Category",
      type: "string",
      aliases: ["sub category", "subcategory", "sub type", "sector", "sub segment", "scheme sub category", "industry"],
    },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      required: true,
      min: 0,
      max: 1e12,
      aliases: ["quantity", "qty", "units", "unit", "units held", "no of shares", "number of shares", "shares", "no of units", "balance units", "closing balance units", "holding qty", "net qty", "quantity available", "free qty"],
    },
    {
      key: "avg_price",
      label: "Average Cost",
      type: "number",
      required: true,
      min: 0,
      max: MONEY_MAX,
      aliases: ["avg price", "average price", "average cost", "avg cost", "buy avg", "avg buy", "avg buy price", "average buy price", "buy price", "purchase price", "cost price", "avg nav", "purchase nav", "average rate", "avg rate", "rate", "cost per unit", "price per unit"],
    },
    {
      key: "current_price",
      label: "Current Price",
      type: "number",
      required: true,
      min: 0,
      max: MONEY_MAX,
      aliases: ["current price", "market price", "ltp", "last price", "last traded price", "cmp", "close price", "closing price", "nav", "current nav", "latest nav", "present price", "price"],
    },
    {
      key: "invested_value",
      label: "Invested Amount",
      type: "number",
      min: 0,
      max: MONEY_MAX,
      aliases: ["invested value", "invested amount", "invested", "cost value", "cost", "total cost", "purchase value", "purchase amount", "principal", "book value", "buy value", "amount invested", "investment value", "net investment"],
      hint: "Derived from quantity × average cost when absent.",
    },
    {
      key: "current_value",
      label: "Current Value",
      type: "number",
      min: 0,
      max: MONEY_MAX,
      aliases: ["current value", "market value", "valuation", "present value", "value", "market val", "closing value", "current amount", "holding value", "net value", "mkt value"],
      hint: "Derived from quantity × current price when absent.",
    },
    { key: "currency", label: "Currency", type: "currency", fallback: "INR", aliases: ["currency", "ccy", "curr", "trade currency"] },
    { key: "purchase_date", label: "Purchase Date", type: "date", aliases: ["purchase date", "buy date", "date of purchase", "trade date", "transaction date", "investment date", "date", "acquired on", "start date"] },
    { key: "maturity_date", label: "Maturity Date", type: "date", aliases: ["maturity date", "maturity", "matures on", "redemption date", "end date"] },
    { key: "exchange", label: "Exchange", type: "string", aliases: ["exchange", "exch", "market", "listed on"] },
    { key: "is_sip", label: "Is SIP", type: "boolean", aliases: ["is sip", "sip", "sip flag", "recurring"] },
    { key: "sip_amount", label: "SIP Amount", type: "number", min: 0, aliases: ["sip amount", "monthly sip", "installment amount", "instalment amount", "recurring amount"] },
    { key: "sip_frequency", label: "SIP Frequency", type: "string", aliases: ["sip frequency", "frequency", "sip type"] },
    { key: "sip_next_date", label: "SIP Next Date", type: "date", aliases: ["sip next date", "next sip date", "next installment", "next due date"] },
    { key: "status", label: "Status", type: "string", fallback: "active", aliases: ["status", "state", "holding status"] },
    { key: "notes", label: "Notes", type: "string", aliases: ["notes", "note", "remarks", "comment", "comments", "narration"] },
  ],
};

export const TRANSACTIONS_SCHEMA: ImportSchema = {
  module: "transactions",
  label: "Money — Transactions",
  description: "Bank / card statements and expense trackers.",
  signals: ["narration", "withdrawal", "deposit", "debit", "credit", "statement", "merchant", "expense", "income", "balance", "particulars"],
  dedupeKeys: ["occurred_on", "amount", "merchant"],
  fields: [
    { key: "occurred_on", label: "Date", type: "date", required: true, aliases: ["date", "txn date", "transaction date", "value date", "tran date", "posting date", "occurred on", "booking date", "payment date", "date of transaction"] },
    { key: "merchant", label: "Merchant / Description", type: "string", required: true, aliases: ["merchant", "description", "narration", "particulars", "details", "remarks", "payee", "vendor", "transaction remarks", "narrative", "name", "reference"] },
    { key: "amount", label: "Amount", type: "number", required: true, min: 0, max: MONEY_MAX, aliases: ["amount", "transaction amount", "amt", "txn amount", "value", "debit", "withdrawal", "withdrawal amt", "withdrawal amount", "credit", "deposit", "deposit amt", "deposit amount", "spend"] },
    { key: "kind", label: "Type (income / expense)", type: "string", fallback: "expense", aliases: ["kind", "type", "transaction type", "txn type", "dr cr", "debit credit", "cr dr", "direction", "in out"] },
    { key: "category", label: "Category", type: "string", aliases: ["category", "category name", "expense category", "head", "group", "tag"] },
    { key: "note", label: "Note", type: "string", aliases: ["note", "notes", "comment", "comments", "memo", "reference no", "ref no", "cheque no", "utr"] },
    /* Bank-statement shaped columns — used to derive amount + kind. */
    { key: "debit", label: "Debit / Withdrawal", type: "number", min: 0, max: MONEY_MAX, aliases: ["debit", "debit amount", "withdrawal", "withdrawal amt", "withdrawal amount", "dr amount", "dr amt", "paid out", "money out"] },
    { key: "credit", label: "Credit / Deposit", type: "number", min: 0, max: MONEY_MAX, aliases: ["credit", "credit amount", "deposit", "deposit amt", "deposit amount", "cr amount", "cr amt", "paid in", "money in"] },
    { key: "raw_amount", label: "Amount (Dr/Cr)", type: "string", aliases: ["amount dr cr", "amount dr/cr", "amount(dr/cr)", "dr cr amount", "transaction amount dr cr"] },
    { key: "balance", label: "Balance", type: "number", max: MONEY_MAX, aliases: ["balance", "closing balance", "running balance", "bal", "available balance", "balance amount"] },
    { key: "reference", label: "Reference", type: "string", aliases: ["reference", "reference no", "ref no", "ref", "chq no", "cheque no", "chq/ref no", "transaction id", "txn id", "utr", "utr no"] },

  ],
};

export const ASSETS_SCHEMA: ImportSchema = {
  module: "assets",
  label: "Assets",
  description: "Property, gold, vehicles and other owned assets.",
  signals: ["asset", "property", "gold", "valuation", "current value", "purchase value"],
  dedupeKeys: ["name", "current_value"],
  fields: [
    { key: "name", label: "Asset Name", type: "string", required: true, aliases: ["name", "asset name", "asset", "description", "particulars", "title", "item"] },
    { key: "category", label: "Category", type: "string", required: true, fallback: "Others", aliases: ["category", "asset type", "type", "asset class", "class", "group"] },
    { key: "sub_category", label: "Sub Category", type: "string", aliases: ["sub category", "subcategory", "sub type", "variant"] },
    { key: "current_value", label: "Current Value", type: "number", required: true, min: 0, max: MONEY_MAX, aliases: ["current value", "market value", "value", "valuation", "present value", "worth", "current worth", "estimated value"] },
    { key: "purchase_value", label: "Purchase Value", type: "number", min: 0, max: MONEY_MAX, aliases: ["purchase value", "cost", "purchase price", "buy value", "acquisition cost", "invested", "invested value", "book value"] },
    { key: "purchase_date", label: "Purchase Date", type: "date", aliases: ["purchase date", "buy date", "acquired on", "date", "date of purchase"] },
    { key: "quantity", label: "Quantity", type: "number", min: 0, aliases: ["quantity", "qty", "units", "weight", "grams", "area"] },
    { key: "unit", label: "Unit", type: "string", aliases: ["unit", "uom", "measure", "unit of measure"] },
    { key: "location", label: "Location", type: "string", aliases: ["location", "place", "city", "address", "stored at", "held at"] },
    { key: "status", label: "Status", type: "string", fallback: "active", aliases: ["status", "state"] },
    { key: "notes", label: "Notes", type: "string", aliases: ["notes", "note", "remarks", "comment"] },
  ],
};

export const LIABILITIES_SCHEMA: ImportSchema = {
  module: "liabilities",
  label: "Liabilities & Loans",
  description: "Loans, EMIs and credit outstanding.",
  signals: ["loan", "emi", "outstanding", "principal", "interest", "lender", "tenure", "liability"],
  dedupeKeys: ["name", "outstanding"],
  fields: [
    { key: "name", label: "Loan Name", type: "string", required: true, aliases: ["name", "loan name", "liability", "liability name", "account name", "description", "particulars", "loan account"] },
    { key: "category", label: "Category", type: "string", required: true, fallback: "Others", aliases: ["category", "loan type", "type", "product", "facility type", "class"] },
    { key: "lender", label: "Lender", type: "string", aliases: ["lender", "bank", "institution", "provider", "financier", "nbfc", "bank name"] },
    { key: "outstanding", label: "Outstanding", type: "number", required: true, min: 0, max: MONEY_MAX, aliases: ["outstanding", "outstanding amount", "balance", "outstanding balance", "principal outstanding", "loan balance", "current balance", "amount due", "payable", "closing balance"] },
    { key: "principal", label: "Principal", type: "number", min: 0, max: MONEY_MAX, aliases: ["principal", "loan amount", "sanctioned amount", "disbursed amount", "original amount", "borrowed amount"] },
    { key: "emi", label: "EMI", type: "number", min: 0, aliases: ["emi", "emi amount", "installment", "instalment", "monthly payment", "monthly emi", "repayment"] },
    { key: "interest_rate", label: "Interest Rate %", type: "percent", min: 0, max: 100, aliases: ["interest rate", "rate of interest", "roi", "interest", "rate", "apr", "annual rate"] },
    { key: "tenure_months", label: "Tenure (months)", type: "number", min: 0, max: 1200, aliases: ["tenure months", "tenure", "term", "tenure in months", "months", "duration", "no of emis"] },
    { key: "start_date", label: "Start Date", type: "date", aliases: ["start date", "disbursal date", "loan start date", "from date", "date"] },
    { key: "end_date", label: "End Date", type: "date", aliases: ["end date", "maturity date", "closure date", "to date", "last emi date"] },
    { key: "due_date", label: "Due Date", type: "date", aliases: ["due date", "next due date", "emi date", "payment due"] },
    { key: "status", label: "Status", type: "string", fallback: "active", aliases: ["status", "state", "loan status"] },
    { key: "notes", label: "Notes", type: "string", aliases: ["notes", "note", "remarks", "comment"] },
  ],
};

export const INSURANCE_SCHEMA: ImportSchema = {
  module: "insurance",
  label: "Insurance",
  description: "Life, health and general insurance policies.",
  signals: ["policy", "premium", "sum assured", "insured", "cover", "renewal", "insurer"],
  dedupeKeys: ["policy_name", "policy_number"],
  fields: [
    { key: "policy_name", label: "Policy Name", type: "string", required: true, aliases: ["policy name", "name", "plan name", "plan", "policy", "product name", "description"] },
    { key: "policy_number", label: "Policy Number", type: "string", aliases: ["policy number", "policy no", "policy id", "certificate no", "number"] },
    { key: "policy_type", label: "Policy Type", type: "string", required: true, fallback: "Other", aliases: ["policy type", "type", "insurance type", "category", "plan type", "cover type"] },
    { key: "provider", label: "Provider", type: "string", aliases: ["provider", "insurer", "company", "insurance company", "underwriter", "issuer"] },
    { key: "coverage_amount", label: "Coverage Amount", type: "number", required: true, min: 0, max: MONEY_MAX, aliases: ["coverage amount", "coverage", "sum assured", "sum insured", "cover amount", "cover", "insured amount", "sa"] },
    { key: "premium_amount", label: "Premium", type: "number", min: 0, max: MONEY_MAX, aliases: ["premium amount", "premium", "annual premium", "premium paid", "installment premium", "modal premium"] },
    { key: "premium_frequency", label: "Premium Frequency", type: "string", aliases: ["premium frequency", "frequency", "payment mode", "premium mode", "mode"] },
    { key: "start_date", label: "Start Date", type: "date", aliases: ["start date", "commencement date", "issue date", "policy start date", "date"] },
    { key: "renewal_date", label: "Renewal Date", type: "date", aliases: ["renewal date", "next renewal", "due date", "next premium date", "renews on"] },
    { key: "end_date", label: "End Date", type: "date", aliases: ["end date", "maturity date", "expiry date", "expires on", "policy end date"] },
    { key: "status", label: "Status", type: "string", fallback: "active", aliases: ["status", "policy status", "state"] },
    { key: "notes", label: "Notes", type: "string", aliases: ["notes", "note", "remarks", "comment"] },
  ],
};

export const ACCOUNTS_SCHEMA: ImportSchema = {
  module: "accounts",
  label: "Accounts",
  description: "Bank accounts, cards and wallets.",
  signals: ["account", "ifsc", "bank", "wallet", "balance", "account number"],
  dedupeKeys: ["name", "account_number_masked"],
  fields: [
    { key: "name", label: "Account Name", type: "string", required: true, aliases: ["name", "account name", "account", "nickname", "label", "description"] },
    { key: "account_type", label: "Account Type", type: "string", required: true, fallback: "Bank Account", aliases: ["account type", "type", "category", "product", "account category"] },
    { key: "provider", label: "Provider", type: "string", aliases: ["provider", "bank", "bank name", "institution", "issuer"] },
    { key: "account_number_masked", label: "Account Number", type: "string", aliases: ["account number", "account no", "acc no", "a/c no", "card number", "masked number", "number"] },
    { key: "ifsc", label: "IFSC", type: "string", aliases: ["ifsc", "ifsc code", "swift", "routing number", "branch code"] },
    { key: "balance", label: "Balance", type: "number", required: true, max: MONEY_MAX, aliases: ["balance", "current balance", "available balance", "closing balance", "amount", "value"] },
    { key: "currency", label: "Currency", type: "currency", fallback: "INR", aliases: ["currency", "ccy", "curr"] },
    { key: "status", label: "Status", type: "string", fallback: "active", aliases: ["status", "state", "account status"] },
    { key: "notes", label: "Notes", type: "string", aliases: ["notes", "note", "remarks", "comment"] },
  ],
};

export const FAMILY_SCHEMA: ImportSchema = {
  module: "family",
  label: "Family Members",
  description: "Family, dependants and nominees.",
  signals: ["relationship", "nominee", "dependent", "dob", "date of birth", "member"],
  dedupeKeys: ["name", "relationship"],
  fields: [
    { key: "name", label: "Name", type: "string", required: true, aliases: ["name", "full name", "member name", "person", "member"] },
    { key: "relationship", label: "Relationship", type: "string", required: true, fallback: "Other", aliases: ["relationship", "relation", "relation type", "role"] },
    { key: "date_of_birth", label: "Date of Birth", type: "date", aliases: ["date of birth", "dob", "birth date", "birthday"] },
    { key: "gender", label: "Gender", type: "string", aliases: ["gender", "sex"] },
    { key: "is_dependent", label: "Is Dependent", type: "boolean", aliases: ["is dependent", "dependent", "dependant"] },
    { key: "is_nominee", label: "Is Nominee", type: "boolean", aliases: ["is nominee", "nominee"] },
    { key: "pan", label: "PAN", type: "string", aliases: ["pan", "pan number", "pan no", "tax id"] },
    { key: "email", label: "Email", type: "string", aliases: ["email", "email id", "e mail", "mail"] },
    { key: "phone", label: "Phone", type: "string", aliases: ["phone", "mobile", "mobile no", "contact", "contact number", "phone number"] },
    { key: "notes", label: "Notes", type: "string", aliases: ["notes", "note", "remarks", "comment"] },
  ],
};

export const INVESTMENT_TXNS_SCHEMA: ImportSchema = {
  module: "investment_txns",
  label: "Investment Transactions",
  description: "Buy / sell trade books and mutual fund transaction statements.",
  signals: ["buy", "sell", "trade", "trade date", "txn type", "transaction type", "order", "contract note", "rate", "traded qty", "purchase", "redemption", "switch"],
  dedupeKeys: ["occurred_on", "investment", "quantity", "price"],
  fields: [
    {
      key: "investment",
      label: "Instrument (existing holding)",
      type: "string",
      required: true,
      aliases: [
        "investment", "instrument", "instrument name", "name", "security", "security name", "scheme", "scheme name",
        "stock", "stock name", "scrip", "scrip name", "symbol", "ticker", "isin", "isin code", "company", "particulars", "description", "fund name",
      ],
      hint: "Matched against your existing holdings by name, symbol or ISIN.",
    },
    {
      key: "txn_type",
      label: "Transaction Type",
      type: "string",
      required: true,
      fallback: "buy",
      aliases: ["txn type", "transaction type", "type", "trade type", "buy sell", "buy / sell", "side", "action", "order type", "nature of transaction", "description type"],
    },
    {
      key: "quantity",
      label: "Quantity",
      type: "number",
      required: true,
      min: 0,
      max: 1e12,
      aliases: ["quantity", "qty", "units", "unit", "no of shares", "number of shares", "shares", "no of units", "traded qty", "filled qty", "executed quantity"],
    },
    {
      key: "price",
      label: "Price / NAV",
      type: "number",
      required: true,
      min: 0,
      max: MONEY_MAX,
      aliases: ["price", "rate", "trade price", "traded price", "nav", "purchase nav", "sale nav", "unit price", "price per unit", "avg trade price", "executed price"],
    },
    {
      key: "amount",
      label: "Amount",
      type: "number",
      min: 0,
      max: MONEY_MAX,
      aliases: ["amount", "net amount", "gross amount", "total", "total amount", "value", "trade value", "consideration", "net obligation"],
      hint: "Derived from quantity x price when absent.",
    },
    {
      key: "occurred_on",
      label: "Date",
      type: "date",
      required: true,
      aliases: ["date", "trade date", "transaction date", "txn date", "order date", "value date", "posting date", "occurred on", "settlement date"],
    },
    { key: "notes", label: "Notes", type: "string", aliases: ["notes", "note", "remarks", "comment", "comments", "narration", "reference", "order id"] },
  ],
};

export const IMPORT_SCHEMAS: ImportSchema[] = [
  INVESTMENTS_SCHEMA,
  INVESTMENT_TXNS_SCHEMA,
  TRANSACTIONS_SCHEMA,
  ASSETS_SCHEMA,
  LIABILITIES_SCHEMA,
  INSURANCE_SCHEMA,
  ACCOUNTS_SCHEMA,
  FAMILY_SCHEMA,
];

export function getSchema(module: string): ImportSchema | undefined {
  return IMPORT_SCHEMAS.find((s) => s.module === module);
}
