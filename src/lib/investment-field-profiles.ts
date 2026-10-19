/**
 * Category → field profile for Add / Edit Investment. Both the page form and
 * the edit dialog read this so they always ask for the same things.
 *
 * Two shapes:
 *  - "units": market instruments (qty × price), live price search.
 *  - "amount": principal-based products. Stored as quantity = 1,
 *    avg_price = principal / invested, current_price = current value, so
 *    valuation, XIRR, snapshots and allocation keep working unchanged.
 */
export type ProfileMode = "units" | "amount";
export type ProfileKey =
  | "market" | "mutual_fund" | "fd" | "rd" | "bond" | "scheme" | "ulip" | "pms" | "lending";

export type FieldProfile = {
  key: ProfileKey;
  mode: ProfileMode;
  search: boolean;          // instrument search + live price
  sip: boolean;             // SIP toggle
  deposit: boolean;         // rate/compounding/maturity preview (FD/RD/Bond)
  maturity: boolean;        // maturity date field
  currentValueInput: boolean; // user types current value (amount products not auto-valued)
  platformRequired: boolean;
  labels: {
    platform: string;
    quantity: string;
    price: string;
    amount: string;         // amount-mode principal label
    currentValue: string;
    date: string;
    name: string;
  };
  summary: [string, string, string];
};

const base = {
  search: false, sip: false, deposit: false, maturity: false,
  currentValueInput: true, platformRequired: false,
};

const P: Record<ProfileKey, FieldProfile> = {
  market: {
    ...base, key: "market", mode: "units", search: true, sip: true, currentValueInput: false, platformRequired: true,
    labels: { platform: "Investment Platform", quantity: "Quantity", price: "Average Buy Price", amount: "Invested amount", currentValue: "Current value", date: "Purchase Date", name: "Instrument name" },
    summary: ["Invested Amount", "Current Price (Live)", "Current Value (Live)"],
  },
  mutual_fund: {
    ...base, key: "mutual_fund", mode: "units", search: true, sip: true, currentValueInput: false, platformRequired: true,
    labels: { platform: "Investment Platform", quantity: "Units held", price: "Average NAV", amount: "Invested amount", currentValue: "Current value", date: "Purchase Date", name: "Scheme name" },
    summary: ["Invested Amount", "Current NAV (Live)", "Current Value (Live)"],
  },
  fd: {
    ...base, key: "fd", mode: "amount", deposit: true, maturity: true, currentValueInput: false, platformRequired: true,
    labels: { platform: "Bank / NBFC", quantity: "", price: "", amount: "Deposit amount (principal)", currentValue: "Value today", date: "Start Date", name: "Deposit name" },
    summary: ["Principal", "Value today", "Value at maturity"],
  },
  rd: {
    ...base, key: "rd", mode: "amount", deposit: true, maturity: true, currentValueInput: false, platformRequired: true,
    labels: { platform: "Bank / NBFC", quantity: "", price: "", amount: "Monthly instalment", currentValue: "Value today", date: "Start Date", name: "Deposit name" },
    summary: ["Invested so far", "Value today", "Value at maturity"],
  },
  bond: {
    ...base, key: "bond", mode: "units", deposit: true, maturity: true, currentValueInput: false, platformRequired: true,
    labels: { platform: "Platform / Broker", quantity: "No. of bonds", price: "Purchase price per bond", amount: "", currentValue: "Value today", date: "Purchase Date", name: "Bond name / ISIN" },
    summary: ["Invested", "Value today", "Value at maturity"],
  },
  scheme: {
    ...base, key: "scheme", mode: "amount", maturity: true,
    labels: { platform: "Provider / Account", quantity: "", price: "", amount: "Amount contributed", currentValue: "Current balance", date: "Start Date", name: "Account / scheme name" },
    summary: ["Contributed", "Current balance", "Gain"],
  },
  ulip: {
    ...base, key: "ulip", mode: "amount", maturity: true,
    labels: { platform: "Insurer", quantity: "", price: "", amount: "Total premium paid", currentValue: "Fund value", date: "Policy start date", name: "Policy / fund name" },
    summary: ["Premium paid", "Fund value", "Gain"],
  },
  pms: {
    ...base, key: "pms", mode: "amount",
    labels: { platform: "Manager / fund house", quantity: "", price: "", amount: "Invested amount", currentValue: "Current value", date: "Start Date", name: "Strategy / fund name" },
    summary: ["Invested", "Current value", "Gain"],
  },
  lending: {
    ...base, key: "lending", mode: "amount", deposit: false, maturity: true,
    labels: { platform: "Borrower / platform", quantity: "", price: "", amount: "Principal lent", currentValue: "Outstanding (current value)", date: "Lent on", name: "Loan name" },
    summary: ["Principal lent", "Outstanding", "Gain"],
  },
};

