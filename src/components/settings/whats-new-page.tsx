import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { groupReleases, formatReleaseDate, releases as allReleases, type Release } from "@/lib/releases";

const STORAGE_KEY = "fv-whats-new-expanded";

type ExpandedState = Record<string, boolean>;

function loadState(): ExpandedState {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ExpandedState) : {};
  } catch {
    return {};
  }
}

function saveState(s: ExpandedState) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function WhatsNewPage() {
  const grouped = useMemo(() => groupReleases(allReleases), []);
  const latestVersion = allReleases[0]?.version;

  const defaults = useMemo<ExpandedState>(() => {
    const d: ExpandedState = {};
    grouped.forEach((y, yi) => {
      d[`y:${y.year}`] = yi === 0;
      y.months.forEach((m, mi) => {
        d[`m:${y.year}-${m.month}`] = yi === 0 && mi === 0;
        m.releases.forEach((r, ri) => {
          d[`v:${r.version}`] = yi === 0 && mi === 0 && ri === 0;
        });
      });
    });
    return d;
  }, [grouped]);

  const [expanded, setExpanded] = useState<ExpandedState>(defaults);

  useEffect(() => {
    const saved = loadState();
    setExpanded({ ...defaults, ...saved });
  }, [defaults]);

  const toggle = (key: string) => {
    setExpanded((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveState(next);
      return next;
    });
  };

  return (
    <>
      <PageHeader
        title="What's New"
        description="See the latest features, improvements and fixes."
      />
      <div className="space-y-3">
        {grouped.map((y) => {
          const yKey = `y:${y.year}`;
          const yOpen = !!expanded[yKey];
          const totalReleases = y.months.reduce((a, m) => a + m.releases.length, 0);
          return (
            <Card key={y.year} className="glass-card border-[var(--border)] overflow-hidden">
              <button
                type="button"
                onClick={() => toggle(yKey)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left transition hover:bg-white/5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-foreground">{y.year}</span>
                  <span className="text-xs text-muted-foreground">
                    {totalReleases} release{totalReleases === 1 ? "" : "s"}
                  </span>
                </div>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${yOpen ? "rotate-180" : ""}`}
                />
              </button>

              {yOpen && (
                <div className="border-t border-[var(--border)]">
                  {y.months.map((m) => {
                    const mKey = `m:${y.year}-${m.month}`;
                    const mOpen = !!expanded[mKey];
                    return (
                      <div key={mKey} className="border-b border-[var(--border)] last:border-b-0">
                        <button
                          type="button"
                          onClick={() => toggle(mKey)}
                          className="flex w-full items-center justify-between gap-3 px-5 py-2.5 text-left transition hover:bg-white/5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground/90">{m.monthLabel}</span>
                            <span className="text-xs text-muted-foreground">
                              ({m.releases.length} release{m.releases.length === 1 ? "" : "s"})
                            </span>
                          </div>
                          <ChevronDown
                            className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${mOpen ? "rotate-180" : ""}`}
                          />
                        </button>

                        {mOpen && (
                          <div className="space-y-2 px-4 pb-4">
                            {m.releases.map((r) => (
                              <VersionCard
                                key={r.version}
                                release={r}
                                isLatest={r.version === latestVersion}
                                open={!!expanded[`v:${r.version}`]}
                                onToggle={() => toggle(`v:${r.version}`)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </>
  );
}

function VersionCard({
  release,
  isLatest,
  open,
  onToggle,
}: {
  release: Release;
  isLatest: boolean;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="rounded-lg border border-[var(--border)] bg-surface/40">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/5"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-foreground">v{release.version}</span>
          <span className="text-xs text-muted-foreground">· {formatReleaseDate(release.releaseDate)}</span>
          {isLatest && (
            <Badge variant="outline" className="border-mint/40 text-[10px] text-mint">
              <Sparkles className="mr-0.5 h-3 w-3" /> Latest
            </Badge>
          )}
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <ul className="ml-5 list-disc space-y-1 px-4 pb-4 pr-6 text-sm text-foreground/90">
          {release.changes.map((c, i) => (
            <li key={i}>{c}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
