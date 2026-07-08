import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  autoOrientation,
  buildFilename,
  DEFAULT_EXPORT_OPTIONS,
  exportReport,
  loadExportPrefs,
  reportIdFor,
  saveExportPrefs,
  type ExportFormat,
  type ExportOptions,
  type ReportDoc,
} from "@/lib/report-engine";
import { toast } from "sonner";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  doc: ReportDoc | null;
  onExported?: (format: ExportFormat) => void;
};

export function ExportReportDialog({ open, onOpenChange, doc, onExported }: Props) {
  const prefs = useMemo(() => loadExportPrefs(), []);
  const [format, setFormat] = useState<ExportFormat>((prefs.format as ExportFormat) ?? "pdf");
  const [paper, setPaper] = useState<"a4" | "letter">(prefs.paper ?? "a4");
  const [orientation, setOrientation] = useState<"auto" | "portrait" | "landscape">(
    prefs.orientation ?? "auto",
  );
  const [includeSummary, setIncludeSummary] = useState(prefs.includeSummary ?? true);
  const [includeCharts, setIncludeCharts] = useState(prefs.includeCharts ?? true);
  const [includeNotes, setIncludeNotes] = useState(prefs.includeNotes ?? true);
  const [includeFilters, setIncludeFilters] = useState(prefs.includeFilters ?? true);
  const [filename, setFilename] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!doc || !open) return;
    // reset filename when the doc changes
    const suggested = buildFilename(doc, {
      format,
      paper,
      orientation,
    }).replace(/\.[^.]+$/, "");
    setFilename(suggested);
    // ensure report has an id for display
    if (!doc.reportId) doc.reportId = reportIdFor(doc);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc, open]);

  const resolvedOrientation =
    doc ? autoOrientation(doc.category, orientation) : "portrait";

  const submit = async () => {
    if (!doc) return;
    setBusy(true);
    try {
      const opts: ExportOptions = {
        format,
        paper,
        orientation,
        includeSummary,
        includeCharts,
        includeNotes,
        includeFilters,
        filename: filename || undefined,
      };
      await exportReport(doc, opts);
      saveExportPrefs(opts);
      onExported?.(format);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate report");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Export Report</DialogTitle>
          <DialogDescription>
            Configure how {doc?.name ?? "this report"} should be exported.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Format</Label>
              <Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="xlsx">Excel</SelectItem>
                  <SelectItem value="csv">CSV (raw)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Paper size</Label>
              <Select
                value={paper}
                onValueChange={(v) => setPaper(v as "a4" | "letter")}
                disabled={format === "csv"}
              >
                <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="a4">A4</SelectItem>
                  <SelectItem value="letter">Letter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Orientation</Label>
            <Select
              value={orientation}
              onValueChange={(v) => setOrientation(v as any)}
              disabled={format === "csv"}
            >
              <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto ({resolvedOrientation})</SelectItem>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {format !== "csv" && (
            <div className="grid grid-cols-2 gap-3 rounded-lg border border-border p-3">
              <ToggleRow label="Summary cards" value={includeSummary} onChange={setIncludeSummary} />
              <ToggleRow
                label="Charts"
                value={includeCharts}
                onChange={setIncludeCharts}
                disabled={format !== "pdf"}
              />
              <ToggleRow label="Notes" value={includeNotes} onChange={setIncludeNotes} />
              <ToggleRow label="Applied filters" value={includeFilters} onChange={setIncludeFilters} />
            </div>
          )}

          <div>
            <Label className="text-xs">Filename</Label>
            <div className="flex items-center gap-2">
              <Input
                value={filename}
                onChange={(e) => setFilename(e.target.value)}
                className="h-9"
              />
              <span className="text-xs text-muted-foreground">.{format}</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={busy || !doc}>
            {busy ? "Generating…" : "Export"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ToggleRow({
  label,
  value,
  onChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <label className="flex items-center justify-between gap-2 text-xs">
      <span className={disabled ? "text-muted-foreground" : ""}>{label}</span>
      <Switch checked={value} onCheckedChange={onChange} disabled={disabled} />
    </label>
  );
}