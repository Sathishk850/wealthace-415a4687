import { useState } from "react";
import { Link2 } from "lucide-react";
import type { Investment } from "@/lib/wealth-api";
import { LinkInvestmentDialog, isLinkable } from "@/components/wealth/link-investment-dialog";

/**
 * Line shown under a holding name: CMP (stocks/ETFs) or NAV (mutual funds)
 * with a Live marker, or a "Link for live price" action when the holding
 * isn't linked to a market instrument yet.
 */
export function HoldingLinkLine({
  inv,
  price,
  live,
  formatPrice,
}: {
  inv?: Investment;
  price: number;
  live: boolean;
  formatPrice: (n: number) => string;
}) {
  const [open, setOpen] = useState(false);
  if (!inv) return null;
  const label = inv.category === "Mutual Funds" ? "NAV" : "CMP";
  const linkable = isLinkable(inv);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] tabular-nums" onClick={stop}>
      <span className="text-muted-foreground">
        {label} <span className="text-foreground">{formatPrice(price)}</span>
      </span>
      {live ? (
        <span className="rounded-full bg-mint/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase text-mint">Live</span>
      ) : null}
      {linkable ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { stop(e); setOpen(true); }}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); stop(e); setOpen(true); } }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-md border border-mint/40 bg-mint/10 px-1.5 py-0.5 text-[10px] font-medium text-mint hover:bg-mint/20"
          title={`Link to a market instrument for live ${label}`}
        >
          <Link2 className="h-3 w-3" /> Link for live {label}
        </span>
      ) : null}
      {open ? <LinkInvestmentDialog open={open} onOpenChange={setOpen} queue={[inv]} /> : null}
    </div>
  );
}
