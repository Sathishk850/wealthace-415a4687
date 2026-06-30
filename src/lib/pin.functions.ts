import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const pinSchema = z.string().regex(/^\d{4,8}$/, "PIN must be 4–8 digits");

export const getPinStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("user_pins")
      .select("user_id, updated_at")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    return { enabled: !!data, updated_at: data?.updated_at ?? null };
  });

export const setPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pin: string; currentPin?: string }) =>
    z.object({ pin: pinSchema, currentPin: pinSchema.optional() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const bcrypt = (await import("bcryptjs")).default;
    const { data: existing, error: readErr } = await context.supabase
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
    const { error } = await context.supabase
      .from("user_pins")
      .upsert({ user_id: context.userId, pin_hash: hash });
    if (error) throw error;
    return { ok: true };
  });

export const verifyPin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { pin: string }) => z.object({ pin: pinSchema }).parse(input))
  .handler(async ({ data, context }) => {
    const bcrypt = (await import("bcryptjs")).default;
    const { data: row, error } = await context.supabase
      .from("user_pins")
      .select("pin_hash")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: false };
    return { ok: await bcrypt.compare(data.pin, row.pin_hash) };
  });

export const disablePin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { currentPin: string }) =>
    z.object({ currentPin: pinSchema }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const bcrypt = (await import("bcryptjs")).default;
    const { data: row, error } = await context.supabase
      .from("user_pins")
      .select("pin_hash")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw error;
    if (!row) return { ok: true };
    const ok = await bcrypt.compare(data.currentPin, row.pin_hash);
    if (!ok) throw new Error("Current PIN is incorrect");
    const { error: delErr } = await context.supabase
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