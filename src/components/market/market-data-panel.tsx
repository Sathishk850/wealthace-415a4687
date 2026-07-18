import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { getMarketSettings, saveMarketSettings } from "@/lib/market/settings";
import { MARKET_REFRESH_INTERVALS } from "@/lib/market/types";
import { useRefreshHoldings } from "@/lib/market/use-market-data";
import { isTwelveDataConfigured } from "@/lib/market/provider-info";

export function MarketDataPanel() {
  const [settings, setSettings] = useState(() => getMarketSettings());
  const refresh = useRefreshHoldings();

  useEffect(() => {
    const on = () => setSettings(getMarketSettings());
    window.addEventListener("finvista:market-settings-changed", on);
    return () => window.removeEventListener("finvista:market-settings-changed", on);
  }, []);

  const twelveOn = isTwelveDataConfigured();

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Market Data</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Live prices for stocks and mutual funds.</p>
        </div>
        <button
          onClick={() => refresh.mutate()}
          disabled={refresh.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-[#04121C] hover:brightness-110 disabled:opacity-60"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refresh.isPending ? "animate-spin" : ""}`} />
          {refresh.isPending ? "Refreshing…" : "Refresh Now"}
        </button>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Row label="Stocks · Primary" value={twelveOn ? "Twelve Data" : "Yahoo Finance"} />
        <Row label="Stocks · Fallback" value={twelveOn ? "Yahoo Finance" : "—"} />
        <Row label="Mutual Funds" value="MFAPI (AMFI)" />
        <Row label="Last Refresh" value={settings.last_refresh_at ? new Date(settings.last_refresh_at).toLocaleString("en-GB") : "—"} />
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <label className="inline-flex items-center gap-2 text-xs text-foreground">
          <input
            type="checkbox"
            checked={settings.auto_refresh}
            onChange={(e) => setSettings(saveMarketSettings({ auto_refresh: e.target.checked }))}
            className="h-4 w-4 accent-mint"
          />
          Auto refresh
        </label>
        <div className="inline-flex items-center gap-2 text-xs text-foreground">
          <span className="text-muted-foreground">Interval</span>
          <select
            value={settings.interval_minutes}
            onChange={(e) => setSettings(saveMarketSettings({ interval_minutes: Number(e.target.value) as (typeof MARKET_REFRESH_INTERVALS)[number] }))}
            className="rounded-md border border-border bg-surface-2 px-2 py-1 text-xs text-foreground focus:border-mint/50 focus:outline-none"
          >
            {MARKET_REFRESH_INTERVALS.map((m) => (
              <option key={m} value={m}>{m} minutes</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-2/40 px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium text-foreground">{value}</div>
    </div>
  );
}
