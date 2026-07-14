import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  useGeneratedReports,
  useDeleteGeneratedReport,
  useMarkReportDownloaded,
  FREQUENCY_LABEL,
  type GeneratedReport,
  type ScheduleFrequency,
} from "@/lib/notifications-api";
import { reportToDoc } from "@/lib/report-export";
import { ExportReportDialog } from "@/components/reports/export-dialog";
import type { ReportDoc } from "@/lib/report-engine";
import { formatDateTime } from "@/lib/date-format";
import { FileDown, Trash2, Inbox, CheckCircle2 } from "lucide-react";

export const Route = createFileRoute("/_app/reports/")({
  head: () => ({
    meta: [
      { title: "Report Center · FinVista" },
      { name: "description", content: "Download generated reports in PDF, Excel or CSV." },
    ],
  }),
  component: ReportCenter,
});

function ReportCenter() {
  const list = useGeneratedReports();
  const del = useDeleteGeneratedReport();
  const markDl = useMarkReportDownloaded();
  const [dialogDoc, setDialogDoc] = useState<{ doc: ReportDoc; id: string } | null>(null);

  const items = list.data ?? [];

  return (
    <>
      <PageHeader
        title="Report Center"
        description="All automatically generated reports. Download as PDF, Excel or CSV. Email delivery activates automatically once your sender domain is verified."
      />

      {items.length === 0 ? (
        <Card className="glass-card border-[var(--border)] p-10 text-center">
          <Inbox className="mx-auto mb-3 h-8 w-8 text-mint" />
          <p className="text-sm font-medium text-foreground">No reports yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Schedule one from <Link to="/tools" className="text-mint hover:underline">Tools → Reports</Link>.
            Generated reports appear here automatically.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {items.map((r) => (
            <ReportRow
              key={r.id}
              r={r}
              onExport={() => setDialogDoc({ doc: reportToDoc(r), id: r.id })}
              onDelete={() => del.mutate(r.id)}
            />
          ))}
        </div>
      )}

      <ExportReportDialog
        open={!!dialogDoc}
        onOpenChange={(o) => !o && setDialogDoc(null)}
        doc={dialogDoc?.doc ?? null}
        onExported={() => dialogDoc && markDl.mutate(dialogDoc.id)}
      />
    </>
  );
}

function ReportRow({
  r,
  onExport,
  onDelete,
}: {
  r: GeneratedReport;
  onExport: () => void;
  onDelete: () => void;
}) {
  const period = r.snapshot.period;
  const periodLabel = period?.start && period?.end ? `${period.start} → ${period.end}` : "All time";
  const freq = (r.frequency ?? "custom") as ScheduleFrequency;
  return (
    <Card className="glass-card border-[var(--border)] p-4">
      <div className="flex flex-wrap items-start gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/reports/$id"
              params={{ id: r.id }}
              className="text-sm font-semibold text-foreground hover:text-mint"
            >
              {r.name}
            </Link>
            <Badge variant="outline" className="text-[10px]">{FREQUENCY_LABEL[freq] ?? freq}</Badge>
            <Badge variant="outline" className="text-[10px]">
              {r.report_keys.length} section{r.report_keys.length === 1 ? "" : "s"}
            </Badge>
            {r.downloaded_at && (
              <Badge variant="outline" className="border-mint/40 text-[10px] text-mint">
                <CheckCircle2 className="mr-0.5 h-3 w-3" /> Downloaded
              </Badge>
            )}
            {r.email_status === "pending" && (
              <Badge variant="outline" className="border-amber-400/40 text-[10px] text-amber-400">
                Email pending domain
              </Badge>
            )}
          </div>
          <p className="mt-1 text-[11px] text-muted-foreground">
            {periodLabel} · Generated {new Date(r.generated_at).toLocaleString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={onExport}>
            <FileDown className="h-3.5 w-3.5" /> Export
          </Button>
          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={onDelete}>
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </Card>
  );
}