const BY_CATEGORY: Record<string, ProfileKey> = {
  Stocks: "market", ETFs: "market", REIT: "market", InvIT: "market", Crypto: "market", Commodities: "market",
  "Mutual Funds": "mutual_fund",
  "Fixed Deposit": "fd", "Recurring Deposit": "rd", Bonds: "bond",
  NPS: "scheme", SSY: "scheme", "Govt. Savings": "scheme", Retirement: "scheme",
  ULIP: "ulip", Insurance: "ulip",
  "PMS/AIF": "pms",
  "P2P Lending": "lending", "Loan Given": "lending",
};

export function profileFor(category?: string | null, depositKind?: string | null): FieldProfile {
  if (depositKind === "rd") return P.rd;
  if (depositKind === "fd" && category !== "Bonds") return P.fd;
  return P[BY_CATEGORY[category ?? ""] ?? "market"];
}

export type ProfileInput = {
  name: string;
  platform: string;
  purchase_date: string;
  quantity: number;
  avg_price: number;      // units mode
  amount: number;         // amount mode principal (RD: instalment)
  current_value: number | null; // amount mode, user-typed
  interest_rate?: number | null;
  maturity_date?: string | null;
};

/** Returns the first validation error, or null when savable. */
export function validateProfile(p: FieldProfile, v: ProfileInput): string | null {
  if (!v.name.trim()) return "Please select or enter a name first";
  if (p.platformRequired && !v.platform.trim()) return `${p.labels.platform} is required`;
  if (p.mode === "units") {
    if (!(v.quantity > 0)) return `${p.labels.quantity} must be greater than zero`;
    if (!(v.avg_price > 0)) return `${p.labels.price} must be greater than zero`;
  } else if (!(v.amount > 0)) {
    return `${p.labels.amount} must be greater than zero`;
  }
  if (!v.purchase_date) return `${p.labels.date} is required`;
  if ((p.key === "fd" || p.key === "rd") && !(Number(v.interest_rate) > 0)) return "Interest rate is required";
  if ((p.key === "fd" || p.key === "rd") && !v.maturity_date) return "Maturity date is required";
  if (v.maturity_date && v.purchase_date && v.maturity_date < v.purchase_date) return "Maturity date must be after the start date";
  return null;
}

/** Maps profile values onto the stored quantity / avg_price / current_price columns. */
export function mapToStorage(p: FieldProfile, v: ProfileInput, livePrice: number | null) {
  if (p.mode === "units") {
    return { quantity: v.quantity, avg_price: v.avg_price, current_price: livePrice ?? v.avg_price };
  }
  const current = p.currentValueInput && v.current_value != null && v.current_value > 0 ? v.current_value : v.amount;
  return {
    quantity: 1,
    avg_price: v.amount,
    current_price: current,
    rd_installment_amount: p.key === "rd" ? v.amount : undefined,
  };
}

/** Reverse of mapToStorage for edit forms. */
export function readFromStorage(p: FieldProfile, row: { quantity?: number | null; avg_price?: number | null; current_price?: number | null; rd_installment_amount?: number | null }) {
  const q = Number(row.quantity) || 0;
  const a = Number(row.avg_price) || 0;
  if (p.mode === "units") return { quantity: q, avg_price: a, amount: q * a, current_value: null as number | null };
  const amount = p.key === "rd" ? Number(row.rd_installment_amount) || a : q * a;
  const cur = row.current_price != null ? Number(row.current_price) * (q || 1) : null;
  return { quantity: 1, avg_price: amount, amount, current_value: cur };
}

/** True when a holding should be displayed as amount-based (no "qty × price"). */
export function isAmountHolding(category?: string | null, depositKind?: string | null) {
  return profileFor(category, depositKind).mode === "amount";
}
