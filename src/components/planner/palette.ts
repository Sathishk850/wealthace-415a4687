import { useEffect, useState } from "react";

export type Palette = {
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
  cardBorder: string;
  divider: string;
  inputBg: string;
  inputBorder: string;
  bgGradient: string;
  chipBg: string;
  chipBorder: string;
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
  chipBg: "rgba(0,212,170,0.08)",
  chipBorder: "rgba(0,212,170,0.15)",
};

const LIGHT: Palette = {
  navy: "#F8FAFC",
  navyMid: "#F1F5F9",
  navyCard: "rgba(255,255,255,0.9)",
  teal: "#0F9E85",
  blue: "#0891B2",
  success: "#059669",
  warning: "#D97706",
  danger: "#DC2626",
  fire: "#EA580C",
  purple: "#7C3AED",
  green: "#059669",
  textPrimary: "#0F172A",
  textMuted: "#475569",
  textDim: "#64748B",
  cardBorder: "rgba(15,158,133,0.18)",
  divider: "rgba(15,23,42,0.08)",
  inputBg: "rgba(15,23,42,0.04)",
  inputBorder: "rgba(15,23,42,0.12)",
  bgGradient:
    "radial-gradient(1200px 600px at 20% 0%, rgba(15,158,133,0.08), transparent 60%), radial-gradient(900px 500px at 80% 100%, rgba(8,145,178,0.06), transparent 60%), #F8FAFC",
  chipBg: "rgba(15,158,133,0.08)",
  chipBorder: "rgba(15,158,133,0.2)",
};

export function usePalette(): Palette {
  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document === "undefined") return true;
    return document.documentElement.classList.contains("dark");
  });

  useEffect(() => {
    const el = document.documentElement;
    const update = () => setIsDark(el.classList.contains("dark"));
    update();
    const mo = new MutationObserver(update);
    mo.observe(el, { attributes: true, attributeFilter: ["class"] });
    return () => mo.disconnect();
  }, []);

  return isDark ? DARK : LIGHT;
}
