import { useState } from "react";
import * as LucideIcons from "lucide-react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

/**
 * Inline (non-modal) two-level category → type picker for adding an asset.
 * Renders as page body content; the page header / tabs stay visible above it.
 */

type SubType = { key: string; label: string; icon: string };
type Category = {
  key: string;
  label: string;
  icon: string;
  color: string;
  bg: string;
  types: SubType[];
};

const EQUITY = { color: "#3FBF9F", bg: "rgba(63,191,159,0.14)" };
const DEBT = { color: "#5B8DEF", bg: "rgba(91,141,239,0.14)" };
const GOLD = { color: "#D4A63A", bg: "rgba(212,166,58,0.14)" };
const REALTY = { color: "#E4A11B", bg: "rgba(228,161,27,0.14)" };
const CRYPTO = { color: "#B07CF0", bg: "rgba(176,124,240,0.14)" };
const CASH = { color: "#4FC3C7", bg: "rgba(79,195,199,0.14)" };
const OTHER = { color: "#9AA4AE", bg: "rgba(154,164,174,0.14)" };

export const ASSET_CATEGORIES: Category[] = [
  {
    key: "stocks",
    label: "Stocks",
    icon: "TrendingUp",
    ...EQUITY,
    types: [
      { key: "direct-stock", label: "Direct Stock", icon: "TrendingUp" },
      { key: "equity-etf", label: "ETF", icon: "CandlestickChart" },
    ],
  },
  {
    key: "mf",
    label: "Mutual Fund",
    icon: "PieChart",
    ...EQUITY,
    types: [
      { key: "thematic-mf", label: "Thematic / Sectoral MF", icon: "Layers" },
      { key: "index-fund", label: "Index Fund", icon: "LineChart" },
      { key: "intl-mf", label: "International MF", icon: "Globe" },
      { key: "elss", label: "ELSS (Tax Saver)", icon: "Receipt" },
      { key: "hybrid-fund", label: "Hybrid Fund", icon: "Blend" },
      { key: "arbitrage-fund", label: "Arbitrage Fund", icon: "Shuffle" },
      { key: "debt-fund", label: "Debt MF", icon: "PieChart" },
      { key: "liquid-fund", label: "Liquid Fund", icon: "Droplets" },
      { key: "pms-aif", label: "PMS / AIF", icon: "Briefcase" },
    ],
  },
  {
    key: "commodity",
    label: "Commodity",
    icon: "Gem",
    ...GOLD,
    types: [
      { key: "physical-gold", label: "Physical Gold / Silver", icon: "Gem" },
      { key: "gold-etf", label: "Digital: ETF", icon: "CandlestickChart" },
      { key: "sgb", label: "Digital: SGB", icon: "Coins" },
      { key: "gold-mf", label: "Digital: MF", icon: "PieChart" },
    ],
  },
  {
    key: "debts",
    label: "Debts",
    icon: "Banknote",
    ...DEBT,
    types: [
      { key: "bank-fd", label: "Bank FD", icon: "PiggyBank" },
      { key: "corporate-fd", label: "Corporate FD", icon: "Building2" },
      { key: "rd", label: "Recurring Deposit", icon: "CalendarClock" },
      { key: "epf", label: "EPF / VPF", icon: "ShieldCheck" },
      { key: "ppf", label: "PPF", icon: "Vault" },
      { key: "nps", label: "NPS", icon: "ShieldCheck" },
      { key: "ssy", label: "Sukanya Samriddhi", icon: "Baby" },
      { key: "govt-bond", label: "Government Bond", icon: "Landmark" },
      { key: "corporate-bond", label: "Corporate Bond", icon: "FileText" },
      { key: "tax-free-bond", label: "Tax-Free Bond", icon: "BadgePercent" },
      { key: "sgb-bond", label: "Sovereign Gold Bond", icon: "Coins" },
      { key: "tbill", label: "Treasury Bill", icon: "Ticket" },
      { key: "nsc-kvp", label: "NSC / KVP", icon: "ScrollText" },
      { key: "debt-etf", label: "Debt ETF", icon: "CandlestickChart" },
    ],
  },
  {
    key: "real-estate",
    label: "Real Estate",
    icon: "Home",
    ...REALTY,
    types: [
      { key: "property", label: "Property", icon: "Home" },
      { key: "reit", label: "REIT", icon: "Building" },
      { key: "invit", label: "InvIT", icon: "Factory" },
    ],
  },
  {
    key: "crypto",
    label: "Crypto",
    icon: "Bitcoin",
    ...CRYPTO,
    types: [
      { key: "crypto-coin", label: "Crypto Token", icon: "Bitcoin" },
      { key: "crypto-etf", label: "Crypto ETF", icon: "CandlestickChart" },
    ],
  },
  {
    key: "savings",
    label: "Savings",
    icon: "Wallet",
    ...CASH,
    types: [
      { key: "savings-account", label: "Savings Account", icon: "Landmark" },
      { key: "current-account", label: "Current Account", icon: "Building2" },
      { key: "cash-wallet", label: "Cash / Wallet", icon: "Wallet" },
      { key: "loan-given", label: "Loan Given", icon: "ArrowLeftRight" },
    ],
  },
  {
    key: "other",
    label: "Other",
    icon: "Boxes",
    ...OTHER,
    types: [
      { key: "esop", label: "ESOP / RSU", icon: "Award" },
      { key: "unlisted-equity", label: "Unlisted Equity", icon: "Building2" },
      { key: "ulip", label: "ULIP / Insurance Plan", icon: "Umbrella" },
      { key: "other-asset", label: "Other Asset", icon: "Boxes" },
    ],
  },
];

