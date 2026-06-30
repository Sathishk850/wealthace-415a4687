import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Info } from "lucide-react";
import {
  CHANNELS,
  CHANNEL_LABEL,
  type Channel,
  type ChannelMap,
  usePreferences,
  useUpdatePreferences,
} from "@/lib/notifications-api";
import { REMINDER_KINDS, REMINDER_KIND_LABEL, type ReminderKind } from "@/lib/tools-api";

const FUTURE_CHANNELS: Channel[] = ["push", "sms", "whatsapp"];

export function NotificationPreferencesForm() {
  const { data: prefs, isLoading } = usePreferences();
  const update = useUpdatePreferences();

  const [channels, setChannels] = useState<ChannelMap>({
    in_app: true, email: true, push: false, sms: false, whatsapp: false,
  });
  const [perType, setPerType] = useState<Record<string, Partial<ChannelMap>>>({});
  const [reports, setReports] = useState<Partial<ChannelMap>>({ in_app: true, email: true });
  const [tz, setTz] = useState("UTC");
  const [qh, setQh] = useState({ enabled: false, start: "22:00", end: "07:00" });

  useEffect(() => {
    if (!prefs) return;
    setChannels(prefs.channels);
    setPerType(prefs.per_type ?? {});
    setReports(prefs.reports ?? { in_app: true, email: true });
    setTz(prefs.timezone);
    setQh(prefs.quiet_hours);
  }, [prefs]);

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading preferences…</div>;
  }

  const save = () => {
    update.mutate({
      channels,
      per_type: perType,
      reports,
      timezone: tz,
      quiet_hours: qh,
    });
  };

  return (
    <div className="space-y-4">
      <Card className="glass-card border-[var(--border)] p-5">
        <div className="mb-2 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-foreground">Notification Channels</h3>
          <Info className="h-3.5 w-3.5 text-muted-foreground" aria-label="Channels enabled globally" />
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Pick which channels FinVista uses by default for all notifications.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          {CHANNELS.map((c) => {
            const future = FUTURE_CHANNELS.includes(c);
            return (
              <label
                key={c}
                className="flex items-center justify-between rounded-lg border border-border bg-surface/40 px-3 py-2.5"
              >
                <span className="flex items-center gap-2 text-sm">
                  {CHANNEL_LABEL[c]}
                  {future && <Badge variant="outline" className="text-[10px]">Coming soon</Badge>}
                  {c === "email" && (
                    <Badge variant="outline" className="border-amber-400/40 text-[10px] text-amber-400">
                      Awaiting domain
                    </Badge>
                  )}
                </span>
                <Switch
                  checked={!!channels[c]}
                  disabled={future}
                  onCheckedChange={(v) => setChannels((s) => ({ ...s, [c]: v }))}
                />
              </label>
            );
          })}
        </div>
      </Card>

      <Card className="glass-card border-[var(--border)] p-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Reminder Types</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Fine-tune which channels to use per reminder type. Leave blank to inherit defaults.
        </p>
        <div className="space-y-2">
          <div className="grid grid-cols-[1fr_repeat(2,80px)] gap-2 px-2 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            <span>Type</span>
            <span className="text-center">In-App</span>
            <span className="text-center">Email</span>
          </div>
          {REMINDER_KINDS.map((k: ReminderKind) => {
            const t = perType[k] ?? {};
            return (
              <div
                key={k}
                className="grid grid-cols-[1fr_repeat(2,80px)] items-center gap-2 rounded-lg border border-border bg-surface/40 px-3 py-2"
              >
                <span className="text-sm">{REMINDER_KIND_LABEL[k]}</span>
                <div className="flex justify-center">
                  <Switch
                    checked={t.in_app ?? channels.in_app}
                    onCheckedChange={(v) =>
                      setPerType((s) => ({ ...s, [k]: { ...s[k], in_app: v } }))
                    }
                  />
                </div>
                <div className="flex justify-center">
                  <Switch
                    checked={t.email ?? channels.email}
                    onCheckedChange={(v) =>
                      setPerType((s) => ({ ...s, [k]: { ...s[k], email: v } }))
                    }
                  />
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card className="glass-card border-[var(--border)] p-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Reports</h3>
        <p className="mb-4 text-xs text-muted-foreground">
          Channels used for scheduled report deliveries.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex items-center justify-between rounded-lg border border-border bg-surface/40 px-3 py-2.5">
            <span className="text-sm">In-App</span>
            <Switch
              checked={reports.in_app ?? true}
              onCheckedChange={(v) => setReports((s) => ({ ...s, in_app: v }))}
            />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-border bg-surface/40 px-3 py-2.5">
            <span className="text-sm">Email</span>
            <Switch
              checked={reports.email ?? true}
              onCheckedChange={(v) => setReports((s) => ({ ...s, email: v }))}
            />
          </label>
        </div>
      </Card>

      <Card className="glass-card border-[var(--border)] p-5">
        <h3 className="mb-2 text-sm font-semibold text-foreground">Timing</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-muted-foreground">Timezone</span>
            <Input value={tz} onChange={(e) => setTz(e.target.value)} placeholder="UTC" />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-muted-foreground">Quiet hours start</span>
            <Input type="time" value={qh.start} onChange={(e) => setQh((s) => ({ ...s, start: e.target.value }))} />
          </label>
          <label className="space-y-1.5">
            <span className="block text-xs font-medium text-muted-foreground">Quiet hours end</span>
            <Input type="time" value={qh.end} onChange={(e) => setQh((s) => ({ ...s, end: e.target.value }))} />
          </label>
        </div>
        <label className="mt-3 flex items-center gap-2 text-sm">
          <Switch
            checked={qh.enabled}
            onCheckedChange={(v) => setQh((s) => ({ ...s, enabled: v }))}
          />
          Enable quiet hours (suppress non-urgent notifications)
        </label>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={update.isPending}>
          {update.isPending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </div>
  );
}