import { amountIn } from "@/lib/wealth-api";
import { cn } from "@/lib/utils";

/**
 * Standard single-row portfolio summary used on every listing and detail view:
 * Total Invested | Current Value | Total P&L (with % underneath).
 */
export function HoldingSummaryRow({
  invested,
  current,
  pnl,
  pnlPct,
  currency = "INR",
  investedLabel = "Total Invested",
  currentLabel = "Current Value",
  pnlLabel = "Total P&L",
  className,
}: {
  invested: number;
  current: number;
  pnl: number;
  pnlPct: number;
  currency?: string;
  investedLabel?: string;
  currentLabel?: string;
  pnlLabel?: string;
  className?: string;
}) {
  const up = pnl >= 0;
  const tone = up ? "text-emerald-500" : "text-rose-500";
  return (
    <div
      className={cn(
        "grid grid-cols-3 items-end gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3",
        className,
      )}
    >
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {investedLabel}
        </div>
        <div className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">
          {amountIn(invested, currency)}
        </div>
      </div>
      <div>
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {currentLabel}
        </div>
        <div className="mt-1 font-display text-xl font-bold text-foreground sm:text-2xl">
          {amountIn(current, currency)}
        </div>
      </div>
      <div className="text-right">
        <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
          {pnlLabel}
        </div>
        <div className={cn("mt-1 font-display text-xl font-bold sm:text-2xl", tone)}>
          {up ? "+" : ""}
          {amountIn(pnl, currency)}
        </div>
        <div className={cn("text-xs font-semibold", tone)}>
          {up ? "+" : ""}
          {Number.isFinite(pnlPct) ? pnlPct.toFixed(2) : "0.00"}%
        </div>
      </div>
    </div>
  );
}
