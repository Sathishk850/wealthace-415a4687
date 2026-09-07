/**
 * Canonical registry of every asset and liability type the user can pick from.
 *
 * The picker UI is purely presentational: each entry carries its own icon and
 * colours, plus the database category / sub-category actually persisted, and
 * which module owns it ("investment" → investments table, "asset" → assets).
 */

export type AssetModule = "investment" | "asset";

export type AssetSubType = {
  key: string;
  label: string;
  /** lucide-react icon name, resolved at render time. */
  icon: string;
  iconColor: string;
  iconBg: string;
  dbCategory: string;
  dbSubCategory?: string;
  module: AssetModule;
};

export type AssetGroup = {
  key: string;
  label: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  types: AssetSubType[];
};

export type LiabilityType = {
  key: string;
  label: string;
  icon: string;
  iconColor: string;
  iconBg: string;
  dbCategory: string;
};

/* ---------------- palette ---------------- */

const EQUITY = { color: "#3FBF9F", bg: "rgba(63,191,159,0.14)" };
const DEBT = { color: "#5B8DEF", bg: "rgba(91,141,239,0.14)" };
const REALTY = { color: "#E4A11B", bg: "rgba(228,161,27,0.14)" };
const GOLD = { color: "#D4A63A", bg: "rgba(212,166,58,0.14)" };
const CASH = { color: "#4FC3C7", bg: "rgba(79,195,199,0.14)" };
const CRYPTO = { color: "#B07CF0", bg: "rgba(176,124,240,0.14)" };
const ALT = { color: "#EC7C8B", bg: "rgba(236,124,139,0.14)" };
const OTHER = { color: "#9AA4AE", bg: "rgba(154,164,174,0.14)" };
const RED = { color: "#E24B4A", bg: "rgba(226,75,74,0.14)" };

/* ---------------- quick picks ---------------- */

export const QUICK_PICKS: AssetSubType[] = [
  {
    key: "direct-stock",
    label: "Direct Stock",
    icon: "TrendingUp",
    iconColor: EQUITY.color,
    iconBg: EQUITY.bg,
    dbCategory: "Stocks",
    dbSubCategory: "Equity",
    module: "investment",
  },
  {
    key: "equity-mf",
    label: "Equity MF",
    icon: "PieChart",
    iconColor: EQUITY.color,
    iconBg: EQUITY.bg,
    dbCategory: "Mutual Funds",
    dbSubCategory: "Equity",
    module: "investment",
  },
  {
    key: "physical-gold",
    label: "Physical Gold / Silver",
    icon: "Gem",
    iconColor: GOLD.color,
    iconBg: GOLD.bg,
    dbCategory: "Gold",
    dbSubCategory: "Physical",
    module: "asset",
  },
  {
    key: "savings-account",
    label: "Savings Account",
    icon: "Landmark",
    iconColor: CASH.color,
    iconBg: CASH.bg,
    dbCategory: "Savings Account",
    module: "asset",
  },
  {
    key: "bank-fd",
    label: "Bank FD",
    icon: "PiggyBank",
    iconColor: DEBT.color,
    iconBg: DEBT.bg,
    dbCategory: "Fixed Deposit",
    dbSubCategory: "Bank FD",
    module: "investment",
  },
  {
    key: "property",
    label: "Property",
    icon: "Home",
    iconColor: REALTY.color,
    iconBg: REALTY.bg,
    dbCategory: "Property",
    module: "asset",
  },
  {
    key: "epf",
    label: "EPF / VPF",
    icon: "ShieldCheck",
    iconColor: DEBT.color,
    iconBg: DEBT.bg,
    dbCategory: "EPF",
    module: "asset",
  },
  {
    key: "ppf",
    label: "PPF",
    icon: "Vault",
    iconColor: DEBT.color,
    iconBg: DEBT.bg,
    dbCategory: "PPF",
    module: "asset",
  },
];

/* ---------------- groups ---------------- */

