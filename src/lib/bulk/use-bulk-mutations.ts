import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Generic bulk mutations for any Supabase table.
 * Every operation triggers a global cache invalidation so all dependent
 * modules recalculate from the latest database state.
 */

export function useBulkDeleteRows(table: string, label = "records") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return 0;
      const { error } = await supabase.from(table as never).delete().in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: async (n) => {
      await qc.invalidateQueries();
      if (n) toast.success(`${n} ${label} deleted`);
    },
    onError: (e: unknown) =>
      toast.error((e as Error)?.message || `Failed to delete ${label}`),
  });
}

export function useBulkUpdateRows(table: string, label = "records") {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      ids,
      patch,
    }: {
      ids: string[];
      patch: Record<string, unknown>;
    }) => {
      if (!ids.length) return 0;
      const { error } = await supabase
        .from(table as never)
        .update(patch as never)
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: async (n) => {
      await qc.invalidateQueries();
      if (n) toast.success(`${n} ${label} updated`);
    },
    onError: (e: unknown) =>
      toast.error((e as Error)?.message || `Failed to update ${label}`),
  });
}
