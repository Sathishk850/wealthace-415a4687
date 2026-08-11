/**
 * WEALTH ACE — WA monogram logo, drawn as pure SVG so it stays crisp at any
 * size and adapts to light/dark themes without swapping raster assets.
 *
 * Teal gradient: #0BD4C0 → #06B3A4   Gold gradient: #FFE08A → #D4A017
 */

let uid = 0;
function useIds() {
  // Stable per-instance gradient ids (SSR-safe: incremented at render time).
  const n = ++uid;
  return { teal: `wa-teal-${n}`, gold: `wa-gold-${n}` };
}

/** The WA monogram only — square-ish emblem, ideal for icons/favicons. */
export function WAMonogram({ className = "" }: { className?: string }) {
  const id = useIds();
  return (
    <svg viewBox="0 0 240 150" className={className} role="img" aria-label="Wealth Ace">
      <defs>
        <linearGradient id={id.teal} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#0BD4C0" />
          <stop offset="100%" stopColor="#06B3A4" />
        </linearGradient>
        <linearGradient id={id.gold} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#FFE08A" />
          <stop offset="100%" stopColor="#D4A017" />
        </linearGradient>
      </defs>
      {/* W — sharp double chevron */}
      <path
        d="M18 20 L58 128 L96 52 L122 108"
        fill="none"
        stroke={`url(#${id.teal})`}
        strokeWidth="19"
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      {/* Bridge — teal swoosh linking W into A */}
      <path
        d="M52 118 C 96 132 140 118 172 84"
        fill="none"
        stroke={`url(#${id.teal})`}
        strokeWidth="13"
        strokeLinecap="round"
        opacity="0.95"
      />
      {/* A — gold apex, right stroke carries the weight */}
      <path
        d="M112 128 L162 20 L212 128"
        fill="none"
        stroke={`url(#${id.gold})`}
        strokeWidth="19"
        strokeLinecap="round"
        strokeLinejoin="miter"
      />
      <path
        d="M136 96 H 188"
        fill="none"
        stroke={`url(#${id.gold})`}
        strokeWidth="12"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Full stacked lockup: monogram + WEALTH ACE wordmark + rule-flanked tagline. */
export function WALockup({
  className = "",
  tagline = true,
}: {
  className?: string;
  tagline?: boolean;
}) {
  return (
    <span className={`flex w-full flex-col items-center ${className}`}>
      <WAMonogram className="h-auto w-[48%] min-w-[64px]" />
      <span className="mt-[6%] flex items-baseline gap-[0.18em] font-display text-[clamp(0.95rem,15cqw,4rem)] font-semibold leading-none tracking-[0.18em]">
        <span className="bg-gradient-to-r from-[#0BD4C0] to-[#06B3A4] bg-clip-text text-transparent">
          WEALTH
        </span>
        <span className="bg-gradient-to-r from-[#FFE08A] to-[#D4A017] bg-clip-text text-transparent">
          ACE
        </span>
      </span>
      {tagline && (
        <span className="mt-[4%] flex w-full items-center justify-center gap-[0.5em]">
          <span className="h-px w-[8%] bg-[#D4A017]/60" aria-hidden />
          <span className="whitespace-nowrap text-[clamp(0.36rem,4.2cqw,0.72rem)] font-medium uppercase tracking-[0.3em] text-[#0BD4C0]">
            Track <span className="text-[#D4A017]">•</span> Nurture{" "}
            <span className="text-[#D4A017]">•</span> Prosper
          </span>
          <span className="h-px w-[8%] bg-[#D4A017]/60" aria-hidden />
        </span>
      )}
    </span>
  );
}
