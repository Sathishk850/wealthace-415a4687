import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import logoAsset from "@/assets/finvista-logo.png.asset.json";

const LOGO_URL = logoAsset.url;

/**
 * FinVista master logo — used as-is, no restyling.
 * The image already contains the fingerprint icon, wordmark,
 * underline, sparkle and tagline.
 */
function LogoImage({ className, withTagline = true }: { className?: string; withTagline?: boolean }) {
  // Crop the tagline off (bottom third of the image) when only the
  // icon+wordmark row is wanted, using CSS object-position + aspect.
  return (
    <img
      src={LOGO_URL}
      alt="FinVista — Direct Your Wealth"
      draggable={false}
      className={className}
      style={withTagline ? undefined : { objectFit: "cover", objectPosition: "center top", aspectRatio: "16 / 9" }}
    />
  );
}

/**
 * BrandIcon — theme-adaptive premium FinVista icon.
 * Fingerprint ridges in teal + gold ₹ glyph, on a deep gradient tile.
 */
export function BrandIcon({
  className = "h-9 w-9",
}: {
  className?: string;
  title?: string;
  animated?: boolean;
}) {
  // Icon-only rendering of the master logo (crops off wordmark+tagline).
  return (
    <span className={`inline-block overflow-hidden ${className}`} aria-label="FinVista">
      <img
        src={LOGO_URL}
        alt=""
        draggable={false}
        style={{
          height: "100%",
          width: "auto",
          objectFit: "cover",
          objectPosition: "8% center",
          // The icon occupies roughly the left ~22% of the master image.
          // Scale the image so only that region is visible in the square box.
          transform: "scale(4.5)",
          transformOrigin: "12% 50%",
        }}
      />
    </span>
  );
}

type Size = "sm" | "md" | "lg" | "xl";

const SIZE: Record<Size, { logo: string; logoNoTag: string }> = {
  sm: { logo: "h-8", logoNoTag: "h-6" },
  md: { logo: "h-10", logoNoTag: "h-8" },
  lg: { logo: "h-14", logoNoTag: "h-10" },
  xl: { logo: "h-24", logoNoTag: "h-16" },
};

/**
 * BrandWordmark — "FinVista" with the "V" rendered in the teal gradient.
 * The wordmark uses currentColor so it inherits the theme's foreground
 * (dark → light text, light → charcoal). Below it, a precision teal
 * underline with a centered gold sparkle spans exactly the wordmark width.
 */
export function BrandWordmark(_props: {
  size?: Size;
  className?: string;
  tagline?: boolean;
  taglineText?: string;
  animated?: boolean;
}) {
  // The master logo image already contains the wordmark (and tagline).
  // Rendering it here would duplicate the mark, so this is intentionally empty.
  return null;
}

/**
 * BrandMark — full lockup: premium icon on the LEFT, wordmark on the right.
 * Theme-adaptive. Pass `hoverAnimated` to enable the fingerprint tilt on hover.
 */
export function BrandMark({
  size = "md",
  to,
  tagline = true,
  className = "",
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
  const heightClass = tagline ? s.logo : s.logoNoTag;
  const content = (
    <span className={`inline-flex items-center ${className}`}>
      <LogoImage className={`${heightClass} w-auto select-none`} withTagline={tagline} />
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