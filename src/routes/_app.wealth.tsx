import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Circle, Plus } from "lucide-react";
import { TextTabs } from "@/components/text-tabs";
import { AssetsView } from "@/components/wealth/assets-view";
import { LiabilitiesView as LiveLiabilitiesView } from "@/components/wealth/liabilities-view";
import { InvestmentsView as LiveInvestmentsView } from "@/components/wealth/investments-view";
import { InsuranceView as LiveInsuranceView } from "@/components/wealth/insurance-view";
import { AccountsView as LiveAccountsView } from "@/components/wealth/accounts-view";
import { WealthOverview } from "@/components/wealth/wealth-overview";
import { getExchangeSessionLabels, getMarketStatus } from "@/lib/market/calendar";
import { useEffect } from "react";

export const Route = createFileRoute("/_app/wealth")({
  head: () => ({
    meta: [
      { title: "Wealth · FinVista" },
      {
        name: "description",
        content: "Premium wealth dashboard — assets, liabilities, insurance, accounts and SIPs.",
      },
    ],
  }),
  component: Wealth,
});

type TabValue = "overview" | "assets" | "liabilities" | "insurance" | "accounts" | "sip-tracker";

const TABS: { value: TabValue; label: string }[] = [
  { value: "overview", label: "Overview" },
  { value: "assets", label: "Assets" },
  { value: "liabilities", label: "Liabilities" },
  { value: "insurance", label: "Insurance" },
  { value: "accounts", label: "Accounts" },
  { value: "sip-tracker", label: "SIP Tracker" },
];

function Wealth() {
  const [tab, setTab] = useState<TabValue>("overview");
  const addRef = useRef<(() => void) | null>(null);

  // Assets tab renders its own contextual Add button in its toolbar.
  const showAdd = tab !== "overview" && tab !== "assets";
  const addLabel =
    tab === "liabilities" ? "Add Liability"
    : tab === "insurance" ? "Add Policy"
    : tab === "accounts" ? "Add Account"
    : tab === "sip-tracker" ? "Add Investment"
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
        {showAdd ? (
          <button
            onClick={() => addRef.current?.()}
            className="inline-flex items-center gap-2 rounded-xl bg-mint px-4 py-2.5 text-sm font-semibold text-[#04121C] transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" /> {addLabel}
          </button>
        ) : null}
      </div>

      <WealthMarketBar />

      <div className="-mx-1 overflow-x-auto">
        <TextTabs
          items={TABS}
          value={tab}
          onChange={(v) => setTab(v as TabValue)}
          className="min-w-max px-1"
        />
      </div>

      {tab === "overview" ? (
        <WealthOverview onGoSip={() => setTab("sip-tracker")} />
      ) : tab === "assets" ? (
        <AssetsView registerAdd={(fn) => { addRef.current = fn; }} />
      ) : tab === "liabilities" ? (
        <LiveLiabilitiesView registerAdd={(fn) => { addRef.current = fn; }} />
      ) : tab === "insurance" ? (
        <LiveInsuranceView registerAdd={(fn) => { addRef.current = fn; }} />
      ) : tab === "accounts" ? (
        <LiveAccountsView registerAdd={(fn) => { addRef.current = fn; }} />
      ) : (
        <LiveInvestmentsView
          key="sip-tracker"
          activeSub="SIP Tracker"
          hideSubTabs
          registerAdd={(fn) => { addRef.current = fn; }}
        />
      )}
    </div>
  );
}

/** Common status bar showing IND + US market state and last price timestamps in IST 12h. */
function WealthMarketBar() {
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const nse = getMarketStatus("NSE");
  const us = getMarketStatus("US");
  const nseSess = getExchangeSessionLabels("NSE");
  const usSess = getExchangeSessionLabels("US");

  const nowIST12 = new Date().toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });

  return (
    <div className="grid grid-cols-1 gap-2 rounded-2xl border border-border bg-card/60 px-4 py-3 text-[11px] sm:grid-cols-2 lg:grid-cols-4">
      <StatusPill
        open={nse.is_open}
        exchange="IND Market"
        session={`${nse.is_open ? "Open" : "Closed"} · NSE`}
        stamp={nseSess.close}
      />
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-foreground/70">IND Prices as of</span>
        <span className="font-medium text-foreground">{nowIST12} IST</span>
      </div>
      <StatusPill
        open={us.is_open}
        exchange="US Market"
        session={`${us.is_open ? "Open" : "Closed"} · NYSE`}
        stamp={usSess.close}
      />
      <div className="flex items-center gap-2 text-muted-foreground">
        <span className="text-foreground/70">US Prices as of</span>
        <span className="font-medium text-foreground">{nowIST12} IST</span>
      </div>
    </div>
  );
}

function StatusPill({
  open,
  exchange,
  session,
  stamp,
}: {
  open: boolean;
  exchange: string;
  session: string;
  stamp: string;
}) {
  const tone = open ? "text-emerald-500" : "text-rose-500";
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
        <Circle className={`h-2 w-2 fill-current ${tone}`} strokeWidth={0} />
        {exchange}
      </span>
      <span className="text-muted-foreground">· {session}</span>
      <span className="text-muted-foreground">· {stamp}</span>
    </div>
  );
}
