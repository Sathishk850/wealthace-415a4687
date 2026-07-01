import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Edit2, Trash2, CalendarClock, Mail, FolderOpen } from "lucide-react";
import { Link } from "@tanstack/react-router";
import {
  useScheduledReports,
  useDeleteScheduledReport,
  useToggleScheduledReport,
  FREQUENCY_LABEL,
  type ScheduledReport,
} from "@/lib/notifications-api";
import { ScheduledReportDialog } from "@/components/scheduled-report-dialog";

export function ScheduledReportsPanel({
  reportOptions,
}: {
  reportOptions: { slug: string; title: string; module: string }[];
}) {
  const list = useScheduledReports();
  const del = useDeleteScheduledReport();
  const toggle = useToggleScheduledReport();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ScheduledReport | undefined>(undefined);

  return (
    <Card className="glass-card border-[var(--border)] p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <CalendarClock className="h-4 w-4 text-mint" />
          <h3 className="text-sm font-semibold text-foreground">Scheduled Report Delivery</h3>
          <Badge variant="outline" className="border-amber-400/40 text-[10px] text-amber-400">
            Email awaiting domain
          </Badge>
        </div>
        <div className="flex flex-wrap items-center gap-2">
        <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs">
          <Link to="/reports"><FolderOpen className="h-3.5 w-3.5" /> Report Center</Link>
        </Button>
        <Button
          size="sm"
          onClick={() => { setEditing(undefined); setOpen(true); }}
          className="h-7 gap-1 text-xs"
        >
          <Plus className="h-3.5 w-3.5" /> New schedule
        </Button>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        Reports are generated automatically on schedule and saved to the Report Center, where you can download them as PDF, Excel or CSV immediately. Email delivery turns on automatically once your sender domain is verified — no other changes needed.
      </p>

      {(list.data ?? []).length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-surface/30 p-6 text-center text-xs text-muted-foreground">
          No scheduled reports yet. Create one to start receiving automatic deliveries.
        </div>
      ) : (
        <ul className="space-y-2">
          {(list.data ?? []).map((s) => (
            <li
              key={s.id}
              className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface/40 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                  <Badge variant="outline" className="text-[10px]">{FREQUENCY_LABEL[s.frequency]}</Badge>
                  {s.formats.map((f) => (
                    <Badge key={f} variant="outline" className="text-[10px] uppercase">{f}</Badge>
                  ))}
                </div>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {s.report_keys.length} report{s.report_keys.length === 1 ? "" : "s"} ·
                  {" "}Next run {new Date(s.next_run_at).toLocaleString()}
                  {s.recipients.length > 0 && (
                    <> · <Mail className="inline h-3 w-3" /> {s.recipients.join(", ")}</>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Switch
                  checked={s.active}
                  onCheckedChange={(v) => toggle.mutate({ id: s.id, active: v })}
                />
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => { setEditing(s); setOpen(true); }}>
                  <Edit2 className="h-3.5 w-3.5" />
                </Button>
                <Button size="sm" variant="ghost" className="h-7 px-2" onClick={() => del.mutate(s.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ScheduledReportDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing}
        reportOptions={reportOptions}
      />
    </Card>
  );
}