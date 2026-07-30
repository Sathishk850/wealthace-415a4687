import { useState, type ReactNode } from "react";
import { Trash2, X } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

export type BulkFieldAction = {
  /** Button label, e.g. "Change Category" */
  label: string;
  icon?: ReactNode;
  /** Options presented in the dropdown */
  options: { value: string; label: string }[];
  /** Called with the chosen option value */
  onSelect: (value: string) => void | Promise<void>;
};

export type BulkCustomAction = {
  label: string;
  icon?: ReactNode;
  onClick: () => void | Promise<void>;
};

/**
 * Global contextual bulk action bar.
 * Renders only when at least one row is selected. Shared across every module;
 * modules just pass the actions relevant to their data.
 */
export function BulkActionBar({
  count,
  entityLabel,
  onClear,
  onDelete,
  fieldActions = [],
  actions = [],
  busy,
}: {
  count: number;
  /** e.g. "asset" / "transaction" */
  entityLabel: string;
  onClear: () => void;
  onDelete?: (() => void | Promise<void>) | null;
  fieldActions?: BulkFieldAction[];
  actions?: BulkCustomAction[];
  busy?: boolean;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  if (count <= 0) return null;
  const plural = count === 1 ? entityLabel : `${entityLabel}s`;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-[calc(78px+env(safe-area-inset-bottom))] z-[70] flex justify-center px-3 sm:bottom-6">
        <div className="pointer-events-auto flex w-full max-w-3xl flex-wrap items-center gap-2 rounded-2xl border border-border bg-card/95 px-3 py-2.5 shadow-lg backdrop-blur">
          <span className="text-sm font-semibold text-foreground">
            {count} {plural} selected
          </span>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            {fieldActions.map((fa) => (
              <DropdownMenu key={fa.label}>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" disabled={busy}>
                    {fa.icon}
                    {fa.label}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
                  <DropdownMenuLabel>{fa.label}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {fa.options.map((o) => (
                    <DropdownMenuItem key={o.value} onSelect={() => fa.onSelect(o.value)}>
                      {o.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ))}
            {actions.map((a) => (
              <Button
                key={a.label}
                variant="outline"
                size="sm"
                disabled={busy}
                onClick={() => a.onClick()}
              >
                {a.icon}
                {a.label}
              </Button>
            ))}
            {onDelete ? (
              <Button
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete Selected
              </Button>
            ) : null}
            <Button variant="ghost" size="sm" onClick={onClear} disabled={busy}>
              <X className="h-4 w-4" /> Clear
            </Button>
          </div>
        </div>
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {count} {plural}?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the selected {plural} and updates every
              dependent total, chart and report. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                setConfirmOpen(false);
                await onDelete?.();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
