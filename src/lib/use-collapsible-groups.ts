import { useCallback, useEffect, useState } from "react";

/**
 * Shared expand/collapse state for grouped lists. State is keyed by a stable
 * storage key and persisted in sessionStorage so groups stay exactly as the
 * user left them across tab switches, navigation and re-renders.
 */
export function useCollapsibleGroups(storageKey: string, defaultOpen = true) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = sessionStorage.getItem(`collapse:${storageKey}`);
      if (raw) setCollapsed(JSON.parse(raw) as Record<string, boolean>);
    } catch {
      /* ignore malformed state */
    }
  }, [storageKey]);

  const persist = useCallback(
    (next: Record<string, boolean>) => {
      try {
        sessionStorage.setItem(`collapse:${storageKey}`, JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
    },
    [storageKey],
  );

  const isOpen = useCallback(
    (label: string) => (collapsed[label] === undefined ? defaultOpen : !collapsed[label]),
    [collapsed, defaultOpen],
  );

  const toggle = useCallback(
    (label: string) => {
      setCollapsed((c) => {
        const open = c[label] === undefined ? defaultOpen : !c[label];
        const next = { ...c, [label]: open };
        persist(next);
        return next;
      });
    },
    [defaultOpen, persist],
  );

  const setAll = useCallback(
    (labels: string[], open: boolean) => {
      setCollapsed(() => {
        const next: Record<string, boolean> = {};
        for (const l of labels) next[l] = !open;
        persist(next);
        return next;
      });
    },
    [persist],
  );

  return { isOpen, toggle, setAll };
}
