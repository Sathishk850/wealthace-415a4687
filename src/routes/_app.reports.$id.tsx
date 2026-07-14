import { createFileRoute, Link, useParams } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useGeneratedReport, useMarkReportDownloaded } from "@/lib/notifications-api";
import { reportToDoc } from "@/lib/report-export";
import { ExportReportDialog } from "@/components/reports/export-dialog";
import { ArrowLeft, FileDown, Loader2 } from "lucide-react";
import { formatDate, formatDateTime } from "@/lib/date-format";

export const Route = createFileRoute("/_app/reports/$id")({
  head: () => ({ meta: [{ title: "Report · FinVista" }] }),
  component: ReportDetail,
});

function ReportDetail() {
  const { id } = useParams({ from: "/_app/reports/$id" });
  const q = useGeneratedReport(id);
  const markDl = useMarkReportDownloaded();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (q.isLoading) {
    return (
      <Card className="glass-card flex items-center justify-center border-[var(--border)] p-10">
        <Loader2 className="h-5 w-5 animate-spin text-mint" />
      </Card>
    );
  }
  const r = q.data;
  if (!r) {
    return (
      <Card className="glass-card border-[var(--border)] p-6 text-sm text-muted-foreground">
        Report not found. <Link to="/reports" className="text-mint hover:underline">Back to Report Center</Link>
      </Card>
    );
  }

  const period = r.snapshot.period;
  const periodLabel = period?.start && period?.end ? `${formatDate(period.start)} → ${formatDate(period.end)}` : "All time";

  const doc = reportToDoc(r);

  return (
    <>
      <div className="mb-3">
        <Link to="/reports" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-mint">
          <ArrowLeft className="h-3.5 w-3.5" /> Report Center
        </Link>
      </div>

      <PageHeader
        title={r.name}
        description={`${periodLabel} · Generated ${new Date(r.generated_at).toLocaleString()}`}
      />

      <Card className="glass-card mb-4 border-[var(--border)] p-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={() => setDialogOpen(true)} className="h-8 gap-1 text-xs">
            <FileDown className="h-3.5 w-3.5" /> Export Report
          </Button>
          {r.email_status === "pending" && (
            <Badge variant="outline" className="ml-auto border-amber-400/40 text-[10px] text-amber-400">
              Email queued — activates when sender domain is verified
            </Badge>
          )}
        </div>
      </Card>

      <ExportReportDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        doc={doc}
        onExported={() => markDl.mutate(r.id)}
      />

      <div className="space-y-4">
        {r.snapshot.sections.map((sec) => (
          <Card key={sec.key} className="glass-card border-[var(--border)] p-4">
            <div className="mb-2 flex flex-wrap items-center gap-3">
              <h3 className="text-sm font-semibold text-foreground">{sec.title}</h3>
              {sec.summary.map((s) => (
                <span key={s.label} className="text-[11px] text-muted-foreground">
                  <span className="text-foreground/70">{s.label}:</span> {s.value}
                </span>
              ))}
            </div>
            {sec.rows.length === 0 ? (
              <p className="text-xs text-muted-foreground">No data for this period.</p>
            ) : (
              <div className="overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      {sec.columns.map((c) => <TableHead key={c} className="text-xs">{c}</TableHead>)}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sec.rows.slice(0, 200).map((row, i) => (
                      <TableRow key={i}>
                        {row.map((cell, j) => <TableCell key={j} className="text-xs">{String(cell)}</TableCell>)}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {sec.rows.length > 200 && (
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    Showing 200 of {sec.rows.length} rows. Download for full data.
                  </p>
                )}
              </div>
            )}
          </Card>
        ))}
      </div>
    </>
  );
}