import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Wallet,
  LineChart,
  Sparkles,
  Shield,
  ArrowRight,
  ShieldCheck,
  Wifi,
  WifiOff,
  Lock,
  Cloud,
  PieChart,

  Target,
  Calculator,
  Download,
  TrendingUp,
  Landmark,
  Monitor,
  CircleCheck,
  LayoutGrid,
  CreditCard,
} from "lucide-react";
import { BrandMark } from "@/components/brand/brand-mark";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Wealth Ace — Master Your Finances | Personal Finance Dashboard" },
      {
        name: "description",
        content:
          "Track net worth, cashflow, investments and goals in one secure, intelligent dashboard. Start free — no credit card required.",
      },
      { property: "og:title", content: "Wealth Ace — Master Your Finances | Personal Finance Dashboard" },
      {
        property: "og:description",
        content:
          "Track net worth, cashflow, investments and goals in one secure, intelligent dashboard. Start free — no credit card required.",
      },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "/" },
      { property: "og:site_name", content: "Wealth Ace" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Wealth Ace" },
      { name: "twitter:title", content: "Wealth Ace — Master Your Finances | Personal Finance Dashboard" },
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
          name: "Wealth Ace",
          url: "/",
          description:
            "Wealth Ace is your all-in-one personal finance dashboard — net worth, cashflow, investments and goals in one place.",
          publisher: {
            "@type": "Organization",
            name: "Wealth Ace",
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
      className={`dark fixed inset-0 z-[100] grid place-items-center bg-background transition-opacity duration-700 ${
        leaving ? "pointer-events-none opacity-0" : "opacity-100"
      }`}

      aria-hidden={leaving}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_55%)]" />

      {/* Subtle banking grid */}
      <div className="absolute inset-0 bg-[linear-gradient(color-mix(in_oklab,var(--primary)_3%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--primary)_3%,transparent)_1px,transparent_1px)] bg-[size:64px_64px]" />

      <div className="relative flex flex-col items-center gap-8">
        {/* Master logo (icon + wordmark + tagline in one image) */}
        <div className="fv-splash-step" style={{ animationDelay: "0ms" }}>
          <BrandMark size="xl" animated />
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
          0%, 100% { opacity: 0.45; color: var(--muted-foreground); }
          50% { opacity: 1; color: var(--primary); }
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

  const smoothTo = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    const header = document.querySelector("header");
    const offset = header ? header.getBoundingClientRect().height + 16 : 96;
    const top = el.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top, behavior: "smooth" });
  };

  return (
    <div className="dark min-h-screen bg-background font-sans text-foreground">
      {/* Ambient animated background */}
      <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="orb orb-1 absolute -left-32 top-[-10%] h-[520px] w-[520px] rounded-full bg-primary/20 blur-3xl" />
        <div className="orb orb-2 absolute -right-40 top-[30%] h-[600px] w-[600px] rounded-full bg-accent/30 blur-3xl" />
        <div className="orb orb-3 absolute left-[20%] bottom-[-20%] h-[560px] w-[560px] rounded-full bg-primary/15 blur-3xl" />
        <div className="grid-fade absolute inset-0 bg-[linear-gradient(color-mix(in_oklab,var(--primary)_5%,transparent)_1px,transparent_1px),linear-gradient(90deg,color-mix(in_oklab,var(--primary)_5%,transparent)_1px,transparent_1px)] bg-[size:56px_56px]" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/70 backdrop-blur-xl load-nav">

        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 overflow-hidden px-3 py-3 sm:gap-4 sm:px-6 sm:py-4">
          <BrandMark to="/" size="sm" tagline className="fv-brand-rise min-w-0 shrink sm:hidden" />
          <span className="hidden min-w-0 sm:block">
            <BrandMark to="/" size="md" tagline className="fv-brand-rise min-w-0" />
          </span>
          <nav className="hidden items-center gap-9 text-sm text-muted-foreground md:flex">
            <a href="#features" onClick={smoothTo("features")} className="nav-link transition-colors hover:text-foreground">Features</a>
            <a href="#how" onClick={smoothTo("how")} className="nav-link transition-colors hover:text-foreground">How It Works</a>
            <a href="#about" onClick={smoothTo("about")} className="nav-link transition-colors hover:text-foreground">About</a>
          </nav>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button asChild variant="ghost" size="sm" className="whitespace-nowrap">
              <Link to="/auth" search={{ mode: "signin" }}>Sign In</Link>
            </Button>
            <Button asChild variant="default" size="sm" className="whitespace-nowrap">
              <Link to="/auth" search={{ mode: "signup" }}>
                Get Started<span className="hidden sm:inline"> Free</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,color-mix(in_oklab,var(--primary)_12%,transparent),transparent_60%)]" />
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 py-14 lg:grid-cols-[1fr_1.1fr] lg:gap-10 lg:py-20">
          {/* Left copy */}
          <div className="relative z-10 text-center lg:text-left">
            <span className="load-badge inline-flex items-center gap-2 text-sm font-semibold text-mint">
              <ShieldCheck className="h-4 w-4" /> All-in-one Personal Finance Platform
            </span>

            <h1 className="load-headline mt-5 font-sans text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl lg:text-[64px]">
              Master Your Finances.<br />
              Grow Your{" "}
              <span className="text-primary">
                Wealth.
              </span>
            </h1>

            <p className="load-desc mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg lg:mx-0">
              Track your assets, investments, expenses and goals in one secure dashboard. Get complete clarity about your financial life.
            </p>

            <div className="load-cta mt-8 flex flex-wrap items-center justify-center gap-3 lg:justify-start">
              <Button asChild variant="default" size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get Started Free <ArrowRight className="h-4 w-4 arrow-nudge" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#features" onClick={smoothTo("features")}>
                  Explore Features <LayoutGrid className="h-4 w-4" />
                </a>
              </Button>
            </div>

            <div className="load-cta mt-8 flex flex-col items-center gap-6 md:flex-row md:items-stretch md:justify-center lg:justify-start md:gap-0">
              {[
                { Icon: ShieldCheck, title: "Hi-Level Security", desc: "256-bit encryption to keep your data safe." },
                { Icon: WifiOff, title: "Works Offline", desc: "Access your finances anytime, anywhere." },
                { Icon: Cloud, title: "Auto Sync", desc: "Secure cloud backup when you're online." },
              ].map(({ Icon, title, desc }, i) => (
                <div
                  key={title}
                  className="hero-feature-item group relative flex flex-1 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 md:justify-center lg:justify-start"
                  style={{ animationDelay: `${i * 120}ms` }}
                >
                  {i > 0 && (
                    <span
                      aria-hidden
                      className="pointer-events-none absolute left-0 top-1/2 hidden h-10 w-px -translate-x-1/2 -translate-y-1/2 bg-border md:block"
                    />
                  )}
                  <div className="hero-feature-icon grid h-10 w-10 shrink-0 place-items-center rounded-lg border border-border bg-card">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 text-left">
                    <div className="hero-feature-title text-sm font-semibold text-foreground">{title}</div>
                    <div className="text-xs text-muted-foreground">{desc}</div>
                  </div>
                </div>
              ))}
            </div>

          </div>


          {/* Right illustration - blended into background */}
          <div className="load-hero-illus relative w-full lg:pl-8">
            <FinanceIllustration />
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="reveal mx-auto max-w-7xl px-6 py-20 scroll-mt-24">
        <div className="text-center">
          <h2 className="font-sans text-4xl font-bold tracking-tight md:text-5xl">Features</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">
            Everything you need to manage your finances in one place.
          </p>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { icon: PieChart, title: "Net Worth Tracking", desc: "Track your total net worth in real time with beautiful insights." },
            { icon: Wallet, title: "Manage Money", desc: "Track income, expenses and cash flow effortlessly." },
            { icon: TrendingUp, title: "Investments", desc: "Track all your investments including stocks, mutual funds, gold and more." },
            { icon: Target, title: "Goal Planning", desc: "Set financial goals and track progress towards achieving them." },
            { icon: Calculator, title: "Smart Tools", desc: "EMI calculator, SIP calculator and more smart tools." },
            { icon: Download, title: "Export & Backup", desc: "Export your data and keep it safe. Your data belongs to you." },
          ].map((f) => (
            <div key={f.title} className="feature-card rounded-2xl border border-border bg-card/60 p-5 backdrop-blur">
              <div className="feature-icon grid h-11 w-11 place-items-center rounded-xl bg-mint/10 text-mint">
                <f.icon className="h-5 w-5" />
              </div>
               <h3 className="mt-4 font-sans text-base font-semibold">{f.title}</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="reveal mx-auto max-w-7xl px-6 py-20 scroll-mt-24">
        <div className="text-center">
          <h2 className="font-sans text-4xl font-bold tracking-tight md:text-5xl">How It Works</h2>
          <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Three simple steps to financial clarity.</p>
        </div>
        <div className="relative mt-14 grid grid-cols-1 gap-8 md:grid-cols-3">
          <div aria-hidden className="pointer-events-none absolute left-[16%] right-[16%] top-[54px] hidden border-t border-dashed border-mint/30 md:block" />
          {[
            { n: 1, icon: Landmark, title: "Add Your Accounts", desc: "Connect or manually add your assets, investments, liabilities and bank balances." },
            { n: 2, icon: Monitor, title: "Track Your Net Worth", desc: "Wealth Ace automatically organizes your finances into one beautiful dashboard." },
            { n: 3, icon: CircleCheck, title: "Grow With Confidence", desc: "Monitor your progress, achieve financial goals and make smarter financial decisions." },
          ].map((s) => (
            <div key={s.n} className="relative">
              <div className="mx-auto mb-4 grid h-9 w-9 place-items-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)]">
                {s.n}
              </div>
              <div className="feature-card rounded-2xl border border-border bg-card/60 p-6 text-center backdrop-blur">
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-mint/10 text-mint">
                  <s.icon className="h-6 w-6" />
                </div>
                <h3 className="mt-4 font-sans text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* About */}
      <section id="about" className="reveal mx-auto max-w-7xl px-6 py-20 scroll-mt-24">
        <div className="grid grid-cols-1 items-center gap-10 md:grid-cols-2">
          {/* Shield illustration */}
          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="absolute inset-[10%] rounded-full border border-mint/20" />
            <div className="aura-ring absolute inset-[6%] rounded-full border border-dashed border-mint/25" />
            <div className="absolute inset-[22%] rounded-full border border-mint/10" />
            <div className="aura-glow absolute inset-[26%] rounded-full bg-mint/10 blur-2xl" />

            {/* Center shield */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
              <div className="grid h-36 w-32 place-items-center rounded-[24px] bg-gradient-to-b from-primary/30 to-primary/10 shadow-[var(--shadow-glow)]">
                <Shield className="h-16 w-16 text-mint" fill="currentColor" fillOpacity={0.15} />
                <span className="absolute font-sans text-3xl font-black text-primary">F</span>
              </div>
            </div>

            {/* Orbiting icons */}
            {[
              { icon: Lock, className: "left-[8%] top-[32%]" },
              { icon: CreditCard, className: "right-[6%] top-[22%]" },
              { icon: Wallet, className: "left-[14%] bottom-[16%]" },
              { icon: PieChart, className: "right-[10%] bottom-[20%]" },
            ].map((o, i) => (
              <div
                key={i}
                className={`coin-glow absolute grid h-12 w-12 place-items-center rounded-xl bg-card/80 text-mint backdrop-blur ${o.className}`}
                style={{ animationDelay: `${i * 0.8}s` }}
              >
                <o.icon className="h-5 w-5" />
              </div>
            ))}
          </div>

          <div>
            <h2 className="font-sans text-4xl font-bold tracking-tight md:text-5xl">About Wealth Ace</h2>
            <p className="mt-2 font-sans text-2xl font-semibold text-primary md:text-3xl">Master Your Finances.</p>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground">
              Wealth Ace is a modern personal finance platform that helps you track, organize and grow your wealth in one secure, intelligent dashboard. From assets and investments to expenses and financial goals, everything is designed to give you complete financial clarity.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild variant="default" size="lg">
                <Link to="/auth" search={{ mode: "signup" }}>
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#features" onClick={smoothTo("features")}>Explore Features</a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60 py-8 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Wealth Ace · Master your finances
      </footer>

      <style>{`
        @keyframes navDown { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes auraSpin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes auraPulse { 0%, 100% { opacity: 0.55; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }
        @keyframes gradientShift { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes orbDrift1 { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(60px, 40px) scale(1.08); } }
        @keyframes orbDrift2 { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(-50px, 30px) scale(1.1); } }
        @keyframes orbDrift3 { 0%, 100% { transform: translate(0,0) scale(1); } 50% { transform: translate(30px, -50px) scale(1.06); } }
        @keyframes gridPulse { 0%, 100% { opacity: 0.35; } 50% { opacity: 0.7; } }
        @keyframes shine { 0% { transform: translateX(-120%) skewX(-20deg); } 100% { transform: translateX(220%) skewX(-20deg); } }
        @keyframes arrowNudge { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(4px); } }
        @keyframes heroSlideIn { from { opacity: 0; transform: translateX(40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes coinPulse {
          0%, 100% { box-shadow: 0 0 12px -2px color-mix(in oklab, var(--primary) 35%, transparent); }
          50% { box-shadow: 0 0 26px 0 color-mix(in oklab, var(--primary) 70%, transparent); }
        }
        @keyframes floatY { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }

        @keyframes barRise { from { transform: scaleY(0); } to { transform: scaleY(1); } }
        @keyframes drawLine { to { stroke-dashoffset: 0; } }
        @keyframes arrowPop { 0% { opacity: 0; transform: scale(0.5); } 100% { opacity: 1; transform: scale(1); } }
        @keyframes heroBreath { 0%, 100% { opacity: 0.85; transform: scale(1); } 50% { opacity: 1; transform: scale(1.04); } }
        @keyframes floatSlow { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(4px,-10px); } }
        @keyframes floatSlowAlt { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(-6px,-14px); } }
        @keyframes floatSlow2 { 0%, 100% { transform: translate(0,0); } 50% { transform: translate(8px,-6px); } }
        @keyframes orbPulse { 0%, 100% { filter: drop-shadow(0 0 6px color-mix(in oklab, var(--primary) 40%, transparent)); } 50% { filter: drop-shadow(0 0 22px color-mix(in oklab, var(--primary) 85%, transparent)); } }
        @keyframes particleDrift { 0% { opacity: 0; transform: translateY(0); } 20% { opacity: 0.9; } 100% { opacity: 0; transform: translateY(-40px); } }
        @keyframes trailShift { 0%, 100% { stroke-dashoffset: 0; } 50% { stroke-dashoffset: -20; } }
        @keyframes areaDraw { to { stroke-dashoffset: 0; } }
        @keyframes areaFade { from { opacity: 0; } to { opacity: 1; } }

        .area-fill { opacity: 0; animation: areaFade 900ms ease-out 1400ms forwards; }
        .area-line { stroke-dasharray: 900; stroke-dashoffset: 900; animation: areaDraw 1800ms ease-out 700ms forwards; }
        .area-dot { opacity: 0; animation: areaFade 400ms ease-out 2400ms forwards; }

        .bar-group > rect,
        .bar-group > polygon { transform-box: fill-box; transform-origin: bottom; }
        .bar-group { transform-box: fill-box; transform-origin: center bottom; opacity: 0; animation: barRise 900ms cubic-bezier(0.2,0.8,0.2,1) forwards; }
        .trend-line { stroke-dasharray: 600; stroke-dashoffset: 600; animation: drawLine 1400ms ease-out 900ms forwards; }
        .trend-arrow { opacity: 0; animation: arrowPop 500ms cubic-bezier(0.2,0.8,0.2,1) 2200ms forwards, orbPulse 3.5s ease-in-out 2700ms infinite; transform-box: fill-box; }
        .data-trails path { stroke-dasharray: 4 10; animation: trailShift 12s linear infinite; }
        .hero-breath { animation: heroBreath 6s ease-in-out infinite; }
        .hero-breath-2 { animation: heroBreath 8s ease-in-out infinite reverse; }
        .particle { animation: particleDrift 6s ease-in-out infinite; }

        .coin-inr { animation: floatSlow 5s ease-in-out infinite, orbPulse 4s ease-in-out infinite; }
        .coin-usd { animation: floatSlowAlt 6s ease-in-out infinite, orbPulse 5s ease-in-out 0.6s infinite; }
        .coin-eur { animation: floatSlow2 5.5s ease-in-out infinite, orbPulse 4.5s ease-in-out 1.2s infinite; }

        .load-nav { opacity: 0; animation: navDown 400ms ease-out 0ms forwards; }
        .load-badge { opacity: 0; animation: fadeIn 400ms ease-out 250ms forwards; }
        .load-headline { opacity: 0; animation: slideUp 500ms ease-out 450ms forwards; }
        .load-desc { opacity: 0; animation: fadeIn 500ms ease-out 800ms forwards; }
        .load-cta { opacity: 0; animation: scaleIn 400ms ease-out 1050ms forwards; }
        .load-hero-illus { opacity: 0; animation: heroSlideIn 700ms cubic-bezier(0.2,0.7,0.2,1) 600ms forwards, floatY 8s ease-in-out 1300ms infinite; }

        .nav-link { position: relative; }
        .nav-link::after {
          content: ""; position: absolute; left: 0; right: 0; bottom: -4px;
          height: 1.5px; background: var(--primary);
          transform: scaleX(0); transform-origin: left;
          transition: transform 250ms ease-out;
        }
        .nav-link:hover::after { transform: scaleX(1); }

        .btn-primary-glow { transition: transform 250ms ease-out, box-shadow 250ms ease-out, opacity 200ms ease-out; will-change: transform; }
        .btn-primary-glow:hover { transform: translateY(-3px); box-shadow: 0 10px 30px -8px color-mix(in oklab, var(--primary) 55%, transparent); opacity: 0.95; }
        .btn-primary-glow:active { transform: translateY(-1px) scale(0.98); }

        .btn-secondary-glow { transition: transform 250ms ease-out, box-shadow 250ms ease-out, border-color 250ms ease-out; will-change: transform; }
        .btn-secondary-glow:hover { transform: translateY(-2px); border-color: color-mix(in oklab, var(--primary) 45%, transparent); box-shadow: 0 0 0 1px color-mix(in oklab, var(--primary) 30%, transparent), 0 8px 24px -12px color-mix(in oklab, var(--primary) 35%, transparent); }

        .reveal { opacity: 0; transform: translateY(20px); transition: opacity 500ms ease-out, transform 500ms ease-out; will-change: opacity, transform; }
        .reveal.is-visible { opacity: 1; transform: translateY(0); }

        .feature-card { transition: transform 250ms ease-out, box-shadow 250ms ease-out, border-color 250ms ease-out; }
        .feature-card:hover { transform: translateY(-4px); border-color: color-mix(in oklab, var(--primary) 45%, transparent); box-shadow: 0 14px 40px -18px color-mix(in oklab, var(--primary) 45%, transparent); }
        .feature-icon { transition: transform 250ms ease-out; }
        .feature-card:hover .feature-icon { transform: scale(1.08); }

        .aura-ring { animation: auraSpin 40s linear infinite; }
        .aura-glow { animation: auraPulse 6s ease-in-out infinite; }
        .coin-glow { animation: coinPulse 4s ease-in-out infinite, floatY 5s ease-in-out infinite; }

        .gradient-shimmer { background-size: 200% 200%; animation: gradientShift 6s ease-in-out infinite; }
        .orb-1 { animation: orbDrift1 18s ease-in-out infinite; will-change: transform; }
        .orb-2 { animation: orbDrift2 22s ease-in-out infinite; will-change: transform; }
        .orb-3 { animation: orbDrift3 26s ease-in-out infinite; will-change: transform; }
        .grid-fade { animation: gridPulse 8s ease-in-out infinite; mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%); -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%); }

        .btn-shine { position: relative; overflow: hidden; isolation: isolate; }
        .btn-shine::before {
          content: ""; position: absolute; inset: 0;
          background: linear-gradient(90deg, transparent, color-mix(in oklab, var(--primary-foreground) 55%, transparent), transparent);
          transform: translateX(-120%) skewX(-20deg);
          pointer-events: none;
        }
        .btn-shine:hover::before { animation: shine 900ms ease-out forwards; }
        .btn-primary-glow:hover .arrow-nudge { animation: arrowNudge 700ms ease-in-out infinite; }

        @media (prefers-reduced-motion: reduce) {
          .load-nav, .load-badge, .load-headline, .load-desc, .load-cta, .load-hero-illus { animation: none; opacity: 1; transform: none; }
          .reveal { opacity: 1; transform: none; transition: none; }
          .btn-primary-glow, .btn-secondary-glow, .feature-card, .feature-icon, .nav-link::after { transition: none; }
          .aura-ring, .aura-glow, .coin-glow, .gradient-shimmer, .orb-1, .orb-2, .orb-3, .grid-fade, .btn-shine::before, .arrow-nudge,
          .bar-group, .trend-line, .trend-arrow, .data-trails path, .hero-breath, .hero-breath-2, .particle,
          .coin-inr, .coin-usd, .coin-eur,
          .area-fill, .area-line, .area-dot { animation: none; opacity: 1; stroke-dashoffset: 0; transform: none; }
        }
      `}</style>
    </div>
  );
}


function Aura() {
  return <FinanceIllustration />;
}

function FinanceIllustration() {
  // Bar heights (in %) rising left to right
  const bars = [28, 40, 34, 52, 46, 66, 78];
  // Trend line points across the 400x260 svg viewport
  const trendPoints = "20,200 80,175 140,155 200,120 260,100 320,70 372,42";
  const particles = Array.from({ length: 22 }, (_, i) => ({
    key: i,
    left: (i * 47) % 100,
    top: (i * 29) % 100,
    size: 2 + ((i * 3) % 3),
    delay: (i % 10) * 0.5,
    dur: 6 + ((i * 7) % 40) / 10,
  }));

  return (
    <div
      className="hero-illus relative aspect-square w-full [mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_88%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black_45%,transparent_88%)]"
      aria-label="Glowing 3D bar chart with upward trend line and floating rupee, dollar and euro currency symbols"
      role="img"
    >
      {/* Soft radial teal breathing glow — fades illustration into page */}
      <div className="hero-breath pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_55%_60%,color-mix(in_oklab,var(--primary)_32%,transparent),color-mix(in_oklab,var(--primary)_8%,transparent)_38%,transparent_70%)]" />
      <div className="hero-breath-2 pointer-events-none absolute inset-[10%] bg-[radial-gradient(circle_at_50%_50%,color-mix(in_oklab,var(--primary)_22%,transparent),transparent_65%)] blur-2xl" />

      {/* Faint financial grid — masked to fade into background */}
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-40 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_78%)] [-webkit-mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_78%)]"
        viewBox="0 0 400 400"
        fill="none"
      >
        <defs>
          <pattern id="fv-grid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 0H0V32" stroke="color-mix(in srgb, var(--primary) 18%, transparent)" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect width="400" height="400" fill="url(#fv-grid)" />
      </svg>

      {/* Curved subtle data trails */}
      <svg
        className="data-trails pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 400 400"
        fill="none"
      >
        <path d="M-20 320 C 90 260, 160 300, 260 220 S 380 140, 440 90" stroke="color-mix(in srgb, var(--primary) 18%, transparent)" strokeWidth="1.2" strokeDasharray="2 6" />
        <path d="M-20 360 C 120 320, 220 340, 300 260 S 420 200, 460 160" stroke="color-mix(in srgb, var(--primary) 12%, transparent)" strokeWidth="1" strokeDasharray="2 8" />
      </svg>

      {/* Main chart SVG */}
      <svg
        className="relative z-10 h-full w-full"
        viewBox="0 0 400 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fv-bar" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-2)" />
            <stop offset="60%" stopColor="var(--primary)" />
            <stop offset="100%" stopColor="var(--brand)" />
          </linearGradient>
          <linearGradient id="fv-bar-top" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand-2)" />
            <stop offset="100%" stopColor="var(--primary)" />
          </linearGradient>
          <linearGradient id="fv-line" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.4" />
            <stop offset="100%" stopColor="var(--brand-2)" />
          </linearGradient>
          <radialGradient id="fv-arrow-glow" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0%" stopColor="var(--brand-2)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </radialGradient>
          <filter id="fv-blur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" />
          </filter>
          <linearGradient id="fv-area" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.45" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Animated area chart behind bars */}
        <g className="area-chart">
          <path
            className="area-fill"
            d="M0,220 C 40,200 70,210 100,180 S 170,150 210,160 S 290,120 330,100 S 390,70 400,60 L400,260 L0,260 Z"
            fill="url(#fv-area)"
          />
          <path
            className="area-line"
            d="M0,220 C 40,200 70,210 100,180 S 170,150 210,160 S 290,120 330,100 S 390,70 400,60"
            stroke="color-mix(in srgb, var(--brand-2) 55%, transparent)"
            strokeWidth="1.5"
            fill="none"
            filter="drop-shadow(0 0 4px color-mix(in srgb, var(--primary) 60%, transparent))"
          />
          <circle className="area-dot" r="4" fill="var(--brand-2)" filter="drop-shadow(0 0 6px color-mix(in srgb, var(--primary) 90%, transparent))">
            <animateMotion
              dur="7s"
              repeatCount="indefinite"
              path="M0,220 C 40,200 70,210 100,180 S 170,150 210,160 S 290,120 330,100 S 390,70 400,60"
            />
          </circle>
        </g>

        {/* Bars (3D-ish with side face) */}
        {bars.map((h, i) => {
          const barW = 26;
          const gap = 22;
          const x = 30 + i * (barW + gap);
          const y = 240 - (h / 100) * 200;
          const height = 240 - y;
          const depth = 6;
          return (
            <g key={i} className="bar-group" style={{ transformOrigin: `${x + barW / 2}px 240px`, animationDelay: `${300 + i * 90}ms` }}>
              {/* soft glow under bar */}
              <ellipse cx={x + barW / 2} cy={244} rx={barW * 0.9} ry={4} fill="color-mix(in srgb, var(--primary) 35%, transparent)" filter="url(#fv-blur)" />
              {/* side face for 3D */}
              <polygon points={`${x + barW},${y} ${x + barW + depth},${y - depth} ${x + barW + depth},${240 - depth} ${x + barW},240`} fill="color-mix(in srgb, var(--primary) 35%, transparent)" />
              {/* top face */}
              <polygon points={`${x},${y} ${x + depth},${y - depth} ${x + barW + depth},${y - depth} ${x + barW},${y}`} fill="url(#fv-bar-top)" />
              {/* front face */}
              <rect x={x} y={y} width={barW} height={height} rx={3} fill="url(#fv-bar)" />
            </g>
          );
        })}

        {/* Trend line (drawn on load) */}
        <polyline
          className="trend-line"
          points={trendPoints}
          stroke="url(#fv-line)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
          filter="drop-shadow(0 0 6px color-mix(in srgb, var(--primary) 75%, transparent))"
        />

        {/* Trend arrow head at end */}
        <g className="trend-arrow" style={{ transformOrigin: "372px 42px" }}>
          <circle cx="372" cy="42" r="22" fill="url(#fv-arrow-glow)" opacity="0.9" />
          <path
            d="M358 52 L378 32 M378 32 L366 32 M378 32 L378 44"
            stroke="var(--brand-2)"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            filter="drop-shadow(0 0 6px color-mix(in srgb, var(--primary) 90%, transparent))"
          />
        </g>
      </svg>

      {/* Floating 3D currency symbols */}
      <CurrencyOrb symbol="₹" className="coin-inr absolute left-[6%] top-[16%] h-14 w-14 md:h-16 md:w-16" />
      <CurrencyOrb symbol="$" className="coin-usd absolute right-[10%] top-[8%] h-16 w-16 md:h-20 md:w-20" />
      <CurrencyOrb symbol="€" className="coin-eur absolute left-[38%] bottom-[6%] h-14 w-14 md:h-16 md:w-16" />

      {/* Drifting particles */}
      {particles.map((p) => (
        <span
          key={p.key}
          className="particle absolute z-20 rounded-full bg-mint/70"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            boxShadow: "0 0 8px color-mix(in srgb, var(--primary) 90%, transparent)",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}

function CurrencyOrb({ symbol, className }: { symbol: string; className?: string }) {
  return (
    <div className={`currency-orb z-20 ${className ?? ""}`}>
      <div className="relative h-full w-full">
        {/* glow halo */}
        <div className="absolute inset-[-30%] rounded-full bg-[radial-gradient(circle,color-mix(in_oklab,var(--primary)_55%,transparent),transparent_65%)] blur-md" />
        {/* orb body */}
        <div className="relative grid h-full w-full place-items-center rounded-full bg-[radial-gradient(circle_at_30%_28%,var(--brand-2),color-mix(in_oklab,var(--primary)_85%,var(--card))_45%,var(--brand))] shadow-[var(--shadow-glow)]">
          {/* top highlight */}
          <span className="pointer-events-none absolute left-[18%] top-[14%] h-[26%] w-[38%] rounded-full bg-primary-foreground/60 blur-[3px]" />
          {/* subtle reflection below */}
          <span className="pointer-events-none absolute inset-x-[20%] bottom-[10%] h-[10%] rounded-full bg-primary-foreground/20 blur-sm" />
          <span className="relative font-sans text-2xl font-bold text-primary-foreground md:text-3xl">
            {symbol}
          </span>
        </div>
      </div>
    </div>
  );
}

function _AuraLegacy() {
  // legacy aura kept for potential reuse
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
      <div className="aura-glow absolute inset-[6%] rounded-full bg-[radial-gradient(circle_at_center,color-mix(in_oklab,var(--primary)_35%,transparent),color-mix(in_oklab,var(--primary)_6%,transparent)_55%,transparent_72%)] blur-2xl" />

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
            boxShadow: "0 0 8px color-mix(in srgb, var(--primary) 90%, transparent)",
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.dur}s`,
          }}
        />
      ))}
    </div>
  );
}
