import { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useInvestments, useAssets } from "@/lib/wealth-api";

const REGION_COLOURS: Record<string, string> = {
  India: "#22d3ee",
  "United States": "#378ADD",
  Europe: "#7F77DD",
  Global: "#1D9E75",
  "Emerging Markets": "#EF9F27",
  Japan: "#D85A30",
  China: "#E24B4A",
  Other: "#6b7280",
};

const ORDER = Object.keys(REGION_COLOURS);

/** Read "Geography: X" from a holding's notes. */
function geographyFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(/Geography:\s*([^\n]+)/i);
  return m && m[1].trim() ? m[1].trim() : null;
}

/** Normalise any free-text region into one of the known buckets. */
function toRegion(raw: string | null | undefined): string {
  const s = (raw ?? "").trim().toLowerCase();
  if (!s) return "India";
  if (/\b(india|indian|ind|bharat|nse|bse)\b/.test(s)) return "India";
  if (/\b(us|usa|u\.s\.|united states|america|american|nasdaq|nyse)\b/.test(s)) return "United States";
  if (/(europe|european|euro zone|eurozone|germany|france|uk|united kingdom|britain)/.test(s))
    return "Europe";
  if (/(global|world|international|developed markets|ex-india)/.test(s)) return "Global";
  if (/(emerging)/.test(s)) return "Emerging Markets";
  if (/(japan|japanese|nikkei)/.test(s)) return "Japan";
  if (/(china|chinese|hong kong|greater china)/.test(s)) return "China";
  return "Other";
}

function inr(n: number) {
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(2)}Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(2)}L`;
  if (n >= 1e3) return `₹${(n / 1e3).toFixed(1)}K`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
}

export function GeographyLensCard({ className }: { className?: string }) {
  const investmentsQ = useInvestments();
  const assetsQ = useAssets();

  const { rows, total, indiaPct } = useMemo(() => {
    const map = new Map<string, number>();
    const add = (region: string, v: number) => map.set(region, (map.get(region) ?? 0) + v);

    for (const inv of investmentsQ.data ?? []) {
      if ((inv.status ?? "active") !== "active") continue;
      const v = Number(inv.current_value ?? inv.invested_value ?? 0);
      if (!Number.isFinite(v) || v <= 0) continue;
      add(toRegion(geographyFromNotes(inv.notes)), v);
    }
    for (const a of assetsQ.data ?? []) {
      const v = Number(a.current_value ?? 0);
      if (!Number.isFinite(v) || v <= 0) continue;
      add(toRegion(a.location ?? geographyFromNotes(a.notes)), v);
    }

    const totalVal = [...map.values()].reduce((s, v) => s + v, 0);
    const list = [...map.entries()]
      .map(([name, value]) => ({
        name,
        value,
        pct: totalVal > 0 ? (value / totalVal) * 100 : 0,
      }))
      .sort((a, b) => {
        const d = b.value - a.value;
        return d !== 0 ? d : ORDER.indexOf(a.name) - ORDER.indexOf(b.name);
      });
    const india = list.find((r) => r.name === "India")?.pct ?? 0;
    return { rows: list, total: totalVal, indiaPct: india };
  }, [investmentsQ.data, assetsQ.data]);

  const isLoading = investmentsQ.isLoading || assetsQ.isLoading;

  const RADIUS = 56;
  const CIRC = 2 * Math.PI * RADIUS;
  let cum = 0;
  const segments = rows
    .filter((r) => r.pct > 0)
    .map((r) => {
      const dash = (r.pct / 100) * CIRC;
      const offset = CIRC - (cum * CIRC) / 100;
      cum += r.pct;
      return { ...r, dash, offset };
    });

  if (isLoading) {
    return (
      <Card className={cn("p-6", className)}>
        <div className="mb-4 h-5 w-40 animate-pulse rounded bg-muted/40" />
        <div className="mb-4 h-8 w-56 animate-pulse rounded bg-muted/30" />
        <div className="flex flex-wrap items-center gap-6">
          <div className="h-[136px] w-[136px] animate-pulse rounded-full bg-muted/40" />
          <div className="flex-1 space-y-2">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-3 w-48 animate-pulse rounded bg-muted/30" />
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn("p-6", className)}>
      <h3 className="mb-1 text-sm font-semibold text-foreground">Geography Lens</h3>
      <p className="mb-4 text-xs text-muted-foreground">
        {total === 0
          ? "Add holdings to see your regional split."
          : `${indiaPct.toFixed(1)}% India / ${(100 - indiaPct).toFixed(1)}% International`}
      </p>

      <div className="mb-5 flex flex-wrap items-center gap-6">
        <div className="relative shrink-0">
          <svg width="136" height="136" viewBox="0 0 136 136" className="-rotate-90">
            <circle cx="68" cy="68" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="18" />
            {total === 0 ? (
              <circle cx="68" cy="68" r={RADIUS} fill="none" stroke="rgba(255,255,255,0.12)" strokeWidth="18" />
            ) : (
              segments.map((s) => (
                <circle
                  key={s.name}
                  cx="68"
                  cy="68"
                  r={RADIUS}
                  fill="none"
                  stroke={REGION_COLOURS[s.name] ?? "#6b7280"}
                  strokeWidth="18"
                  strokeDasharray={`${s.dash} ${CIRC - s.dash}`}
                  strokeDashoffset={s.offset}
                  strokeLinecap="butt"
                />
              ))
            )}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-base font-bold text-foreground">{inr(total)}</span>
            <span className="text-[10px] text-muted-foreground">Total</span>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          {rows.map((r) => (
            <div key={r.name} className="flex items-center gap-2 text-xs">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ background: REGION_COLOURS[r.name] ?? "#6b7280" }}
              />
              <span className="w-32 text-muted-foreground">{r.name}</span>
              <span className="w-12 text-right font-semibold text-foreground">{r.pct.toFixed(1)}%</span>
              <span className="text-muted-foreground">{inr(r.value)}</span>
            </div>
          ))}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="space-y-2.5">
          {rows.map((r) => (
            <div key={r.name}>
              <div className="mb-1 flex items-center justify-between text-[11px]">
                <span className="text-muted-foreground">{r.name}</span>
                <span className="font-semibold text-foreground">{r.pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted/30">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, r.pct)}%`,
                    background: REGION_COLOURS[r.name] ?? "#6b7280",
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
