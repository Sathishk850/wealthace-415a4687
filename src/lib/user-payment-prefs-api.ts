import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * User-scoped payment preferences.
 *
 * Replaces the previous localStorage cache with a single row in
 * `user_payment_prefs`, so the "last used" Payment Mode, Payment Channel
 * (per mode) and Paid From account (per mode) sync across every device
 * the user is signed in on (desktop, mobile browser, installed PWA, …).
 *
 * This is a pure UX layer — it never touches transaction rows and is
 * best-effort: a failure to load or write must never block a transaction.
 */

export type PaymentPrefs = {
  last_payment_mode: string | null;
  last_channel_by_mode: Record<string, string>;
  last_account_by_mode: Record<string, string>;
};

const EMPTY: PaymentPrefs = {
  last_payment_mode: null,
  last_channel_by_mode: {},
  last_account_by_mode: {},
};

export const paymentPrefsKey = ["user_payment_prefs"] as const;

export function usePaymentPrefs() {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: paymentPrefsKey,
    queryFn: async (): Promise<PaymentPrefs> => {
      try {
        const { data: userRes } = await supabase.auth.getUser();
        const user = userRes.user;
        if (!user) return EMPTY;
        const { data, error } = await supabase
          .from("user_payment_prefs" as never)
          .select("*")
          .eq("user_id", user.id)
          .maybeSingle();
        if (error || !data) return EMPTY;
        const d = data as unknown as {
          last_payment_mode: string | null;
          last_channel_by_mode: Record<string, string> | null;
          last_account_by_mode: Record<string, string> | null;
        };
        return {
          last_payment_mode: d.last_payment_mode ?? null,
          last_channel_by_mode: d.last_channel_by_mode ?? {},
          last_account_by_mode: d.last_account_by_mode ?? {},
        };
      } catch {
        return EMPTY;
      }
    },
    staleTime: 30_000,
  });

  // Cross-device sync via Supabase realtime.
  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data.user;
        if (!user || cancelled) return;
        channel = supabase
          .channel(`user_payment_prefs:${user.id}`)
          .on(
            "postgres_changes",
            {
              event: "*",
              schema: "public",
              table: "user_payment_prefs",
              filter: `user_id=eq.${user.id}`,
            },
            () => {
              qc.invalidateQueries({ queryKey: paymentPrefsKey });
            },
          )
          .subscribe();
      } catch {
        /* ignore realtime setup failures */
      }
    })();
    return () => {
      cancelled = true;
      if (channel) supabase.removeChannel(channel);
    };
  }, [qc]);

  return query;
}

/* ---------------- Staging + commit ---------------- */
/**
 * Preferences are only persisted after a transaction is successfully saved.
 * PaymentFields stages the current selection here on every change; the
 * outflow form calls `commitStagedPaymentPreferences()` after a successful
 * `mutateAsync`. Cancelled / abandoned forms never overwrite anything.
 */
type StagedPref = {
  mode: string | null;
  channel: string | null;
  accountId: string | null;
};

let staged: StagedPref | null = null;

export function stagePaymentPreference(v: StagedPref): void {
  staged = v;
}

export function clearStagedPaymentPreference(): void {
  staged = null;
}

export async function commitStagedPaymentPreferences(
  qc?: import("@tanstack/react-query").QueryClient,
): Promise<void> {
  const v = staged;
  staged = null;
  if (!v || !v.mode) return;
  try {
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes.user;
    if (!user) return;
    const { data: current } = await supabase
      .from("user_payment_prefs" as never)
      .select("last_channel_by_mode,last_account_by_mode")
      .eq("user_id", user.id)
      .maybeSingle();
    const cur = (current ?? {}) as {
      last_channel_by_mode?: Record<string, string> | null;
      last_account_by_mode?: Record<string, string> | null;
    };
    const channels: Record<string, string> = { ...(cur.last_channel_by_mode ?? {}) };
    const accounts: Record<string, string> = { ...(cur.last_account_by_mode ?? {}) };
    if (v.channel) channels[v.mode] = v.channel;
    else delete channels[v.mode];
    if (v.accountId) accounts[v.mode] = v.accountId;
    else delete accounts[v.mode];
    await supabase
      .from("user_payment_prefs" as never)
      .upsert(
        {
          user_id: user.id,
          last_payment_mode: v.mode,
          last_channel_by_mode: channels,
          last_account_by_mode: accounts,
        } as never,
        { onConflict: "user_id" },
      );
    if (qc) qc.invalidateQueries({ queryKey: paymentPrefsKey });
  } catch {
    /* best-effort — never block the transaction */
  }
}