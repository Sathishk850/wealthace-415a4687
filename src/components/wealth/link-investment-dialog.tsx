import { useEffect, useMemo, useState } from "react";
import { ChevronRight, Link2, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { InstrumentSearch } from "@/components/market/instrument-search";
import { useLinkInvestment, type Investment } from "@/lib/wealth-api";
import type { IdentifierType, SearchResult } from "@/lib/market/types";

function searchKindFor(category: string): IdentifierType | null {
  if (category === "Stocks") return "stock_in";
  if (category === "Mutual Funds") return "mf_in";
  return null;
}

export function isLinkable(inv: Investment) {
  return !inv.identifier && searchKindFor(inv.category) !== null;
}

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  queue: Investment[];
};

export function LinkInvestmentDialog({ open, onOpenChange, queue }: Props) {
  const [index, setIndex] = useState(0);
  const link = useLinkInvestment();

  useEffect(() => {
    if (open) setIndex(0);
  }, [open, queue]);

  const current = queue[index];
  const kind = useMemo(() => (current ? searchKindFor(current.category) : null), [current]);
  const total = queue.length;

  const advance = () => {
    if (index + 1 < total) setIndex((i) => i + 1);
    else onOpenChange(false);
  };

  const onSelect = async (r: SearchResult) => {
    if (!current) return;
    try {
      await link.mutateAsync({
        id: current.id,
        identifier_type: r.identifier_type,
        identifier: r.identifier,
        exchange: r.exchange ?? null,
        name: r.name,
        symbol: r.identifier_type === "stock_in" ? r.identifier : current.symbol ?? undefined,
      });
      advance();
    } catch {
      /* toast handled in hook */
    }
  };

  if (!current || !kind) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-4 w-4 text-mint" />
            Link Investment
          </DialogTitle>
          <DialogDescription>
            {total > 1
              ? `Linking ${index + 1} of ${total} · attach a market instrument to enable live pricing.`
              : "Attach a market instrument to enable live pricing."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-lg border border-border bg-surface-2 px-3 py-2">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Holding
            </div>
            <div className="mt-0.5 truncate text-sm font-medium text-foreground">
              {current.name}
            </div>
            <div className="truncate text-[11px] text-muted-foreground">
              {current.category}
              {current.sub_category ? ` · ${current.sub_category}` : ""}
            </div>
          </div>

          <InstrumentSearch
            kind={kind}
            onSelect={onSelect}
            placeholder={
              kind === "mf_in"
                ? "Search scheme name, AMC, or plan…"
                : "Search company name or ticker…"
            }
            autoFocus
          />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-surface-2"
            disabled={link.isPending}
          >
            <X className="h-3.5 w-3.5" /> Close
          </button>
          {total > 1 ? (
            <button
              type="button"
              onClick={advance}
              className="inline-flex items-center gap-1 rounded-lg border border-border bg-background px-3 py-1.5 text-xs text-foreground hover:bg-surface-2"
              disabled={link.isPending}
            >
              Skip <ChevronRight className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
