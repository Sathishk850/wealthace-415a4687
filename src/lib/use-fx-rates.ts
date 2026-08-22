import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getFxRates } from "@/lib/fx.functions";
import type { FxRate } from "@/lib/fx-types";

export function useFxRates() {
  const fetchRates = useServerFn(getFxRates);
  return useQuery({
    queryKey: ["fx-rates"],
    queryFn: () => fetchRates(),
    staleTime: 10 * 60 * 1000,
    refetchInterval: 15 * 60 * 1000,
  });
}

/** Get the rate for a specific pair from the rates array. */
export function getRateFor(rates: FxRate[], from: string, to: string): number | null {
  return rates.find((r) => r.from === from && r.to === to)?.rate ?? null;
}
