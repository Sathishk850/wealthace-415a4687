import { Link } from "@tanstack/react-router";
import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/**
 * BrandIcon — theme-adaptive premium FinVista icon.
 * Fingerprint ridges in teal + gold ₹ glyph, on a deep gradient tile.
 */
export function BrandIcon({
  className = "h-9 w-9",
  title = "FinVista",
  animated = false,
}: {
  className?: string;
  title?: string;
  /** When true, plays the periodic ₹ metallic shine sweep. */
  animated?: boolean;
}) {
  return (
    <svg
      viewBox="0 0 48 48"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
      className={className}
    >
      <defs>
        <linearGradient id="fv-brand-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0a1420" />
          <stop offset="100%" stopColor="#0f2331" />
        </linearGradient>
        <linearGradient id="fv-brand-teal" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22E6D8" />
          <stop offset="55%" stopColor="#14D8CF" />
          <stop offset="100%" stopColor="#0FB7B0" />
        </linearGradient>
        <linearGradient id="fv-brand-gold" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#F7E39A" />
          <stop offset="45%" stopColor="#D4A24A" />
          <stop offset="100%" stopColor="#8A5A17" />
        </linearGradient>
        <linearGradient id="fv-brand-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        {/* ₹ metallic sweep mask — a diagonal white band that traverses the glyph */}
        <linearGradient id="fv-rupee-sweep" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="50%" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="55%" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="1.5" y="1.5" width="45" height="45" rx="10.5" fill="url(#fv-brand-bg)" />
      <rect x="1.5" y="1.5" width="45" height="22" rx="10.5" fill="url(#fv-brand-sheen)" />
      {/* Fingerprint ridges — teal gradient */}
      <g fill="none" stroke="url(#fv-brand-teal)" strokeLinecap="round" transform="translate(24 24) scale(0.078) translate(-256 -256)">
        <path d="M256 108 C 176 108 128 176 128 244 v 56 c 0 60 20 108 44 140" strokeWidth="18" opacity="0.95" />
        <path d="M256 108 C 336 108 384 176 384 244 v 56 c 0 60 -20 108 -44 140" strokeWidth="18" opacity="0.95" />
        <path d="M256 148 C 196 148 164 200 164 250 v 46 c 0 46 14 82 32 108" strokeWidth="16" opacity="0.82" />
        <path d="M256 148 C 316 148 348 200 348 250 v 46 c 0 46 -14 82 -32 108" strokeWidth="16" opacity="0.82" />
        <path d="M256 190 C 216 190 198 226 198 258 v 38 c 0 32 8 60 20 82" strokeWidth="14" opacity="0.68" />
        <path d="M256 190 C 296 190 314 226 314 258 v 38 c 0 32 -8 60 -20 82" strokeWidth="14" opacity="0.68" />
      </g>
      {/* Rupee glyph — gold gradient with optional metallic sweep */}
      <g>
        <text x="24" y="30" textAnchor="middle" fontFamily="Inter, 'Helvetica Neue', Arial, sans-serif" fontWeight={800} fontSize="15" fill="url(#fv-brand-gold)">₹</text>
        {animated && (
          <text
            x="24"
            y="30"
            textAnchor="middle"
            fontFamily="Inter, 'Helvetica Neue', Arial, sans-serif"
            fontWeight={800}
            fontSize="15"
            fill="url(#fv-rupee-sweep)"
            className="fv-rupee-shine"
          >
            ₹
          </text>
        )}
      </g>
    </svg>
  );
}

type Size = "sm" | "md" | "lg" | "xl";

const SIZE: Record<Size, { icon: string; text: string; tagline: string; gap: string }> = {
  sm: { icon: "h-7 w-7", text: "text-base", tagline: "text-[9px]", gap: "gap-2" },
  md: { icon: "h-9 w-9", text: "text-lg", tagline: "text-[10px]", gap: "gap-2.5" },
  lg: { icon: "h-12 w-12", text: "text-2xl", tagline: "text-[11px]", gap: "gap-3" },
  xl: { icon: "h-20 w-20", text: "text-4xl", tagline: "text-xs", gap: "gap-5" },
};

