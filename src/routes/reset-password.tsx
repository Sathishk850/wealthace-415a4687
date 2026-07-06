import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset password · FinVista" },
      { name: "description", content: "Set a new password for your FinVista account." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [show, setShow] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    // Supabase handles the recovery token in the URL hash and fires PASSWORD_RECOVERY.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitting) return;
    setMessage(null);
    const form = e.currentTarget;
    const password = String(new FormData(form).get("password") ?? "");
    const confirm = String(new FormData(form).get("confirm") ?? "");
    if (password.length < 8) {
      setMessage({ type: "error", text: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirm) {
      setMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        setMessage({ type: "error", text: error.message });
        return;
      }
      setMessage({ type: "success", text: "Password updated. Redirecting…" });
      setTimeout(() => navigate({ to: "/dashboard" }), 800);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(20,216,207,0.10),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(15,183,176,0.08),transparent_55%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col justify-center px-6 py-10">
        <BrandMark to="/" size="md" tagline className="mb-8" />

        <div className="rounded-3xl border border-mint/15 bg-card/60 p-8 backdrop-blur-xl shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]">
          <h2 className="font-display text-2xl font-bold tracking-tight">Set a new password</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Choose a strong password you haven't used before.
          </p>

          {!ready ? (
            <p className="mt-6 rounded-xl border border-border bg-background/40 px-4 py-3 text-sm text-muted-foreground">
              Waiting for your reset link to be verified. Open this page from the email link you received.
            </p>
          ) : (
            <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">New password</span>
                <div className="relative">
                  <input
                    name="password"
                    type={show ? "text" : "password"}
                    required
                    minLength={8}
                    className="w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 pr-10 text-sm focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/30"
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
              <label className="block">
                <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm password</span>
                <input
                  name="confirm"
                  type={show ? "text" : "password"}
                  required
                  minLength={8}
                  className="w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/30"
                />
              </label>
              <button
                type="submit"
                disabled={submitting}
                className="mt-2 w-full rounded-xl bg-mint py-3 text-sm font-semibold text-mint-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {submitting ? "Updating…" : "Update password"}
              </button>
            </form>
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

          <Link
            to="/auth"
            search={{ mode: "signin" }}
            className="mt-6 block text-center text-xs text-muted-foreground hover:text-foreground"
          >
            ← Back to sign in
          </Link>
        </div>
      </div>
    </div>
  );
}