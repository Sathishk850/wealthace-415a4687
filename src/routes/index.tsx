import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet,
  LineChart,
  PiggyBank,
  Sparkles,
  Shield,
  ArrowRight,
  Play,
  ShieldCheck,
  CloudOff,
  RefreshCw,
  PieChart,
  BarChart3,
  Target,
  Bell,
  Lock,
  Cloud,
} from "lucide-react";
import logo from "@/assets/finvista-logo.png";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FinVista — Know Your Worth | Personal Finance Dashboard" },
      {
        name: "description",
        content:
          "Track net worth, cashflow, investments and goals in one secure, intelligent dashboard. Start free — no credit card required.",
      },
      { property: "og:title", content: "FinVista — Know Your Worth | Personal Finance Dashboard" },
      {
        property: "og:description",
        content:
          "Track net worth, cashflow, investments and goals in one secure, intelligent dashboard. Start free — no credit card required.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { property: "og:site_name", content: "FinVista" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@FinVista" },
      { name: "twitter:title", content: "FinVista — Know Your Worth | Personal Finance Dashboard" },
      {
        name: "twitter:description",
        content:
          "Track net worth, cashflow, investments and goals in one secure, intelligent dashboard. Start free — no credit card required.",
      },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "FinVista",
          url: "/",
          description:
            "FinVista is your all-in-one personal finance dashboard — net worth, cashflow, investments and goals in one place.",
          publisher: {
            "@type": "Organization",
            name: "FinVista",
            url: "/",
          },
        }),
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
    // Force dark theme on the landing page
    const root = document.documentElement;
    const hadDark = root.classList.contains("dark");
    root.classList.add("dark");
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      document.querySelectorAll<HTMLElement>(".reveal").forEach((el) => el.classList.add("is-visible"));
      return () => {
        if (!hadDark) root.classList.remove("dark");
      };
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
    return () => {
      io.disconnect();
      if (!hadDark) root.classList.remove("dark");
    };
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Ambient animated background orbs */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="orb orb-1 absolute -left-32 top-[-10%] h-[520px] w-[520px] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,216,207,0.28),transparent_65%)] blur-3xl" />
        <div className="orb orb-2 absolute -right-40 top-[30%] h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(15,183,176,0.22),transparent_65%)] blur-3xl" />
        <div className="orb orb-3 absolute left-[20%] bottom-[-20%] h-[560px] w-[560px] rounded-full bg-[radial-gradient(circle_at_center,rgba(32,231,229,0.18),transparent_65%)] blur-3xl" />
        <div className="grid-fade absolute inset-0 bg-[linear-gradient(rgba(20,216,207,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(20,216,207,0.05)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl load-nav">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-6 py-4">
          <Link to="/" className="flex min-w-0 items-center gap-2.5">
            <img src={logo} alt="FinVista" className="h-9 w-9 shrink-0 rounded-lg" />
            <span className="leading-tight">
              <span className="block font-display text-base font-bold">FinVista</span>
              <span className="block text-[10px] font-medium tracking-[0.18em] text-mint">
                KNOW YOUR WORTH
              </span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="nav-link transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#pricing" className="nav-link transition-colors hover:text-foreground">
              Pricing
            </a>
            <a
              href="#about"
              onClick={(e) => {
                e.preventDefault();
                const el = document.getElementById("about");
                if (!el) return;
                const header = document.querySelector("header");
                const offset = header ? header.getBoundingClientRect().height + 16 : 96;
                const top = el.getBoundingClientRect().top + window.scrollY - offset;
                window.scrollTo({ top, behavior: "smooth" });
              }}
              className="nav-link transition-colors hover:text-foreground"
            >
              About
            </a>
          </nav>
          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              search={{ mode: "signin" }}
              className="btn-secondary-glow rounded-xl border border-border bg-transparent px-4 py-2 text-sm font-medium text-foreground"
            >
              Sign In
            </Link>
            <Link
              to="/auth"
              search={{ mode: "signup" }}
              className="btn-primary-glow hidden rounded-xl bg-mint px-4 py-2 text-sm font-semibold text-mint-foreground sm:inline-flex"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        {/* soft top glow */}
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,rgba(20,216,207,0.12),transparent_60%)]" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-14 lg:grid-cols-[1.05fr_1fr] lg:gap-6 lg:py-24">
          {/* Left column — copy */}
          <div className="relative z-10 text-center lg:text-left">
            <span className="load-badge inline-flex items-center gap-2 rounded-full border border-mint/30 bg-mint/10 px-3.5 py-1.5 text-xs font-semibold text-mint">
              <Sparkles className="h-3.5 w-3.5" /> All-in-one Personal Finance Platform
            </span>

            <h1 className="load-headline mt-6 font-display text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl lg:text-6xl xl:text-[68px]">
              Take Control of
              <br />
              Your{" "}
              <span className="gradient-shimmer bg-gradient-to-r from-mint via-cyan-300 to-accent bg-clip-text text-transparent">
                Financial Future
              </span>
            </h1>

            <p className="load-desc mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg lg:mx-0">
              Track, plan, and grow your wealth with FinVista.
              <br className="hidden sm:block" />
              All your finances, in one secure and intelligent platform.
            </p>

            <div className="load-cta mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Link
                to="/auth"
                search={{ mode: "signup" }}
                className="btn-primary-glow btn-shine inline-flex items-center gap-2 rounded-2xl bg-mint px-6 py-3.5 text-sm font-semibold text-mint-foreground"
              >
                Get Started Free <ArrowRight className="h-4 w-4 arrow-nudge" />
              </Link>
              <a
                href="#features"
                className="btn-secondary-glow inline-flex items-center gap-2 rounded-2xl border border-border bg-card/60 px-6 py-3.5 text-sm font-semibold text-foreground backdrop-blur"
              >
                Explore Features <Play className="h-3.5 w-3.5 fill-current" />
              </a>
            </div>

            {/* Trust strip */}
            <div className="load-cta mt-10 grid grid-cols-1 gap-5 text-left sm:grid-cols-3">
              {[
                { icon: ShieldCheck, title: "Hi-Level Security", desc: "256-bit encryption to keep your data safe" },
                { icon: CloudOff, title: "Works Offline", desc: "Access your finances anytime, anywhere" },
                { icon: RefreshCw, title: "Auto Sync", desc: "Secure cloud backup when you're online" },
              ].map((t) => (
                <div key={t.title} className="flex items-start gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-mint/10 text-mint">
                    <t.icon className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold text-mint">{t.title}</div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{t.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right column — animated aura (replaces phone) */}
          <div className="relative aspect-square w-full max-w-[560px] justify-self-center lg:justify-self-end">
            <Aura />
          </div>
        </div>
      </section>

      {/* Bottom feature strip */}
      <section id="features" className="reveal mx-auto max-w-7xl px-6 pb-16 scroll-mt-24">
        <div className="rounded-3xl border border-border/70 bg-card/40 p-6 backdrop-blur md:p-8">
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { icon: PieChart, title: "All in One", desc: "Manage all your finances in one place" },
              { icon: BarChart3, title: "Smart Insights", desc: "AI-powered insights to help you grow" },
              { icon: Target, title: "Plan Better", desc: "Set goals and plan your financial future" },
              { icon: Bell, title: "Stay Alert", desc: "Smart alerts for bills, renewals & due dates" },
              { icon: Lock, title: "Secure", desc: "Your data is encrypted and always private" },
              { icon: Cloud, title: "Works Offline", desc: "Access your finances anytime, anywhere" },
            ].map((f) => (
              <div key={f.title} className="feature-card min-w-0">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-mint/10 text-mint">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-3 font-display text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{f.desc}</p>
              </div>
            ))}
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
      <section id="how" className="reveal mx-auto max-w-7xl px-6 py-16 scroll-mt-24">
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
      <section id="pricing" className="reveal mx-auto max-w-4xl px-6 py-20 text-center scroll-mt-24">
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

      <div id="security" className="sr-only" aria-hidden="true" />

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} FinVista · Know your worth
      </footer>

      <style>{`
        @keyframes navDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes auraSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes auraSpinRev { from { transform: rotate(0deg); } to { transform: rotate(-360deg); } }
        @keyframes auraPulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.04); }
        }
        @keyframes auraFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.15; }
          50% { opacity: 1; }
        }
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes orbDrift1 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(60px, 40px) scale(1.08); }
        }
        @keyframes orbDrift2 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(-50px, 30px) scale(1.1); }
        }
        @keyframes orbDrift3 {
          0%, 100% { transform: translate(0,0) scale(1); }
          50% { transform: translate(30px, -50px) scale(1.06); }
        }
        @keyframes gridPulse {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.7; }
        }
        @keyframes shine {
          0% { transform: translateX(-120%) skewX(-20deg); }
          100% { transform: translateX(220%) skewX(-20deg); }
        }
        @keyframes arrowNudge {
          0%, 100% { transform: translateX(0); }
          50% { transform: translateX(4px); }
        }
        @keyframes floatY {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }

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

        .aura-wrap { animation: auraFloat 9s ease-in-out infinite; }
        .aura-ring { animation: auraSpin 40s linear infinite; }
        .aura-ring-rev { animation: auraSpinRev 55s linear infinite; }
        .aura-glow { animation: auraPulse 6s ease-in-out infinite; }
        .aura-dot { animation: twinkle 3.6s ease-in-out infinite; }

        .gradient-shimmer {
          background-size: 200% 200%;
          animation: gradientShift 6s ease-in-out infinite;
        }
        .orb-1 { animation: orbDrift1 18s ease-in-out infinite; will-change: transform; }
        .orb-2 { animation: orbDrift2 22s ease-in-out infinite; will-change: transform; }
        .orb-3 { animation: orbDrift3 26s ease-in-out infinite; will-change: transform; }
        .grid-fade { animation: gridPulse 8s ease-in-out infinite; mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%); -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%); }

        .btn-shine { position: relative; overflow: hidden; isolation: isolate; }
        .btn-shine::before {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent);
          transform: translateX(-120%) skewX(-20deg);
          pointer-events: none;
        }
        .btn-shine:hover::before { animation: shine 900ms ease-out forwards; }
        .btn-primary-glow:hover .arrow-nudge { animation: arrowNudge 700ms ease-in-out infinite; }

        .feature-card { animation: floatY 6s ease-in-out infinite; animation-play-state: paused; }
        .feature-card:hover { animation-play-state: running; }

        @media (prefers-reduced-motion: reduce) {
          .load-nav, .load-badge, .load-headline, .load-desc, .load-cta { animation: none; opacity: 1; transform: none; }
          .reveal { opacity: 1; transform: none; transition: none; }
          .btn-primary-glow, .btn-secondary-glow, .feature-card, .feature-icon, .nav-link::after { transition: none; }
          .aura-wrap, .aura-ring, .aura-ring-rev, .aura-glow, .aura-dot { animation: none; }
          .gradient-shimmer, .orb-1, .orb-2, .orb-3, .grid-fade, .btn-shine::before, .arrow-nudge, .feature-card { animation: none; }
        }
      `}</style>
    </div>
  );
}

