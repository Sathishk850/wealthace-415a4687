import { useEffect, useMemo, useRef, useState } from "react";
import { Search, Loader2, AlertTriangle, RefreshCw } from "lucide-react";
import { useInstrumentSearch, useQuotesForItems } from "@/lib/market/use-market-data";
import type {
  IdentifierType,
  MarketQuote,
  QuoteRequestItem,
  SearchResult,
} from "@/lib/market/types";
import { cn } from "@/lib/utils";

type Props = {
  kind: IdentifierType;
  onSelect: (r: SearchResult, quote?: MarketQuote | null) => void;
  placeholder?: string;
  autoFocus?: boolean;
};

/**
 * Search box for instruments. Debounced, keyboard-navigable, closes on
 * outside click. Emits a fully-typed SearchResult on select. Purely
 * additive — safe to drop into any form.
 */
export function InstrumentSearch({ kind, onSelect, placeholder, autoFocus }: Props) {
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // debounce input by 250ms
  useEffect(() => {
    const id = setTimeout(() => setDebounced(q.trim()), 250);
    return () => clearTimeout(id);
  }, [q]);

  const { data = [], isFetching, error, refetch } = useInstrumentSearch(debounced, kind);
  const results = data;
  const showPanel = open && debounced.length >= 2;

  // Live CMP / NAV for the visible results.
  const quoteItems = useMemo<QuoteRequestItem[]>(
    () =>
      results.slice(0, 8).map((r) => ({
        identifier_type: r.identifier_type,
        identifier: r.identifier,
        exchange: r.exchange ?? null,
      })),
    [results],
  );
  const { quoteMap } = useQuotesForItems(showPanel ? quoteItems : []);

  useEffect(() => {
    setActive(0);
  }, [results]);

  // click outside to close
  useEffect(() => {
    if (!showPanel) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [showPanel]);

  const commit = (r: SearchResult) => {
    onSelect(r, quoteMap.get(`${r.identifier_type}:${r.identifier}`) ?? null);
    setQ("");
    setDebounced("");
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel || results.length === 0) {
      if (e.key === "Escape") setOpen(false);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const r = results[active];
      if (r) commit(r);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className="relative space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <input
          ref={inputRef}
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder={placeholder ?? "Search by name…"}
          role="combobox"
          aria-expanded={showPanel}
          aria-autocomplete="list"
          className="w-full rounded-lg border border-border bg-surface-2 pl-9 pr-9 py-2 text-sm text-foreground focus:border-mint/50 focus:outline-none"
        />
        {isFetching ? (
          <Loader2 className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-muted-foreground" />
        ) : null}
      </div>

      {showPanel ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border bg-card shadow-lg">
          {error ? (
            <div className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
              <span className="flex items-center gap-1.5 text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                Search provider unavailable.
              </span>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-[11px] text-foreground hover:bg-surface-2"
              >
                <RefreshCw className="h-3 w-3" /> Retry
              </button>
            </div>
          ) : isFetching && results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">Searching…</div>
          ) : results.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">No results found.</div>
          ) : (
            <div className="max-h-64 overflow-y-auto py-1">
              {results.map((r, idx) => (
                <ResultRow
                  key={`${r.identifier_type}:${r.identifier}:${r.exchange ?? ""}`}
                  r={r}
                  active={idx === active}
                  onSelect={() => commit(r)}
                  onHover={() => setActive(idx)}
                />
              ))}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function ResultRow({
  r,
  active,
  onSelect,
  onHover,
}: {
  r: SearchResult;
  active: boolean;
  onSelect: () => void;
  onHover: () => void;
}) {
  const { primary, secondary, badge } = useMemo(() => formatResult(r), [r]);
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs",
        active ? "bg-surface-2" : "hover:bg-surface-2",
      )}
    >
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-foreground">{primary}</div>
        <div className="truncate text-[11px] text-muted-foreground">{secondary}</div>
      </div>
      {badge ? (
        <span className="shrink-0 rounded-md bg-mint/15 px-2 py-0.5 text-[10px] font-semibold text-mint">
          {badge}
        </span>
      ) : null}
    </button>
  );
}

function formatResult(r: SearchResult): { primary: string; secondary: string; badge: string } {
  if (r.identifier_type === "mf_in") {
    // Parse "<AMC> - <Scheme> - Direct/Regular - Growth/IDCW" style names.
    const name = r.name;
    const plan = /direct/i.test(name) ? "Direct" : /regular/i.test(name) ? "Regular" : null;
    const option = /idcw|dividend/i.test(name) ? "IDCW" : /growth/i.test(name) ? "Growth" : null;
    const parts = name.split(/\s[-–]\s|,\s?/);
    const house = parts[0]?.trim();
    const tags = [plan, option].filter(Boolean).join(" · ");
    return {
      primary: name,
      secondary: [house, tags].filter(Boolean).join(" · "),
      badge: "MF",
    };
  }
  if (r.identifier_type === "stock_in") {
    return {
      primary: r.name,
      secondary: `${r.exchange ?? "NSE"} · ${r.identifier}`,
      badge: r.exchange ?? "NSE",
    };
  }
  return {
    primary: r.name,
    secondary: `${r.identifier}${r.exchange ? ` · ${r.exchange}` : ""}`,
    badge: "Select",
  };
}
