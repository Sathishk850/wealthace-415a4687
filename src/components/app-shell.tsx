import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Coins,
  Target,
  Wrench,
  Bell,
  Search,
  Settings,
  LogOut,
  Sparkles,
  TrendingUp,
  ArrowLeftRight,
  Flame,
  Menu,
  X,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import logo from "@/assets/finvista-logo.png";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

const PRIMARY_NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/wealth", label: "Wealth", icon: Wallet },
  { to: "/money", label: "Money", icon: Coins },
  { to: "/planner", label: "Planner", icon: Target },
  { to: "/tools", label: "Tools", icon: Wrench },
];

const MOBILE_TABS: NavItem[] = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/money/transactions", label: "Tx", icon: ArrowLeftRight },
  { to: "/wealth", label: "Wealth", icon: Wallet },
  { to: "/dashboard/networth", label: "NW", icon: TrendingUp },
  { to: "/planner/fire", label: "FIRE", icon: Flame },
];

function NavLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={[
        "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-sidebar-accent text-mint shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--mint)_30%,transparent)]"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
      ].join(" ")}
    >
      <Icon className={["h-5 w-5 shrink-0", active ? "text-mint" : ""].join(" ")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}

function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src={logo} alt="FinVista" width={36} height={36} className="h-9 w-9 rounded-lg" />
      <div className="flex flex-col leading-tight">
        <span className="font-display text-base font-bold tracking-tight text-foreground">
          FinVista
        </span>
        <span className="text-[10px] font-medium uppercase tracking-[0.18em] text-mint/80">
          Know your worth
        </span>
      </div>
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <aside className="flex h-full w-64 flex-col gap-6 border-r border-sidebar-border bg-sidebar px-4 py-5">
      <Brand />
      <nav className="flex flex-col gap-1">
        {PRIMARY_NAV.map((item) => (
          <NavLink key={item.to} item={item} onNavigate={onNavigate} />
        ))}
      </nav>
      <div className="mt-auto rounded-2xl border border-mint/20 bg-gradient-to-br from-mint/10 to-accent/10 p-4">
        <div className="flex items-center gap-2 text-mint">
          <Sparkles className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">AI Insights</span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Your financial health score improved 4% this month. Tap for details.
        </p>
      </div>
    </aside>
  );
}

function TopBar({ onOpenMenu }: { onOpenMenu: () => void }) {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-background/80 px-4 py-3 backdrop-blur-xl md:px-6">
      <button
        onClick={onOpenMenu}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border bg-surface md:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-4 w-4" />
      </button>
      <div className="md:hidden">
        <Brand />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            placeholder="Search assets, transactions, goals..."
            className="h-10 w-72 rounded-xl border border-border bg-surface pl-9 pr-3 text-sm placeholder:text-muted-foreground/70 focus:border-mint/50 focus:outline-none focus:ring-2 focus:ring-mint/30"
          />
        </div>
        <IconButton label="Reminders"><Bell className="h-4 w-4" /></IconButton>
        <IconButton label="Settings"><Settings className="h-4 w-4" /></IconButton>
        <div className="ml-1 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-mint to-accent text-xs font-bold text-mint-foreground">
          RS
        </div>
        <IconButton label="Sign out"><LogOut className="h-4 w-4" /></IconButton>
      </div>
    </header>
  );
}

function IconButton({ children, label }: { children: ReactNode; label: string }) {
  return (
    <button
      aria-label={label}
      className="grid h-9 w-9 place-items-center rounded-lg border border-border bg-surface text-muted-foreground transition hover:border-mint/40 hover:text-foreground"
    >
      {children}
    </button>
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
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="flex">
        <div className="sticky top-0 hidden h-screen md:block">
          <Sidebar />
        </div>

        {menuOpen && (
          <div className="fixed inset-0 z-40 md:hidden">
            <div
              className="absolute inset-0 bg-background/70 backdrop-blur-sm"
              onClick={() => setMenuOpen(false)}
            />
            <div className="absolute inset-y-0 left-0 w-72">
              <Sidebar onNavigate={() => setMenuOpen(false)} />
              <button
                onClick={() => setMenuOpen(false)}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg bg-surface text-foreground"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 pb-24 md:pb-0">
          <TopBar onOpenMenu={() => setMenuOpen(true)} />
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomTabs />
    </div>
  );
}