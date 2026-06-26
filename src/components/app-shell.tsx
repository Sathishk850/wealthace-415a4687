import { Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Coins,
  Wrench,
  Bell,
  Eye,
  Sun,
  Moon,
  PanelLeft,
  Search,
  User,
  Building2,
  Banknote,
  TrendingUp,
  LineChart,
  ArrowLeftRight,
  Target as TargetIcon,
  PiggyBank,
  CalendarClock,
  FileText,
  Calculator,
  PlusCircle,
  BarChart3,
  Activity,
} from "lucide-react";
import { useState, useEffect } from "react";
import logo from "@/assets/finvista-logo.png";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

type IconType = React.ComponentType<{ className?: string }>;
type NavItem = { to: string; label: string; icon: IconType };
type NavSection = { label: string; items: NavItem[] };

const DASHBOARD: NavItem = { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard };

const NAV_SECTIONS: NavSection[] = [
  {
    label: "Wealth",
    items: [
      { to: "/wealth/assets", label: "Assets", icon: Building2 },
      { to: "/wealth/investments", label: "Investments", icon: TrendingUp },
      { to: "/wealth/liabilities", label: "Liabilities", icon: Banknote },
      { to: "/wealth", label: "Net Worth", icon: BarChart3 },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/money/income", label: "Income", icon: PlusCircle },
      { to: "/money/expenses", label: "Expenses", icon: PlusCircle },
      { to: "/money/transactions", label: "Transactions", icon: ArrowLeftRight },
      { to: "/money/cashflow", label: "Cash Flow", icon: Activity },
      { to: "/planner/budget", label: "Budget", icon: Wallet },
    ],
  },
  {
    label: "Planner",
    items: [
      { to: "/planner/goals", label: "Goals", icon: TargetIcon },
      { to: "/tools/sip", label: "SIP Planner", icon: LineChart },
      { to: "/tools/emi", label: "EMI Calculator", icon: Calculator },
      { to: "/planner/retirement", label: "Retirement", icon: PiggyBank },
    ],
  },
  {
    label: "Tools",
    items: [
      { to: "/tools/reports", label: "Reports", icon: FileText },
      { to: "/tools/alerts", label: "Alerts", icon: Bell },
      { to: "/tools/documents", label: "Documents", icon: FileText },
    ],
  },
];

const MOBILE_TABS: NavItem[] = [
  { to: "/wealth", label: "Wealth", icon: Wallet },
  { to: "/money", label: "Money", icon: Coins },
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/planner", label: "Planner", icon: CalendarClock },
  { to: "/tools", label: "Tools", icon: Wrench },
];

function NavLink({
  item,
  onNavigate,
  active,
}: {
  item: NavItem;
  onNavigate?: () => void;
  active: boolean;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-[13.5px] font-medium transition-all",
        active
          ? "bg-mint/15 text-mint shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--mint)_35%,transparent)]"
          : "text-sidebar-foreground hover:text-foreground hover:bg-sidebar-accent",
      )}
    >
      <Icon className={cn("size-[17px] shrink-0", active ? "text-mint" : "text-mint/85")} />
      <span>{item.label}</span>
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
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = (u: string) =>
    u === "/" ? pathname === "/" : pathname === u || pathname.startsWith(u + "/");
  const [privacy, setPrivacy] = useState(true);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Brand />
      </div>
      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 py-4">
        <NavLink
          item={DASHBOARD}
          active={isActive("/dashboard")}
          onNavigate={onNavigate}
        />
        {NAV_SECTIONS.map((section) => (
          <div key={section.label} className="flex flex-col gap-1">
            <div className="px-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/80">
              {section.label}
            </div>
            {section.items.map((item) => (
              <NavLink
                key={item.to + item.label}
                item={item}
                active={isActive(item.to)}
                onNavigate={onNavigate}
              />
            ))}
          </div>
        ))}
      </nav>
      <div className="border-t border-sidebar-border px-4 py-3">
        <button
          type="button"
          onClick={() => setPrivacy((p) => !p)}
          className="flex w-full items-center justify-between gap-3 text-[13px] font-medium text-sidebar-foreground transition hover:text-foreground"
          aria-pressed={privacy}
        >
          <span className="flex items-center gap-2">
            <Eye className="size-4 text-mint/85" />
            Privacy Mode
          </span>
          <span
            className={cn(
              "relative inline-flex h-5 w-9 items-center rounded-full transition",
              privacy ? "bg-mint" : "bg-muted",
            )}
          >
            <span
              className={cn(
                "inline-block h-4 w-4 transform rounded-full bg-background shadow transition",
                privacy ? "translate-x-[18px]" : "translate-x-0.5",
              )}
            />
          </span>
        </button>
      </div>
    </aside>
  );
}


function TopBar() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const navigate = useNavigate();
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
    <header className="glass-card sticky top-0 z-30 flex items-center gap-3 border-b border-border px-4 py-3 md:px-6">
      <div className="md:hidden">
        <Brand />
      </div>
      <button
        aria-label="Toggle sidebar"
        className="hidden h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-surface hover:text-foreground md:grid"
      >
        <PanelLeft className="h-4 w-4" />
      </button>
      <div className="ml-auto flex items-center gap-1.5">
        <button
          aria-label="Search"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-surface hover:text-foreground"
        >
          <Search className="h-4 w-4" />
        </button>
        <button
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-surface hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-mint" />
        </button>
        <button
          aria-label="Privacy mode"
          title="Privacy mode"
          className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-surface hover:text-foreground"
        >
          <Eye className="h-4 w-4" />
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
          className="ml-1 grid h-9 w-9 place-items-center rounded-full border border-mint/40 bg-mint/10 text-mint transition hover:bg-mint/20"
        >
          <User className="h-4 w-4" />
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
      <div className="flex">
        <div className="sticky top-0 hidden h-screen md:block">
          <Sidebar />
        </div>

        <main className="flex-1 pb-24 md:pb-0">
          <TopBar />
          <div className="mx-auto w-full max-w-7xl px-4 py-6 md:px-8 md:py-8">
            <Outlet />
          </div>
        </main>
      </div>
      <MobileBottomTabs />
    </div>
  );
}
