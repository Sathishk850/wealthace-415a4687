import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Coins,
  Wrench,
  Eye,
  Bell,
  Sun,
  Moon,
  CalendarClock,
} from "lucide-react";
import { useState, useEffect } from "react";
import logo from "@/assets/finvista-logo.png";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type IconType = React.ComponentType<{ className?: string }>;
type NavItem = { to: string; label: string; icon: IconType };

const TOP_TABS: NavItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/wealth", label: "Wealth", icon: Wallet },
  { to: "/money", label: "Money", icon: Coins },
  { to: "/planner", label: "Planner", icon: CalendarClock },
  { to: "/tools", label: "Tools", icon: Wrench },
];

const MOBILE_TABS: NavItem[] = [
  { to: "/wealth", label: "Wealth", icon: Wallet },
  { to: "/money", label: "Money", icon: Coins },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/planner", label: "Planner", icon: CalendarClock },
  { to: "/tools", label: "Tools", icon: Wrench },
];

function Brand() {
  return (
    <Link to="/dashboard" className="flex items-center gap-2.5">
      <img src={logo} alt="FinTrack" width={36} height={36} className="h-9 w-9 rounded-lg" />
      <div className="flex flex-col leading-tight">
        <span className="font-display text-[17px] font-bold tracking-tight text-foreground">
          FinTrack
        </span>
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
          Know Your Worth
        </span>
      </div>
    </Link>
  );
}

function TopBar() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [privacy, setPrivacy] = useState(true);
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (u: string) => pathname === u || pathname.startsWith(u + "/");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-surface-2/90 px-4 py-2.5 backdrop-blur-xl md:px-6">
      <Brand />
      <nav className="hidden flex-1 items-center justify-center gap-1 md:flex">
        {TOP_TABS.map((t) => {
          const Icon = t.icon;
          const active = isActive(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition",
                active ? "text-mint" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {active && (
                <span className="absolute inset-x-3 -bottom-[10px] h-[2px] rounded-full bg-mint" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2 md:ml-0">
        <button
          type="button"
          onClick={() => setPrivacy((v) => !v)}
          className="inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium text-muted-foreground transition hover:text-foreground"
          aria-label="Privacy mode"
        >
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">Privacy</span>
          <span
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition",
              privacy ? "bg-mint" : "bg-surface",
            )}
          >
            <span
              className={cn(
                "absolute top-0.5 h-4 w-4 rounded-full bg-background shadow transition-all",
                privacy ? "left-[18px]" : "left-0.5",
              )}
            />
          </span>
        </button>
        <button
          aria-label="Toggle theme"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-surface hover:text-foreground"
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <button
          type="button"
          onClick={handleSignOut}
          aria-label="Profile"
          title="Profile · Sign out"
          className="ml-1 grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-mint/40 bg-mint/10 text-mint transition hover:bg-mint/20"
        >
          <img
            src="https://i.pravatar.cc/64?img=12"
            alt="Account"
            className="h-full w-full object-cover"
          />
        </button>
      </div>
    </header>
  );
}

function MobileBottomTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl md:hidden">
      {MOBILE_TABS.map((tab) => {
        const active = tab.to === "/" ? pathname === "/" : pathname.startsWith(tab.to);
        const Icon = tab.icon;
        return (
          <Link
            key={tab.to}
            to={tab.to}
            className={[
              "flex flex-col items-center gap-1 py-1.5 text-[10px] font-semibold uppercase tracking-wider",
              active ? "text-mint" : "text-muted-foreground",
            ].join(" ")}
          >
            <Icon className="h-5 w-5" />
            <span>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export function AppShell() {
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="pb-24 md:pb-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
      <MobileBottomTabs />
    </div>
  );
}