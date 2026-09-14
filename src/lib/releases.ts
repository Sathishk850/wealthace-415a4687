export type Release = {
  version: string;
  releaseDate: string; // ISO YYYY-MM-DD
  changes: string[];
};

export const releases: Release[] = [
  {
    version: "1.10.0",
    releaseDate: "2026-09-13",
    changes: [
      "Geography Lens — See how much of your portfolio is in India vs abroad — Wealth → Allocation → Geography shows a regional breakdown by value and percentage.",
    ],
  },
  {
    version: "1.9.0",
    releaseDate: "2026-08-26",
    changes: [
      "Universal Import — bring in files from any broker or bank (Zerodha, Upstox, ICICI, Angel One, INDMoney, Kuvera, Dhan, HDFC, SBI and more). Column names don't need to match; they're mapped automatically.",
      "Column mapping review step — see how each column was mapped before committing, and fix low-confidence matches with a dropdown.",
      "Import now available on Investments, Assets, Liabilities, Insurance, Accounts, Family and Transactions.",
      "Saved mappings — your column mapping is remembered for next time.",
    ],
  },
  {
    version: "1.8.0",
    releaseDate: "2026-08-24",
    changes: [
      "Auto-fill budget from last 3 months average — select a category and get an instant suggestion.",
      "Remaining budget column — instantly see how much headroom you have per category.",
      "Burn rate projection — see if your current spend pace will exceed the budget by month-end.",
      "Copy from last month — replicate all last month's budgets to this month in one tap.",
      "Budget history chart — 6-month bar chart of budgeted vs actual spending.",
      "80% nudge badge — At Risk budgets now show a visible ⚠ 80% indicator.",
    ],
  },
  {
    version: "1.7.0",
    releaseDate: "2026-08-23",
    changes: [
      "Added UGX (Ugandan Shilling) support — track assets, investments and accounts in UGX.",
      "Live UGX conversion rates (INR, USD, EUR, GBP) in the FX Rates widget.",
    ],
  },
  {
    version: "1.6.0",
    releaseDate: "2026-07-25",
    changes: [
      "Added Investment Platform field for investments.",
      "Added automatic Asset Class and Market Cap classification.",
      "Improved Dashboard layout and spacing.",
      "Fixed Stock Price update issue.",
      "Improved app performance.",
      "Enhanced app security.",
    ],
  },
  {
    version: "1.5.0",
    releaseDate: "2026-07-10",
    changes: [
      "Added live market price fetching for Indian and US stocks.",
      "Improved instrument search performance.",
      "Fixed decimal precision in average cost.",
      "Added currency-aware valuation for global holdings.",
    ],
  },
  {
    version: "1.4.0",
    releaseDate: "2026-06-30",
    changes: [
      "Standardized chart time-range selector across all modules.",
      "Profile menu refresh with dedicated My Profile page.",
      "Settings reorganized into General, Notifications, Appearance, Security, Data & Backup.",
    ],
  },
  {
    version: "1.3.0",
    releaseDate: "2026-06-20",
    changes: [
      "Wealth module: Accounts and Family management.",
      "Investments with XIRR, CAGR, SIP tracker.",
      "Insurance with renewal reminders.",
    ],
  },
  {
    version: "1.2.0",
    releaseDate: "2026-06-10",
    changes: [
      "Report Center with PDF, Excel and CSV exports.",
      "Scheduled reports and notification preferences.",
    ],
  },
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type GroupedReleases = {
  year: number;
  months: {
    month: number; // 0-11
    monthLabel: string;
    releases: Release[];
  }[];
}[];

export function groupReleases(list: Release[] = releases): GroupedReleases {
  const byYear = new Map<number, Map<number, Release[]>>();
  const sorted = [...list].sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  for (const r of sorted) {
    const d = new Date(r.releaseDate + "T00:00:00");
    const y = d.getFullYear();
    const m = d.getMonth();
    if (!byYear.has(y)) byYear.set(y, new Map());
    const mm = byYear.get(y)!;
    if (!mm.has(m)) mm.set(m, []);
    mm.get(m)!.push(r);
  }
  return [...byYear.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, mm]) => ({
      year,
      months: [...mm.entries()]
        .sort((a, b) => b[0] - a[0])
        .map(([month, releases]) => ({
          month,
          monthLabel: MONTHS[month],
          releases,
        })),
    }));
}

export function formatReleaseDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}
