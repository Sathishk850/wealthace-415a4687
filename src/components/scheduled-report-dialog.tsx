import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FREQUENCY_LABEL,
  computeNextRun,
  useUpsertScheduledReport,
  type ScheduledReport,
  type ScheduleFormat,
  type ScheduleFrequency,
} from "@/lib/notifications-api";

const FORMATS: { value: ScheduleFormat; label: string }[] = [
  { value: "pdf", label: "PDF" },
  { value: "excel", label: "Excel" },
  { value: "csv", label: "CSV" },
];

const DATE_RANGES = [
  { value: "last_period", label: "Last period" },
  { value: "mtd", label: "Month to date" },
  { value: "ytd", label: "Year to date" },
  { value: "all", label: "All time" },
] as const;

export function ScheduledReportDialog({
  open,
  onOpenChange,
  initial,
  reportOptions,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initial?: Partial<ScheduledReport>;
  reportOptions: { slug: string; title: string; module: string }[];
}) {
  const upsert = useUpsertScheduledReport();
  const [name, setName] = useState("");
  const [keys, setKeys] = useState<string[]>([]);
  const [formats, setFormats] = useState<ScheduleFormat[]>(["pdf"]);
  const [frequency, setFrequency] = useState<ScheduleFrequency>("monthly");
  const [dateRange, setDateRange] = useState<ScheduledReport["date_range"]>("last_period");
  const [recipients, setRecipients] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [inAppEnabled, setInAppEnabled] = useState(true);
  const [aiInsights, setAiInsights] = useState(true);
  const [active, setActive] = useState(true);

  useEffect(() => {
    if (!open) return;
    setName(initial?.name ?? "");
    setKeys(initial?.report_keys ?? []);
    setFormats((initial?.formats as ScheduleFormat[]) ?? ["pdf"]);
    setFrequency((initial?.frequency as ScheduleFrequency) ?? "monthly");
    setDateRange(initial?.date_range ?? "last_period");
    setRecipients((initial?.recipients ?? []).join(", "));
    setCc((initial?.cc ?? []).join(", "));
    setBcc((initial?.bcc ?? []).join(", "));
    setEmailEnabled(initial?.channels?.email ?? true);
    setInAppEnabled(initial?.channels?.in_app ?? true);
    setAiInsights(initial?.include_ai_insights ?? true);
    setActive(initial?.active ?? true);
  }, [open, initial]);

  const toggleKey = (slug: string) => {
    setKeys((s) => (s.includes(slug) ? s.filter((x) => x !== slug) : [...s, slug]));
  };

  const toggleFmt = (f: ScheduleFormat) => {
    setFormats((s) => (s.includes(f) ? s.filter((x) => x !== f) : [...s, f]));
  };

  const parseEmails = (s: string) =>
    s.split(",").map((e) => e.trim()).filter((e) => e.length > 0);

  const submit = async () => {
    if (!name.trim() || keys.length === 0) return;
    await upsert.mutateAsync({
      id: initial?.id,
      name,
      report_keys: keys,
      formats: formats.length ? formats : ["pdf"],
      frequency,
      date_range: dateRange,
      recipients: parseEmails(recipients),
      cc: parseEmails(cc),
      bcc: parseEmails(bcc),
      channels: { email: emailEnabled, in_app: inAppEnabled },
      include_ai_insights: aiInsights,
      active,
      next_run_at: initial?.next_run_at ?? computeNextRun(frequency).toISOString(),
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Edit schedule" : "Schedule a report"}</DialogTitle>
          <DialogDescription>
            FinTrack will generate and deliver these reports automatically.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Schedule name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Monthly net worth" />
          </div>

          <div className="grid gap-1.5">
            <Label>Reports</Label>
            <div className="max-h-44 overflow-y-auto rounded-lg border border-border bg-surface/40 p-2">
              {reportOptions.map((r) => (
                <label
                  key={r.slug}
                  className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-surface"
                >
                  <input
                    type="checkbox"
                    checked={keys.includes(r.slug)}
                    onChange={() => toggleKey(r.slug)}
                    className="accent-mint"
                  />
                  <span className="flex-1">{r.title}</span>
                  <Badge variant="outline" className="text-[10px] capitalize">{r.module}</Badge>
                </label>
              ))}
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="grid gap-1.5">
              <Label>Frequency</Label>
              <Select value={frequency} onValueChange={(v) => setFrequency(v as ScheduleFrequency)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(FREQUENCY_LABEL).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Date range</Label>
              <Select value={dateRange} onValueChange={(v) => setDateRange(v as ScheduledReport["date_range"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATE_RANGES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Formats</Label>
              <div className="flex gap-1">
                {FORMATS.map((f) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => toggleFmt(f.value)}
                    className={`flex-1 rounded-md border px-2 py-1.5 text-xs font-medium transition ${
                      formats.includes(f.value)
                        ? "border-mint bg-mint/10 text-mint"
                        : "border-border bg-surface/40 text-muted-foreground"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-1.5">
            <Label>Recipient emails (comma separated, blank = account email)</Label>
            <Input value={recipients} onChange={(e) => setRecipients(e.target.value)} placeholder="you@example.com, accountant@firm.com" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label>CC</Label>
              <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="optional" />
            </div>
            <div className="grid gap-1.5">
              <Label>BCC</Label>
              <Input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="optional" />
            </div>
          </div>

          <div className="grid gap-2 rounded-lg border border-border bg-surface/40 p-3">
            <label className="flex items-center justify-between text-sm">
              <span>Send via Email <Badge variant="outline" className="ml-2 border-amber-400/40 text-[10px] text-amber-400">Awaiting domain</Badge></span>
              <Switch checked={emailEnabled} onCheckedChange={setEmailEnabled} />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Post to Notification Center</span>
              <Switch checked={inAppEnabled} onCheckedChange={setInAppEnabled} />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Include AI insights summary</span>
              <Switch checked={aiInsights} onCheckedChange={setAiInsights} />
            </label>
            <label className="flex items-center justify-between text-sm">
              <span>Active</span>
              <Switch checked={active} onCheckedChange={setActive} />
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            onClick={submit}
            disabled={upsert.isPending || !name.trim() || keys.length === 0}
          >
            {upsert.isPending ? "Saving…" : initial?.id ? "Save changes" : "Create schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}