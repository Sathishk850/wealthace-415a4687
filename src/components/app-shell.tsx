import { Link, Outlet, useRouterState } from "@tanstack/react-router";
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
} from "lucide-react";
import { useState, useEffect } from "react";
import logo from "@/assets/finvista-logo.png";

type IconType = React.ComponentType<{ className?: string }>;
type NavItem = { to: string; label: string; icon: IconType };
type NavGroup = { to: string; label: string; icon: IconType; children: NavItem[] };

const DASHBOARD: NavItem = { to: "/", label: "Dashboard", icon: LayoutDashboard };

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
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/planner", label: "Planner", icon: CalendarClock },
  { to: "/tools", label: "Tools", icon: Wrench },
];

function NavLink({
  item,
  variant = "sub",
  onNavigate,
}: {
  item: NavItem;
  variant?: "top" | "sub";
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const active = item.to === "/" ? pathname === "/" : pathname === item.to;
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      onClick={onNavigate}
      className={[
        "group flex items-center gap-3 px-3 py-2 text-sm font-medium transition-all",
        active
          ? variant === "top"
            ? "nav-active text-foreground"
            : "submenu-active text-foreground"
          : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground rounded-xl",
      ].join(" ")}
    >
      <Icon className={["h-4 w-4 shrink-0", active ? "text-mint" : "text-muted-foreground"].join(" ")} />
      <span className="truncate">{item.label}</span>
    </Link>
  );
}



function NavGroupItem({
  group,
  expanded,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  expanded: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const within = pathname.startsWith(group.to);
  const Icon = group.icon;
  const isExpanded = expanded || within;
  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        className={[
          "flex w-full items-center gap-3 px-3 py-2.5 text-sm font-semibold transition-all",
          within
            ? "nav-active"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60 hover:text-foreground rounded-xl",
        ].join(" ")}
        aria-expanded={isExpanded}
      >
        <Icon className={["h-5 w-5 shrink-0", within ? "text-mint" : ""].join(" ")} />
        <span className="flex-1 truncate text-left">{group.label}</span>
        <ChevronDown
          className={[
            "h-4 w-4 shrink-0 transition-transform",
            isExpanded ? "rotate-180" : "",
            within ? "text-mint" : "text-muted-foreground",
          ].join(" ")}
        />
      </button>
      {isExpanded && (
        <div className="relative mt-1 ml-5 flex flex-col gap-0.5 border-l border-sidebar-border pl-3">
          {group.children.map((c) => (
            <NavLink key={c.to} item={c} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  );
}


function Brand() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <img src={logo} alt="FinTrack" width={36} height={36} className="h-9 w-9 rounded-lg" />
      <div className="flex flex-col leading-tight">
        <span className="font-display text-base font-bold tracking-tight text-foreground">
          FinTrack
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
  const activeGroup = NAV_GROUPS.find((g) => pathname.startsWith(g.to))?.to ?? null;
  const [expandedGroup, setExpandedGroup] = useState<string | null>(activeGroup);

  // Auto-expand the group matching the current route when navigation changes.
  useEffect(() => {
    setExpandedGroup((current) => {
      if (activeGroup) return activeGroup;
      return current;
    });
  }, [activeGroup]);

  return (
    <aside className="flex h-full w-64 flex-col gap-5 border-r border-sidebar-border bg-sidebar px-4 py-5">
      <Brand />
      <nav className="flex flex-col gap-1 overflow-y-auto pr-1">
        <NavLink item={DASHBOARD} variant="top" onNavigate={onNavigate} />
        {NAV_GROUPS.map((g) => (
          <NavGroupItem
            key={g.to}
            group={g}
            expanded={expandedGroup === g.to}
            onToggle={() =>
              setExpandedGroup((current) => (current === g.to ? null : g.to))
            }
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="glass-card mt-auto rounded-2xl p-4">
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
        <button className="ml-1 rounded-lg px-3 py-1.5 text-sm font-medium text-foreground/90 transition hover:text-foreground">
          Sign in
        </button>
        <button className="rounded-lg bg-mint px-3.5 py-1.5 text-sm font-semibold text-mint-foreground shadow-[0_0_0_1px_rgba(20,216,207,0.45)] transition hover:bg-primary-hover">
          Sign up
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
