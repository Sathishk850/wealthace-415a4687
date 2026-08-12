/**
 * WEALTH ACE — official brand artwork.
 *
 * Two tuned variants of the same artwork ship from /public:
 *  - *-dark.png  : transparent art, tuned for dark surfaces
 *  - *-light.png : shadow areas filled with brand navy so the metallic
 *                  gold/teal still reads on white surfaces
 *
 * Both are rendered and swapped with the `dark` class variant so there is no
 * hydration mismatch and no theme flash.
 */

export const WA_LOCKUP_URL = "/logo-full-dark.png";
export const WA_LOCKUP_LIGHT_URL = "/logo-full-light.png";
export const WA_MARK_URL = "/logo-icon-dark.png";
export const WA_MARK_LIGHT_URL = "/logo-icon-light.png";

const IMG = "object-contain select-none";

/** The WA monogram only — square emblem, ideal for icons/avatars. */
export function WAMonogram({ className = "" }: { className?: string }) {
  return (
    <>
      <img
        src={WA_MARK_LIGHT_URL}
        alt="Wealth Ace"
        className={`${IMG} dark:hidden ${className}`}
        loading="eager"
        decoding="async"
      />
      <img
        src={WA_MARK_URL}
        alt=""
        aria-hidden
        className={`${IMG} hidden dark:block ${className}`}
        loading="eager"
        decoding="async"
      />
    </>
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
  void tagline;
  const base = `block h-auto w-full ${IMG} ${className}`;
  return (
    <>
      <img
        src={WA_LOCKUP_LIGHT_URL}
        alt="Wealth Ace — Track. Nurture. Prosper."
        title="Wealth Ace — Track. Nurture. Prosper."
        className={`${base} dark:hidden`}
        loading="eager"
        decoding="async"
      />
      <img
        src={WA_LOCKUP_URL}
        alt=""
        aria-hidden
        title="Wealth Ace — Track. Nurture. Prosper."
        className={`${base} hidden dark:block`}
        loading="eager"
        decoding="async"
      />
    </>
  );
}
