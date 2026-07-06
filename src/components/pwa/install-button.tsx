import { useEffect, useState } from "react";
import { Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as unknown as { standalone?: boolean }).standalone === true
  );
}

function detectIOS(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) && !("MSStream" in window);
}

export function InstallAppButton() {
  const [deferred, setDeferred] = useState<BIPEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [showIOSHelp, setShowIOSHelp] = useState(false);

  useEffect(() => {
    if (isStandalone()) {
      setInstalled(true);
      return;
    }
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  if (installed) return null;

  const ios = detectIOS();
  if (!deferred && !ios) return null;

  const handleClick = async () => {
    if (deferred) {
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      if (outcome === "accepted") setInstalled(true);
      setDeferred(null);
    } else if (ios) {
      setShowIOSHelp(true);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClick}
        className="hidden md:inline-flex items-center gap-1.5 rounded-lg border border-[#21DBD2]/40 bg-[rgba(33,219,210,0.10)] px-2.5 py-1.5 text-xs font-semibold text-[#21DBD2] transition hover:bg-[rgba(33,219,210,0.18)]"
        aria-label="Install FinVista"
      >
        <Download className="h-3.5 w-3.5" />
        Install App
      </button>
      <Dialog open={showIOSHelp} onOpenChange={setShowIOSHelp}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add FinVista to Home Screen</DialogTitle>
            <DialogDescription>
              iOS doesn't allow automatic install prompts. To install FinVista:
            </DialogDescription>
          </DialogHeader>
          <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
            <li>Tap the <span className="font-semibold">Share</span> icon in Safari's toolbar.</li>
            <li>Scroll and tap <span className="font-semibold">Add to Home Screen</span>.</li>
            <li>Confirm by tapping <span className="font-semibold">Add</span>.</li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  );
}