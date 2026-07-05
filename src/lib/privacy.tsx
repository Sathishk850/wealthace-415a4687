import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type PrivacyCtx = {
  enabled: boolean;
  toggle: () => void;
  setEnabled: (v: boolean) => void;
};

const Ctx = createContext<PrivacyCtx>({
  enabled: false,
  toggle: () => {},
  setEnabled: () => {},
});

export const usePrivacy = () => useContext(Ctx);

const STORAGE_KEY = "fv-privacy";
const DIGIT_RE = /\d/;

/** Replace every digit with • while preserving currency symbols, +/-, %, punctuation, letters, whitespace. */
export function maskNumbers(input: string): string {
  return input.replace(/\d/g, "•");
}

/** Skip nodes inside inputs/textareas and editor-like fields. */
function shouldSkip(node: Node): boolean {
  let el: Node | null = node;
  while (el) {
    if (el.nodeType === Node.ELEMENT_NODE) {
      const e = el as Element;
      const tag = e.tagName;
      if (tag === "SCRIPT" || tag === "STYLE" || tag === "NOSCRIPT") return true;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return true;
      if (e.getAttribute && e.getAttribute("data-privacy-ignore") != null) return true;
      if ((e as HTMLElement).isContentEditable) return true;
    }
    el = el.parentNode;
  }
  return false;
}

export function PrivacyProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  });

  const toggle = useCallback(() => setEnabledState((v) => !v), []);
  const setEnabled = useCallback((v: boolean) => setEnabledState(v), []);

  // WeakMaps must survive across effect runs.
  const originalsRef = useRef<WeakMap<Text, string>>(new WeakMap());
  const maskedRef = useRef<WeakMap<Text, string>>(new WeakMap());

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");
    } catch {}
    document.documentElement.classList.toggle("privacy-on", enabled);

    const originals = originalsRef.current;
    const masked = maskedRef.current;

    const maskTextNode = (node: Text) => {
      const cur = node.nodeValue ?? "";
      if (!DIGIT_RE.test(cur)) return;
      if (shouldSkip(node)) return;
      // If we already masked this exact rendered value, skip.
      if (masked.get(node) === cur) return;
      // Treat current value as the newest original.
      originals.set(node, cur);
      const m = maskNumbers(cur);
      masked.set(node, m);
      if (node.nodeValue !== m) node.nodeValue = m;
    };

    const restoreTextNode = (node: Text) => {
      const o = originals.get(node);
      if (o !== undefined && node.nodeValue !== o) {
        node.nodeValue = o;
      }
      originals.delete(node);
      masked.delete(node);
    };

    const walkAndApply = (root: Node, fn: (t: Text) => void) => {
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n = walker.nextNode();
      while (n) {
        fn(n as Text);
        n = walker.nextNode();
      }
    };

    if (!enabled) {
      // Restore any previously masked nodes still in the DOM.
      walkAndApply(document.body, (t) => {
        if (originals.has(t)) restoreTextNode(t);
      });
      return;
    }

    // Enable: mask everything under body, then observe for future changes.
    walkAndApply(document.body, maskTextNode);

    const obs = new MutationObserver((records) => {
      for (const r of records) {
        if (r.type === "characterData") {
          const n = r.target as Text;
          // React (or app) wrote a new value; treat as new original and remask.
          if (masked.get(n) !== n.nodeValue) maskTextNode(n);
        } else if (r.type === "childList") {
          r.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              maskTextNode(node as Text);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              walkAndApply(node, maskTextNode);
            }
          });
        }
      }
    });
    obs.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });
    return () => obs.disconnect();
  }, [enabled]);

  return (
    <Ctx.Provider value={{ enabled, toggle, setEnabled }}>{children}</Ctx.Provider>
  );
}