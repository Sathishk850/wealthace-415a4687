import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import logoDarkAsset from "@/assets/wealth-ace-logo-dark.png.asset.json";
import logoLightAsset from "@/assets/wealth-ace-logo-light.png.asset.json";
import iconAsset from "@/assets/wealth-ace-icon-t.png.asset.json";

/** Dark-mode lockup (original gold/teal on transparent). */
export const BRAND_LOGO_URL = logoDarkAsset.url;
/** Light-mode lockup (ink wordmark + deepened teal on transparent). */
export const BRAND_LOGO_LIGHT_URL = logoLightAsset.url;
export const BRAND_ICON_URL = iconAsset.url;

const LOGO_ALT = "Wealth Ace — Track. Nurture. Prosper.";

/**
 * The lockup ships as two transparent variants of the same artwork: the
 * original gold/teal lockup for dark surfaces, and an ink-wordmark version
 * for light surfaces. No plaque, no shadow — it sits directly on the surface.
 */
const PLAQUE = "";

/** Renders the theme-correct lockup (light variant by default, dark under `.dark`). */
function LogoImg({ alt = "", className = "" }: { alt?: string; className?: string }) {
  return (
    <>
      <img
        src={BRAND_LOGO_LIGHT_URL}
        alt={alt}
        draggable={false}
        className={`block h-auto w-full select-none dark:hidden ${className}`}
      />
      <img
        src={BRAND_LOGO_URL}
        alt=""
        draggable={false}
        className={`hidden h-auto w-full select-none dark:block ${className}`}
      />
    </>
  );
}


/**
 * BrandIcon — the compact brand mark (square emblem asset).
 */
export function BrandIcon({ className = "h-9 w-9" }: { className?: string; title?: string; animated?: boolean }) {
  return (
    <span
      className={`inline-block shrink-0 overflow-hidden ${PLAQUE} ${className}`}
      aria-label="Wealth Ace"
    >
      <img
        src={BRAND_ICON_URL}
        alt=""
        draggable={false}
        className="h-full w-full object-contain"
      />
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

/**
 * Deprecated — the master image already contains the wordmark and tagline.
 */
export function BrandWordmark(_props: {
  size?: Size;
  className?: string;
  tagline?: boolean;
  taglineText?: string;
  animated?: boolean;
}) {
  return null;
}

/** Horizontal bands of the lockup, used for the staged entrance animation. */
const BANDS = [
  { key: "emblem", top: 0, bottom: 36, cls: "wa-band-emblem" },
  { key: "wordmark", top: 64, bottom: 18, cls: "wa-band-word" },
  { key: "divider", top: 82, bottom: 11, cls: "wa-band-divider" },
  { key: "tagline", top: 89, bottom: 0, cls: "wa-band-tagline" },
] as const;

function AnimatedLogo() {
  return (
    <span className="relative block w-full">
      {/* Sizing ghost — keeps layout identical to the static logo */}
      <img src={BRAND_LOGO_URL} alt={LOGO_ALT} className="block h-auto w-full opacity-0" />
      {BANDS.map((b) => (
        <span
          key={b.key}
          className={`pointer-events-none absolute inset-0 block ${b.cls}`}
          style={{ clipPath: `inset(${b.top}% 0% ${b.bottom}% 0%)` }}
          aria-hidden
        >
          <img src={BRAND_LOGO_URL} alt="" className="block h-auto w-full" draggable={false} />
        </span>
      ))}
      {/* Gold arrow sweep + closing teal shimmer */}
      <span className="wa-sweep pointer-events-none absolute inset-x-0 top-0 bottom-[40%]" aria-hidden />
      <span className="wa-glow pointer-events-none absolute inset-0" aria-hidden />
      <style>{`
        @keyframes waRise { from { opacity:0; transform: translateY(10px) scale(.985); } to { opacity:1; transform:none; } }
        @keyframes waFade { from { opacity:0; } to { opacity:1; } }
        @keyframes waExtend { from { opacity:0; transform: scaleX(.2); } to { opacity:1; transform: scaleX(1); } }
        @keyframes waSweep { 0% { opacity:0; transform: translateX(-70%); } 25% { opacity:.9; } 100% { opacity:0; transform: translateX(120%); } }
        @keyframes waGlow { 0%,100% { opacity:0; } 55% { opacity:.55; } }
        .wa-band-emblem { animation: waRise 620ms cubic-bezier(.22,.7,.24,1) both; }
        .wa-band-word { animation: waFade 480ms ease-out 540ms both; }
        .wa-band-divider { transform-origin: 50% 50%; animation: waExtend 520ms cubic-bezier(.22,.7,.24,1) 860ms both; }
        .wa-band-tagline { animation: waFade 520ms ease-out 1150ms both; }
        .wa-sweep {
          background: linear-gradient(105deg, transparent 35%, rgba(226,183,94,.28) 50%, transparent 65%);
          animation: waSweep 900ms ease-out 320ms both;
        }
        .wa-glow {
          background: radial-gradient(ellipse at 55% 40%, rgba(33,219,210,.22), transparent 62%);
          animation: waGlow 900ms ease-in-out 1250ms both;
        }
        @media (prefers-reduced-motion: reduce) {
          .wa-band-emblem, .wa-band-word, .wa-band-divider, .wa-band-tagline { animation: waFade 1ms linear both; }
          .wa-sweep, .wa-glow { display: none; }
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
  const classes = `block w-full overflow-hidden ${PLAQUE} ${SIZE[size]} ${className}`;
  const inner = animated ? (
    <AnimatedLogo />
  ) : (
    <img
      src={BRAND_LOGO_URL}
      alt={LOGO_ALT}
      draggable={false}
      className="block h-auto w-full select-none"
    />
  );
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
