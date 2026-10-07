import { useState } from "react";
import { MoreVertical, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { SnapshotsView } from "@/components/wealth/SnapshotsView";
import { useSnapshots } from "@/lib/snapshots-api";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export function SnapshotHistoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [confirmAllOpen, setConfirmAllOpen] = useState(false);
  const qc = useQueryClient();
  const { data: snapshots = [] } = useSnapshots();

  const deleteAll = useMutation({
    mutationFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase
        .from("wealth_snapshots" as never)
        .delete()
        .eq("user_id", u.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("All snapshots deleted");
      setConfirmAllOpen(false);
      qc.invalidateQueries({ queryKey: ["wealth", "snapshots"] });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to delete"),
  });

  const hasAny = snapshots.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="grid h-[88vh] max-h-[88vh] w-[95vw] max-w-5xl grid-rows-[auto_1fr] gap-0 overflow-hidden border-border bg-[#02101c] p-0 sm:h-auto sm:max-h-[90vh]"
      >
        {/* HEADER */}
        <div className="relative flex items-start justify-between gap-3 border-b border-border/60 p-4 pr-14 sm:p-6 sm:pr-16">
          <div className="flex flex-col gap-1">
            <DialogPrimitive.Title className="text-[22px] font-bold leading-tight tracking-tight sm:text-2xl">
              Snapshots
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="text-[14px] text-muted-foreground">
              Track your net worth over time based on your snapshots.
            </DialogPrimitive.Description>
          </div>
          {hasAny && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" aria-label="More">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmAllOpen(true);
                  }}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete All Snapshots
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* SNAPSHOTS */}
        <div className="min-h-0 overflow-y-auto p-4 sm:p-6">
          <SnapshotsView />
        </div>

        <AlertDialog open={confirmAllOpen} onOpenChange={setConfirmAllOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete all snapshots?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently removes every snapshot in your history. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={deleteAll.isPending}
                onClick={(e) => {
                  e.preventDefault();
                  deleteAll.mutate();
                }}
              >
                {deleteAll.isPending ? "Deleting…" : "Delete All"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </DialogContent>
    </Dialog>
  );
}
