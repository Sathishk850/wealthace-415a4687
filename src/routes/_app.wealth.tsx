import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { TextTabs } from "@/components/text-tabs";
import { AssetsView } from "@/components/wealth/assets-view";
import { LiabilitiesView as LiveLiabilitiesView } from "@/components/wealth/liabilities-view";
import { InvestmentsView as LiveInvestmentsView, type InvestmentsSub } from "@/components/wealth/investments-view";
import { InsuranceView as LiveInsuranceView } from "@/components/wealth/insurance-view";
import { AccountsView as LiveAccountsView } from "@/components/wealth/accounts-view";
import { FamilyView as LiveFamilyView } from "@/components/wealth/family-view";
import { Plus } from "lucide-react";

export const Route = createFileRoute("/_app/wealth")({
  head: () => ({
    meta: [
      { title: "Wealth · FinVista" },
      { name: "description", content: "Manage assets, liabilities, investments, insurance, accounts and family wealth." },
    ],
  }),
  component: Wealth,
});

type TabValue =
  | "investments"
  | "holdings"
  | "sip-tracker"
  | "performance"
  | "pl-analysis"
  | "assets"
  | "liabilities"
  | "insurance"
  | "accounts"
  | "family";

const TABS: { value: TabValue; label: string }[] = [
  { value: "investments", label: "Investments & Portfolio" },
  { value: "holdings", label: "Holdings" },
  { value: "sip-tracker", label: "SIP Tracker" },
  { value: "performance", label: "Performance" },
  { value: "pl-analysis", label: "P&L Analysis" },
  { value: "assets", label: "Assets" },
  { value: "liabilities", label: "Liabilities" },
  { value: "insurance", label: "Insurance" },
  { value: "accounts", label: "Accounts" },
  { value: "family", label: "Family" },
];

const INVESTMENT_SUB: Record<string, InvestmentsSub> = {
  investments: "Overview",
  holdings: "Holdings",
  "sip-tracker": "SIP Tracker",
  performance: "Performance",
  "pl-analysis": "P&L Analysis",
};

function Wealth() {
  const [tab, setTab] = useState<TabValue>("investments");
  const addRef = useRef<(() => void) | null>(null);

  const isInvestment = tab in INVESTMENT_SUB;

  const addLabel =
    isInvestment ? "Add Investment"
    : tab === "liabilities" ? "Add Liability"
    : tab === "insurance" ? "Add Policy"
    : tab === "accounts" ? "Add Account"
    : tab === "family" ? "Add Member"
    : "Add Asset";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Wealth</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track, analyze, and grow your overall financial wealth.
          </p>
        </div>
        <button
          onClick={() => addRef.current?.()}
          className="inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-[#04121C] transition hover:brightness-110"
        >
          <Plus className="h-4 w-4" /> {addLabel}
        </button>
      </div>

      <div className="-mx-1 overflow-x-auto">
        <TextTabs
          items={TABS}
          value={tab}
          onChange={(v) => setTab(v as TabValue)}
          className="min-w-max px-1"
        />
      </div>

      {isInvestment ? (
        <LiveInvestmentsView
          key={tab}
          activeSub={INVESTMENT_SUB[tab]}
          hideSubTabs
          registerAdd={(fn) => { addRef.current = fn; }}
        />
      ) : tab === "assets" ? (
        <AssetsView registerAdd={(fn) => { addRef.current = fn; }} />
      ) : tab === "liabilities" ? (
        <LiveLiabilitiesView registerAdd={(fn) => { addRef.current = fn; }} />
      ) : tab === "insurance" ? (
        <LiveInsuranceView registerAdd={(fn) => { addRef.current = fn; }} />
      ) : tab === "accounts" ? (
        <LiveAccountsView registerAdd={(fn) => { addRef.current = fn; }} />
      ) : (
        <LiveFamilyView registerAdd={(fn) => { addRef.current = fn; }} />
      )}
    </div>
  );
}
