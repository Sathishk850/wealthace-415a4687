import { Link, Outlet, useRouterState } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
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
  Sparkles,
  ChevronDown,
  Building2,
  Banknote,
  TrendingUp,
  Shield,
  Landmark,
  Users,
  LineChart,
  ArrowUpCircle,
  ArrowDownCircle,
  ArrowLeftRight,
  Target as TargetIcon,
  PiggyBank,
  Flame,
  CalendarClock,
  FileText,
  Calculator,
  MessageSquare,
  Settings as SettingsIcon,
} from "lucide-react";
import { useState, useEffect } from "react";
import logo from "@/assets/finvista-logo.png";
import { cn } from "@/lib/utils";

type IconType = React.ComponentType<{ className?: string }>;
type NavItem = { to: string; label: string; icon: IconType };
type NavGroup = { to: string; label: string; icon: IconType; children: NavItem[] };

const DASHBOARD: NavItem = { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard };

const NAV_GROUPS: NavGroup[] = [
  {
    to: "/wealth",
    label: "Wealth",
    icon: Wallet,
    children: [
      { to: "/wealth/assets", label: "Assets", icon: Building2 },
      { to: "/wealth/liabilities", label: "Liabilities", icon: Banknote },
      { to: "/wealth/investments", label: "Investments", icon: TrendingUp },
      { to: "/wealth/insurance", label: "Insurance", icon: Shield },
      { to: "/wealth/accounts", label: "Accounts", icon: Landmark },
      { to: "/wealth/family", label: "Family", icon: Users },
    ],
  },
  {
    to: "/money",
    label: "Money",
    icon: Coins,
    children: [
      { to: "/money/cashflow", label: "Cashflow", icon: LineChart },
      { to: "/money/income", label: "Income", icon: ArrowUpCircle },
      { to: "/money/expenses", label: "Expenses", icon: ArrowDownCircle },
      { to: "/money/transactions", label: "Transactions", icon: ArrowLeftRight },
    ],
  },
  {
    to: "/planner",
    label: "Planner",
    icon: CalendarClock,
    children: [
      { to: "/planner/goals", label: "Goals", icon: TargetIcon },
      { to: "/planner/retirement", label: "Retirement", icon: PiggyBank },
      { to: "/planner/fire", label: "FIRE", icon: Flame },
      { to: "/planner/budget", label: "Budget", icon: Wallet },
    ],
  },
  {
    to: "/tools",
    label: "Tools",
    icon: Wrench,
    children: [
      { to: "/tools/reports", label: "Reports", icon: FileText },
      { to: "/tools/sip", label: "SIP Calculator", icon: TrendingUp },
      { to: "/tools/emi", label: "EMI Calculator", icon: Calculator },
      { to: "/tools/ai-insights", label: "AI Insights", icon: Sparkles },
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
        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
        active
          ? "bg-gradient-to-r from-mint/25 to-mint/5 text-mint shadow-[inset_0_0_0_1px_color-mix(in_oklab,var(--mint)_30%,transparent)]"
          : "text-sidebar-foreground/85 hover:text-sidebar-foreground hover:bg-sidebar-accent",
      )}
    >
      <Icon className="size-[18px] shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

function SubLink({
  item,
  active,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  onNavigate?: () => void;
}) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] transition-all",
        active
          ? "bg-gradient-to-r from-mint/30 to-mint/10 text-foreground"
          : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
      )}
    >
      <Icon className="size-3.5 shrink-0 opacity-80" />
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
  const activeGroup =
    NAV_GROUPS.find((g) => g.children.some((c) => isActive(c.to)))?.to ?? null;
  const [openKey, setOpenKey] = useState<string | null>(activeGroup);

  useEffect(() => {
    if (activeGroup) setOpenKey(activeGroup);
  }, [activeGroup]);

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="border-b border-sidebar-border px-4 py-4">
        <Brand />
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-2 py-3">
        <div className="mb-3 border-b border-sidebar-border pb-3">
          <NavLink item={DASHBOARD} active={pathname === "/"} onNavigate={onNavigate} />
        </div>
        {NAV_GROUPS.map((g) => {
          const open = openKey === g.to;
          const within = g.children.some((c) => isActive(c.to));
          const Icon = g.icon;
          return (
            <div key={g.to} className="select-none">
              <button
                type="button"
                onClick={() => setOpenKey(open ? null : g.to)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all",
                  "text-sidebar-foreground/85 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                  (open || within) && "bg-sidebar-accent text-sidebar-foreground",
                )}
                aria-expanded={open}
              >
                <Icon className={cn("size-[18px] shrink-0", within && "text-mint")} />
                <span className="flex-1 text-left">{g.label}</span>
                <motion.span
                  animate={{ rotate: open ? 180 : 0 }}
                  transition={{ duration: 0.2 }}
                >
                  <ChevronDown className="size-4 opacity-70" />
                </motion.span>
              </button>
              <AnimatePresence initial={false}>
                {open && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="overflow-hidden"
                  >
                    <div className="mt-1 ml-3 space-y-0.5 border-l border-sidebar-border py-1 pl-3">
                      {g.children.map((c) => (
                        <SubLink
                          key={c.to}
                          item={c}
                          active={isActive(c.to)}
                          onNavigate={onNavigate}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>
      <div className="flex flex-col gap-1 border-t border-sidebar-border px-2 py-2">
        <NavLink
          item={{ to: "/feedback", label: "Feedback", icon: MessageSquare }}
          active={isActive("/feedback")}
          onNavigate={onNavigate}
        />
        <NavLink
          item={{ to: "/settings", label: "Settings", icon: SettingsIcon }}
          active={isActive("/settings")}
          onNavigate={onNavigate}
        />
      </div>
    </aside>
  );
}


function TopBar() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  }, [theme]);
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
          aria-label="Notifications"
          className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-surface hover:text-foreground"
        >
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-mint" />
        </button>
        <button
          aria-label="Preview"
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
        <Link
          to="/auth"
          search={{ mode: "signin" }}
          className="ml-1 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/90 transition hover:text-foreground"
        >
          Sign in
        </Link>
        <Link
          to="/auth"
          search={{ mode: "signup" }}
          className="rounded-lg bg-mint px-3.5 py-1.5 text-sm font-semibold text-mint-foreground shadow-[0_0_0_1px_rgba(20,216,207,0.45)] transition hover:bg-primary-hover"
        >
          Sign up
        </Link>
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
