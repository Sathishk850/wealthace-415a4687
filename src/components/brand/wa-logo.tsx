```tsx
/**
 * WEALTH ACE — brand artwork.
 *
 * Uses the approved WealthAce image assets:
 * - wa-lockup.png → full WEALTH ACE logo + tagline
 * - wa-icon.png   → W+A monogram
 */

import waLockup from "@/assets/wa-lockup.png";
import waIcon from "@/assets/wa-icon.png";

/** Logo URLs kept for consumers that need the brand artwork. */
export const WA_LOCKUP_URL = waLockup;
export const WA_LOCKUP_LIGHT_URL = waLockup;
export const WA_MARK_URL = waIcon;
export const WA_MARK_LIGHT_URL = waIcon;

/** The WA monogram only — square emblem, ideal for icons/avatars. */
export function WAMonogram({ className = "" }: { className?: string }) {
  return (
    <img
      src={waIcon}
      alt="Wealth Ace"
      draggable={false}
      className={`block object-contain ${className}`}
    />
  );
}

/** Full horizontal WealthAce lockup. */
export function WALockup({
  className = "",
  tagline = true,
}: {
  className?: string;
  tagline?: boolean;
}) {
  return (
    <span
      className={`block w-full overflow-hidden ${className}`}
      aria-label="Wealth Ace"
    >
      <img
        src={waLockup}
        alt="Wealth Ace — Track, Nurture, Prosper"
        draggable={false}
        className="block h-auto w-full object-contain"
      />
    </span>
  );
}
```
