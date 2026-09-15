/**
 * Per-asset-type field specification for the shared Add Asset form.
 *
 * The form shell (name, currency, held-in-account, current value, details,
 * flags, actions) is identical for every type — only the fields described here
 * change. Keys match `src/lib/asset-types.ts`.
 */

import { allAssetTypes, type AssetSubType } from "@/lib/asset-types";

export type NumField = { label: string; placeholder?: string };

export type FormFieldType = "text" | "number" | "select" | "date" | "textarea";

export type FormField = {
  key: string;
  label: string;
  type: FormFieldType;
  required?: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  /** Auto-calculated from other fields. */
  calculated?: boolean;
  calcFrom?: [string, string];
  calcOp?: "multiply" | "subtract";
  /** Only visible when another field matches a value. */
  showWhen?: { field: string; value: string };
};

export type AssetFormSpec = {
  key: string;
  label: string;
  module: "investment" | "asset";
  dbCategory: string;
  dbSubCategory?: string;
  namePlaceholder: string;
  /** Show the "Held in account" dropdown. */
  accountField: boolean;
  accountPlaceholder: string;
  quantity?: NumField;
  price?: NumField;
  secondary: {
    label: string;
    placeholder?: string;
    helper?: string;
    /** Auto-calculated from quantity × price. */
    auto?: "shares" | "units";
  };
  /** Live-price search box: ticker search, fund search or crypto search. */
  livePrice?: "stock" | "fund" | "crypto";
  /** Which configured accounts the "Held in account" selector should offer. */
  accountKind?: "market" | "bank";
  /** Show the "Customize asset allocation split" link. */
  allocationSplit?: boolean;
  /** Show the "Interest & maturity" sub-section. */
  interestSection?: boolean;
  /** Recurring-deposit extras (monthly instalment + paid frequency). */
  recurring?: boolean;
  /** Equity allocation % segmented control. */
  equityAllocation?: boolean;
  /** NPS three-way split sliders (Equity / Debt / Alternative). */
  npsAllocation?: boolean;
  /** Fully custom per-type field list (non-market asset types). */
  fields?: FormField[];
  /** Placeholder for the live-price ticker search box. */
  tickerSearchPlaceholder?: string;
  /** Label for the dividend/distribution field. */
  dividendLabel?: string;
  /** Show the dividend received field (market types). */
  dividendReceived?: boolean;
};

const TOTAL_INVESTED_SHARES = {
  label: "Total Invested",
  placeholder: "Total amount invested",
  auto: "shares" as const,
};
const TOTAL_INVESTED_UNITS = {
  label: "Total Invested",
  placeholder: "Total amount invested",
  auto: "units" as const,
};

const SHARES = { label: "No. of Shares", placeholder: "e.g. 100" };
const AVG_PRICE = { label: "Avg. Purchase Price", placeholder: "e.g. 1500" };
const UNITS = { label: "Units Held", placeholder: "e.g. 250.456" };
const AVG_NAV = { label: "Avg. NAV", placeholder: "e.g. 45.20" };

const FD_SECONDARY = {
  label: "Principal Amount",
  placeholder: "Total principal deposited",
  helper: "Enables gain/loss tracking against maturity value",
};

