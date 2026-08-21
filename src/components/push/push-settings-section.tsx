import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { disablePush, enablePush, isPushSubscribed, pushContextBlocked } from "@/lib/push-client";

const HIGH_ONLY_KEY = "wa-push-high-impact-only";
const PORTFOLIO_KEY = "wa-push-portfolio-events";

export function PushSettingsSection() {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  const [highOnly, setHighOnly] = useState(false);
  const [portfolioOnly, setPortfolioOnly] = useState(false);
  const blocked = typeof window === "undefined" ? "Unavailable" : pushContextBlocked();

  useEffect(() => {
    void isPushSubscribed().then(setEnabled);
    setHighOnly(localStorage.getItem(HIGH_ONLY_KEY) === "1");
    setPortfolioOnly(localStorage.getItem(PORTFOLIO_KEY) === "1");
  }, []);

  const toggle = async (v: boolean) => {
    setBusy(true);
    if (v) {
      const res = await enablePush();
      if (res.ok) {
        setEnabled(true);
        toast.success("Push notifications enabled for this device");
      } else {
        toast.error(res.reason ?? "Could not enable push notifications");
      }
    } else {
      await disablePush();
      setEnabled(false);
      toast.success("Push notifications disabled on this device");
    }
    setBusy(false);
  };

  return (
    <Card className="glass-card border-[var(--border)] p-5">
      <div className="mb-2 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-foreground">Push Notifications</h3>
        {blocked && <Badge variant="outline" className="text-[10px]">Published app only</Badge>}
      </div>
      <p className="mb-4 text-xs text-muted-foreground">
        {blocked ?? "Receive market event alerts on this device, even when Wealth Ace is closed."}
      </p>
      <div className="space-y-2">
        <label className="flex items-center justify-between rounded-lg border border-border bg-surface/40 px-3 py-2.5">
          <span className="text-sm">Enable push notifications</span>
          <Switch checked={enabled} disabled={!!blocked || busy} onCheckedChange={(v) => void toggle(v)} />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-border bg-surface/40 px-3 py-2.5">
          <span className="text-sm">High &amp; Very High impact events only</span>
          <Switch
            checked={highOnly}
            onCheckedChange={(v) => {
              setHighOnly(v);
              localStorage.setItem(HIGH_ONLY_KEY, v ? "1" : "0");
            }}
          />
        </label>
        <label className="flex items-center justify-between rounded-lg border border-border bg-surface/40 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm">
            Events affecting my portfolio
            <Badge variant="outline" className="text-[10px]">Coming soon</Badge>
          </span>
          <Switch
            checked={portfolioOnly}
            onCheckedChange={(v) => {
              setPortfolioOnly(v);
              localStorage.setItem(PORTFOLIO_KEY, v ? "1" : "0");
            }}
          />
        </label>
      </div>
    </Card>
  );
}
