import { useEffect, useState } from "react";

type Palette = {
  navy: string;
  navyMid: string;
  navyCard: string;
  teal: string;
  blue: string;
  success: string;
  warning: string;
  danger: string;
  fire: string;
  purple: string;
  green: string;
  textPrimary: string;
  textMuted: string;
  textDim: string;
  // extras for surfaces
  cardBorder: string;
  divider: string;
  inputBg: string;
  inputBorder: string;
  bgGradient: string;
  bgGradientFire: string;
  focusBorder: string;
  focusBorderFire: string;
  primaryBtnText: string;
  softBg: string;
};

const DARK: Palette = {
  navy: "#121309", navyMid: "#191A11", navyCard: "#1E2015",
  teal: "#7AB894", blue: "#8FCBA6", success: "#7AB894", warning: "#D9B872",
  danger: "#E38B6E", fire: "#E38B6E", purple: "#9A9C8B", green: "#7AB894",
  textPrimary: "#ECE8DA", textMuted: "#9A9C8B", textDim: "#9A9C8B",
  cardBorder: "#2E301F", divider: "#2E301F", inputBg: "#1E2015", inputBorder: "#2E301F",
  bgGradient: "#121309", bgGradientFire: "#121309",
  focusBorder: "rgba(122,184,148,0.55)", focusBorderFire: "rgba(227,139,110,0.55)",
  primaryBtnText: "#121309", softBg: "#191A11",
};

const LIGHT: Palette = {
  navy: "#F6F3EC", navyMid: "#EFEAE0", navyCard: "#FFFFFF",
  teal: "#2F4B3C", blue: "#3E634F", success: "#2F6B45", warning: "#A6813C",
  danger: "#A8412F", fire: "#A8412F", purple: "#6B6D5F", green: "#2F6B45",
  textPrimary: "#1E2019", textMuted: "#6B6D5F", textDim: "#6B6D5F",
  cardBorder: "#E2DCCC", divider: "#E2DCCC", inputBg: "#FFFFFF", inputBorder: "#E2DCCC",
  bgGradient: "#F6F3EC", bgGradientFire: "#F6F3EC",
  focusBorder: "rgba(47,75,60,0.55)", focusBorderFire: "rgba(166,65,47,0.55)",
  primaryBtnText: "#FFFFFF", softBg: "#EFEAE0",
};

function isDarkNow() {
  if (typeof document === "undefined") return true;
  return document.documentElement.classList.contains("dark");
}

// Proxy that always resolves to the current theme's palette value.
export const C: Palette = new Proxy({} as Palette, {
  get(_t, prop: string) {
    const p = isDarkNow() ? DARK : LIGHT;
    return (p as unknown as Record<string, string>)[prop];
  },
}) as Palette;

// Hook to trigger re-render when the theme class changes.
export function useThemeVersion() {
  const [, setV] = useState(0);
  useEffect(() => {
    const el = document.documentElement;
    const mo = new MutationObserver(() => setV((v) => v + 1));
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);
}
