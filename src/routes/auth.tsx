import { createFileRoute, Link, useSearch } from "@tanstack/react-router";
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
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleMockSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage({ type: "success", text: "Mock validation passed. Real authentication is not yet connected." });
  };

  const handleMockGoogle = () => {
    setMessage({ type: "success", text: "Mock Google validation passed. Real OAuth is not yet connected." });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top_left,rgba(20,216,207,0.10),transparent_55%),radial-gradient(ellipse_at_bottom_right,rgba(15,183,176,0.08),transparent_55%)]" />

      <div className="mx-auto grid min-h-screen w-full max-w-7xl grid-cols-1 gap-10 px-6 py-10 lg:grid-cols-2 lg:gap-16 lg:px-12">
        {/* Left: brand + tagline */}
        <div className="flex flex-col justify-between">
          <Link to="/" className="flex items-center gap-3">
            <img src={logo} alt="FinVista" className="h-10 w-10 rounded-lg" />
            <div className="leading-tight">
              <div className="font-display text-lg font-bold">FinVista</div>
              <div className="text-[10px] font-medium tracking-[0.18em] text-muted-foreground">
                KNOW YOUR WORTH
              </div>
            </div>
          </Link>

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
          <div className="w-full max-w-md rounded-3xl border border-mint/15 bg-card/60 p-8 backdrop-blur-xl shadow-[0_10px_40px_-12px_rgba(0,0,0,0.6)]">
            <h2 className="font-display text-2xl font-bold tracking-tight">Welcome</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Sign in or create your account to continue.
            </p>

            {/* Tabs */}
            <div className="mt-6 grid grid-cols-2 rounded-xl border border-border bg-background/40 p-1">
              <button
                type="button"
                onClick={() => setMode("signin")}
                className={`rounded-lg py-2 text-sm font-medium transition ${
                  mode === "signin"
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign in
              </button>
              <button
                type="button"
                onClick={() => setMode("signup")}
                className={`rounded-lg py-2 text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-background text-foreground shadow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Create account
              </button>
            </div>

            <form
              className="mt-6 space-y-4"
              onSubmit={handleMockSubmit}
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
              onClick={handleMockGoogle}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/40 py-3 text-sm font-medium text-foreground transition hover:bg-background/70"
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