const inv = (
  key: string,
  label: string,
  icon: string,
  c: { color: string; bg: string },
  dbCategory: string,
  dbSubCategory?: string,
): AssetSubType => ({
  key,
  label,
  icon,
  iconColor: c.color,
  iconBg: c.bg,
  dbCategory,
  dbSubCategory,
  module: "investment",
});

const ast = (
  key: string,
  label: string,
  icon: string,
  c: { color: string; bg: string },
  dbCategory: string,
  dbSubCategory?: string,
): AssetSubType => ({
  key,
  label,
  icon,
  iconColor: c.color,
  iconBg: c.bg,
  dbCategory,
  dbSubCategory,
  module: "asset",
});

export const ASSET_GROUPS: AssetGroup[] = [
  {
    key: "equity",
    label: "Equity",
    icon: "TrendingUp",
    iconColor: EQUITY.color,
    iconBg: EQUITY.bg,
    types: [
      QUICK_PICKS[0]!,
      QUICK_PICKS[1]!,
      inv("index-fund", "Index Fund", "LineChart", EQUITY, "Mutual Funds", "Index"),
      inv("equity-etf", "Equity ETF", "CandlestickChart", EQUITY, "ETFs", "Equity"),
      inv("intl-equity", "International Equity", "Globe", EQUITY, "Stocks", "International"),
      inv("elss", "ELSS (Tax Saver)", "Receipt", EQUITY, "Mutual Funds", "ELSS"),
      inv("hybrid-fund", "Hybrid Fund", "Blend", EQUITY, "Mutual Funds", "Hybrid"),
      inv("unlisted-equity", "Unlisted / Startup Equity", "Rocket", EQUITY, "Stocks", "Unlisted"),
      inv("esop", "ESOP / RSU", "BadgeCheck", EQUITY, "Stocks", "ESOP"),
      inv("pms-aif", "PMS / AIF", "Briefcase", EQUITY, "PMS/AIF"),
    ],
  },
  {
    key: "debt",
    label: "Debt",
    icon: "Banknote",
    iconColor: DEBT.color,
    iconBg: DEBT.bg,
    types: [
      QUICK_PICKS[4]!,
      inv("corporate-fd", "Corporate FD", "Building2", DEBT, "Fixed Deposit", "Corporate FD"),
      inv("rd", "Recurring Deposit", "CalendarClock", DEBT, "Fixed Deposit", "RD"),
      QUICK_PICKS[6]!,
      QUICK_PICKS[7]!,
      ast("nps", "NPS", "ShieldCheck", DEBT, "NPS"),
      ast("ssy", "Sukanya Samriddhi", "Baby", DEBT, "SSY"),
      inv("govt-bond", "Government Bond", "Landmark", DEBT, "Bonds", "Government"),
      inv("corporate-bond", "Corporate Bond", "FileText", DEBT, "Bonds", "Corporate"),
      inv("tax-free-bond", "Tax-free Bond", "BadgePercent", DEBT, "Bonds", "Tax Free"),
      inv("sgb", "Sovereign Gold Bond", "Coins", GOLD, "Bonds", "SGB"),
      inv("tbill", "Treasury Bill", "Ticket", DEBT, "Bonds", "T-Bill"),
      inv("debt-fund", "Debt Mutual Fund", "PieChart", DEBT, "Mutual Funds", "Debt"),
      inv("liquid-fund", "Liquid Fund", "Droplets", DEBT, "Mutual Funds", "Liquid"),
      inv("debt-etf", "Debt ETF", "CandlestickChart", DEBT, "ETFs", "Debt"),
      inv("nsc-kvp", "NSC / KVP", "ScrollText", DEBT, "Govt. Savings"),
      inv("p2p", "P2P Lending", "HandCoins", DEBT, "P2P Lending"),
      inv("loan-given", "Loan Given", "ArrowLeftRight", DEBT, "Loan Given"),
    ],
  },
  {
    key: "real-estate",
    label: "Real Estate",
    icon: "Home",
    iconColor: REALTY.color,
    iconBg: REALTY.bg,
    types: [
      QUICK_PICKS[5]!,
      inv("reit", "REIT", "Building", REALTY, "REIT", "Real Estate"),
    ],
  },
  {
    key: "commodities",
    label: "Commodities",
    icon: "Gem",
    iconColor: GOLD.color,
    iconBg: GOLD.bg,
    types: [
      QUICK_PICKS[2]!,
      inv("gold-etf", "Gold ETF", "CandlestickChart", GOLD, "ETFs", "Commodity"),
      inv("gold-fund", "Gold / Silver Fund", "PieChart", GOLD, "Mutual Funds", "Commodity"),
      inv("commodity-other", "Other Commodity", "Wheat", GOLD, "Commodities"),
    ],
  },
  {
    key: "cash",
    label: "Cash & Savings",
    icon: "Wallet",
    iconColor: CASH.color,
    iconBg: CASH.bg,
    types: [
      QUICK_PICKS[3]!,
      ast("current-account", "Current Account", "Building2", CASH, "Current Account"),
      ast("cash-wallet", "Cash / Wallet", "Wallet", CASH, "Cash/Wallet"),
    ],
  },
  {
    key: "crypto",
    label: "Crypto",
    icon: "Bitcoin",
    iconColor: CRYPTO.color,
    iconBg: CRYPTO.bg,
    types: [
      inv("crypto-coin", "Cryptocurrency", "Bitcoin", CRYPTO, "Crypto"),
      inv("crypto-etf", "Crypto ETF / Fund", "CandlestickChart", CRYPTO, "ETFs", "Crypto"),
    ],
  },
  {
    key: "alternatives",
    label: "Alternatives",
    icon: "Sparkles",
    iconColor: ALT.color,
    iconBg: ALT.bg,
    types: [
      inv("invit", "InvIT", "Factory", ALT, "InvIT", "Infrastructure"),
      inv("ulip", "ULIP / Insurance Plan", "Umbrella", ALT, "ULIP"),
    ],
  },
  {
    key: "other",
    label: "Other",
    icon: "Boxes",
    iconColor: OTHER.color,
    iconBg: OTHER.bg,
    types: [ast("other-asset", "Other Asset", "Boxes", OTHER, "Other")],
  },
];

