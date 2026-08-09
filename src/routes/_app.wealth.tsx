import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Circle } from "lucide-react";
import { TextTabs } from "@/components/text-tabs";
import { AssetsView } from "@/components/wealth/assets-view";
import { LiabilitiesView as LiveLiabilitiesView } from "@/components/wealth/liabilities-view";
import { InvestmentsView as LiveInvestmentsView } from "@/components/wealth/investments-view";
import { InsuranceView as LiveInsuranceView } from "@/components/wealth/insurance-view";
import { AccountsView as LiveAccountsView } from "@/components/wealth/accounts-view";
import { WealthOverview } from "@/components/wealth/wealth-overview";
import { getExchangeSessionLabels, getMarketStatus } from "@/lib/market/calendar";
import { formatTime } from "@/lib/date-format";
import { useEffect } from "react";


export const Route = createFileRoute("/_app/wealth")({
  head: () => ({
    meta: [
      { title: "Wealth · Wealth Ace" },
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

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-foreground">Wealth</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Track, analyze, and grow your overall financial wealth.
          </p>
        </div>
        <WealthMarketBar />
      </div>

      <div className="-mx-1 overflow-x-auto overflow-y-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <TextTabs
          items={TABS}
          value={tab}
          onChange={(v) => setTab(v as TabValue)}
          className="min-w-max flex-nowrap px-1"
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

/**
 * Market timings shown at the end of the Wealth title row.
 * Only markets that are currently open are surfaced; when both are shut a
 * single compact "Markets closed" chip is shown instead.
 */
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

  const openMarkets = [
    nse.is_open ? { label: "IND Market", venue: "NSE", stamp: nseSess.close } : null,
    us.is_open ? { label: "US Market", venue: "NYSE", stamp: usSess.close } : null,
  ].filter(Boolean) as { label: string; venue: string; stamp: string }[];

  const now = formatTime(new Date());

  if (openMarkets.length === 0) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-[11px]">
        <Circle className="h-2 w-2 fill-current text-rose-500" strokeWidth={0} />
        <span className="font-medium text-foreground">Markets closed</span>
        <span className="text-muted-foreground">· as of {now}</span>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {openMarkets.map((m) => (
        <div
          key={m.label}
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1.5 text-[11px]"
        >
          <Circle className="h-2 w-2 fill-current text-emerald-500" strokeWidth={0} />
          <span className="font-medium text-foreground">{m.label} Open</span>
          <span className="text-muted-foreground">
            · {m.venue} till {m.stamp}
          </span>
          <span className="text-muted-foreground">· prices as of {now}</span>
        </div>
      ))}
    </div>
  );
}

