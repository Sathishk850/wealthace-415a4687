import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const pinSchema = z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits");

const MAX_ATTEMPTS = 5;
const LOCK_MINUTES = 5;

const WEAK_PINS = new Set([
  "0000","1111","2222","3333","4444","5555","6666","7777","8888","9999",
  "1234","2345","3456","4567","5678","6789","0123",
  "9876","8765","7654","6543","5432","4321","3210",
]);

function isWeakPin(pin: string): boolean {
  if (WEAK_PINS.has(pin)) return true;
  // Sequential ascending/descending (already covered above, but keep as guard)
  const digits = pin.split("").map((d) => parseInt(d, 10));
  const asc = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
  const desc = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
  return asc || desc;
}

const strongPinSchema = pinSchema.refine((p) => !isWeakPin(p), {
  message: "PIN is too easy to guess. Avoid sequences (1234) or repeats (1111).",
});

export const getPinStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("user_pins")
      .select("user_id, updated_at, locked_until, failed_attempts")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    const lockedUntil = data?.locked_until ? new Date(data.locked_until) : null;
    const locked = lockedUntil ? lockedUntil.getTime() > Date.now() : false;
    const { data: prof, error: profErr } = await context.supabase
      .from("profiles")
      .select("pin_skipped")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (profErr) throw profErr;
    return {
      enabled: !!data,
      updated_at: data?.updated_at ?? null,
      locked,
      locked_until: locked ? lockedUntil!.toISOString() : null,
      pin_skipped: !!prof?.pin_skipped,
    };
  });

export const setPinSkipped = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { skipped: boolean }) =>
    z.object({ skipped: z.boolean() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ pin_skipped: data.skipped })
      .eq("user_id", context.userId);
    if (error) throw error;
    return { ok: true };
  });

export const setPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pin: string; currentPin?: string }) =>
    z.object({ pin: strongPinSchema, currentPin: pinSchema.optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const bcrypt = (await import("bcryptjs")).default;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing, error: readErr } = await supabaseAdmin
      .from("user_pins")
      .select("pin_hash")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (readErr) throw readErr;
    if (existing) {
      if (!data.currentPin) throw new Error("Current PIN required");
      const ok = await bcrypt.compare(data.currentPin, existing.pin_hash);
      if (!ok) throw new Error("Current PIN is incorrect");
    }
    const hash = await bcrypt.hash(data.pin, 10);
    const { error } = await supabaseAdmin
      .from("user_pins")
      .upsert({
        user_id: context.userId,
        pin_hash: hash,
        failed_attempts: 0,
        locked_until: null,
      });
    if (error) throw error;
    await context.supabase
      .from("profiles")
      .update({ pin_skipped: false })
      .eq("user_id", context.userId);
    return { ok: true };
  });

export const verifyPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pin: string }) => z.object({ pin: pinSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const bcrypt = (await import("bcryptjs")).default;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("user_pins")
      .select("pin_hash, failed_attempts, locked_until")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: false as const, locked: false, retry_after_seconds: 0, attempts_remaining: 0 };

    const now = Date.now();
    const lockedUntil = row.locked_until ? new Date(row.locked_until).getTime() : 0;
    if (lockedUntil > now) {
      const secs = Math.ceil((lockedUntil - now) / 1000);
      return { ok: false as const, locked: true, retry_after_seconds: secs, attempts_remaining: 0 };
    }

    const ok = await bcrypt.compare(data.pin, row.pin_hash);
    if (ok) {
      if ((row.failed_attempts ?? 0) > 0 || row.locked_until) {
        await supabaseAdmin
          .from("user_pins")
          .update({ failed_attempts: 0, locked_until: null })
          .eq("user_id", context.userId);
      }
      return { ok: true as const, locked: false, retry_after_seconds: 0, attempts_remaining: MAX_ATTEMPTS };
    }

    const nextAttempts = (row.failed_attempts ?? 0) + 1;
    const shouldLock = nextAttempts >= MAX_ATTEMPTS;
    const newLockedUntil = shouldLock
      ? new Date(now + LOCK_MINUTES * 60_000).toISOString()
      : null;
    await supabaseAdmin
      .from("user_pins")
      .update({
        failed_attempts: shouldLock ? 0 : nextAttempts,
        locked_until: newLockedUntil,
      })
      .eq("user_id", context.userId);
    return {
      ok: false as const,
      locked: shouldLock,
      retry_after_seconds: shouldLock ? LOCK_MINUTES * 60 : 0,
      attempts_remaining: shouldLock ? 0 : MAX_ATTEMPTS - nextAttempts,
    };
  });

export const disablePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { currentPin: string }) =>
    z.object({ currentPin: pinSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const bcrypt = (await import("bcryptjs")).default;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("user_pins")
      .select("pin_hash")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: true };
    const ok = await bcrypt.compare(data.currentPin, row.pin_hash);
    if (!ok) throw new Error("Current PIN is incorrect");
    const { error: delErr } = await supabaseAdmin
      .from("user_pins")
      .delete()
      .eq("user_id", context.userId);
    if (delErr) throw delErr;
    return { ok: true };
  });

export const deleteAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw error;
    return { ok: true };
  });