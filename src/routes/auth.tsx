import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import React, { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useServerFn } from "@tanstack/react-start";
import { verifyPin, getPinStatus } from "@/lib/pin.functions";
import { triggerSessionExpired, isAuthError } from "@/lib/session-expired";

/**
 * No-op kept for API compatibility with existing call sites.
 *
 * A previous "Remember this device" implementation used a `pagehide`
 * listener that wiped the Supabase auth token from localStorage when a
 * session-only flag was set. That mechanism caused a Google OAuth
 * regression: on the full-page provider redirect, `pagehide` fires while
 * the browser is navigating to Google, and if the flag was ever set the
 * freshly hydrated token was wiped — bouncing the user back to /auth.
 *
 * Supabase already persists sessions to localStorage; the checkbox is now
 * purely a UI affordance. Also clear any lingering flag from older builds.
 */
function applyRememberDevice(_remember: boolean) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem("finvista_session_only");
}

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode === "signup" ? "signup" : "signin") as "signin" | "signup",
    redirect: typeof s.redirect === "string" ? s.redirect : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Sign in · FinVista" },
      { name: "description", content: "Sign in or create your FinVista account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  useEffect(() => {
    if (typeof window !== "undefined") {
      // One-time cleanup: purge any stale flag left by older builds.
      window.sessionStorage.removeItem("finvista_session_only");
    }
  }, []);
  const { mode: initialMode, redirect: redirectParam } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup" | "forgot" | "pin">(initialMode);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [suggestGoogle, setSuggestGoogle] = useState(false);
  const [remember, setRemember] = useState(true);
  const [pinAvailable, setPinAvailable] = useState(false);
  const [pinValue, setPinValue] = useState("");
  const navigate = useNavigate();
  // Only accept same-origin absolute paths — never external URLs.
  const safeRedirect =
    redirectParam && /^\/[^/]/.test(redirectParam) ? redirectParam : undefined;
  const goHome = () => {
    if (safeRedirect) {
      navigate({ to: safeRedirect as never });
    } else {
      navigate({ to: "/dashboard" });
    }
  };
  const verifyPinFn = useServerFn(verifyPin);
  const getPinStatusFn = useServerFn(getPinStatus);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session || cancelled) return;
      // Validate the session is still good before revealing the PIN screen.
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (cancelled) return;
      if (userErr || !userData.user) {
        // Stale token in storage — clear it silently and stay on password sign-in.
        await supabase.auth.signOut().catch(() => {});
        return;
      }
      try {
        const status = await getPinStatusFn();
        if (cancelled) return;
        if (status?.enabled) {
          setPinAvailable(true);
          setMode((m) => (m === "signup" ? m : "pin"));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => { cancelled = true; };
  }, [getPinStatusFn]);

  const handlePinSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setMessage(null);
    if (!/^\d{4}$/.test(pinValue)) {
      setMessage({ type: "error", text: "Enter your 4-digit PIN." });
      return;
    }
    setSubmitting(true);
    try {
      // Ensure we still have a valid, non-expired session before hitting the
      // protected server fn — otherwise the bearer attacher has no token to send.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setPinValue("");
        setPinAvailable(false);
        setMode("signin");
        triggerSessionExpired();
        return;
      }
      const { data: userData, error: userErr } = await supabase.auth.getUser();
      if (userErr || !userData.user) {
        setPinValue("");
        setPinAvailable(false);
        setMode("signin");
        await supabase.auth.signOut().catch(() => {});
        triggerSessionExpired();
        return;
      }
      const res = await verifyPinFn({ data: { pin: pinValue } });
      if (res?.ok) {
        setPinValue("");
        goHome();
      } else {
        setPinValue("");
        if (res?.locked) {
          const mins = Math.ceil((res.retry_after_seconds ?? 300) / 60);
          setMessage({
            type: "error",
            text: `Too many wrong attempts. PIN locked for ${mins} minute${mins === 1 ? "" : "s"}. Sign in with your password.`,
          });
          // Force back to password sign-in per spec (clear session on repeated failures).
          setPinAvailable(false);
          setMode("signin");
          await supabase.auth.signOut().catch(() => {});
        } else {
          const rem = res?.attempts_remaining;
          setMessage({
            type: "error",
            text: rem !== undefined
              ? `Incorrect PIN. ${rem} attempt${rem === 1 ? "" : "s"} left.`
              : "Incorrect PIN. Try again.",
          });
        }
      }
    } catch (err) {
      if (isAuthError(err)) {
        setPinValue("");
        setPinAvailable(false);
        setMode("signin");
        await supabase.auth.signOut().catch(() => {});
        triggerSessionExpired();
      } else {
        setMessage({ type: "error", text: "PIN verification failed. Please try again." });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const switchToPassword = async () => {
    await supabase.auth.signOut();
    setPinAvailable(false);
    setPinValue("");
    setMessage(null);
    setMode("signin");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setMessage(null);
    setSuggestGoogle(false);
    const form = e.currentTarget;
    const formData = new FormData(form);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("fullName") ?? "").trim();

    setSubmitting(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`,
            data: fullName ? { full_name: fullName } : undefined,
          },
        });
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
            setMessage({
              type: "error",
              text: "An account with this email already exists. Sign in below, or use Continue with Google if you signed up with Google.",
            });
            setMode("signin");
            setSuggestGoogle(true);
          } else {
            setMessage({ type: "error", text: error.message });
          }
          return;
        }
        // Supabase returns a user with empty identities[] when the email already exists
        // (and confirmations are on). Treat that as "account exists, likely via OAuth".
        if (data.user && (data.user.identities?.length ?? 0) === 0) {
          setMessage({
            type: "error",
            text: "This email is already registered with Google sign-in. Please use Continue with Google below.",
          });
          setMode("signin");
          setSuggestGoogle(true);
          return;
        }
        if (data.session) {
          applyRememberDevice(remember);
          goHome();
        } else {
          setMessage({
            type: "success",
            text: "Check your email to confirm your account, then sign in.",
          });
        }
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          const code = (error as { code?: string }).code ?? "";
          if (code === "invalid_credentials" || /invalid login/i.test(error.message)) {
            setMessage({
              type: "error",
              text: "No password account found for this email. If you signed up with Google, use Continue with Google below.",
            });
            setSuggestGoogle(true);
          } else {
            setMessage({ type: "error", text: error.message });
          }
          return;
        }
        applyRememberDevice(remember);
        goHome();
      } else if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) {
          setMessage({ type: "error", text: error.message });
          return;
        }
        setMessage({
          type: "success",
          text: "If an account exists for that email, a password reset link is on its way.",
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setMessage(null);
    setSuggestGoogle(false);
    // Match the password path: honour the current "Remember this device" choice
    // so the pagehide guard doesn't wipe the freshly-minted OAuth session on
    // the redirect out to Google (or on the navigation to /dashboard).
    applyRememberDevice(remember);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setMessage({ type: "error", text: result.error.message ?? "Google sign-in failed." });
      return;
    }
    if (result.redirected) return;
    goHome();
  };

  return (
    <div className="dark relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(33,219,210,0.11),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(15,183,176,0.07),transparent_55%)]" />


      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-2 lg:gap-16 lg:px-12">
        {/* Left: brand + tagline */}
        <div className="flex flex-col justify-between gap-10">
          <BrandMark to="/" size="xl" tagline />

          <div className="hidden lg:block">
            <h1 className="font-display text-4xl font-bold leading-tight tracking-tight xl:text-5xl">
              A calm way to see all your money.
            </h1>
            <p className="mt-4 max-w-md text-base text-muted-foreground">
              Net worth, budgets, goals, household roll-ups, and your FIRE number — multi-currency, mobile + web.
            </p>
          </div>

          <p className="hidden text-xs text-muted-foreground lg:block">
            Private by design — your data is yours.
          </p>
        </div>

        {/* Right: auth card */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md rounded-3xl border border-mint/15 bg-card/80 p-8 backdrop-blur-xl shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]">
            <h2 className="font-display text-2xl font-bold tracking-tight">Welcome</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in or create your account to continue.
            </p>

            {/* Tabs */}
            {mode !== "pin" && (
            <div className="mt-6 grid grid-cols-2 rounded-xl border border-border bg-surface/40 p-1">
              <button
                type="button"
                onClick={() => { setMode("signin"); setMessage(null); }}
                className={`rounded-lg py-2 text-sm font-medium transition ${
                  mode === "signin" || mode === "forgot"
                    ? "bg-surface text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setMessage(null); }}
                className={`rounded-lg py-2 text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-surface text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create account
              </button>
            </div>
            )}

            {mode === "pin" ? (
              <PinForm
                pinValue={pinValue}
                setPinValue={setPinValue}
                onSubmit={handlePinSubmit}
                submitting={submitting}
                onUseDifferentAccount={switchToPassword}
                message={message}
              />
            ) : (
            <form
              className="mt-6 space-y-4"
              onSubmit={handleSubmit}
            >
              {mode === "signup" && (
                <Field label="Full name" name="fullName" type="text" placeholder="Ada Lovelace" />
              )}
              <Field label="Email" name="email" type="email" placeholder="you@example.com" />
              {mode !== "forgot" && (
                <PasswordField
                  label="Password"
                  name="password"
                  placeholder="••••••••"
                  rightSlot={
                    mode === "signin" ? (
                      <button
                        type="button"
                        onClick={() => { setMode("forgot"); setMessage(null); }}
                        className="text-xs font-medium text-mint hover:underline"
                      >
                        Forgot password?
                      </button>
                    ) : null
                  }
                />
              )}

              {mode === "signin" && (
                <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-4 w-4 rounded border-border bg-surface/60 text-mint accent-mint focus:ring-mint/30"
                  />
                  Remember this device
                </label>
              )}

              {mode === "forgot" && (
                <p className="-mt-1 text-xs text-muted-foreground">
                  Enter your email and we'll send you a link to reset your password.
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-xl bg-mint py-3 text-sm font-semibold text-mint-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting
                  ? "Please wait…"
                  : mode === "signin"
                    ? "Sign in"
                    : mode === "signup"
                      ? "Create account"
                      : "Send reset link"}
              </button>

              {mode === "forgot" && (
                <button
                  type="button"
                  onClick={() => { setMode("signin"); setMessage(null); }}
                  className="block w-full text-center text-xs text-muted-foreground hover:text-foreground"
                >
                  ← Back to sign in
                </button>
              )}
            </form>
            )}

            {mode !== "pin" && pinAvailable && (
              <button
                type="button"
                onClick={() => { setMode("pin"); setMessage(null); }}
                className="mt-3 block w-full text-center text-xs font-medium text-mint hover:underline"
              >
                Unlock with PIN instead
              </button>
            )}

            {message && (
              <div
                className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                  message.type === "success"
                    ? "border-mint/30 bg-mint/10 text-mint"
                    : "border-red-500/30 bg-red-500/10 text-red-400"
                }`}
              >
                {message.text}
              </div>
            )}

            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              or
              <div className="h-px flex-1 bg-border" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              className={`flex w-full items-center justify-center gap-2 rounded-xl border py-3 text-sm font-medium text-foreground transition ${
                suggestGoogle
                  ? "border-mint/60 bg-mint/10 shadow-[0_0_0_3px_rgba(20,216,207,0.15)] hover:bg-mint/15"
                  : "border-border bg-surface/40 hover:bg-surface/70"
              }`}
            >
              <GoogleIcon /> Continue with Google
            </button>

            <Link
              to="/"
              className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground"
            >
              ← Back to home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.66 4.1-5.5 4.1-3.3 0-6-2.74-6-6.1s2.7-6.1 6-6.1c1.88 0 3.14.8 3.86 1.48l2.63-2.54C16.84 3.4 14.66 2.4 12 2.4 6.86 2.4 2.7 6.56 2.7 11.7s4.16 9.3 9.3 9.3c5.36 0 8.92-3.76 8.92-9.06 0-.6-.06-1.06-.16-1.74H12z"/>
    </svg>
  );
}

