import { RefreshCw } from "lucide-react";

/**
 * Icon-only manual refresh control. Pair it with a 30-minute auto-refresh
 * interval on the owning view so displayed data (and any insight derived from
 * it) is never more than half an hour old.
 */
export function RefreshIconButton({
  onClick,
  busy,
  label = "Refresh data",
  lastUpdated,
}: {
  onClick: () => void;
  busy?: boolean;
  label?: string;
  lastUpdated?: string | null;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={lastUpdated ? `${label} · updated ${lastUpdated}` : label}
      className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-mint/40 bg-mint/[0.06] text-mint transition hover:bg-mint/10 disabled:opacity-60"
    >
      <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
    </button>
  );
}

/** Auto-refresh cadence used across the app (5 minutes). */
export const AUTO_REFRESH_MS = 5 * 60 * 1000;
