import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { WALockup, WAMonogram } from "./wa-logo";

/** Kept for consumers (reports, meta) that need a raster URL. */
export const BRAND_LOGO_URL = "/logo-full-dark.png";
export const BRAND_LOGO_LIGHT_URL = "/logo-full-light.png";
export const BRAND_ICON_URL = "/logo-icon-dark.png";
export const BRAND_ICON_LIGHT_URL = "/logo-icon-light.png";

/**
 * BrandIcon — the compact WA monogram.
 */
export function BrandIcon({ className = "h-9 w-9" }: { className?: string; title?: string; animated?: boolean }) {
  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`} aria-label="Wealth Ace">
      <WAMonogram className="h-full w-full" />
    </span>
  );
}

type Size = "sm" | "md" | "lg" | "xl";

const SIZE: Record<Size, string> = {
  sm: "w-[92px] sm:w-[108px] md:w-[118px] lg:w-[132px] max-w-full",
  md: "w-[124px] sm:w-[146px] md:w-[172px] lg:w-[200px] max-w-full",
  lg: "w-[168px] sm:w-[196px] md:w-[228px] lg:w-[264px] max-w-full",
  xl: "w-[280px] sm:w-[340px] md:w-[400px] lg:w-[460px] max-w-full",
};


/** Deprecated — the lockup already renders the wordmark and tagline. */
export function BrandWordmark(_props: {
  size?: Size;
  className?: string;
  tagline?: boolean;
  taglineText?: string;
  animated?: boolean;
}) {
  return null;
}

function AnimatedLockup() {
  return (
    <span className="relative block w-full">
      <span className="wa-in block w-full">
        <WALockup />
      </span>
      <span className="wa-sweep pointer-events-none absolute inset-x-0 top-0 bottom-[45%]" aria-hidden />
      <style>{`
        @keyframes waRise { from { opacity:0; transform: translateY(10px) scale(.985); } to { opacity:1; transform:none; } }
        @keyframes waSweep { 0% { opacity:0; transform: translateX(-70%); } 25% { opacity:.9; } 100% { opacity:0; transform: translateX(120%); } }
        .wa-in { animation: waRise 700ms cubic-bezier(.22,.7,.24,1) both; }
        .wa-sweep {
          background: linear-gradient(105deg, transparent 35%, rgba(226,183,94,.28) 50%, transparent 65%);
          animation: waSweep 1000ms ease-out 380ms both;
        }
        @media (prefers-reduced-motion: reduce) {
          .wa-in { animation-duration: 1ms; }
          .wa-sweep { display: none; }
        }
      `}</style>
    </span>
  );
}

export function BrandMark({
  size = "md",
  to,
  className = "",
  animated = false,
  tagline = true,
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
  const classes = `@container block shrink-0 ${SIZE[size]} ${className}`;
  const inner = animated ? <AnimatedLockup /> : <WALockup tagline={tagline} />;
  if (to) {
    return (
      <Link to={to} aria-label="Wealth Ace" className={classes}>
        {inner}
        {children}
      </Link>
    );
  }
  return (
    <span className={classes}>
      {inner}
      {children}
    </span>
  );
}
