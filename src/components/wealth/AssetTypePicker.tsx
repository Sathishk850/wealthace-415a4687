import { useMemo, useState } from "react";
import * as LucideIcons from "lucide-react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  ASSET_GROUPS,
  LIABILITY_TYPES,
  QUICK_PICKS,
  allAssetTypes,
  type AssetSubType,
  type LiabilityType,
} from "@/lib/asset-types";

type Tab = "asset" | "liability";

type Props = {
  onSelectAsset: (type: AssetSubType) => void;
  onSelectLiability: (type: LiabilityType) => void;
  onClose: () => void;
  defaultTab?: Tab;
};

/** Resolve a lucide icon by its name string. */
function DynIcon({
  name,
  className,
  color,
}: {
  name: string;
  className?: string;
  color?: string;
}) {
  const icons = LucideIcons as unknown as Record<
    string,
    React.ComponentType<{ className?: string; style?: React.CSSProperties }>
  >;
  const Cmp = icons[name] ?? icons["Boxes"]!;
  return <Cmp className={className} style={color ? { color } : undefined} />;
}

export function AssetTypePicker({
  onSelectAsset,
  onSelectLiability,
  onClose,
  defaultTab = "asset",
}: Props) {
  const [tab, setTab] = useState<Tab>(defaultTab);
  const [group, setGroup] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const query = q.trim().toLowerCase();
  const searching = query.length > 0;

  const matches = useMemo(() => {
    if (!searching) return [] as AssetSubType[];
    return allAssetTypes().filter(
      (t) =>
        t.label.toLowerCase().includes(query) ||
        t.dbCategory.toLowerCase().includes(query) ||
        (t.dbSubCategory ?? "").toLowerCase().includes(query),
    );
  }, [query, searching]);

  const liabilityMatches = useMemo(
    () =>
      searching
        ? LIABILITY_TYPES.filter((t) => t.label.toLowerCase().includes(query))
        : LIABILITY_TYPES,
    [query, searching],
  );

  const activeGroup = ASSET_GROUPS.find((g) => g.key === group) ?? null;

  return (
    <div className="flex max-h-[85vh] w-full flex-col overflow-hidden rounded-2xl border border-border bg-card">
      {/* 1. Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Select type</h2>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 px-4 pt-3">
        {/* 2. Asset / Liability toggle */}
        <div className="flex gap-2">
          {(["asset", "liability"] as Tab[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => {
                setTab(t);
                setGroup(null);
              }}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-medium transition-colors",
                tab === t
                  ? "border-mint/30 bg-mint/15 text-mint"
                  : "border-transparent bg-surface-2 text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "asset" ? "Asset" : "Liability"}
            </button>
          ))}
        </div>

        {/* 3. Search */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search asset types…"
            className="pl-9"
          />
        </div>
      </div>

      {/* 4. Content */}
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        {tab === "liability" ? (
          <section className="space-y-2">
            <Label>Select loan type</Label>
            <div className="grid grid-cols-3 gap-2">
              {liabilityMatches.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => onSelectLiability(t)}
                  className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-2 p-3 text-center hover:bg-surface-2/80"
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{ background: t.iconBg }}
                  >
                    <DynIcon name={t.icon} className="h-4 w-4" color={t.iconColor} />
                  </span>
                  <span className="text-[11px] leading-tight text-foreground">{t.label}</span>
                </button>
              ))}
            </div>
          </section>
        ) : searching ? (
          <section className="space-y-2">
            <Label>{matches.length} match{matches.length === 1 ? "" : "es"}</Label>
            <TypeGrid types={matches} onSelect={onSelectAsset} />
            {matches.length === 0 && (
              <p className="py-6 text-center text-xs text-muted-foreground">
                Nothing matches “{q}”.
              </p>
            )}
          </section>
        ) : activeGroup ? (
          <section className="space-y-3">
            <button
              type="button"
              onClick={() => setGroup(null)}
              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ChevronLeft className="h-3.5 w-3.5" /> All categories
            </button>
            <Label>{activeGroup.label}</Label>
            <TypeGrid types={activeGroup.types} onSelect={onSelectAsset} />
          </section>
        ) : (
          <>
            <section className="space-y-2">
              <Label>Common</Label>
              <TypeGrid types={QUICK_PICKS} onSelect={onSelectAsset} />
            </section>
            <section className="space-y-2">
              <Label>All categories</Label>
              <div className="space-y-2">
                {ASSET_GROUPS.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setGroup(g.key)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-2 p-3 text-left hover:bg-surface-2/80"
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                      style={{ background: g.iconBg }}
                    >
                      <DynIcon name={g.icon} className="h-4 w-4" color={g.iconColor} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm text-foreground">{g.label}</span>
                      <span className="block text-[11px] text-muted-foreground">
                        {g.types.length} types
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
      {children}
    </div>
  );
}

function TypeGrid({
  types,
  onSelect,
}: {
  types: AssetSubType[];
  onSelect: (t: AssetSubType) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {types.map((t) => (
        <button
          key={t.key}
          type="button"
          onClick={() => onSelect(t)}
          className="flex items-center gap-2 rounded-xl border border-border bg-surface-2 p-2.5 text-left hover:bg-surface-2/80"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
            style={{ background: t.iconBg }}
          >
            <DynIcon name={t.icon} className="h-4 w-4" color={t.iconColor} />
          </span>
          <span className="min-w-0 text-[11px] leading-tight text-foreground">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
