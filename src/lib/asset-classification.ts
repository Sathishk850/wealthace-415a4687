// Single source of truth for the simplified asset classification list.
// Used everywhere a user picks / changes an asset classification
// (single row actions and bulk actions).

export type AssetClassification =
  | "Stocks"
  | "Mutual Funds"
  | "ETFs"
  | "Debt"
  | "Gold"
  | "Commodities"
  | "Real Estate"
  | "Cash & Savings"
  | "Other";

export const ASSET_CLASSIFICATIONS: AssetClassification[] = [
  "Stocks",
  "Mutual Funds",
  "ETFs",
  "Debt",
  "Gold",
  "Commodities",
  "Real Estate",
  "Cash & Savings",
  "Other",
];

/** Map a simplified classification onto the stored investment category. */
export const INVESTMENT_CATEGORY_FOR: Record<AssetClassification, string> = {
  Stocks: "Stocks",
  "Mutual Funds": "Mutual Funds",
  ETFs: "ETFs",
  Debt: "Bonds",
  Gold: "Gold",
  Commodities: "Gold",
  "Real Estate": "Others",
  "Cash & Savings": "Others",
  Other: "Others",
};

/** Map a simplified classification onto the stored manual-asset category. */
export const ASSET_CATEGORY_FOR: Record<AssetClassification, string> = {
  Stocks: "Investments",
  "Mutual Funds": "Investments",
  ETFs: "Investments",
  Debt: "Investments",
  Gold: "Gold",
  Commodities: "Gold",
  "Real Estate": "Property",
  "Cash & Savings": "Cash",
  Other: "Other",
};
