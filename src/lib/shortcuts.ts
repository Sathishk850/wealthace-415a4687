/**
 * Global shortcut routing map.
 *
 * Single source of truth for every deep link in the app. Used by the quick-nav
 * command palette (Cmd/Ctrl-K) and the Shortcuts widget. Tab-level targets use
 * a hash so they survive bookmarking and sharing (see use-tab-param.ts).
 */
export type Shortcut = {
  id: string;
  label: string;
  group: "Dashboard" | "Wealth" | "Money" | "Planner" | "Tools" | "Account";
  path: string;
  keywords?: string;
};

export const SHORTCUTS: Shortcut[] = [
  { id: "dashboard", label: "Dashboard", group: "Dashboard", path: "/dashboard", keywords: "home summary" },
  { id: "networth", label: "Net Worth & History", group: "Dashboard", path: "/dashboard/networth", keywords: "net worth snapshot trend" },

  { id: "wealth", label: "Wealth Overview", group: "Wealth", path: "/wealth#overview", keywords: "portfolio allocation" },
  { id: "assets", label: "Holdings & Assets", group: "Wealth", path: "/wealth#assets", keywords: "stocks mutual funds etf gold" },
  { id: "liabilities", label: "Liabilities & Loans", group: "Wealth", path: "/wealth#liabilities", keywords: "loan emi debt" },
  { id: "insurance", label: "Insurance Policies", group: "Wealth", path: "/wealth#insurance", keywords: "policy premium cover" },
  { id: "accounts", label: "Bank & Demat Accounts", group: "Wealth", path: "/wealth#accounts", keywords: "bank balance demat" },
  { id: "sip", label: "SIP Tracker", group: "Wealth", path: "/wealth#siptracker", keywords: "sip systematic investment" },
  { id: "add-investment", label: "Add Investment", group: "Wealth", path: "/wealth/add-investment", keywords: "new holding buy stock" },

  { id: "money", label: "Transactions", group: "Money", path: "/money#transactions", keywords: "ledger spend" },
  { id: "income", label: "Income", group: "Money", path: "/money#income", keywords: "salary earnings" },
  { id: "expenses", label: "Expenses", group: "Money", path: "/money#expenses", keywords: "spending outflow" },
  { id: "budgets", label: "Budgets", group: "Money", path: "/money#budgets", keywords: "limit category budget" },
  { id: "import", label: "Import Bank Statement", group: "Money", path: "/money#import", keywords: "csv excel hdfc sbi icici upload" },

  { id: "planner", label: "Planner Overview", group: "Planner", path: "/planner#overview", keywords: "plan" },
  { id: "goals", label: "Goals", group: "Planner", path: "/planner#goals", keywords: "goal target saving" },
  { id: "retirement", label: "Retirement Plan", group: "Planner", path: "/planner#retirement", keywords: "retire corpus pension" },
  { id: "fire", label: "FIRE Plan", group: "Planner", path: "/planner#fire", keywords: "financial independence" },


  { id: "tools", label: "Tools Overview", group: "Tools", path: "/tools#overview", keywords: "utilities" },
  { id: "reports", label: "Reports Generator", group: "Tools", path: "/tools#reports", keywords: "pdf excel export statement" },
  { id: "report-center", label: "Report Center", group: "Tools", path: "/reports", keywords: "generated reports download" },
  { id: "calculators", label: "Financial Calculators", group: "Tools", path: "/tools#calculators", keywords: "sip emi lumpsum calculator" },
  { id: "reminders", label: "Reminders", group: "Tools", path: "/tools#reminders", keywords: "due bills alerts" },
  { id: "ai-insights", label: "AI Insights", group: "Tools", path: "/tools#ai-insights", keywords: "tips recommendations" },
  { id: "insights-page", label: "Insights & Alerts", group: "Tools", path: "/tools#insights", keywords: "observations reminders banner" },

  { id: "notifications", label: "Notifications", group: "Account", path: "/notifications", keywords: "alerts inbox" },
  { id: "profile", label: "My Profile", group: "Account", path: "/profile", keywords: "name avatar" },
  { id: "settings", label: "Settings", group: "Account", path: "/settings#general", keywords: "preferences currency theme" },
  { id: "settings-security", label: "Security & PIN", group: "Account", path: "/settings#security", keywords: "pin password security" },
  { id: "settings-notifications", label: "Notification Preferences", group: "Account", path: "/settings#notifications", keywords: "email push quiet hours" },
  { id: "feedback", label: "Send Feedback", group: "Account", path: "/feedback", keywords: "bug feature support" },
  { id: "whats-new", label: "What's New", group: "Account", path: "/whats-new", keywords: "release notes changelog" },
];

export const SHORTCUT_GROUPS = [
  "Dashboard",
  "Wealth",
  "Money",
  "Planner",
  "Tools",
  "Account",
] as const;
