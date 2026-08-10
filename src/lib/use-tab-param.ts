import { useCallback, useEffect, useState } from "react";

/**
 * Deep-linkable tab state.
 *
 * Reads the initial tab from the URL hash (e.g. `/wealth#assets`) and keeps the
 * hash in sync as the user switches tabs, so every tab in the app can be
 * reached from a shortcut link, bookmark or the quick-nav palette.
 *
 * Matching is case/format insensitive: `#sip-tracker`, `#SIP Tracker` and
 * `#siptracker` all resolve to the tab whose value is `SIP Tracker`.
 */
function slug(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function useTabParam<T extends string>(defaultTab: T, valid: readonly T[]) {
  const resolve = useCallback(
    (hash: string): T | null => {
      const h = slug(hash.replace(/^#/, ""));
      if (!h) return null;
      return valid.find((v) => slug(v) === h) ?? null;
    },
    [valid],
  );

  const [tab, setTabState] = useState<T>(() => {
    if (typeof window === "undefined") return defaultTab;
    return resolve(window.location.hash) ?? defaultTab;
  });

  // React to external hash changes (shortcut links to the current page).
  useEffect(() => {
    const onHash = () => {
      const next = resolve(window.location.hash);
      if (next) setTabState(next);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, [resolve]);

  const setTab = useCallback((next: T) => {
    setTabState(next);
    if (typeof window === "undefined") return;
    const hash = `#${slug(next)}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", window.location.pathname + window.location.search + hash);
    }
  }, []);

  return [tab, setTab] as const;
}
