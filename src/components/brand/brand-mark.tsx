import { Link } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import logoDark from "@/assets/finvista-logo-dark.png.asset.json";
import logoLight from "@/assets/finvista-logo-light.png.asset.json";

/**
 * Watches the `dark` class on <html> so the brand mark can swap between
 * the dark-theme (white text) and light-theme (charcoal text) logo
 * variants without any redraw / recolor at render time.
 */
function useIsDarkTheme() {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.documentElement.classList.contains("dark");
  });
  useEffect(() => {
    const el = document.documentElement;
    const sync = () => setIsDark(el.classList.contains("dark"));
    sync();
    const mo = new MutationObserver(sync);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
  return isDark;
}

function LogoImage({
  className,
  withTagline = true,
}: {
  className?: string;
  withTagline?: boolean;
}) {
  const isDark = useIsDarkTheme();
  const src = isDark ? logoDark.url : logoLight.url;
  return (
    <img
      src={src}
      alt="FinVista — Direct Your Wealth"
      draggable={false}
      className={className}
      style={
        withTagline
          ? undefined
          : { objectFit: "cover", objectPosition: "center top", aspectRatio: "16 / 9" }
      }
    />
  );
}

/**
 * BrandIcon — icon-only crop of the master logo. Theme-aware.
 */
export function BrandIcon({ className = "h-9 w-9" }: { className?: string; title?: string; animated?: boolean }) {
  const isDark = useIsDarkTheme();
  const src = isDark ? logoDark.url : logoLight.url;
  return (
    <span className={`inline-block overflow-hidden ${className}`} aria-label="FinVista">
      <img
        src={src}
        alt=""
        draggable={false}
        style={{
          height: "100%",
          width: "auto",
          objectFit: "cover",
          objectPosition: "8% center",
          transform: "scale(4.5)",
          transformOrigin: "12% 50%",
        }}
      />
    </span>
  );
}

type Size = "sm" | "md" | "lg" | "xl";

const SIZE: Record<Size, { logo: string; logoNoTag: string }> = {
  sm: {
    logo: "max-w-[80px] sm:max-w-[100px] md:max-w-[110px] lg:max-w-[130px]",
    logoNoTag: "max-w-[80px] sm:max-w-[100px] md:max-w-[110px] lg:max-w-[130px]",
  },
  md: {
    logo: "max-w-[120px] sm:max-w-[140px] md:max-w-[170px] lg:max-w-[200px]",
    logoNoTag: "max-w-[120px] sm:max-w-[140px] md:max-w-[170px] lg:max-w-[200px]",
  },
  lg: {
    logo: "max-w-[160px] sm:max-w-[190px] md:max-w-[220px] lg:max-w-[260px]",
    logoNoTag: "max-w-[160px] sm:max-w-[190px] md:max-w-[220px] lg:max-w-[260px]",
  },
  xl: {
    logo: "max-w-[300px] sm:max-w-[340px] md:max-w-[400px] lg:max-w-[480px]",
    logoNoTag: "max-w-[300px] sm:max-w-[340px] md:max-w-[400px] lg:max-w-[480px]",
  },
};

/**
 * Deprecated — master image already contains the wordmark and tagline.
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
  const widthClass = tagline ? s.logo : s.logoNoTag;
  const classes = `block w-full ${widthClass} ${className}`;
  if (to) {
    return (
      <Link to={to} aria-label="FinVista" className={classes}>
        <LogoImage className="w-full h-auto select-none" withTagline={tagline} />
        {children}
      </Link>
    );
  }
  return (
    <span className={classes}>
      <LogoImage className="w-full h-auto select-none" withTagline={tagline} />
      {children}
    </span>
  );
}
