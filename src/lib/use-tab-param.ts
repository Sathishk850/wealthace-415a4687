import { useCallback, useEffect, useState } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";

/**
 * Deep-linkable tab state.
 *
 * Reads the active tab from the URL hash (e.g. `/wealth#assets`) and keeps the
 * hash in sync as the user switches tabs, so every tab in the app can be
 * reached from a shortcut link, bookmark or the quick-nav palette.
 *
 * Matching is format insensitive: `#sip-tracker`, `#SIP Tracker` and
 * `#siptracker` all resolve to the tab whose value is `SIP Tracker`.
 */
function slug(v: string) {
  return v.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function useTabParam<T extends string>(defaultTab: T, valid: readonly T[]) {
  const navigate = useNavigate();
  const hash = useRouterState({ select: (s) => s.location.hash });

  const resolve = useCallback(
    (raw: string | undefined): T | null => {
      const h = slug((raw ?? "").replace(/^#/, ""));
      if (!h) return null;
      return valid.find((v) => slug(v) === h) ?? null;
    },
    [valid],
  );

  const [tab, setTabState] = useState<T>(() => resolve(hash) ?? defaultTab);

  // React to hash changes coming from links / back-forward navigation.
  useEffect(() => {
    const next = resolve(hash);
    if (next && next !== tab) setTabState(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hash]);

  const setTab = useCallback(
    (next: T) => {
      setTabState(next);
      navigate({ to: ".", hash: slug(next), replace: true } as never);
    },
    [navigate],
  );

  return [tab, setTab] as const;
}
