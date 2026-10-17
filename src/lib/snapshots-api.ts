import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { parseSnapshotItems, type SnapshotItem } from './snapshot-changes';

export type Snapshot = {
  id: string;
  user_id: string;
  snapshot_date: string;
  net_worth: number;
  assets_total: number;
  liabilities_total: number;
  investments_total: number;
  savings_total: number;
  annotation: string | null;
  /** When the row was last written; bounds the "What Changed" activity window. */
  updated_at: string | null;
  created_at: string | null;
  line_items: SnapshotItem[] | null;
};

const KEY = ["wealth", "snapshots"] as const;

const numeric = (value: number | string | null) => Number(value ?? 0);

export function useSnapshots() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Snapshot[]> => {
      const { data, error } = await supabase
        .from("wealth_snapshots")
        .select("id,user_id,snapshot_date,net_worth,assets_total,liabilities_total,investments_total,savings_total,annotation,updated_at,created_at,line_items")
        .order("snapshot_date", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((row) => ({
        ...row,
        line_items: parseSnapshotItems(row.line_items),
        net_worth: numeric(row.net_worth),
        assets_total: numeric(row.assets_total),
        liabilities_total: numeric(row.liabilities_total),
        investments_total: numeric(row.investments_total),
        savings_total: numeric(row.savings_total),
      }));
    },
  });
}

export function useDeleteSnapshot() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("wealth_snapshots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}

export function useUpdateSnapshotAnnotation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, annotation }: { id: string; annotation: string | null }) => {
      const { error } = await supabase
        .from("wealth_snapshots")
        .update({ annotation })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
/** Silently refreshes an existing snapshot row with live totals from the global calculator. */
export function useSyncSnapshotTotals() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...totals }: { id: string; net_worth: number; assets_total: number; liabilities_total: number; investments_total: number; savings_total: number; line_items: SnapshotItem[] }) => {
      const { error } = await supabase.from("wealth_snapshots").update(totals).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: KEY }),
  });
}
