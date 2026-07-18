import { useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { useInstrumentSearch } from "@/lib/market/use-market-data";
import type { IdentifierType, SearchResult } from "@/lib/market/types";

type Props = {
  kind: IdentifierType;
  onSelect: (r: SearchResult) => void;
  placeholder?: string;
};

/**
 * Search box for instruments. Emits a fully-typed SearchResult
 * on select. Purely additive — safe to drop into any form.
 */
export function InstrumentSearch({ kind, onSelect, placeholder }: Props) {
  const [q, setQ] = useState("");
  const { data = [], isFetching } = useInstrumentSearch(q, kind);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={placeholder ?? "Search by name…"}
          className="w-full rounded-lg border border-border bg-surface-2 pl-9 pr-3 py-2 text-sm text-foreground focus:border-mint/50 focus:outline-none"
        />
        {isFetching ? (
          <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>
      {q.trim().length >= 2 && data.length > 0 ? (
        <div className="max-h-64 overflow-y-auto rounded-lg border border-border bg-card">
          {data.map((r) => (
            <button
              key={`${r.identifier_type}:${r.identifier}:${r.exchange ?? ""}`}
              type="button"
              onClick={() => {
                onSelect(r);
                setQ("");
              }}
              className="flex w-full items-center justify-between gap-2 border-b border-border/60 px-3 py-2 text-left text-xs last:border-b-0 hover:bg-surface-2"
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-medium text-foreground">{r.name}</div>
                <div className="truncate text-[11px] text-muted-foreground">{r.identifier}{r.exchange ? ` · ${r.exchange}` : ""}</div>
              </div>
              <span className="shrink-0 rounded-md bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mint">Select</span>
            </button>
          ))}
        </div>
      ) : q.trim().length >= 2 && !isFetching ? (
        <div className="rounded-lg border border-dashed border-border px-3 py-2 text-xs text-muted-foreground">
          No matches. Try a different name.
        </div>
      ) : null}
    </div>
  );
}
