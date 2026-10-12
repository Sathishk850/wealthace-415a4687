import { useEffect, useMemo, useState } from "react";
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
  const groups = useMemo(() => {
    const map = new Map<string, UpcomingResult[]>();
    for (const r of q.data ?? []) {
      if (r.date < today) continue; // never show past results
      map.set(r.date, [...(map.get(r.date) ?? []), r]);
    }
    return [...map.entries()];
  }, [q.data, today]);

  // Day groups start collapsed; the nearest day is expanded initially.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (groups.length > 0 && expanded.size === 0) {
      setExpanded(new Set([groups[0][0]]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groups.length]);
  const toggle = (date: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(date)) next.delete(date);
      else next.add(date);
      return next;
    });

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
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No quarterly results scheduled in the next 7 days.
        </p>
      ) : (
        <ul className="space-y-1.5">
          {groups.map(([date, items]) => {
            const f = fmt(date);
            const isOpen = expanded.has(date);
            return (
              <li key={date} className="rounded-lg border border-border/60">
                <button
                  type="button"
                  onClick={() => toggle(date)}
                  aria-expanded={isOpen}
                  className="flex w-full items-center gap-2 px-2.5 py-2 text-left transition-colors hover:bg-muted/40"
                >
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <CalendarDays className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                    {f.day} • {f.weekday}
                    {date === today && (
                      <span className="ml-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                        Today
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {items.length} {items.length === 1 ? "company" : "companies"}
                  </span>
                </button>
                {isOpen && (
                  <p className="border-t border-border/60 px-2.5 py-2 pl-10 text-sm text-muted-foreground">
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
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
