import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { useState } from "react";
import logo from "@/assets/finvista-logo.png";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>) => ({
    mode: (s.mode === "signup" ? "signup" : "signin") as "signin" | "signup",
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
  const { mode: initialMode } = useSearch({ from: "/auth" });
  const [mode, setMode] = useState<"signin" | "signup">(initialMode);
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(20,216,207,0.18),transparent_60%),radial-gradient(ellipse_at_bottom,rgba(15,183,176,0.12),transparent_60%)]" />
      <div className="mx-auto flex min-h-screen w-full max-w-md flex-col items-center justify-center px-6 py-12">
        <Link to="/" className="mb-8 flex items-center gap-3">
          <img src={logo} alt="FinVista" className="h-10 w-10 rounded-lg" />
          <span className="font-display text-xl font-bold">FinVista</span>
        </Link>

        <div className="w-full rounded-3xl border border-mint/15 bg-card/60 p-8 backdrop-blur-xl shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]">
          <h1 className="font-display text-2xl font-bold tracking-tight">
            {mode === "signin" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "signin"
              ? "Sign in to continue tracking your wealth."
              : "Start your journey to financial clarity."}
          </p>

          <form
            className="mt-6 space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              navigate({ to: "/dashboard" });
            }}
          >
            {mode === "signup" && (
              <Field label="Full name" type="text" placeholder="Ada Lovelace" />
            )}
            <Field label="Email" type="email" placeholder="you@example.com" />
            <Field label="Password" type="password" placeholder="••••••••" />

            <button
              type="submit"
              className="mt-2 w-full rounded-xl bg-mint py-3 text-sm font-semibold text-mint-foreground transition hover:opacity-90"
            >
              {mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {mode === "signin" ? (
              <>
                Don't have an account?{" "}
                <button
                  onClick={() => setMode("signup")}
                  className="font-semibold text-mint hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  onClick={() => setMode("signin")}
                  className="font-semibold text-mint hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </div>

        <Link
          to="/"
          className="mt-6 text-xs text-muted-foreground hover:text-foreground"
        >
          ← Back to home
        </Link>
      </div>
    </div>
  );
}

function Field({
  label,
  type,
  placeholder,
}: {
  label: string;
  type: string;
  placeholder: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type={type}
        placeholder={placeholder}
        required
        className="w-full rounded-xl border border-border bg-background/60 px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:border-mint focus:outline-none focus:ring-2 focus:ring-mint/30"
      />
    </label>
  );
}