function Field({
  label,
  name,
  type,
  placeholder,
}: {
  label: string;
  name: string;
  type: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        name={name}
        type={type}
        placeholder={placeholder}
        required
        className="w-full rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/30"
      />
    </label>
  );
}

function PasswordField({
  label,
  name,
  placeholder,
  rightSlot,
}: {
  label: string;
  name: string;
  placeholder: string;
  rightSlot?: React.ReactNode;
}) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-medium text-muted-foreground">
        <span>{label}</span>
        {rightSlot}
      </span>
      <div className="relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          placeholder={placeholder}
          required
          className="w-full rounded-xl border border-border bg-surface/60 px-3.5 py-2.5 pr-10 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/30"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-muted-foreground transition hover:text-foreground"
          aria-label={show ? "Hide password" : "Show password"}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
    </label>
  );
}

function PinForm({
  pinValue,
  setPinValue,
  onSubmit,
  submitting,
  onUseDifferentAccount,
  message,
}: {
  pinValue: string;
  setPinValue: (v: string) => void;
  onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  submitting: boolean;
  onUseDifferentAccount: () => void;
  message: { type: "success" | "error"; text: string } | null;
}) {
  const SLOTS = 4;
  const [reveal, setReveal] = useState(false);

  const append = (d: string) => {
    if (submitting) return;
    if (pinValue.length >= SLOTS) return;
    setPinValue((pinValue + d).slice(0, SLOTS));
  };
  const backspace = () => {
    if (submitting) return;
    setPinValue(pinValue.slice(0, -1));
  };

  // Physical keyboard support (digits, backspace, enter). No paste allowed.
  const rootRef = React.useRef<HTMLFormElement>(null);
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key >= "0" && e.key <= "9") { e.preventDefault(); append(e.key); }
      else if (e.key === "Backspace") { e.preventDefault(); backspace(); }
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
  });

  return (
    <form
      ref={rootRef}
      tabIndex={0}
      className="mt-6 space-y-5 outline-none"
      onSubmit={onSubmit}
      onPaste={(e) => e.preventDefault()}
    >
      <div className="space-y-1">
        <h3 className="text-sm font-semibold text-foreground">Unlock with PIN</h3>
        <p className="text-xs text-muted-foreground">
          Enter your 4-digit PIN to continue on this device.
        </p>
      </div>

      {/* Slot display */}
      <div
        className="rounded-2xl border border-border bg-surface/40 p-3"
        aria-label="PIN entry"
      >
        <div className="flex items-center justify-center gap-3">
          {Array.from({ length: SLOTS }).map((_, i) => {
            const char = pinValue[i];
            const isActive = i === Math.min(pinValue.length, SLOTS - 1);
            const filled = char !== undefined;
            return (
              <div
                key={i}
                className={[
                  "flex h-14 w-12 sm:h-16 sm:w-14 items-center justify-center rounded-xl border text-xl sm:text-2xl font-semibold tabular-nums transition",
                  filled
                    ? "border-mint/60 bg-mint/10 text-foreground"
                    : "border-border bg-background/40 text-muted-foreground",
                  isActive ? "ring-2 ring-mint/40 border-mint" : "",
                ].join(" ")}
                aria-label={filled ? "digit entered" : "empty"}
              >
                {filled ? (reveal ? char : "•") : ""}
              </div>
            );
          })}
        </div>
      </div>

      {/* Banking-style numeric keypad */}
      <div className="grid grid-cols-3 gap-2 sm:gap-3" role="group" aria-label="PIN keypad">
        {["1","2","3","4","5","6","7","8","9"].map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => append(d)}
            className="rounded-2xl border border-border bg-surface/60 py-4 text-xl font-semibold text-foreground transition hover:bg-surface active:scale-[0.98]"
            aria-label={`Digit ${d}`}
          >
            {d}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setReveal((r) => !r)}
          className="rounded-2xl border border-border bg-surface/40 py-4 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          aria-label={reveal ? "Hide PIN" : "Show PIN"}
        >
          {reveal ? <EyeOff className="mx-auto" size={18} /> : <Eye className="mx-auto" size={18} />}
        </button>
        <button
          type="button"
          onClick={() => append("0")}
          className="rounded-2xl border border-border bg-surface/60 py-4 text-xl font-semibold text-foreground transition hover:bg-surface active:scale-[0.98]"
          aria-label="Digit 0"
        >
          0
        </button>
        <button
          type="button"
          onClick={backspace}
          disabled={pinValue.length === 0}
          className="rounded-2xl border border-border bg-surface/40 py-4 text-sm font-medium text-muted-foreground transition hover:text-foreground disabled:opacity-40"
          aria-label="Delete last digit"
        >
          ⌫
        </button>
      </div>

      {message && message.type === "error" && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2.5 text-sm text-red-400">
          {message.text}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || pinValue.length !== SLOTS}
        className="w-full rounded-xl bg-mint py-3 text-sm font-semibold text-mint-foreground transition hover:opacity-90 disabled:opacity-60"
      >
        {submitting ? "Verifying…" : "Unlock"}
      </button>

      <button
        type="button"
        onClick={onUseDifferentAccount}
        className="block w-full text-center text-xs text-muted-foreground transition hover:text-foreground"
      >
        Use a different account
      </button>
    </form>
  );
}