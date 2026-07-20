import { useEffect, useId, useMemo, useRef, useState } from "react";

type Point = { i: number; v: number };

/**
 * Lightweight SVG sparkline for KPI cards.
 *
 * Trend rules (color decided by parent via `positive`):
 *   positive === true  → up-good  → green (#00c896)
 *   positive === false → down-bad → red   (#ff4d4d)
 *   positive === null  → flat/no history → muted gray
 *
 * Renders a smooth (Catmull-Rom → cubic Bézier) 2px stroke with a soft
 * gradient area fill (10–20% opacity), highlights the latest data point,
 * and animates the stroke drawing left-to-right on mount / data change.
 */
export function KpiSparkline({
  series,
  positive,
  height = 40,
  placeholder = false,
}: {
  series: Point[];
  /** true = good trend (green), false = bad trend (red), null = flat/neutral */
  positive: boolean | null;
  height?: number;
  placeholder?: boolean;
}) {
  const uid = useId().replace(/:/g, "");
  const gradId = `spark-grad-${uid}`;
  const clipId = `spark-clip-${uid}`;
  const pathRef = useRef<SVGPathElement | null>(null);
  const [width, setWidth] = useState(120);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 120;
      if (w > 0) setWidth(w);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const color = placeholder
    ? "var(--muted-foreground)"
    : positive === null
    ? "var(--muted-foreground)"
    : positive
    ? "#00c896"
    : "#ff4d4d";

  const data = useMemo<Point[]>(() => {
    if (placeholder || !series || series.length === 0) {
      // subtle decorative wave — never shown with text
      return [0, 1, 2, 3, 4, 5, 6].map((i) => ({
        i,
        v: Math.sin(i * 0.9) * 0.5 + 0.5,
      }));
    }
    if (series.length === 1) return [series[0], series[0]];
    return series;
  }, [series, placeholder]);

  const { path, area, points } = useMemo(() => {
    const w = Math.max(width, 1);
    const h = height;
    const pad = 4;
    const vals = data.map((p) => p.v);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const span = max - min || 1;
    const n = data.length;
    const pts = data.map((p, idx) => {
      const x = n === 1 ? w / 2 : pad + (idx / (n - 1)) * (w - pad * 2);
      const y = pad + (1 - (p.v - min) / span) * (h - pad * 2);
      return { x, y, v: p.v };
    });

    // Connected polyline with visible data points
    const d = pts.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(" ");
    const last = pts[pts.length - 1];
    const areaD = `${d} L ${last.x.toFixed(2)} ${h} L ${pts[0].x.toFixed(2)} ${h} Z`;
    return { path: d, area: areaD, points: pts };
  }, [data, width, height]);

  // Draw-in animation on mount and whenever the path changes (only real data)
  useEffect(() => {
    if (placeholder) return;
    const el = pathRef.current;
    if (!el) return;
    const len = el.getTotalLength();
    el.style.transition = "none";
    el.style.strokeDasharray = `${len}`;
    el.style.strokeDashoffset = `${len}`;
    // force reflow
    void el.getBoundingClientRect();
    el.style.transition = "stroke-dashoffset 700ms ease-out";
    el.style.strokeDashoffset = "0";
  }, [path, placeholder]);

  return (
    <div ref={wrapRef} className="relative w-full" style={{ height }}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={placeholder ? 0.05 : 0.18} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
          <clipPath id={clipId}>
            <rect x="0" y="0" width={width} height={height} />
          </clipPath>
        </defs>
        <g clipPath={`url(#${clipId})`}>
          <path d={area} fill={`url(#${gradId})`} />
          <path
            ref={pathRef}
            d={path}
            fill="none"
            stroke={color}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={placeholder ? 0.35 : 1}
            strokeDasharray={placeholder ? "3 4" : undefined}
          />
          {!placeholder && (
            <>
              <circle cx={lastX} cy={lastY} r={4.5} fill={color} opacity={0.18} />
              <circle
                cx={lastX}
                cy={lastY}
                r={2.5}
                fill={color}
                stroke="var(--card)"
                strokeWidth={1.25}
              />
            </>
          )}
        </g>
      </svg>
    </div>
  );
}
