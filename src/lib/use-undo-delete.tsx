import { useCallback, useEffect, useRef } from "react";
import { useQueryClient, type QueryKey } from "@tanstack/react-query";
import { toast } from "sonner";

type Pending<T> = { item: T; timeoutId: ReturnType<typeof setTimeout> };

/**
 * 5-second undo-delete: optimistically removes the row from cached lists
 * under `queryKey`, then commits after 5s unless Undo is pressed.
 * Any pending delete is committed on unmount.
 */
export function useUndoDelete<T extends { id: string }>(opts: {
  queryKey: QueryKey;
  commit: (item: T) => Promise<unknown>;
  label: (item: T) => string;
}) {
  const qc = useQueryClient();
  const ref = useRef<Pending<T> | null>(null);
  const optsRef = useRef(opts);
  optsRef.current = opts;

  const commitNow = useCallback(async (item: T) => {
    try {
      await optsRef.current.commit(item);
    } catch {
      toast.error("Failed to delete — please try again");
      qc.invalidateQueries({ queryKey: optsRef.current.queryKey });
    }
  }, [qc]);

  const remove = useCallback((item: T) => {
    if (ref.current) {
      clearTimeout(ref.current.timeoutId);
      void commitNow(ref.current.item);
      ref.current = null;
    }
    const key = optsRef.current.queryKey;
    qc.setQueriesData<T[]>({ queryKey: key, exact: false }, (old) =>
      Array.isArray(old) ? old.filter((r) => r.id !== item.id) : old,
    );
    const toastId = toast(
      <div className="flex w-full items-center justify-between gap-3">
        <span className="text-sm">Deleted <strong className="font-medium">{optsRef.current.label(item)}</strong></span>
        <button
          type="button"
          className="shrink-0 rounded-md border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
          onClick={() => {
            if (ref.current?.item.id === item.id) {
              clearTimeout(ref.current.timeoutId);
              ref.current = null;
            }
            toast.dismiss(toastId);
            toast.success("Deletion undone");
            qc.invalidateQueries({ queryKey: key });
          }}
        >
          Undo
        </button>
      </div>,
      { duration: 5000 },
    );
    const timeoutId = setTimeout(() => {
      ref.current = null;
      void commitNow(item);
    }, 5000);
    ref.current = { item, timeoutId };
  }, [qc, commitNow]);

  useEffect(() => () => {
    if (ref.current) {
      clearTimeout(ref.current.timeoutId);
      void commitNow(ref.current.item);
      ref.current = null;
    }
  }, [commitNow]);

  return remove;
}
