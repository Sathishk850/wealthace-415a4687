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
import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { BrandMark, BrandIcon } from "@/components/brand/brand-mark";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Toaster } from "@/components/ui/sonner";
import { NotificationBell } from "@/components/notification-bell";
import { QuickNav } from "@/components/quick-nav";
import { usePrivacy } from "@/lib/privacy";
import { SessionExpiredDialog, markIntentionalSignOut } from "@/lib/session-expired";
import { PinReminder } from "@/components/pin-reminder";
import { AlertsDigest } from "@/components/alerts-digest";
import { RemindersBanner } from "@/components/reminders-banner";

import { InstallAppButton } from "@/components/pwa/install-button";
import { PwaProvider } from "@/components/pwa/pwa-provider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function useProfileAvatar() {
  const userQ = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => (await supabase.auth.getUser()).data.user,
  });
  const profileQ = useQuery({
    queryKey: ["profile", userQ.data?.id],
    enabled: !!userQ.data?.id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("user_id", userQ.data!.id)
        .maybeSingle();
      return data;
    },
  });
  const [signed, setSigned] = useState<string | null>(null);
  const path = profileQ.data?.avatar_url ?? null;
  useEffect(() => {
    let off = false;
    if (!path) { setSigned(null); return; }
    if (/^https?:\/\//i.test(path)) { setSigned(path); return; }
    (async () => {
      const { data } = await supabase.storage.from("avatars").createSignedUrl(path, 60 * 60);
      if (!off) setSigned(data?.signedUrl ?? null);
    })();
    return () => { off = true; };
  }, [path]);
  const name = profileQ.data?.full_name?.trim() || "";
  const email = userQ.data?.email ?? "";
  const letter = (name[0] || email[0] || "U").toUpperCase();
  return { url: signed, letter };
}

const ProfileMenuTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>((props, ref) => {
  const { url, letter } = useProfileAvatar();
  return (
    <button
      ref={ref}
      type="button"
      aria-label="Profile menu"
      {...props}
      className="ml-1 grid h-9 w-9 place-items-center overflow-hidden rounded-full border border-[#21DBD2]/40 bg-[rgba(33,219,210,0.10)] text-[#21DBD2] transition hover:bg-[rgba(33,219,210,0.18)]"
    >
      {url ? (
        <img src={url} alt="Account" className="h-full w-full object-cover" />
      ) : (
        <span className="text-sm font-semibold">{letter}</span>
      )}
    </button>
  );
});
ProfileMenuTrigger.displayName = "ProfileMenuTrigger";

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
    <>
      <Link to="/dashboard" aria-label="Wealth Ace" className="sm:hidden">
        <BrandIcon className="h-9 w-9" />
      </Link>
      <span className="hidden sm:block">
        <BrandMark to="/dashboard" size="md" />
      </span>
    </>
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
  const queryClient = useQueryClient();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (u: string) => pathname === u || pathname.startsWith(u + "/");

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
    try { window.localStorage.setItem("fv-theme", theme); } catch {}
  }, [theme]);

  const handleSignOut = async () => {
    markIntentionalSignOut();
    // Cancel in-flight queries and clear cache BEFORE signOut so we don't
    // storm the cleared session with 401s or leak protected data on Back.
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", search: { mode: "signin" } as never, replace: true });
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
        <QuickNav />
        <InstallAppButton />
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
            <ProfileMenuTrigger />
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
          <RemindersBanner />
          <Outlet />
        </div>
      </main>
      <MobileBottomTabs />
      <Toaster />
      <SessionExpiredDialog />
      <PinReminder />
      <AlertsDigest />

      <PwaProvider />
    </div>
  );
}