import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet,
  LineChart,
  PiggyBank,
  Sparkles,
  Shield,
  ArrowRight,
} from "lucide-react";
import logo from "@/assets/finvista-logo.png";

const SPLASH_KEY = "finvista_splash_seen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinVista — Know your worth" },
      {
        name: "description",
        content:
          "FinVista is your all-in-one personal finance dashboard — net worth, cashflow, investments and goals in one place.",
      },
    ],
  }),
  component: HomeRoute,
});

function HomeRoute() {
  const [showSplash, setShowSplash] = useState(true);
  const [splashLeaving, setSplashLeaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(SPLASH_KEY)) {
      setShowSplash(false);
      return;
    }
    sessionStorage.setItem(SPLASH_KEY, "1");
    const leave = setTimeout(() => setSplashLeaving(true), 2400);
    const done = setTimeout(() => setShowSplash(false), 3000);
    return () => {
      clearTimeout(leave);
      clearTimeout(done);
    };
  }, []);

  if (showSplash) return <Splash leaving={splashLeaving} />;
  return <Landing />;
}

function Splash({ leaving }: { leaving: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-500 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-hidden={leaving}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,216,207,0.18),transparent_60%)]" />
      <div className="relative flex flex-col items-center gap-6">
        <div className="relative">
          <div className="absolute inset-0 -m-4 animate-ping rounded-3xl bg-mint/20" />
          <img
            src={logo}
            alt="FinVista"
            className="relative h-20 w-20 rounded-2xl shadow-[0_0_40px_-4px_rgba(20,216,207,0.6)]"
          />
        </div>
        <div className="text-center">
          <div className="font-display text-3xl font-bold tracking-tight text-foreground">
            FinVista
          </div>
          <div className="mt-2 text-[11px] font-semibold uppercase tracking-[0.32em] text-mint">
            Know your worth
          </div>
        </div>
        <div className="mt-4 h-1 w-56 overflow-hidden rounded-full bg-surface-2">
          <div className="splash-bar h-full rounded-full bg-gradient-to-r from-mint to-accent" />
        </div>
      </div>
      <style>{`
        @keyframes splashFill { from { width: 0% } to { width: 100% } }
        .splash-bar { width: 0%; animation: splashFill 2.2s ease-out forwards; }
      `}</style>
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="FinVista" className="h-9 w-9 rounded-lg" />
            <span className="font-display text-base font-bold">FinVista</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#pricing" className="hover:text-foreground">Pricing</a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="rounded-lg bg-mint px-3.5 py-2 text-sm font-semibold text-mint-foreground transition hover:opacity-90"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(20,216,207,0.18),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-6 py-20 text-center md:py-28">
          <span className="inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-mint">
            <Sparkles className="h-3.5 w-3.5" /> Personal finance, reimagined
          </span>
          <h1 className="mt-6 font-display text-4xl font-extrabold tracking-tight md:text-6xl">
            Know your worth.
            <br />
            <span className="bg-gradient-to-r from-mint to-accent bg-clip-text text-transparent">
              Grow it with clarity.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Track every asset, liability, investment and goal in one beautiful
            dashboard. Built for people who care about where their money goes.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="inline-flex items-center gap-2 rounded-xl bg-mint px-5 py-3 text-sm font-semibold text-mint-foreground transition hover:opacity-90"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-5 py-3 text-sm font-semibold text-foreground backdrop-blur hover:border-mint/40"
            >
              I have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-6xl px-6 py-16 scroll-mt-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Wallet, title: "Unified net worth", desc: "All assets and liabilities, one number you trust." },
            { icon: LineChart, title: "Investment insights", desc: "Track allocation, returns and SIPs across accounts." },
            { icon: PiggyBank, title: "Goal planner", desc: "Plan retirement, FIRE, vacations, anything." },
            { icon: Shield, title: "Private by design", desc: "Your data stays yours. Always encrypted." },
            { icon: Sparkles, title: "AI insights", desc: "Smart nudges on cashflow, savings and risk." },
            { icon: ArrowRight, title: "Built for everyday", desc: "Snap your net worth in seconds. Daily-ready." },
          ].map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-border bg-card/60 p-6 backdrop-blur transition hover:border-mint/40"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-mint/10 text-mint">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="mx-auto max-w-6xl px-6 py-16 scroll-mt-24">
        <div className="mb-10 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mint">
            How it works
          </span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Three steps to financial clarity
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { n: "01", title: "Add your accounts", desc: "Connect or manually add assets, liabilities and investments in minutes." },
            { n: "02", title: "See your net worth", desc: "Get a unified, beautiful view of where you stand right now." },
            { n: "03", title: "Plan & grow", desc: "Set goals, track cashflow, and let AI nudge you toward them." },
          ].map((s) => (
            <div
              key={s.n}
              className="relative rounded-2xl border border-border bg-card/60 p-6 backdrop-blur"
            >
              <div className="font-display text-4xl font-extrabold text-mint/40">{s.n}</div>
              <h3 className="mt-2 font-display text-base font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="rounded-3xl border border-mint/25 bg-gradient-to-br from-card to-mint/5 p-10">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
            Ready to know your worth?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">
            Free to start. No credit card required.
          </p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-mint px-6 py-3 text-sm font-semibold text-mint-foreground transition hover:opacity-90"
          >
            Start Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FinVista · Know your worth
      </footer>
    </div>
  );
}