/* ---------------- liabilities ---------------- */

export const LIABILITY_TYPES: LiabilityType[] = [
  { key: "home-loan", label: "Home Loan", icon: "Home", iconColor: RED.color, iconBg: RED.bg, dbCategory: "Home Loan" },
  { key: "vehicle-loan", label: "Vehicle Loan", icon: "Car", iconColor: RED.color, iconBg: RED.bg, dbCategory: "Vehicle Loan" },
  { key: "personal-loan", label: "Personal Loan", icon: "User", iconColor: RED.color, iconBg: RED.bg, dbCategory: "Personal Loan" },
  { key: "education-loan", label: "Education Loan", icon: "GraduationCap", iconColor: RED.color, iconBg: RED.bg, dbCategory: "Education Loan" },
  { key: "credit-card", label: "Credit Card", icon: "CreditCard", iconColor: RED.color, iconBg: RED.bg, dbCategory: "Credit Card" },
  { key: "gold-loan", label: "Gold Loan", icon: "Coins", iconColor: RED.color, iconBg: RED.bg, dbCategory: "Gold Loan" },
  { key: "business-loan", label: "Business Loan", icon: "Briefcase", iconColor: RED.color, iconBg: RED.bg, dbCategory: "Business Loan" },
  { key: "friends-family", label: "Friends / Family", icon: "Users", iconColor: RED.color, iconBg: RED.bg, dbCategory: "Friends / Family" },
  { key: "other-liability", label: "Other", icon: "Boxes", iconColor: OTHER.color, iconBg: OTHER.bg, dbCategory: "Other" },
];

/** Every asset sub-type, de-duplicated by key. */
export function allAssetTypes(): AssetSubType[] {
  const seen = new Map<string, AssetSubType>();
  for (const t of QUICK_PICKS) seen.set(t.key, t);
  for (const g of ASSET_GROUPS) for (const t of g.types) if (!seen.has(t.key)) seen.set(t.key, t);
  return [...seen.values()];
}
