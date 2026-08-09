import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { onSwUpdateReady, registerServiceWorker } from "@/lib/pwa/register-sw";

export function PwaUpdatePrompt() {
  const [reload, setReload] = useState<null | (() => void)>(null);

  useEffect(() => {
    registerServiceWorker();
    const off = onSwUpdateReady((fn) => setReload(() => fn));
    return off;
  }, []);

  if (!reload) return null;

  return (
    <div className="fixed bottom-24 left-1/2 z-[60] w-[calc(100%-2rem)] max-w-sm -translate-x-1/2 rounded-xl border border-[#21DBD2]/40 bg-surface-2/95 p-4 shadow-2xl backdrop-blur-xl lg:bottom-6">
      <div className="flex items-start gap-3">
        <div className="grid h-9 w-9 place-items-center rounded-lg bg-[rgba(33,219,210,0.15)] text-[#21DBD2]">
          <RefreshCw className="h-4 w-4" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-foreground">
            A new version of Wealth Ace is available.
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Refresh to get the latest updates.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => reload()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#21DBD2] px-3 py-1.5 text-xs font-semibold text-black transition hover:bg-[#21DBD2]/90"
            >
              Refresh Now
            </button>
            <button
              onClick={() => setReload(null)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:text-foreground"
            >
              Later
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}