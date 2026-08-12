/**
 * WEALTH ACE — brand artwork (vector, theme-aware).
 *
 * The mark is a single continuous stroke: a W whose final upstroke becomes the
 * left leg of the A, so the two letters interlock into one monogram.
 * Colors adapt automatically: deep teal / antique gold on light surfaces,
 * bright teal / champagne gold on dark surfaces.
 */

/** Legacy raster URLs kept for consumers that need a bitmap (PDF reports, meta). */
export const WA_LOCKUP_URL = "/logo-full-dark.png";
export const WA_LOCKUP_LIGHT_URL = "/logo-full-light.png";
export const WA_MARK_URL = "/logo-icon-dark.png";
export const WA_MARK_LIGHT_URL = "/logo-icon-light.png";

const TEAL = "stroke-[#0E9C86] dark:stroke-[#21DBD2]";
const GOLD = "stroke-[#B0842A] dark:stroke-[#E2B75E]";

/** The WA monogram only — square emblem, ideal for icons/avatars. */
export function WAMonogram({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 112 96"
      role="img"
      aria-label="Wealth Ace"
      className={className}
      fill="none"
      strokeWidth={9}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {/* W — flows into the A's left leg */}
      <path d="M10 22 L27 74 L44 36 L61 74 L79 22" className={TEAL} />
      {/* A — right leg + crossbar */}
      <path d="M79 22 L97 74" className={GOLD} />
      <path d="M70 58 H89" className={GOLD} strokeWidth={7} />
    </svg>
  );
}

/** Full horizontal lockup: WA monogram + WEALTH ACE wordmark + tagline. */
export function WALockup({
  className = "",
  tagline = true,
}: {
  className?: string;
  tagline?: boolean;
}) {
  return (
    <span className={`@container flex w-full items-center gap-[5cqw] ${className}`}>
      <WAMonogram className="h-[27cqw] w-[27cqw] shrink-0" />
      <span className="flex min-w-0 flex-col justify-center">
        <span className="font-display text-[13cqw] leading-none font-semibold tracking-[0.14em] whitespace-nowrap text-[#0B1E2D] dark:text-white">
          WEALTH<span className="text-[#B0842A] dark:text-[#E2B75E]"> ACE</span>
        </span>
        {tagline ? (
          <span className="mt-[2.5cqw] text-[4.6cqw] leading-none font-medium tracking-[0.34em] whitespace-nowrap text-[#0E9C86] dark:text-[#21DBD2]">
            TRACK · NURTURE · PROSPER
          </span>
        ) : null}
      </span>
    </span>
  );
}
