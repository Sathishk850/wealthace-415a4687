import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CalendarDays, ChevronDown, ChevronRight, RefreshCw } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { istDate } from "@/lib/results";
import { cn } from "@/lib/utils";
import { getUpcomingResults, type UpcomingResult } from "@/lib/results.functions";

const fmt = (d: string) => {
  const dt = new Date(`${d}T00:00:00`);
  return {
    day: dt.toLocaleDateString("en-IN", { day: "numeric", month: "short" }),
    weekday: dt.toLocaleDateString("en-IN", { weekday: "long" }),
  };
};

export function UpcomingResultsCard({ ownOnly = false }: { ownOnly?: boolean }) {
  const fetchResults = useServerFn(getUpcomingResults);
  const q = useQuery({
    queryKey: ["upcoming-results"],
    queryFn: () => fetchResults(),
    staleTime: 10 * 60_000,
    refetchInterval: 10 * 60_000,
    refetchOnWindowFocus: "always",
  });

  const today = istDate(Date.now());
  const groups = useMemo(() => {
    const map = new Map<string, UpcomingResult[]>([[today, []]]);
    for (const r of q.data?.results ?? []) {
      if (ownOnly && r.source === "market") continue;
      if (r.date < today) continue; // never show past results
      map.set(r.date, [...(map.get(r.date) ?? []), r]);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [q.data, today, ownOnly]);

  // Today's populated group opens automatically; an empty today stays collapsed.
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  useEffect(() => {
    if (groups[0]?.[1].length) setExpanded(prev => new Set([...prev, today]));
  }, [today, groups[0]?.[1].length]);
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
          <h2 className="font-serif text-lg font-semibold">{ownOnly ? "High-priority Q results" : "This week's Q results"}</h2>
          <p className="text-xs text-muted-foreground">
            {ownOnly ? "Holdings and watchlist" : "All companies reporting in the next 7 days — yours are highlighted"}
          </p>
        </div>
        <Button variant="ghost" size="icon"
          type="button"
          onClick={() => q.refetch()}
          aria-label="Refresh results"
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
        >
          <RefreshCw className={cn("h-4 w-4", q.isFetching && "animate-spin")} />
        </Button>
      </div>
      {q.data?.indiaAvailable === false && <p className="mb-2 text-xs text-muted-foreground">India results feed unavailable, showing US only</p>}
      {q.data?.usAvailable === false && <p className="mb-2 text-xs text-muted-foreground">US results feed unavailable{q.data.indiaAvailable ? ", showing India only" : ""}</p>}
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
                <Button variant="ghost"
                  type="button"
                  onClick={() => toggle(date)}
                  aria-expanded={isOpen}
                  className="flex h-auto w-full items-center justify-start gap-2 whitespace-normal px-2.5 py-2 text-left transition-colors hover:bg-muted/40"
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
                    {items.length === 0 ? "No results today" : `${items.length} ${items.length === 1 ? "company" : "companies"}`}
                  </span>
                </Button>
                {isOpen && (
                  <p className="break-words border-t border-border/60 px-2.5 py-2 pl-10 text-sm text-muted-foreground">
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
