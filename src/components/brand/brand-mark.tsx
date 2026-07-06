import { Link } from "@tanstack/react-router";
import type { CSSProperties, ReactNode } from "react";

/**
 * BrandIcon — theme-adaptive premium FinVista icon.
 * Minimal ascending-peak mark on a teal gradient rounded square, with a
 * spark accent. Scales via className; SVG so it's crisp at every size.
 */
export function BrandIcon({
  className = "h-9 w-9",
  title = "FinVista",
}: {
  className?: string;
  title?: string;
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
        <linearGradient id="fv-brand-grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#22E6D8" />
          <stop offset="55%" stopColor="#14D8CF" />
          <stop offset="100%" stopColor="#0FB7B0" />
        </linearGradient>
        <linearGradient id="fv-brand-sheen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.22" />
          <stop offset="60%" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="44" height="44" rx="12" fill="url(#fv-brand-grad)" />
      <rect x="2" y="2" width="44" height="22" rx="12" fill="url(#fv-brand-sheen)" />
      {/* ascending peak */}
      <path
        d="M12 31.5 L21 20.5 L27 27 L36 15.5"
        fill="none"
        stroke="#ffffff"
        strokeWidth="3.25"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* spark accent */}
      <circle cx="36" cy="15.5" r="2.6" fill="#ffffff" />
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
 * Uses currentColor for Fin/ista so it adapts to light/dark themes.
 */
export function BrandWordmark({
  size = "md",
  className = "",
  tagline = false,
  taglineText = "Direct Your Wealth",
}: {
  size?: Size;
  className?: string;
  tagline?: boolean;
  taglineText?: string;
}) {
  const s = SIZE[size];
  const gradientStyle: CSSProperties = {
    backgroundImage: "linear-gradient(135deg,#22E6D8,#14D8CF 55%,#0FB7B0)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    color: "transparent",
  };
  return (
    <span className={`inline-flex flex-col leading-tight ${className}`}>
      <span className={`font-display font-bold tracking-tight ${s.text}`}>
        <span>Fin</span>
        <span style={gradientStyle}>V</span>
        <span>ista</span>
      </span>
      {tagline && (
        <span
          className={`mt-0.5 font-semibold uppercase tracking-[0.28em] text-muted-foreground ${s.tagline}`}
        >
          {taglineText}
        </span>
      )}
    </span>
  );
}

/**
 * BrandMark — full lockup: premium icon on the LEFT, wordmark on the right.
 * Theme-adaptive, responsive via size prop, optional tagline underneath.
 * Wrap in a Link by passing `to`, or render standalone.
 */
export function BrandMark({
  size = "md",
  to,
  tagline = false,
  taglineText = "Direct Your Wealth",
  className = "",
  iconClassName = "",
  wordmarkClassName = "",
  children,
}: {
  size?: Size;
  to?: string;
  tagline?: boolean;
  taglineText?: string;
  className?: string;
  iconClassName?: string;
  wordmarkClassName?: string;
  children?: ReactNode;
}) {
  const s = SIZE[size];
  const content = (
    <span className={`inline-flex items-center ${s.gap} ${className}`}>
      <BrandIcon className={`${s.icon} shrink-0 rounded-[22%] shadow-[0_6px_20px_-6px_rgba(20,216,207,0.5)] transition-transform duration-200 hover:scale-[1.03] ${iconClassName}`} />
      <BrandWordmark size={size} tagline={tagline} taglineText={taglineText} className={wordmarkClassName} />
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