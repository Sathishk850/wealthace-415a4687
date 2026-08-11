/**
 * WEALTH ACE — official brand artwork.
 *
 * Both marks are the supplied artwork (transparent PNG, CDN-hosted), so they
 * sit correctly on light and dark surfaces without theme swapping.
 */
import lockupAsset from "@/assets/wealth-ace-lockup-h.png.asset.json";
import markAsset from "@/assets/wealth-ace-mark.png.asset.json";

export const WA_LOCKUP_URL = lockupAsset.url;
export const WA_MARK_URL = markAsset.url;

/** The WA monogram only — square emblem, ideal for icons/avatars. */
export function WAMonogram({ className = "" }: { className?: string }) {
  return (
    <img
      src={WA_MARK_URL}
      alt="Wealth Ace"
      className={`object-contain ${className}`}
      loading="eager"
      decoding="async"
    />
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
  return (
    <img
      src={WA_LOCKUP_URL}
      alt="Wealth Ace — Track · Nurture · Prosper"
      className={`block h-auto w-full object-contain ${className}`}
      loading="eager"
      decoding="async"
    />
  );
}
