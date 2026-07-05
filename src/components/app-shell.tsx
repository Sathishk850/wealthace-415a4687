import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Coins,
  Wrench,
  Eye,
  EyeOff,
  Sun,
  Moon,
  CalendarClock,
  User,
  Settings as SettingsIcon,
  MessageSquare,
  Sparkles,
  LogOut,
} from "lucide-react";
import { useState, useEffect } from "react";
import logo from "@/assets/finvista-logo.png";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { NotificationBell } from "@/components/notification-bell";
import { usePrivacy } from "@/lib/privacy";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
      <img src={logo} alt="FinVista" width={36} height={36} className="h-9 w-9 rounded-lg" />
      <div className="flex flex-col leading-tight">
        <span className="font-display text-[17px] font-bold tracking-tight text-foreground">
          FinVista
        </span>
        <span className="text-[10px] font-medium tracking-wide text-muted-foreground">
          Know Your Worth
        </span>
      </div>
    </Link>
  );
}

function TopBar() {
  const [theme, setTheme] = useState<"dark" | "light">(() => {
    if (typeof window === "undefined") return "dark";
    const saved = window.localStorage.getItem("fv-theme");
    return saved === "light" ? "light" : "dark";
  });
  const { enabled: privacy, toggle: togglePrivacy } = usePrivacy();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (u: string) => pathname === u || pathname.startsWith(u + "/");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try { window.localStorage.setItem("fv-theme", theme); } catch {}
  }, [theme]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate({ to: "/", replace: true });
  };

  const iconBtn =
    "grid h-9 w-9 place-items-center rounded-lg transition-all duration-200 text-muted-foreground hover:bg-[rgba(33,219,210,0.12)] hover:text-[#21DBD2]";
  const iconBtnActive =
    "grid h-9 w-9 place-items-center rounded-lg transition-all duration-200 bg-[rgba(33,219,210,0.12)] text-[#21DBD2]";

  return (
    <header className="sticky top-0 z-30 flex items-center gap-4 border-b border-border bg-surface-2/90 px-4 py-2.5 backdrop-blur-xl md:px-6">
      <Brand />
      <nav className="hidden flex-1 items-center justify-center gap-1 lg:flex">
        {TOP_TABS.map((t) => {
          const Icon = t.icon;
          const active = isActive(t.to);
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "relative inline-flex items-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-medium transition",
                active ? "text-[#21DBD2]" : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{t.label}</span>
              {active && (
                <span className="absolute inset-x-3 -bottom-[10px] h-[2px] rounded-full bg-[#21DBD2]" />
              )}
            </Link>
          );
        })}
      </nav>
      <div className="ml-auto flex items-center gap-2 lg:ml-0">
        <button
          type="button"
          onClick={togglePrivacy}
          className={privacy ? iconBtnActive : iconBtn}
          aria-label={privacy ? "Privacy on" : "Privacy off"}
          title={privacy ? "Privacy on" : "Privacy off"}
        >
          {privacy ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
        <NotificationBell />
        <button
          aria-label="Toggle theme"
          onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
          className={iconBtnActive}
          title={theme === "dark" ? "Dark mode" : "Light mode"}
        >
          {theme === "dark" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label="Profile menu"
              className="ml-1 grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[#21DBD2]/40 bg-[rgba(33,219,210,0.10)] text-[#21DBD2] transition hover:bg-[rgba(33,219,210,0.18)]"
            >
              <img
                src="https://i.pravatar.cc/64?img=12"
                alt="Account"
                className="h-full w-full object-cover"
              />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate({ to: "/profile" })}>
              <User className="mr-2 h-4 w-4" /> My Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/settings" })}>
              <SettingsIcon className="mr-2 h-4 w-4" /> Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/feedback" })}>
              <MessageSquare className="mr-2 h-4 w-4" /> Feedback
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => navigate({ to: "/whats-new" })}>
              <Sparkles className="mr-2 h-4 w-4" /> What's New
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" /> Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

function MobileBottomTabs() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-background/95 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-xl lg:hidden">
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
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="pb-24 lg:pb-0">
        <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
          <Outlet />
        </div>
      </main>
      <MobileBottomTabs />
      <Toaster />
    </div>
  );
}