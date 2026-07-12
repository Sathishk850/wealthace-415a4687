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
  navy: "#000000",
  navyMid: "#0A0A0A",
  navyCard: "rgba(15,15,17,0.85)",
  teal: "#00D4AA",
  blue: "#00B4D8",
  success: "#10B981",
  warning: "#F59E0B",
  danger: "#EF4444",
  fire: "#F97316",
  purple: "#A78BFA",
  green: "#10B981",
  textPrimary: "#E2E8F0",
  textMuted: "#94A3B8",
  textDim: "#64748B",
  cardBorder: "rgba(0,212,170,0.12)",
  divider: "rgba(255,255,255,0.06)",
  inputBg: "rgba(255,255,255,0.06)",
  inputBorder: "rgba(255,255,255,0.1)",
  bgGradient:
    "radial-gradient(1200px 600px at 20% 0%, rgba(0,212,170,0.06), transparent 60%), radial-gradient(900px 500px at 80% 100%, rgba(0,180,216,0.05), transparent 60%), #000",
  bgGradientFire:
    "radial-gradient(1200px 600px at 20% 0%, rgba(249,115,22,0.06), transparent 60%), radial-gradient(900px 500px at 80% 100%, rgba(0,212,170,0.05), transparent 60%), #000",
  focusBorder: "rgba(0,212,170,0.5)",
  focusBorderFire: "rgba(249,115,22,0.5)",
  primaryBtnText: "#0A1628",
  softBg: "rgba(255,255,255,0.03)",
};

const LIGHT: Palette = {
  navy: "#F8FAFC",
  navyMid: "#F1F5F9",
  navyCard: "rgba(255,255,255,0.95)",
  teal: "#0F9E85",
  blue: "#0284C7",
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  fire: "#EA580C",
  purple: "#7C3AED",
  green: "#059669",
  textPrimary: "#0F172A",
  textMuted: "#475569",
  textDim: "#64748B",
  cardBorder: "rgba(15,158,133,0.22)",
  divider: "rgba(15,23,42,0.08)",
  inputBg: "#FFFFFF",
  inputBorder: "rgba(15,23,42,0.14)",
  bgGradient:
    "radial-gradient(1200px 600px at 20% 0%, rgba(15,158,133,0.10), transparent 60%), radial-gradient(900px 500px at 80% 100%, rgba(2,132,199,0.08), transparent 60%), #F8FAFC",
  bgGradientFire:
    "radial-gradient(1200px 600px at 20% 0%, rgba(234,88,12,0.10), transparent 60%), radial-gradient(900px 500px at 80% 100%, rgba(15,158,133,0.08), transparent 60%), #F8FAFC",
  focusBorder: "rgba(15,158,133,0.55)",
  focusBorderFire: "rgba(234,88,12,0.55)",
  primaryBtnText: "#FFFFFF",
  softBg: "rgba(15,23,42,0.035)",
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
