import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { WALockup, WAMonogram } from "./wa-logo";

/** Kept for consumers (reports, meta) that need a raster URL. */
import logoDarkAsset from "@/assets/wealth-ace-logo-dark.png.asset.json";
import logoLightAsset from "@/assets/wealth-ace-logo-light.png.asset.json";
import iconAsset from "@/assets/wealth-ace-icon-t.png.asset.json";

export const BRAND_LOGO_URL = logoDarkAsset.url;
export const BRAND_LOGO_LIGHT_URL = logoLightAsset.url;
export const BRAND_ICON_URL = iconAsset.url;

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
  sm: "max-w-[92px] sm:max-w-[108px] md:max-w-[118px] lg:max-w-[132px]",
  md: "max-w-[124px] sm:max-w-[146px] md:max-w-[172px] lg:max-w-[200px]",
  lg: "max-w-[168px] sm:max-w-[196px] md:max-w-[228px] lg:max-w-[264px]",
  xl: "max-w-[280px] sm:max-w-[340px] md:max-w-[400px] lg:max-w-[460px]",
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
  const classes = `@container block w-full ${SIZE[size]} ${className}`;
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