/**
 * BrandWordmark — "FinVista" with the "V" rendered in the teal gradient.
 * The wordmark uses currentColor so it inherits the theme's foreground
 * (dark → light text, light → charcoal). Below it, a precision teal
 * underline with a centered gold sparkle spans exactly the wordmark width.
 */
export function BrandWordmark({
  size = "md",
  className = "",
  tagline = false,
  taglineText = "Direct Your Wealth",
  animated = true,
}: {
  size?: Size;
  className?: string;
  tagline?: boolean;
  taglineText?: string;
  animated?: boolean;
}) {
  const s = SIZE[size];
  const gradientStyle: CSSProperties = {
    backgroundImage: "linear-gradient(135deg,#22E6D8,#14D8CF 55%,#0FB7B0)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  };
  // Pin underline + tagline widths to the wordmark's actual rendered width
  // so the line starts under "F" and ends under the final "a".
  const wordRef = useRef<HTMLSpanElement>(null);
  const [wordWidth, setWordWidth] = useState<number | undefined>(undefined);
  useLayoutEffect(() => {
    const el = wordRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setWordWidth(el.offsetWidth));
    ro.observe(el);
    setWordWidth(el.offsetWidth);
    return () => ro.disconnect();
  }, []);
  const pinned: CSSProperties | undefined = wordWidth ? { width: wordWidth } : undefined;
  return (
    <span className={`inline-flex flex-col items-center leading-tight ${className}`}>
      <span ref={wordRef} className={`fv-wordmark font-display font-bold tracking-tight ${s.text}`}>
        <span>Fin</span>
        <span className={animated ? "fv-v" : undefined} style={gradientStyle}>V</span>
        <span>ista</span>
      </span>
      {tagline && (
        <span className="fv-underline-row mt-1 flex items-center gap-1.5" style={pinned} aria-hidden="true">
          <span className={`fv-underline ${animated ? "fv-underline--animated" : ""} h-[2px] flex-1`} />
          <svg viewBox="0 0 12 12" className="fv-sparkle h-2 w-2 shrink-0" aria-hidden="true">
            <defs>
              <linearGradient id="fv-spark-gold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#F7E39A" />
                <stop offset="55%" stopColor="#D4A24A" />
                <stop offset="100%" stopColor="#8A5A17" />
              </linearGradient>
            </defs>
            <path d="M6 0 L7 5 L12 6 L7 7 L6 12 L5 7 L0 6 L5 5 Z" fill="url(#fv-spark-gold)" />
          </svg>
          <span className={`fv-underline ${animated ? "fv-underline--animated" : ""} h-[2px] flex-1`} />
        </span>
      )}
      {tagline && (
        <span
          className={`mt-1 block text-center font-semibold uppercase tracking-[0.16em] text-muted-foreground ${s.tagline}`}
        >
          {taglineText}
        </span>
      )}
    </span>
  );
}

/**
 * BrandMark — full lockup: premium icon on the LEFT, wordmark on the right.
 * Theme-adaptive. Pass `hoverAnimated` to enable the fingerprint tilt on hover.
 */
export function BrandMark({
  size = "md",
  to,
  tagline = false,
  taglineText = "Direct Your Wealth",
  className = "",
  iconClassName = "",
  wordmarkClassName = "",
  hoverAnimated = true,
  animated = true,
  children,
}: {
  size?: Size;
  to?: string;
  tagline?: boolean;
  taglineText?: string;
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  hoverAnimated?: boolean;
  animated?: boolean;
  children?: ReactNode;
}) {
  const s = SIZE[size];
  const content = (
    <span className={`fv-brandmark group inline-flex items-center ${s.gap} ${className}`}>
      <BrandIcon
        animated={animated}
        className={`${s.icon} shrink-0 rounded-[22%] shadow-[0_6px_20px_-6px_rgba(20,216,207,0.5)] ${
          hoverAnimated ? "fv-fingerprint" : ""
        } ${iconClassName}`}
      />
      <BrandWordmark size={size} tagline={tagline} taglineText={taglineText} animated={animated} className={wordmarkClassName} />
      {children}
    </span>
  );
  if (to) {
    return (
      <Link to={to} aria-label="FinVista" className="inline-flex items-center">
        {content}
      </Link>
    );
  }
  return content;
}