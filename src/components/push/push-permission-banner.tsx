import { useEffect, useState } from "react";
import { BellRing, X } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { enablePush, pushContextBlocked } from "@/lib/push-client";

const DISMISS_KEY = "wa-push-banner-dismissed";

export function PushPermissionBanner() {
  const [state, setState] = useState<"hidden" | "prompt" | "denied">("hidden");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (pushContextBlocked()) return;
    if (localStorage.getItem(DISMISS_KEY) === "1") return;
    if (Notification.permission === "default") setState("prompt");
    else if (Notification.permission === "denied") setState("denied");
  }, []);

  if (state === "hidden") return null;

  if (state === "denied") {
    return (
      <p className="text-xs text-muted-foreground">
        Notifications blocked — enable in browser settings to receive alerts.
      </p>
    );
  }

  const onEnable = async () => {
    setBusy(true);
    const res = await enablePush();
    setBusy(false);
    if (res.ok) {
      toast.success("Push notifications enabled for this device");
      setState("hidden");
    } else if (Notification.permission === "denied") {
      setState("denied");
    } else {
      toast.error(res.reason ?? "Could not enable push notifications");
    }
  };

  const dismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setState("hidden");
  };

  return (
    <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-start gap-3">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary">
          <BellRing className="h-4 w-4" />
        </span>
        <div>
          <div className="text-sm font-semibold text-foreground">Get instant market alerts</div>
          <p className="text-xs text-muted-foreground">
            Enable push notifications to receive high-impact event alerts on this device.
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button size="sm" onClick={onEnable} disabled={busy}>
          {busy ? "Enabling…" : "Enable Notifications"}
        </Button>
        <Button size="sm" variant="ghost" onClick={dismiss} aria-label="Not now">
          <X className="h-4 w-4" /> Not now
        </Button>
      </div>
    </Card>
  );
}
