import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { getUpcomingResults, type UpcomingResult } from "@/lib/results.functions";

const fmt = (d: string) => {
  const dt = new Date(`${d}T00:00:00`);
  return {
    day: dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    weekday: dt.toLocaleDateString("en-IN", { weekday: "long" }),
  };
};

export function UpcomingResultsCard() {
  const fetchResults = useServerFn(getUpcomingResults);
  const q = useQuery({
    queryKey: ["upcoming-results"],
    queryFn: () => fetchResults(),
    staleTime: 30 * 60_000,
  });

  const today = new Date(Date.now() + 5.5 * 3600_000).toISOString().slice(0, 10);
  const groups = new Map<string, UpcomingResult[]>();
  for (const r of q.data ?? []) {
    if (r.date < today) continue; // never show past results
    groups.set(r.date, [...(groups.get(r.date) ?? []), r]);
  }

  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-serif text-lg font-semibold">This week's Q results</h2>
          <p className="text-xs text-muted-foreground">
            All companies reporting in the next 7 days — yours are highlighted
          </p>
        </div>
        <button
          type="button"
          onClick={() => q.refetch()}
          aria-label="Refresh results"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} />
        </button>
      </div>
      {q.isLoading ? (
        <p className="text-sm text-muted-foreground">Checking result dates…</p>
      ) : q.isError ? (
        <p className="text-sm text-destructive">Couldn't load result dates.</p>
      ) : groups.size === 0 ? (
        <p className="text-sm text-muted-foreground">
          No quarterly results scheduled in the next 7 days.
        </p>
      ) : (
        <ul className="space-y-3">
          {[...groups.entries()].map(([date, items]) => {
            const f = fmt(date);
            return (
              <li key={date} className="flex gap-3">
                <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">
                    {f.day} • {f.weekday}
                    {date === today && (
                      <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Today
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {items.map((r, i) => (
                      <span key={r.symbol}>
                        <span
                          className={cn(
                            "font-medium",
                            r.source === "market" ? "text-muted-foreground" : "text-primary",
                          )}
                          title={r.name}
                        >
                          {r.symbol}
                        </span>
                        {r.source !== "market" && (
                          <span className="text-[10px] text-primary">
                            {r.source === "watchlist" ? " (watch)" : " (yours)"}
                          </span>
                        )}
                        {i < items.length - 1 && ", "}
                      </span>
                    ))}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
