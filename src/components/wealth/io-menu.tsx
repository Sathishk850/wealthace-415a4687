import { Download, Upload, FileText, FileSpreadsheet, FileJson, FilePlus2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  onImport: () => void;
  onExportCsv: () => void;
  onExportXlsx: () => void;
  onExportJson: () => void;
  onExportPdf: () => void;
};

export function IoMenu({ onImport, onExportCsv, onExportXlsx, onExportJson, onExportPdf }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-2.5 text-xs text-foreground hover:bg-surface-2/80"
        >
          <Download className="h-3.5 w-3.5" /> Import / Export
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs">Import</DropdownMenuLabel>
        <DropdownMenuItem onClick={onImport} className="gap-2 text-sm">
          <Upload className="h-4 w-4" /> Import (CSV / XLSX / JSON)
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="text-xs">Export</DropdownMenuLabel>
        <DropdownMenuItem onClick={onExportCsv} className="gap-2 text-sm">
          <FileText className="h-4 w-4" /> Export as CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportXlsx} className="gap-2 text-sm">
          <FileSpreadsheet className="h-4 w-4" /> Export as Excel
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportJson} className="gap-2 text-sm">
          <FileJson className="h-4 w-4" /> Export as JSON
        </DropdownMenuItem>
        <DropdownMenuItem onClick={onExportPdf} className="gap-2 text-sm">
          <FilePlus2 className="h-4 w-4" /> Export as PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}