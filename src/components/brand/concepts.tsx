import type { ReactElement } from "react";
/**
 * WEALTH ACE — logo concept exploration.
 *
 * Four vector marks, each drawn on a 64x64 grid so they scale from 16px
 * favicons to print. Colours are passed in so every concept can render in
 * full colour, monochrome ink, or reversed white.
 */

export const BRAND = {
  teal: "#00D9A3",
  gold: "#FFD700",
  navy: "#0F1419",
  white: "#FFFFFF",
} as const;

export type MarkTone = "color" | "ink" | "reverse";

type MarkProps = { className?: string; tone?: MarkTone };

function tones(tone: MarkTone) {
  if (tone === "ink") return { a: BRAND.navy, b: BRAND.navy, dim: "rgba(15,20,25,0.45)" };
  if (tone === "reverse")
    return { a: BRAND.white, b: BRAND.white, dim: "rgba(255,255,255,0.5)" };
  return { a: BRAND.teal, b: BRAND.gold, dim: "rgba(0,217,163,0.35)" };
}

/** Concept 1 — ACE CARD: a card silhouette whose spade grows out of a bar chart. */
export function MarkAceCard({ className = "h-16 w-16", tone = "color" }: MarkProps) {
  const c = tones(tone);
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Wealth Ace">
      <rect x="12" y="4" width="40" height="56" rx="9" fill="none" stroke={c.a} strokeWidth="3.4" />
      <path
        d="M32 17 L43 31.5 C45.6 35 43.2 39.6 38.9 39.6 C36.6 39.6 34.9 38.4 34 36.6 L34 43 L30 43 L30 36.6 C29.1 38.4 27.4 39.6 25.1 39.6 C20.8 39.6 18.4 35 21 31.5 Z"
        fill={c.b}
      />
      <g fill={c.a}>
        <rect x="22" y="50" width="4" height="5" rx="1.4" />
        <rect x="30" y="47" width="4" height="8" rx="1.4" />
        <rect x="38" y="43.5" width="4" height="11.5" rx="1.4" />
      </g>
    </svg>
  );
}

/** Concept 2 — ASCENT: an "A" built from a rising track line, gold tip breaking out. */
export function MarkAscent({ className = "h-16 w-16", tone = "color" }: MarkProps) {
  const c = tones(tone);
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Wealth Ace">
      <path
        d="M8 54 L26 22 L38 40 L52 12"
        fill="none"
        stroke={c.a}
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M40 10 L56 8 L54 24 Z" fill={c.b} />
      <path d="M14 54 H56" stroke={c.dim} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Concept 3 — AEGIS: shield of trust, growth curve inside, gold apex. */
export function MarkAegis({ className = "h-16 w-16", tone = "color" }: MarkProps) {
  const c = tones(tone);
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Wealth Ace">
      <path
        d="M32 5 L55 13 V32 C55 46 45 55.5 32 59 C19 55.5 9 46 9 32 V13 Z"
        fill="none"
        stroke={c.a}
        strokeWidth="3.4"
        strokeLinejoin="round"
      />
      <path
        d="M19 41 L27.5 32 L34 37 L45 22"
        fill="none"
        stroke={c.a}
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="45" cy="21" r="4.6" fill={c.b} />
    </svg>
  );
}

/** Concept 4 — TRIAD: three strokes — track, nurture, prosper — spiralling upward. */
export function MarkTriad({ className = "h-16 w-16", tone = "color" }: MarkProps) {
  const c = tones(tone);
  return (
    <svg viewBox="0 0 64 64" className={className} role="img" aria-label="Wealth Ace">
      <path
        d="M10 48 C10 26 24 14 44 14"
        fill="none"
        stroke={c.a}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M20 52 C20 34 30 25 45 25"
        fill="none"
        stroke={c.a}
        strokeOpacity={tone === "color" ? 0.6 : 0.55}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M31 55 C31 43 37 37 47 37"
        fill="none"
        stroke={c.a}
        strokeOpacity={tone === "color" ? 0.32 : 0.3}
        strokeWidth="5"
        strokeLinecap="round"
      />
      <circle cx="49" cy="12" r="6" fill={c.b} />
    </svg>
  );
}

export type Concept = {
  id: string;
  name: string;
  idea: string;
  Mark: (p: MarkProps) => ReactElement;
};

export const CONCEPTS: Concept[] = [
  {
    id: "ace-card",
    name: "Ace Card",
    idea: "The ace of wealth — a card frame, a spade rising out of a bar chart.",
    Mark: MarkAceCard,
  },
  {
    id: "ascent",
    name: "Ascent",
    idea: "An 'A' drawn as a tracked climb, gold arrow breaking the ceiling.",
    Mark: MarkAscent,
  },
  {
    id: "aegis",
    name: "Aegis",
    idea: "Shield of trust with a growth curve and a gold coin at its apex.",
    Mark: MarkAegis,
  },
  {
    id: "triad",
    name: "Triad",
    idea: "Three arcs — track, nurture, prosper — converging on a gold sun.",
    Mark: MarkTriad,
  },
];

/** Horizontal lockup: mark + wordmark + tagline rule. */
export function Lockup({
  Mark,
  tone = "color",
  vertical = false,
  textClass = "",
  size = "md",
}: {
  Mark: (p: MarkProps) => ReactElement;
  tone?: MarkTone;
  vertical?: boolean;
  textClass?: string;
  size?: "sm" | "md" | "lg";
}) {
  const markSize = size === "lg" ? "h-20 w-20" : size === "sm" ? "h-9 w-9" : "h-14 w-14";
  const wordSize = size === "lg" ? "text-4xl" : size === "sm" ? "text-base" : "text-2xl";
  const tagSize = size === "lg" ? "text-[11px]" : "text-[9px]";
  return (
    <div
      className={`flex items-center gap-4 ${vertical ? "flex-col gap-3 text-center" : ""} ${textClass}`}
    >
      <Mark className={markSize} tone={tone} />
      <div className={vertical ? "" : "min-w-0"}>
        <div className={`font-display font-bold leading-none tracking-[0.14em] ${wordSize}`}>
          WEALTH<span className="font-light"> ACE</span>
        </div>
        <div
          className={`mt-2 flex items-center gap-2 ${vertical ? "justify-center" : ""}`}
          aria-hidden
        >
          <span className="h-px w-4 shrink-0 bg-current opacity-30" />
          <span className={`${tagSize} whitespace-nowrap font-medium uppercase tracking-[0.28em] opacity-70`}>
            Track · Nurture · Prosper
          </span>
          <span className="h-px w-4 shrink-0 bg-current opacity-30" />
        </div>
      </div>
    </div>
  );
}
