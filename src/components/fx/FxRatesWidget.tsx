import { TrendingUp, RefreshCw } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useFxRates } from "@/lib/use-fx-rates";

const PAIRS = [
  { from: "UGX", to: "INR", label: "UGX / INR", flag: "🇺🇬" },
  { from: "UGX", to: "USD", label: "UGX / USD", flag: "🇺🇬" },
  { from: "USD", to: "INR", label: "USD / INR", flag: "🇺🇸" },
];

export function FxRatesWidget({ className }: { className?: string }) {
  const { data, isLoading, isFetching } = useFxRates();
  const qc = useQueryClient();
  const rates = data?.rates ?? [];

  return (
    <Card className={cn("p-5", className)}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Live FX Rates</span>
          <span className="text-[10px] text-muted-foreground">(15 min cache)</span>
        </div>
        <button
          type="button"
          onClick={() => qc.invalidateQueries({ queryKey: ["fx-rates"] })}
          disabled={isFetching}
          className="grid h-7 w-7 place-items-center rounded-lg border border-border text-muted-foreground hover:text-foreground disabled:opacity-50"
        >
          <RefreshCw className={cn("h-3.5 w-3.5", isFetching && "animate-spin")} />
        </button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {PAIRS.map((p) => (
            <div key={p.label} className="h-9 animate-pulse rounded-lg bg-muted/40" />
          ))}
        </div>
      ) : rates.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          FX rates unavailable — check that the market data API key is configured.
        </p>
      ) : (
        <div className="space-y-1">
          {PAIRS.map((p) => {
            const r = rates.find((x) => x.from === p.from && x.to === p.to);
            if (!r) return null;
            const rate = r.rate;
            const spread = r.ask > 0 && r.bid > 0 ? r.ask - r.bid : null;
            return (
              <div
                key={p.label}
                className="flex items-center gap-3 rounded-lg border border-border/50 px-3 py-2.5"
              >
                <span className="text-base">{p.flag}</span>
                <span className="w-20 shrink-0 text-xs font-semibold text-foreground">{p.label}</span>
                <span className="flex-1 text-right font-mono text-sm font-bold text-primary">
                  {rate < 0.01 ? rate.toFixed(6) : rate.toFixed(4)}
                </span>
                {spread !== null && (
                  <span className="text-[10px] text-muted-foreground">
                    spread {spread < 0.01 ? spread.toFixed(6) : spread.toFixed(4)}
                  </span>
                )}
              </div>
            );
          })}
          {rates[0]?.refreshed_at && (
            <p className="mt-1.5 text-[10px] text-muted-foreground">
              Updated {rates[0].refreshed_at} UTC · Alpha Vantage
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