const SPECS: Record<string, Partial<AssetFormSpec>> = {
  /* ---------- Equity ---------- */
  "direct-stock": {
    namePlaceholder: "e.g. Reliance Industries",
    accountPlaceholder: "e.g. Groww Portfolio or HDFC Bank",
    quantity: SHARES,
    price: AVG_PRICE,
    secondary: TOTAL_INVESTED_SHARES,
    livePrice: "stock",
  },
  "equity-mf": {
    namePlaceholder: "e.g. Parag Parikh Flexi Cap Fund",
    quantity: UNITS,
    price: AVG_NAV,
    secondary: TOTAL_INVESTED_UNITS,
    livePrice: "fund",
  },
  "hybrid-fund": {
    namePlaceholder: "e.g. HDFC Balanced Advantage Fund",
    quantity: UNITS,
    price: AVG_NAV,
    secondary: TOTAL_INVESTED_UNITS,
    livePrice: "fund",
    allocationSplit: true,
  },
  "arbitrage-fund": {
    label: "Arbitrage Fund",
    module: "investment",
    dbCategory: "Mutual Funds",
    dbSubCategory: "Arbitrage",
    namePlaceholder: "e.g. Kotak Equity Arbitrage Fund",
    quantity: UNITS,
    price: AVG_NAV,
    secondary: TOTAL_INVESTED_UNITS,
    livePrice: "fund",
    allocationSplit: true,
  },
  "equity-etf": {
    namePlaceholder: "e.g. Nippon India Nifty 50 ETF",
    quantity: UNITS,
    price: AVG_NAV,
    secondary: TOTAL_INVESTED_UNITS,
    livePrice: "stock",
    allocationSplit: true,
  },
  esop: {
    namePlaceholder: "e.g. Employer RSU grant",
    accountField: false,
    quantity: { label: "Shares / RSUs", placeholder: "e.g. 500" },
    price: AVG_PRICE,
    secondary: TOTAL_INVESTED_SHARES,
    livePrice: "stock",
  },
  "unlisted-equity": {
    namePlaceholder: "e.g. Startup Pvt Ltd",
    quantity: SHARES,
    price: AVG_PRICE,
    secondary: TOTAL_INVESTED_SHARES,
    livePrice: "stock",
  },
  nps: {
    namePlaceholder: "e.g. NPS Tier 1",
    accountField: false,
    secondary: {
      label: "Total Contributions",
      placeholder: "Cumulative contributions",
      helper: "Enables gain/loss tracking against corpus",
    },
    allocationSplit: true,
    equityAllocation: false,
    npsAllocation: true,
  },
  ulip: {
    namePlaceholder: "e.g. HDFC Life Click 2 Wealth",
    secondary: {
      label: "Premiums Paid",
      placeholder: "Cumulative premiums paid",
      helper: "Enables gain/loss tracking against fund value",
    },
    allocationSplit: true,
  },
  "pms-aif": {
    namePlaceholder: "e.g. Motilal Oswal PMS",
    quantity: UNITS,
    price: AVG_NAV,
    secondary: TOTAL_INVESTED_UNITS,
    livePrice: "fund",
  },

  /* ---------- Debt: FD / RD / Bond ---------- */
  "bank-fd": {
    namePlaceholder: "e.g. SBI FD 3yr",
    secondary: FD_SECONDARY,
    interestSection: true,
  },
  "corporate-fd": {
    namePlaceholder: "e.g. Bajaj Finance FD",
    secondary: FD_SECONDARY,
    interestSection: true,
  },
  rd: {
    namePlaceholder: "e.g. HDFC RD 2yr",
    secondary: FD_SECONDARY,
    interestSection: true,
    recurring: true,
  },
  "govt-bond": {
    namePlaceholder: "e.g. GOI 7.26% 2033",
    secondary: {
      label: "Purchase Price",
      placeholder: "Face value or purchase price",
      helper: "Enables gain/loss tracking",
    },
    interestSection: true,
  },

  /* ---------- Govt schemes ---------- */
  ppf: {
    namePlaceholder: "e.g. PPF — SBI",
    accountField: false,
    secondary: {
      label: "Total Contributions",
      placeholder: "Cumulative contributions",
      helper: "Enables gain/loss tracking against corpus",
    },
    equityAllocation: true,
  },
  epf: {
    namePlaceholder: "e.g. EPF — Employer",
    accountField: false,
    secondary: {
      label: "Total Contributions",
      placeholder: "Cumulative contributions",
      helper: "Enables gain/loss tracking against corpus",
    },
    equityAllocation: true,
    allocationSplit: true,
  },
  ssy: {
    namePlaceholder: "e.g. Sukanya Samriddhi — Daughter",
    accountField: false,
    secondary: {
      label: "Total Deposits",
      placeholder: "Cumulative deposits",
      helper: "Enables gain/loss tracking",
    },
  },
  "nsc-kvp": {
    namePlaceholder: "e.g. NSC VIII Issue",
    accountField: false,
    secondary: {
      label: "Total Contributions",
      placeholder: "Cumulative contributions",
      helper: "Enables gain/loss tracking against corpus",
    },
    equityAllocation: true,
  },

  /* ---------- Debt mutual fund ---------- */
  "debt-fund": {
    namePlaceholder: "e.g. ICICI Corporate Bond Fund",
    quantity: UNITS,
    price: AVG_NAV,
    secondary: {
      label: "Total Invested",
      placeholder: "Total amount invested",
      helper: "Optional — enables gain/loss tracking",
      auto: "units",
    },
    livePrice: "fund",
  },

  /* ---------- Physical assets / property / cash ---------- */
  "physical-gold": {
    label: "Physical Gold / Silver",
    module: "asset",
    dbCategory: "Commodity",
    namePlaceholder: "e.g. 22K gold bangles",
    accountField: false,
    secondary: {
      label: "Invested Value",
      placeholder: "Weight × purchase price per gram",
      helper: "Auto-calculated from weight and purchase price",
    },
    fields: [
      { key: "metal", label: "Metal", type: "select", required: true, options: ["Gold", "Silver"] },
      { key: "form", label: "Form", type: "select", required: true, options: ["Coin", "Bar", "Jewellery", "Other"] },
      { key: "weight", label: "Weight in grams", type: "number", required: true },
      {
        key: "purity",
        label: "Purity",
        type: "select",
        required: true,
        options: ["24K (99.9%)", "22K (91.7%)", "18K (75%)", "14K (58.3%)", "999 Fine (Silver)", "925 Sterling (Silver)", "Other"],
        defaultValue: "24K (99.9%)",
      },
      { key: "purchasePrice", label: "Purchase Price per gram", type: "number", required: true },
      { key: "purchaseDate", label: "Purchase Date", type: "date" },
      {
        key: "currentPrice",
        label: "Current Rate per gram (24K base)",
        type: "number",
        placeholder: "Auto-filled from GOLDBEES live rate",
      },
      {
        key: "investmentValue",
        label: "Investment Value",
        type: "number",
        calculated: true,
        calcFrom: ["weight", "purchasePrice"],
        calcOp: "multiply",
      },
      {
        key: "currentValue",
        label: "Current Value",
        type: "number",
        required: true,
        calculated: true,
        calcFrom: ["weight", "currentPrice"],
        calcOp: "multiply",
      },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  property: {
    label: "Property",
    module: "asset",
    dbCategory: "Real Estate",
    namePlaceholder: "e.g. 2BHK, Whitefield",
    accountField: false,
    secondary: {
      label: "Purchase Price",
      placeholder: "Total purchase price",
      helper: "Enables gain/loss tracking against market value",
    },
    fields: [
      { key: "propertyType", label: "Property Type", type: "select", required: true, options: ["Residential", "Commercial", "Land", "Other"] },
      { key: "propertyName", label: "Property Name / Address", type: "text", required: true },
      { key: "purchaseDate", label: "Purchase Date", type: "date" },
      { key: "purchasePrice", label: "Purchase Price", type: "number", required: true },
      { key: "stampDuty", label: "Registration & Stamp Duty", type: "number" },
      { key: "currentMarketValue", label: "Current Market Value", type: "number", required: true },
      { key: "rentalIncome", label: "Monthly Rental Income", type: "number" },
      { key: "ownershipPct", label: "Ownership %", type: "number", placeholder: "e.g. 100" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
  "savings-account": {
    label: "Savings Account",
    module: "asset",
    dbCategory: "Savings",
    namePlaceholder: "e.g. HDFC Salary Account",
    accountKind: "bank",
    secondary: {
      label: "Current Balance",
      placeholder: "Current account balance",
    },
    fields: [
      { key: "bank", label: "Bank Name", type: "text", required: true },
      { key: "accountName", label: "Account Name / Nickname", type: "text" },
      { key: "accountNumber", label: "Account Number (masked)", type: "text", placeholder: "e.g. XXXX1234" },
      { key: "currentBalance", label: "Current Balance", type: "number", required: true },
      { key: "interestRate", label: "Interest Rate (%)", type: "number" },
      { key: "jointOrSingle", label: "Account Type", type: "select", options: ["Single", "Joint"] },
      {
        key: "jointHolder",
        label: "Joint Holder Name",
        type: "text",
        showWhen: { field: "jointOrSingle", value: "Joint" },
      },
      { key: "lastUpdated", label: "Last Updated", type: "date" },
    ],
  },
  "current-account": {
    label: "Current Account",
    module: "asset",
    dbCategory: "Savings",
    namePlaceholder: "e.g. ICICI Business Account",
    accountKind: "bank",
    secondary: {
      label: "Current Balance",
      placeholder: "Current account balance",
    },
    fields: [
      { key: "bank", label: "Bank Name", type: "text", required: true },
      { key: "accountName", label: "Account Name / Nickname", type: "text" },
      { key: "accountNumber", label: "Account Number (masked)", type: "text", placeholder: "e.g. XXXX1234" },
      { key: "currentBalance", label: "Current Balance", type: "number", required: true },
      { key: "jointOrSingle", label: "Account Type", type: "select", options: ["Single", "Joint"] },
      {
        key: "jointHolder",
        label: "Joint Holder Name",
        type: "text",
        showWhen: { field: "jointOrSingle", value: "Joint" },
      },
      { key: "lastUpdated", label: "Last Updated", type: "date" },
    ],
  },
  "cash-wallet": {
    label: "Cash / Wallet",
    module: "asset",
    dbCategory: "Savings",
    namePlaceholder: "e.g. Home safe",
    accountField: false,
    secondary: {
      label: "Amount",
      placeholder: "Cash / wallet balance",
    },
    fields: [
      { key: "walletLocation", label: "Wallet / Location", type: "text", required: true, placeholder: "e.g. Home safe, Paytm, UPI wallet" },
      { key: "currency", label: "Currency", type: "select", options: ["INR", "USD", "EUR", "GBP", "AED", "Other"], defaultValue: "INR" },
      { key: "amount", label: "Amount", type: "number", required: true },
      { key: "lastUpdated", label: "Last Updated", type: "date" },
    ],
  },
  "loan-given": {
    label: "Loan Given",
    module: "asset",
    dbCategory: "Savings",
    namePlaceholder: "e.g. Loan to Ravi",
    accountField: false,
    secondary: {
      label: "Loan Amount",
      placeholder: "Total loan amount",
      helper: "Enables outstanding / repayment tracking",
    },
    fields: [
      { key: "borrower", label: "Borrower Name", type: "text", required: true },
      { key: "loanAmount", label: "Loan Amount", type: "number", required: true },
      { key: "amountGiven", label: "Amount Disbursed", type: "number" },
      { key: "interestRate", label: "Interest Rate (%)", type: "number" },
      { key: "startDate", label: "Start Date", type: "date" },
      { key: "expectedRepaymentDate", label: "Expected Repayment Date", type: "date" },
      { key: "amountRepaid", label: "Amount Repaid", type: "number" },
      {
        key: "outstandingAmount",
        label: "Outstanding Amount",
        type: "number",
        calculated: true,
        calcFrom: ["loanAmount", "amountRepaid"],
        calcOp: "subtract",
      },
      { key: "status", label: "Status", type: "select", options: ["Active", "Partially Repaid", "Fully Repaid", "Defaulted"] },
    ],
  },
  "other-asset": {
    label: "Other Asset",
    module: "asset",
    dbCategory: "Other",
    namePlaceholder: "e.g. Art collection",
    accountField: false,
    secondary: {
      label: "Purchase / Invested Amount",
      placeholder: "Amount invested",
      helper: "Enables gain/loss tracking",
    },
    fields: [
      { key: "name", label: "Name", type: "text", required: true },
      { key: "description", label: "Description", type: "textarea" },
      { key: "purchaseDate", label: "Purchase Date", type: "date" },
      { key: "purchasePrice", label: "Purchase / Invested Amount", type: "number" },
      { key: "currentValue", label: "Current Value", type: "number", required: true },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
  },
};

/** Bond variants share the Bond / Debenture layout. */
for (const k of ["corporate-bond", "tax-free-bond", "sgb", "tbill"]) {
  SPECS[k] = { ...SPECS["govt-bond"] };
}
/** Other fund variants behave like their equity / debt counterparts. */
for (const k of ["index-fund", "elss", "intl-equity", "gold-fund", "crypto-etf"]) {
  SPECS[k] = { ...SPECS["equity-mf"] };
}
for (const k of ["liquid-fund"]) SPECS[k] = { ...SPECS["debt-fund"] };
for (const k of ["debt-etf", "gold-etf"]) SPECS[k] = { ...SPECS["equity-etf"] };
/** Picker aliases for the fund variants. */
for (const k of ["thematic-mf", "intl-mf", "gold-mf"]) SPECS[k] = { ...SPECS["equity-mf"] };
SPECS["sgb-bond"] = { ...SPECS["govt-bond"] };

/** Listed trusts trade like ETFs on the exchange. */
for (const k of ["reit", "invit"]) {
  SPECS[k] = {
    ...SPECS["equity-etf"],
    namePlaceholder: k === "reit" ? "e.g. Embassy Office Parks REIT" : "e.g. IndiGrid InvIT",
    livePrice: "stock",
    tickerSearchPlaceholder: k === "reit" ? "Search REIT ticker..." : "Search InvIT ticker...",
    dividendLabel: "Distribution Received",
  };
}

/** Crypto tokens / ETFs get the crypto price search. */
SPECS["crypto-coin"] = {
  namePlaceholder: "e.g. Bitcoin",
  accountPlaceholder: "e.g. CoinDCX or WazirX",
  quantity: { label: "Quantity Held", placeholder: "e.g. 0.25" },
  price: { label: "Avg. Buy Price", placeholder: "e.g. 4500000" },
  secondary: TOTAL_INVESTED_UNITS,
  livePrice: "crypto",
};
SPECS["crypto-etf"] = {
  ...SPECS["equity-etf"],
  livePrice: "stock",
  tickerSearchPlaceholder: "Search crypto ETF ticker...",
  dividendReceived: false,
};

/** Bank-held asset types offer bank accounts in "Held in account". */
for (const k of [
  "bank-fd",
  "corporate-fd",
  "rd",
  "savings-account",
  "current-account",
  "cash-wallet",
  "ppf",
  "govt-bond",
  "corporate-bond",
  "tax-free-bond",
  "sgb",
  "sgb-bond",
  "tbill",
]) {
  if (SPECS[k]) SPECS[k] = { ...SPECS[k], accountKind: "bank" };
  else SPECS[k] = { accountKind: "bank" };
}

const BY_KEY = new Map(allAssetTypes().map((t) => [t.key, t] as const));

function fallbackSpec(t: AssetSubType): Partial<AssetFormSpec> {
  if (t.module === "investment") {
    return {
      quantity: UNITS,
      price: { label: "Avg. Price", placeholder: "e.g. 100" },
      secondary: TOTAL_INVESTED_UNITS,
    };
  }
  return {
    secondary: {
      label: "Invested Amount",
      placeholder: "Amount invested",
      helper: "Enables gain/loss tracking",
    },
  };
}

/** Resolves the full spec for an asset-type key. Returns null for unknown keys. */
export function assetFormSpec(key: string): AssetFormSpec | null {
  const type = BY_KEY.get(key);
  const partial = SPECS[key];
  if (!type && !partial) return null;
  const base: AssetFormSpec = {
    key,
    label: type?.label ?? partial?.label ?? key,
    module: type?.module ?? partial?.module ?? "asset",
    dbCategory: type?.dbCategory ?? partial?.dbCategory ?? "Other",
    ...(type?.dbSubCategory || partial?.dbSubCategory
      ? { dbSubCategory: type?.dbSubCategory ?? partial?.dbSubCategory }
      : {}),
    namePlaceholder: "e.g. My holding",
    accountField: true,
    accountPlaceholder: "e.g. Groww Portfolio or HDFC Bank",
    secondary: { label: "Invested Amount" },
  };
  const merged = {
    ...base,
    ...(type ? fallbackSpec(type) : {}),
    ...(partial ?? {}),
  } as AssetFormSpec;
  // Market-linked types offer broker / demat / MF accounts by default.
  if (!merged.accountKind && merged.livePrice) merged.accountKind = "market";
  return merged;
}

/** Icon / colour metadata for the "selected type" banner. */
export function assetTypeMeta(key: string): AssetSubType | undefined {
  return BY_KEY.get(key);
}
