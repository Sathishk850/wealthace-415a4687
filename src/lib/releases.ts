export type Release = {
  version: string;
  releaseDate: string; // ISO YYYY-MM-DD
  changes: string[];
};

export const releases: Release[] = [
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
