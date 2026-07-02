import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, LineChart, PiggyBank, Sparkles, Shield, ArrowRight } from "lucide-react";
import logo from "@/assets/finvista-logo.png";
import { supabase } from "@/integrations/supabase/client";

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
  const [authed, setAuthed] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (typeof window === "undefined") return;
    let leave: ReturnType<typeof setTimeout> | undefined;
    let done: ReturnType<typeof setTimeout> | undefined;
    supabase.auth.getSession().then(({ data }) => {
      const hasSession = !!data.session;
      setAuthed(hasSession);
      if (hasSession) {
        // Valid session — skip splash, go straight to dashboard.
        navigate({ to: "/dashboard", replace: true });
        return;
      }
      leave = setTimeout(() => setSplashLeaving(true), 2000);
      done = setTimeout(() => setShowSplash(false), 2500);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setAuthed(false);
        setShowSplash(false);
      }
    });
    return () => {
      if (leave) clearTimeout(leave);
      if (done) clearTimeout(done);
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!showSplash && authed) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [showSplash, authed, navigate]);

  if (authed === null || showSplash) return <Splash leaving={splashLeaving} />;
  if (authed) return <Splash leaving={false} />;
  return <Landing />;
}

function Splash({ leaving }: { leaving: boolean }) {
  return (
    <div
      className={`fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-700 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}
      aria-hidden={leaving}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(20,216,207,0.12),transparent_55%)]" />

      {/* Subtle banking grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(20,216,207,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(20,216,207,0.025)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative flex flex-col items-center gap-8">
        {/* Logo with elegant orbital rings */}
        <div className="relative">
          <div className="absolute inset-0 -m-7 animate-[spin_10s_linear_infinite] rounded-full border border-dashed border-mint/20" />
          <div className="absolute inset-0 -m-4 rounded-full border border-mint/10" />
          <div className="absolute inset-0 -m-2 animate-pulse rounded-full bg-mint/10 blur-2xl" />
          <img
            src={logo}
            alt="FinVista"
            className="relative h-24 w-24 rounded-2xl shadow-[0_0_60px_-8px_rgba(20,216,207,0.5)]"
          />
        </div>

        {/* Brand lockup */}
        <div className="text-center">
          <div className="font-display text-4xl font-bold tracking-tight text-foreground">FinVista</div>
          <div className="mt-3 text-[11px] font-semibold uppercase tracking-[0.35em] text-mint">Know your worth</div>
        </div>

        {/* Wealth view loading state */}
        <div className="flex flex-col items-center gap-4">
          <div className="text-sm font-medium tracking-wide text-muted-foreground">Building your wealth view...</div>

          {/* Elegant module cycle */}
          <div className="flex items-center gap-3 text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground">
            <span className="splash-word">Assets</span>
            <span className="text-mint/60">•</span>
            <span className="splash-word" style={{ animationDelay: "0.45s" }}>
              Cashflow
            </span>
            <span className="text-mint/60">•</span>
            <span className="splash-word" style={{ animationDelay: "0.9s" }}>
              Goals
            </span>
          </div>
        </div>

        {/* Premium shimmer progress */}
        <div className="mt-2 h-px w-64 overflow-hidden bg-surface-2">
          <div className="splash-bar h-full bg-gradient-to-r from-transparent via-mint to-transparent" />
        </div>
      </div>

      <style>{`
        @keyframes splashFill {
          0% { transform: translateX(-100%); opacity: 0; }
          15% { opacity: 1; }
          85% { opacity: 1; }
          100% { transform: translateX(100%); opacity: 0; }
        }
        .splash-bar {
          width: 100%;
          animation: splashFill 2.2s cubic-bezier(0.4, 0, 0.2, 1) infinite;
        }
        @keyframes splashWord {
          0%, 100% { opacity: 0.45; color: rgba(138, 160, 179, 1); }
          50% { opacity: 1; color: rgba(20, 216, 207, 1); }
        }
        .splash-word {
          animation: splashWord 2.4s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}

function Landing() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-visible");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" },
    );
    document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl load-nav">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2.5">
            <img src={logo} alt="FinVista" className="h-9 w-9 rounded-lg" />
            <span className="font-display text-base font-bold">FinVista</span>
          </Link>
          <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
            <a href="#features" className="nav-link transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#how" className="nav-link transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#pricing" className="nav-link transition-colors hover:text-foreground">
              Pricing
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Sign in
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="btn-primary-glow rounded-lg bg-mint px-3.5 py-2 text-sm font-semibold text-mint-foreground"
            >
              Sign up
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(20,216,207,0.18),transparent_60%)]" />
        <div className="mx-auto max-w-6xl px-6 py-20 text-center md:py-28">
          <span className="load-badge inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-mint">
            <Sparkles className="h-3.5 w-3.5" /> Personal finance, reimagined
          </span>
          <h1 className="load-headline mt-6 font-display text-4xl font-extrabold tracking-tight md:text-6xl">
            Know your worth.
            <br />
            <span className="bg-gradient-to-r from-mint to-accent bg-clip-text text-transparent">
              Grow it with clarity.
            </span>
          </h1>
          <p className="load-desc mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
            Track every asset, liability, investment and goal in one beautiful dashboard. Built for people who care
            about where their money goes.
          </p>
          <div className="load-cta mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="btn-primary-glow inline-flex items-center gap-2 rounded-xl bg-mint px-5 py-3 text-sm font-semibold text-mint-foreground"
            >
              Start Free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="btn-secondary-glow inline-flex items-center gap-2 rounded-xl border border-border bg-card/60 px-5 py-3 text-sm font-semibold text-foreground backdrop-blur"
            >
              I have an account
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="reveal mx-auto max-w-6xl px-6 py-16 scroll-mt-24">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: Wallet, title: "Unified net worth", desc: "All assets and liabilities, one number you trust." },
            {
              icon: LineChart,
              title: "Investment insights",
              desc: "Track allocation, returns and SIPs across accounts.",
            },
            { icon: PiggyBank, title: "Goal planner", desc: "Plan retirement, FIRE, vacations, anything." },
            { icon: Shield, title: "Private by design", desc: "Your data stays yours. Always encrypted." },
            { icon: Sparkles, title: "AI insights", desc: "Smart nudges on cashflow, savings and risk." },
            { icon: ArrowRight, title: "Built for everyday", desc: "Snap your net worth in seconds. Daily-ready." },
          ].map((f, i) => (
            <div
              key={f.title}
              className="feature-card reveal rounded-2xl border border-border bg-card/60 p-6 backdrop-blur"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="feature-icon grid h-10 w-10 place-items-center rounded-xl bg-mint/10 text-mint">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 font-display text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="reveal mx-auto max-w-6xl px-6 py-16 scroll-mt-24">
        <div className="mb-10 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.22em] text-mint">How it works</span>
          <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
            Three steps to financial clarity
          </h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            {
              n: "01",
              title: "Add your accounts",
              desc: "Connect or manually add assets, liabilities and investments in minutes.",
            },
            {
              n: "02",
              title: "See your net worth",
              desc: "Get a unified, beautiful view of where you stand right now.",
            },
            { n: "03", title: "Plan & grow", desc: "Set goals, track cashflow, and let AI nudge you toward them." },
          ].map((s, i) => (
            <div
              key={s.n}
              className="feature-card reveal relative rounded-2xl border border-border bg-card/60 p-6 backdrop-blur"
              style={{ transitionDelay: `${i * 90}ms` }}
            >
              <div className="font-display text-4xl font-extrabold text-mint/40">{s.n}</div>
              <h3 className="mt-2 font-display text-base font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section id="pricing" className="reveal mx-auto max-w-4xl px-6 py-20 text-center">
        <div className="rounded-3xl border border-mint/25 bg-gradient-to-br from-card to-mint/5 p-10">
          <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">Ready to know your worth?</h2>
          <p className="mx-auto mt-3 max-w-md text-muted-foreground">Free to start. No credit card required.</p>
          <Link
            to="/auth"
            search={{ mode: "signup" }}
            className="btn-primary-glow mt-6 inline-flex items-center gap-2 rounded-xl bg-mint px-6 py-3 text-sm font-semibold text-mint-foreground"
          >
            Start Free <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FinVista · Know your worth
      </footer>

      <style>{`
        @keyframes navDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }

        .load-nav { opacity: 0; animation: navDown 400ms ease-out 0ms forwards; }
        .load-badge { opacity: 0; animation: fadeIn 400ms ease-out 250ms forwards; }
        .load-headline { opacity: 0; animation: slideUp 500ms ease-out 450ms forwards; }
        .load-desc { opacity: 0; animation: fadeIn 500ms ease-out 800ms forwards; }
        .load-cta { opacity: 0; animation: scaleIn 400ms ease-out 1050ms forwards; }

        .nav-link { position: relative; }
        .nav-link::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: -4px;
          height: 1.5px; background: var(--mint, #14D8CF);
          transform: scaleX(0); transform-origin: left;
          transition: transform 250ms ease-out;
        }
        .nav-link:hover::after { transform: scaleX(1); }

        .btn-primary-glow {
          transition: transform 250ms ease-out, box-shadow 250ms ease-out, opacity 200ms ease-out;
          will-change: transform;
        }
        .btn-primary-glow:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px -8px color-mix(in oklab, var(--mint, #14D8CF) 55%, transparent);
          opacity: 0.95;
        }

        .btn-secondary-glow {
          transition: transform 250ms ease-out, box-shadow 250ms ease-out, border-color 250ms ease-out;
          will-change: transform;
        }
        .btn-secondary-glow:hover {
          transform: translateY(-2px);
          border-color: color-mix(in oklab, var(--mint, #14D8CF) 45%, transparent);
          box-shadow: 0 0 0 1px color-mix(in oklab, var(--mint, #14D8CF) 30%, transparent),
                      0 8px 24px -12px color-mix(in oklab, var(--mint, #14D8CF) 35%, transparent);
        }

        .reveal {
          opacity: 0; transform: translateY(20px);
          transition: opacity 500ms ease-out, transform 500ms ease-out;
          will-change: opacity, transform;
        }
        .reveal.is-visible { opacity: 1; transform: translateY(0); }

        .feature-card {
          transition: transform 250ms ease-out, box-shadow 250ms ease-out, border-color 250ms ease-out, opacity 500ms ease-out;
        }
        .feature-card:hover {
          transform: translateY(-4px);
          border-color: color-mix(in oklab, var(--mint, #14D8CF) 45%, transparent);
          box-shadow: 0 14px 40px -18px color-mix(in oklab, var(--mint, #14D8CF) 45%, transparent);
        }
        .feature-icon { transition: transform 250ms ease-out; }
        .feature-card:hover .feature-icon { transform: scale(1.08); }

        @media (prefers-reduced-motion: reduce) {
          .load-nav, .load-badge, .load-headline, .load-desc, .load-cta { animation: none; opacity: 1; transform: none; }
          .reveal { opacity: 1; transform: none; transition: none; }
          .btn-primary-glow, .btn-secondary-glow, .feature-card, .feature-icon, .nav-link::after { transition: none; }
        }
      `}</style>
    </div>
  );
}
