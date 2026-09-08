import { useEffect, useMemo, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCorporateActions,
  getInstrumentFundamentals,
  getMarketQuotes,
  refreshMyHoldings,
  searchInstruments,
} from "@/lib/market.functions";
import type { Investment } from "@/lib/wealth-api";
import type {
  CorporateAction,
  IdentifierType,
  InstrumentFundamentals,
  MarketQuote,
  MarketRefreshInterval,
  QuoteRequestItem,
  SearchResult,
} from "./types";

import { getMarketStatus, isAnyMarketOpen } from "./calendar";
import { getMarketSettings } from "./settings";

export const marketKeys = {
  quotes: (items: QuoteRequestItem[]) => [
    "market",
    "quotes",
    ...items.map((i) => `${i.identifier_type}:${i.identifier}`).sort(),
  ],
  search: (q: string, kind: IdentifierType) => ["market", "search", kind, q] as const,
};

function investmentToItem(
  inv: Pick<Investment, "identifier_type" | "identifier" | "exchange" | "status">,
): QuoteRequestItem | null {
  if (!inv.identifier || !inv.identifier_type) return null;
  if ((inv.status ?? "active") !== "active") return null;
  return {
    identifier_type: inv.identifier_type as IdentifierType,
    identifier: inv.identifier,
    exchange: inv.exchange ?? null,
  };
}

/**
 * Live quotes for a list of investments. Reads cache first (fast render),
 * then refreshes in the background based on refresh settings + market status.
 */
export function useInvestmentQuotes(investments: Investment[]) {
  const fetchQuotes = useServerFn(getMarketQuotes);

  const items = useMemo<QuoteRequestItem[]>(() => {
    const arr: QuoteRequestItem[] = [];
    const seen = new Set<string>();
    for (const inv of investments) {
      const it = investmentToItem(inv);
      if (!it) continue;
      const k = `${it.identifier_type}:${it.identifier}`;
      if (seen.has(k)) continue;
      seen.add(k);
      arr.push(it);
    }
    return arr;
  }, [investments]);

  const forceRef = useRef(false);
  const query = useQuery({
    queryKey: marketKeys.quotes(items),
    queryFn: async () => {
      if (items.length === 0) return [] as MarketQuote[];
      const force = forceRef.current;
      forceRef.current = false;
      return (await fetchQuotes({ data: { items, force } })) as MarketQuote[];
    },
    enabled: items.length > 0,
    staleTime: 60 * 1000,
    // Retain previous data on error → "Using cached market data"
    placeholderData: (prev) => prev,
  });

  const forceRefetch = () => {
    forceRef.current = true;
    return query.refetch();
  };

  // Auto-refresh loop: honors settings, pauses when tab hidden, respects market status
  const settings = getMarketSettings();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    if (!settings.auto_refresh || items.length === 0) return;
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      const hasStocks = items.some((i) => i.identifier_type !== "mf_in");
      const anyOpen = isAnyMarketOpen(["NSE", "BSE", "US"]);
      if (hasStocks && !anyOpen) return; // markets closed → no polling
      query.refetch();
    };
    const ms = settings.interval_minutes * 60 * 1000;
    intervalRef.current = setInterval(tick, ms);
    const onVisible = () => {
      if (!document.hidden) query.refetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onVisible);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
  }, [settings.auto_refresh, settings.interval_minutes, items, query]);

  // Build lookup map
  const quoteMap = useMemo(() => {
    const m = new Map<string, MarketQuote>();
    for (const q of query.data ?? []) m.set(`${q.identifier_type}:${q.identifier}`, q);
    return m;
  }, [query.data]);

  const lastFetchedAt = useMemo(() => {
    let latest: string | null = null;
    for (const q of query.data ?? []) {
      const ts = q.server_fetched_at ?? q.fetched_at;
      if (!latest || ts > latest) latest = ts;
    }
    return latest;
  }, [query.data]);

  return {
    quotes: query.data ?? [],
    quoteMap,
    lastFetchedAt,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isStale: !!query.error,
    refetch: forceRefetch,
    refetchCached: query.refetch,
    error: query.error,
  };
}

export function useInstrumentSearch(query: string, kind: IdentifierType) {
  const search = useServerFn(searchInstruments);
  return useQuery({
    queryKey: marketKeys.search(query, kind),
    queryFn: async () => {
      if (query.trim().length < 2) return [] as SearchResult[];
      return (await search({ data: { query, kind } })) as SearchResult[];
    },
    enabled: query.trim().length >= 2,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Live quotes for an ad-hoc list of instruments (e.g. search results).
 * Read-only, cache-first — never forces a provider refresh.
 */
export function useQuotesForItems(items: QuoteRequestItem[]) {
  const fetchQuotes = useServerFn(getMarketQuotes);
  const list = useMemo(() => items.slice(0, 12), [items]);
  const query = useQuery({
    queryKey: marketKeys.quotes(list),
    queryFn: async () => {
      if (list.length === 0) return [] as MarketQuote[];
      return (await fetchQuotes({ data: { items: list } })) as MarketQuote[];
    },
    enabled: list.length > 0,
    staleTime: 60 * 1000,
  });
  const quoteMap = useMemo(() => {
    const m = new Map<string, MarketQuote>();
    for (const q of query.data ?? []) m.set(`${q.identifier_type}:${q.identifier}`, q);
    return m;
  }, [query.data]);
  return { quoteMap, isFetching: query.isFetching };
}

export function useRefreshHoldings() {
  const qc = useQueryClient();
  const fn = useServerFn(refreshMyHoldings);
  return useMutation({
    mutationFn: async () => (await fn({} as never)) as { refreshed: number; total: number },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["market"] });
      qc.invalidateQueries({ queryKey: ["wealth"] });
    },
  });
}

export function useMarketStatus(exchange: string = "NSE") {
  return getMarketStatus(exchange);
}

export type UseAutoRefreshOptions = {
  interval?: MarketRefreshInterval;
};

/**
 * Read-only fundamentals + classification for a single instrument.
 * Auto-fetched; never user-editable. Returns null when unsupported (e.g. MFs).
 */
export function useInstrumentFundamentals(item: QuoteRequestItem | null) {
  const fn = useServerFn(getInstrumentFundamentals);
  return useQuery({
    queryKey: ["market", "fundamentals", item?.identifier_type, item?.identifier],
    queryFn: async () => {
      if (!item) return null;
      return (await fn({
        data: {
          identifier_type: item.identifier_type,
          identifier: item.identifier,
          exchange: item.exchange ?? null,
        },
      })) as InstrumentFundamentals | null;
    },
    enabled: !!item,
    // Fundamentals change at most daily — cache for a day.
    staleTime: 24 * 60 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}

/**
 * Read-only corporate actions (dividends / splits) for a single instrument.
 * Auto-fetched, never user-editable. Empty for mutual funds.
 */
export function useCorporateActions(item: QuoteRequestItem | null) {
  const fn = useServerFn(getCorporateActions);
  return useQuery({
    queryKey: ["market", "corporate-actions", item?.identifier_type, item?.identifier],
    queryFn: async () => {
      if (!item) return [] as CorporateAction[];
      return (await fn({
        data: {
          identifier_type: item.identifier_type,
          identifier: item.identifier,
          exchange: item.exchange ?? null,
        },
      })) as CorporateAction[];
    },
    enabled: !!item,
    staleTime: 24 * 60 * 60 * 1000,
    placeholderData: (prev) => prev,
  });
}