export function DynIcon({
  name,
  className,
  color,
}: {
  name: string;
  className?: string;
  color?: string;
}) {
  const icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  >;
  const Cmp = icons[name] ?? icons["Boxes"]!;
  return <Cmp className={className} style={color ? { color } : undefined} />;
}

export function PickerShell({
  title,
  subtitle,
  onClose,
  back,
  children,
}: {
  title: string;
  subtitle: string;
  onClose: () => void;
  back?: { label: string; onClick: () => void };
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[600px] rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {back ? (
            <button
              type="button"
              onClick={back.onClick}
              className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> {back.label}
            </button>
          ) : null}
          <h2 className="text-base font-semibold text-foreground">{title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {children}
    </div>
  );
}

export function AssetCategoryPicker({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const [view, setView] = useState<"categories" | "subcategories">("categories");
  const [catKey, setCatKey] = useState<string | null>(null);

  const cat = ASSET_CATEGORIES.find((c) => c.key === catKey) ?? null;

  if (view === "subcategories" && cat) {
    return (
      <PickerShell
        title="Select type"
        subtitle={cat.label}
        onClose={onClose}
        back={{
          label: "All Categories",
          onClick: () => {
            setView("categories");
            setCatKey(null);
          },
        }}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {cat.types.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() =>
                navigate({ to: "/wealth/add-asset", search: { type: t.key } } as never)
              }
              className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-2 p-3 text-center transition hover:bg-surface-2/80"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{ background: cat.bg }}
              >
                <DynIcon name={t.icon} className="h-4 w-4" color={cat.color} />
              </span>
              <span className="text-[11px] leading-tight text-foreground">{t.label}</span>
            </button>
          ))}
        </div>
      </PickerShell>
    );
  }

  return (
    <PickerShell title="Add Asset" subtitle="Select a category" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {ASSET_CATEGORIES.map((c) => (
          <button
            key={c.key}
            type="button"
            onClick={() => {
              setCatKey(c.key);
              setView("subcategories");
            }}
            className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-3 text-left transition hover:bg-surface-2/80"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
              style={{ background: c.bg }}
            >
              <DynIcon name={c.icon} className="h-4 w-4" color={c.color} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-foreground">{c.label}</span>
              <span className="block text-[11px] text-muted-foreground">
                {c.types.length} types
              </span>
            </span>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        ))}
      </div>
    </PickerShell>
  );
}
