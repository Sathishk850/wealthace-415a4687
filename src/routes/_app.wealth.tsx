import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { TextTabs } from "@/components/text-tabs";
import { AssetsView } from "@/components/wealth/assets-view";
import { LiabilitiesView as LiveLiabilitiesView } from "@/components/wealth/liabilities-view";
import { InvestmentsView as LiveInvestmentsView } from "@/components/wealth/investments-view";
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

const TABS = ["Assets", "Liabilities", "Investments", "Insurance", "Accounts", "Family"] as const;

function Wealth() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("Assets");
  const addRef = useRef<(() => void) | null>(null);

  const addLabel =
    tab === "Liabilities" ? "Add Liability"
    : tab === "Investments" ? "Add Investment"
    : tab === "Insurance" ? "Add Policy"
    : tab === "Accounts" ? "Add Account"
    : tab === "Family" ? "Add Member"
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

      <TextTabs
        items={TABS as unknown as readonly string[]}
        value={tab}
        onChange={(v) => setTab(v as (typeof TABS)[number])}
      />

      {tab === "Assets" ? (
        <AssetsView registerAdd={(fn) => { addRef.current = fn; }} />
      ) : tab === "Liabilities" ? (
        <LiveLiabilitiesView registerAdd={(fn) => { addRef.current = fn; }} />
      ) : tab === "Investments" ? (
        <LiveInvestmentsView registerAdd={(fn) => { addRef.current = fn; }} />
      ) : tab === "Insurance" ? (
        <LiveInsuranceView registerAdd={(fn) => { addRef.current = fn; }} />
      ) : tab === "Accounts" ? (
        <LiveAccountsView registerAdd={(fn) => { addRef.current = fn; }} />
      ) : (
        <LiveFamilyView registerAdd={(fn) => { addRef.current = fn; }} />
      )}
    </div>
  );
}
