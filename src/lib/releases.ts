export type Release = {
  version: string;
  releaseDate: string; // ISO YYYY-MM-DD
  changes: string[];
};

export const releases: Release[] = [
  {
    version: "2.0.0",
    releaseDate: "2026-10-05",
    changes: [
      "Major Feature Update — Imports, Investing, Money & More",
      "Broker import — 15 sources: CDSL CAS, Aionion, Angel One, Upstox, Kotak Neo, 5paisa, Groww, Kuvera, Dhan, MFCentral CAS, mstock, Zerodha Kite, Vested, Tickertape. Auto-detects format from file headers.",
      "ISIN-based deduplication on broker import — warns before adding holdings that already exist in your portfolio.",
      "Snapshots tab on Wealth page — net worth timeline chart, Growth / Best Month / Avg stats, expandable history with Line Items and What Changed.",
      "Group by Stock — merge the same stock held across multiple brokers into a single consolidated row.",
      "Loan Dashboard — tap any liability to see amortisation schedule, total interest, and a prepayment what-if calculator.",
      "NPS equity split — set Equity / Corporate Bond / Govt Securities percentages for NPS holdings so allocation reflects the true sub-class split.",
      "Gold purity (22K / 24K / 18K / 14K) — physical gold assets now apply a purity ratio to their market value.",
      "SGB live pricing — Sovereign Gold Bonds are automatically priced via the GOLDBEES NSE Gold ETF rate.",
      "Geography auto-detect — typing a stock ticker or linking an instrument in the investment form automatically sets the geography.",
      "Link investments to a goal — selected holdings' current value counts toward the goal's progress automatically.",
      "Allocation target card — see current vs target allocation with Gap column and Reduce / Add action per category.",
      "Step-up SIP — model an annual % increase to your SIP contribution inside goal projections.",
      "Undo delete for assets and liabilities — 5-second undo window instead of an immediate delete.",
      "Transaction tags — add tags to any expense or income; tap a tag pill on a row to filter the list instantly.",
      "Bulk Add — add multiple transactions at once in a bottom sheet; Copy button duplicates a row with category and account pre-filled.",
      "Cross-currency transfers — move money between accounts in different currencies with a live FX rate fetch.",
      "Clone transaction — copy any transaction into a pre-filled form dated today.",
      "In-field calculator — type sums like 1200+340 or 1200+18% directly in any amount field.",
      "Running total — select multiple transactions with checkboxes to see the combined income, expense, and net total.",
      "Bulk edit descriptions — update the merchant name on multiple selected transactions at once.",
      "Undo delete for transactions — 5-second undo window instead of an immediate delete.",
      "Merchant autocomplete — previous merchant names appear as suggestions while you type.",
      "Account filter in insights — narrow spending breakdowns to a single bank account.",
      "Financial Health Score — 0-to-100 score on the Dashboard based on emergency fund, savings rate, debt, investments, net worth, goals, and insurance.",
      "Market Events card on Dashboard — live economic events from FRED (US CPI, NFP, Fed Funds Rate, GDP, and more) with Previous and Actual values.",
      "Automatic net worth snapshots — schedule weekly or monthly auto-capture from Settings.",
      "Chart annotations — add a note to any snapshot; appears as a marker on the net worth chart.",
      "Text size control — Small / Normal / Large / Extra Large in Settings → Appearance; persists per device.",
      "UGX (Ugandan Shilling) currency with live conversion.",
      "Events page — global economic and central bank events with Previous and Actual values, impact ratings, and push notifications.",
      "Every 2 months recurring frequency — for alternate-month bills like bimonthly electricity.",
      "Reschedule recurring day — change the day of month a recurring entry fires without deleting and recreating it.",
      "Improved: Broker imports now auto-detect the source from file headers — no need to manually pick the right format tile.",
      "Improved: Sort transactions by Merchant or Account column in addition to Date and Amount.",
    ],
  },
  {
    version: "1.11.0",
    releaseDate: "2026-09-15",
    changes: [
      "Gold purity picker — choose 24K, 22K, 18K or 14K on any physical gold holding. Current value now reflects actual purity (22K jewellery = 91.7% of the 24K rate).",
      "Live gold rate from NSE GOLDBEES ETF — tap “Use live NSE rate” to auto-fill the current price per gram at domestic Indian wholesale rates, adjusted for your purity.",
    ],
  },
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