function Aura() {
  // Deterministic particle field so SSR + client render match
  const particles = Array.from({ length: 46 }, (_, i) => {
    const angle = (i * 137.5) % 360;
    const radius = 34 + ((i * 53) % 22); // 34–56%
    const x = 50 + radius * Math.cos((angle * Math.PI) / 180);
    const y = 50 + radius * Math.sin((angle * Math.PI) / 180);
    const size = 1 + ((i * 7) % 3);
    const delay = (i % 12) * 0.25;
    const dur = 3 + ((i * 11) % 40) / 10;
    return { x, y, size, delay, dur, key: i };
  });

  return (
    <div className="aura-wrap absolute inset-0">
      {/* Outer soft halo */}
      <div className="aura-glow absolute inset-[6%] rounded-full bg-[radial-gradient(circle_at_center,rgba(20,216,207,0.35),rgba(20,216,207,0.06)_55%,transparent_72%)] blur-2xl" />

      {/* Rotating dashed ring */}
      <div className="aura-ring absolute inset-[10%] rounded-full border border-dashed border-mint/25" />
      {/* Solid faint ring */}
      <div className="absolute inset-[16%] rounded-full border border-mint/15" />
      {/* Reverse ring */}
      <div className="aura-ring-rev absolute inset-[22%] rounded-full border border-mint/10" />

      {/* Meridian lines (subtle sphere hint) */}
      <div className="absolute inset-[10%] rounded-full border border-mint/10 [transform:rotateY(70deg)]" />
      <div className="absolute inset-[10%] rounded-full border border-mint/10 [transform:rotateX(70deg)]" />

      {/* Inner core glow */}
      <div className="aura-glow absolute inset-[36%] rounded-full bg-mint/15 blur-2xl" />

      {/* Particle field */}
      {particles.map((p) => (
        <span
          key={p.key}
          className="aura-dot absolute rounded-full bg-mint"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            transform: "translate(-50%, -50%)",
            boxShadow: "0 0 8px rgba(20,216,207,0.9)",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
