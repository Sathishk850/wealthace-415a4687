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
        "grid grid-cols-3 items-end gap-2 rounded-xl border border-border bg-surface-2/40 px-3 py-3 sm:gap-4 sm:px-4",
        className,
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-[9px] font-medium uppercase leading-tight tracking-wide text-muted-foreground sm:text-[11px] sm:tracking-wider">
          {investedLabel}
        </div>
        <div className="mt-1 font-display text-[15px] font-bold tabular-nums leading-tight text-foreground sm:text-2xl">
          {amountIn(invested, currency)}
        </div>
      </div>
      <div className="min-w-0">
        <div className="truncate text-[9px] font-medium uppercase leading-tight tracking-wide text-muted-foreground sm:text-[11px] sm:tracking-wider">
          {currentLabel}
        </div>
        <div className="mt-1 font-display text-[15px] font-bold tabular-nums leading-tight text-foreground sm:text-2xl">
          {amountIn(current, currency)}
        </div>
      </div>
      <div className="min-w-0 text-right">
        <div className="truncate text-[9px] font-medium uppercase leading-tight tracking-wide text-muted-foreground sm:text-[11px] sm:tracking-wider">
          {pnlLabel}
        </div>
        <div className={cn("mt-1 font-display text-[15px] font-bold tabular-nums leading-tight sm:text-2xl", tone)}>
          {up ? "+" : ""}
          {amountIn(pnl, currency)}
        </div>
        <div className={cn("text-[10px] font-semibold tabular-nums sm:text-xs", tone)}>
          {up ? "+" : ""}
          {Number.isFinite(pnlPct) ? pnlPct.toFixed(2) : "0.00"}%
        </div>
      </div>
    </div>
  );
}
