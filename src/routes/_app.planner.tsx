import { createFileRoute } from "@tanstack/react-router";
import { smartXAxisProps } from "@/lib/chart-axis";
import { useMemo, useState } from "react";
import { ClearButton } from "@/components/clear-button";
import {
  Target,
  Flame,
  Plus,
  TrendingUp,
  PiggyBank,
  Calendar,
  Sparkles,
  GraduationCap,
  Home,
  Car,
  Plane,
  Shield,
  CheckCircle2,
  Briefcase,
  Heart,
  Pencil,
  Trash2,
  Loader2,
  AlertCircle,
  Wallet,
  Info,
  ChevronDown,
  ChevronUp,
  Landmark,
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  LineChart,
  Line,
  Legend,
} from "recharts";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { TextTabs } from "@/components/text-tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  GOAL_TYPES,
  GOAL_TYPE_LABEL,
  fireNumber,
  inr,
  inrFull,
  projectCorpus,
  retirementCorpusNeeded,
  useFirePlan,
  useDeleteGoal,
  useGoals,
  useRetirementPlan,
  useSaveFirePlan,
  useSaveRetirementPlan,
  useUpsertGoal,
  yearsToReach,
  type Goal,
  type GoalType,
  type PlannerSettings,
} from "@/lib/planner-api";
import { useInvestments } from "@/lib/wealth-api";
import RetirementPlanTab from "@/components/planner/retirement-plan-tab";
import FIREPlanTab from "@/components/planner/fire-plan-tab";

export const Route = createFileRoute("/_app/planner")({
  head: () => ({
    meta: [
      { title: "Planner · Wealth Ace" },
      { name: "description", content: "Set goals, budgets and your FIRE roadmap." },
    ],
  }),
  component: Planner,
});

const ICON_BY_TYPE: Record<GoalType, React.ComponentType<{ className?: string }>> = {
  emergency_fund: Shield,
  vehicle: Car,
  house: Home,
  education: GraduationCap,
  wedding: Heart,
  vacation: Plane,
  business: Briefcase,
  custom: Target,
};

function Planner() {
  const [goalDialog, setGoalDialog] = useState<{ open: boolean; goal?: Goal }>({ open: false });
  const [tab, setTab] = useState<"overview" | "goals" | "retirement" | "fire">("overview");

  return (
    <TooltipProvider>
      <PageHeader
        title="Planner"
        description="Goals, retirement and your FIRE roadmap."
        actions={
          <Button
            size="sm"
            className="gap-1.5 bg-mint text-mint-foreground hover:bg-mint/90"
            onClick={() => setGoalDialog({ open: true })}
          >
            <Plus className="h-4 w-4" /> Add Goal
          </Button>
        }
      />

      <TextTabs
        className="mb-6"
        items={[
          { value: "overview", label: "Overview" },
          { value: "goals", label: "Goals" },
          { value: "retirement", label: "Retirement" },
          { value: "fire", label: "FIRE" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "overview" && <OverviewView onAddGoal={() => setGoalDialog({ open: true })} />}
      {tab === "goals" && (
        <GoalsView
          onAddGoal={() => setGoalDialog({ open: true })}
          onEditGoal={(g) => setGoalDialog({ open: true, goal: g })}
        />
      )}
      {tab === "retirement" && <RetirementPlanTab />}
      {tab === "fire" && <FIREPlanTab />}

      <GoalDialog
        open={goalDialog.open}
        onOpenChange={(open) => setGoalDialog({ open, goal: open ? goalDialog.goal : undefined })}
        goal={goalDialog.goal}
      />
    </TooltipProvider>
  );
}

/* ---------- KPI ---------- */
function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  tone = "mint",
  tooltip,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: string;
  tone?: "mint" | "positive" | "negative" | "warn";
  tooltip?: string;
}) {
  const map = {
    mint: "bg-mint/10 text-mint",
    positive: "bg-success/10 text-success",
    negative: "bg-destructive/10 text-destructive",
    warn: "bg-amber-500/10 text-amber-400",
  } as const;
  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start justify-between">
        <div className="inline-flex items-center gap-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/70 hover:text-foreground">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${map[tone]}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 font-display text-2xl font-bold tracking-tight">{value}</div>
      {delta && <div className="mt-1 text-xs text-muted-foreground">{delta}</div>}
    </div>
  );
}

/* ---------- Common states ---------- */
function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-border bg-card p-10 text-muted-foreground">
      <Loader2 className="mb-2 h-5 w-5 animate-spin text-mint" />
      <div className="text-xs">{label}</div>
    </div>
  );
}
function ErrorBlock({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-5 text-sm text-destructive">
      <div className="mb-2 flex items-center gap-2 font-semibold">
        <AlertCircle className="h-4 w-4" /> Something went wrong
      </div>
      <p className="text-xs opacity-80">{error.message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>Retry</Button>
      )}
    </div>
  );
}
function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-card/40 p-10 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-xl bg-mint/10 text-mint">
        <Icon className="h-5 w-5" />
      </div>
      <div className="mt-3 font-display text-base font-semibold">{title}</div>
      <p className="mt-1 max-w-sm text-xs text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

/* ---------- helpers ---------- */
function goalProgressPct(g: Goal) {
  if (g.target_amount <= 0) return 0;
  return Math.min(100, Math.round((g.saved_amount / g.target_amount) * 100));
}
function goalTone(g: Goal): "positive" | "warn" | "mint" {
  const pct = goalProgressPct(g);
  if (pct >= 80) return "positive";
  if (g.target_date) {
    const days = (new Date(g.target_date).getTime() - Date.now()) / 86400000;
    if (days < 180 && pct < 70) return "warn";
  }
  return "mint";
}
function fmtDate(iso: string | null) {
  if (!iso) return "No deadline";
  return new Date(iso).toLocaleDateString("en-IN", { month: "short", year: "numeric" });
}
/** Blank first-time state — no assumptions or defaults. */
const BLANK_SETTINGS: Omit<PlannerSettings, "user_id" | "created_at" | "updated_at"> = {
  current_age: 0,
  retirement_age: 0,
  life_expectancy: 0,
  monthly_expense: 0,
  inflation_pct: 0,
  pre_return_pct: 0,
  post_return_pct: 0,
  current_corpus: 0,
  monthly_sip: 0,
  withdrawal_rate_pct: 0,
  retirement_plan_saved: false,
  fire_plan_saved: false,
};
const RETIREMENT_CLEAR_KEY = "finvista.planner.retirement.cleared";
const FIRE_CLEAR_KEY = "finvista.planner.fire.cleared";

function readClearMarker(key: string) {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(key) === "1";
}
function writeClearMarker(key: string, value: boolean) {
  if (typeof window === "undefined") return;
  if (value) window.localStorage.setItem(key, "1");
  else window.localStorage.removeItem(key);
  window.sessionStorage.removeItem(key);
}

/* ---------- OVERVIEW ---------- */
function OverviewView({ onAddGoal }: { onAddGoal: () => void }) {
  const goalsQ = useGoals();
  const retQ = useRetirementPlan();
  const fireQ = useFirePlan();

  if (goalsQ.isLoading || retQ.isLoading || fireQ.isLoading) return <LoadingBlock label="Loading planner…" />;
  if (goalsQ.error) return <ErrorBlock error={goalsQ.error as Error} onRetry={() => goalsQ.refetch()} />;
  if (retQ.error) return <ErrorBlock error={retQ.error as Error} onRetry={() => retQ.refetch()} />;
  if (fireQ.error) return <ErrorBlock error={fireQ.error as Error} onRetry={() => fireQ.refetch()} />;

  const goals = goalsQ.data ?? [];
  const retirementPlan = retQ.data ?? null;
  const firePlan = fireQ.data ?? null;
  const totalSaved = goals.reduce((s, g) => s + g.saved_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const onTrack = goals.filter((g) => goalProgressPct(g) >= 50).length;

  const retirementSettings: PlannerSettings = {
    user_id: "",
    ...BLANK_SETTINGS,
    ...(retirementPlan ?? {}),
    created_at: "",
    updated_at: "",
  };
  const fireSettings: PlannerSettings = {
    user_id: "",
    ...BLANK_SETTINGS,
    ...(firePlan ?? {}),
    created_at: "",
    updated_at: "",
  };

  const canComputeRet = !!retirementPlan && retirementSettings.current_age > 0 && retirementSettings.retirement_age > retirementSettings.current_age && retirementSettings.monthly_expense > 0;
  const retirementTarget = canComputeRet ? retirementCorpusNeeded(retirementSettings) : 0;
  const yearsToRet = canComputeRet ? Math.max(0, retirementSettings.retirement_age - retirementSettings.current_age) : 0;
  const retirementProjected = canComputeRet
    ? projectCorpus(retirementSettings.current_corpus, retirementSettings.monthly_sip, retirementSettings.pre_return_pct, yearsToRet)
    : 0;
  const retPct = retirementTarget > 0 ? Math.min(100, (retirementProjected / retirementTarget) * 100) : 0;

  const canComputeFire = !!firePlan && fireSettings.current_age > 0 && fireSettings.monthly_expense > 0 && fireSettings.current_corpus > 0 && fireSettings.withdrawal_rate_pct > 0 && fireSettings.pre_return_pct > 0 && fireSettings.inflation_pct > 0;
  const fireTarget = canComputeFire ? fireNumber(fireSettings) : 0;
  const yrsToFire = canComputeFire
    ? yearsToReach(fireSettings.current_corpus, fireSettings.monthly_sip, fireSettings.pre_return_pct, fireTarget)
    : Infinity;
  const firePct = fireTarget > 0 ? Math.min(100, (fireSettings.current_corpus / fireTarget) * 100) : 0;

  const milestones = [...goals]
    .filter((g) => g.target_date)
    .sort((a, b) => +new Date(a.target_date!) - +new Date(b.target_date!))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Target} label="Active Goals" value={String(goals.length)} delta={`${onTrack} on track`} tone="mint" />
        <Kpi icon={PiggyBank} label="Total Saved" value={inr(totalSaved)} delta={`of ${inr(totalTarget)} target`} tone="positive" />
        <Kpi icon={Wallet} label="Retirement" value={canComputeRet ? `${retPct.toFixed(1)}%` : "—"} delta={canComputeRet ? `${yearsToRet} yrs to go` : "Set up your plan"} tone="mint" />
        <Kpi icon={Flame} label="FIRE Progress" value={canComputeFire ? `${firePct.toFixed(1)}%` : "—"} delta={canComputeFire ? (Number.isFinite(yrsToFire) ? `${yrsToFire.toFixed(1)} yrs to go` : "Add a SIP") : "Set up your plan"} tone="warn" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <div className="font-display text-base font-semibold">Wealth Projection</div>
              <div className="text-xs text-muted-foreground">
                {canComputeRet ? `Corpus growth at ${retirementSettings.pre_return_pct}% CAGR · in ₹ Lakhs` : "Add your retirement plan to see a projection."}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">FIRE Number</div>
              <div className="font-display text-lg font-bold text-mint">{canComputeFire ? inr(fireTarget) : "—"}</div>
            </div>
          </div>
          {canComputeRet ? (
            <ProjectionChart settings={retirementSettings} yearsSpan={Math.max(8, yearsToRet)} />
          ) : (
            <div className="grid h-[260px] place-items-center rounded-xl border border-dashed border-border text-xs text-muted-foreground">
              No projection yet — head to the Retirement tab to enter your assumptions.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-mint" />
            <div className="font-display text-base font-semibold">Upcoming Milestones</div>
          </div>
          {milestones.length === 0 ? (
            <div className="text-xs text-muted-foreground">No upcoming milestones. Add target dates to your goals to see them here.</div>
          ) : (
            <div className="space-y-3 text-sm">
              {milestones.map((g) => {
                const Icon = ICON_BY_TYPE[g.goal_type];
                const pct = goalProgressPct(g);
                return (
                  <div key={g.id} className="flex items-start gap-3 rounded-xl border border-border/60 bg-surface-2/40 p-3">
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-mint/10 text-mint">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="truncate text-xs font-medium">{g.name}</div>
                        <div className="text-[11px] text-muted-foreground">{fmtDate(g.target_date)}</div>
                      </div>
                      <div className="mt-1 text-[11px] text-muted-foreground">{pct}% · {inr(g.saved_amount)} of {inr(g.target_amount)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="font-display text-base font-semibold">Goals Snapshot</div>
          {goals.length > 0 && (
            <Button variant="ghost" size="sm" className="text-mint" onClick={onAddGoal}>
              <Plus className="h-4 w-4" /> Add Goal
            </Button>
          )}
        </div>
        {goals.length === 0 ? (
          <EmptyState
            icon={Target}
            title="No goals yet"
            description="Add your first financial goal to start tracking progress."
            action={<Button size="sm" className="bg-mint text-mint-foreground hover:bg-mint/90" onClick={onAddGoal}><Plus className="h-4 w-4" /> Add Goal</Button>}
          />
        ) : (
          <div className="space-y-4">
            {goals.slice(0, 5).map((g) => (
              <GoalRow key={g.id} goal={g} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function GoalRow({ goal }: { goal: Goal }) {
  const Icon = ICON_BY_TYPE[goal.goal_type];
  const pct = goalProgressPct(goal);
  const tone = goalTone(goal);
  const barColor = tone === "positive" ? "bg-success" : tone === "warn" ? "bg-amber-400" : "bg-mint";
  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-mint/10 text-mint">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{goal.name}</div>
            <div className="text-xs text-muted-foreground">Target: {fmtDate(goal.target_date)}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-sm font-semibold">{inr(goal.saved_amount)}</div>
          <div className="text-xs text-muted-foreground">of {inr(goal.target_amount)}</div>
        </div>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-1 text-right text-[11px] text-muted-foreground">{pct}%</div>
    </div>
  );
}

/* ---------- GOALS ---------- */
function GoalsView({
  onAddGoal,
  onEditGoal,
}: {
  onAddGoal: () => void;
  onEditGoal: (g: Goal) => void;
}) {
  const q = useGoals();
  const del = useDeleteGoal();

  if (q.isLoading) return <LoadingBlock label="Loading goals…" />;
  if (q.error) return <ErrorBlock error={q.error as Error} onRetry={() => q.refetch()} />;

  const goals = q.data ?? [];
  const totalCurrent = goals.reduce((s, g) => s + g.saved_amount, 0);
  const totalTarget = goals.reduce((s, g) => s + g.target_amount, 0);
  const onTrack = goals.filter((g) => goalProgressPct(g) >= 50).length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi icon={Target} label="Total Goals" value={String(goals.length)} tone="mint" />
        <Kpi icon={CheckCircle2} label="On Track" value={String(onTrack)} tone="positive" />
        <Kpi icon={PiggyBank} label="Saved" value={inr(totalCurrent)} tone="mint" />
        <Kpi
          icon={TrendingUp}
          label="Overall Progress"
          value={`${totalTarget > 0 ? Math.round((totalCurrent / totalTarget) * 100) : 0}%`}
          tone="positive"
        />
      </div>

      {goals.length === 0 ? (
        <EmptyState
          icon={Target}
          title="No goals yet"
          description="Track Emergency Funds, a Home, Education, Vacations and more."
          action={<Button size="sm" className="bg-mint text-mint-foreground hover:bg-mint/90" onClick={onAddGoal}><Plus className="h-4 w-4" /> Add Your First Goal</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {goals.map((g) => (
            <GoalCard
              key={g.id}
              goal={g}
              onEdit={() => onEditGoal(g)}
              onDelete={() => del.mutate(g.id)}
              deleting={del.isPending}
            />
          ))}
          <button
            onClick={onAddGoal}
            className="grid min-h-[180px] place-items-center rounded-2xl border-2 border-dashed border-border bg-card/40 text-muted-foreground transition hover:border-mint/40 hover:text-mint"
          >
            <div className="flex flex-col items-center gap-2">
              <Plus className="h-6 w-6" />
              <span className="text-sm font-medium">Add New Goal</span>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

function GoalCard({
  goal,
  onEdit,
  onDelete,
  deleting,
}: {
  goal: Goal;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const Icon = ICON_BY_TYPE[goal.goal_type];
  const pct = goalProgressPct(goal);
  const tone = goalTone(goal);
  const barColor = tone === "positive" ? "bg-success" : tone === "warn" ? "bg-amber-400" : "bg-mint";
  return (
    <div className="group rounded-2xl border border-border bg-card p-5 transition hover:border-mint/40">
      <div className="flex items-start justify-between">
        <div className="grid h-11 w-11 place-items-center rounded-xl bg-mint/10 text-mint">
          <Icon className="h-5 w-5" />
        </div>
        <div className="flex items-center gap-1">
          <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {fmtDate(goal.target_date)}
          </span>
        </div>
      </div>
      <div className="mt-4 flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate font-display text-base font-semibold">{goal.name}</div>
          <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {GOAL_TYPE_LABEL[goal.goal_type]}
          </div>
        </div>
        <div className="flex shrink-0 gap-1 opacity-0 transition group-hover:opacity-100">
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete this goal?</AlertDialogTitle>
                <AlertDialogDescription>
                  "{goal.name}" will be removed permanently. This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={onDelete} disabled={deleting}>
                  {deleting ? "Deleting…" : "Delete"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {inr(goal.saved_amount)} of {inr(goal.target_amount)}
        {goal.monthly_contribution > 0 && (
          <span> · {inr(goal.monthly_contribution)}/mo</span>
        )}
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={`h-full ${barColor}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{pct}% complete</span>
        <span className="font-medium text-mint">{inr(Math.max(0, goal.target_amount - goal.saved_amount))} left</span>
      </div>
    </div>
  );
}

/* ---------- GOAL DIALOG ---------- */
function GoalDialog({
  open,
  onOpenChange,
  goal,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  goal?: Goal;
}) {
  const upsert = useUpsertGoal();
  const isEdit = !!goal;

  const [name, setName] = useState(goal?.name ?? "");
  const [goalType, setGoalType] = useState<GoalType>(goal?.goal_type ?? "custom");
  const [target, setTarget] = useState(String(goal?.target_amount ?? ""));
  const [saved, setSaved] = useState(String(goal?.saved_amount ?? "0"));
  const [date, setDate] = useState(goal?.target_date ?? "");
  const [monthly, setMonthly] = useState(String(goal?.monthly_contribution ?? "0"));
  const [notes, setNotes] = useState(goal?.notes ?? "");

  // Re-seed when opening a different goal
  useMemo(() => {
    if (open) {
      setName(goal?.name ?? "");
      setGoalType(goal?.goal_type ?? "custom");
      setTarget(String(goal?.target_amount ?? ""));
      setSaved(String(goal?.saved_amount ?? "0"));
      setDate(goal?.target_date ?? "");
      setMonthly(String(goal?.monthly_contribution ?? "0"));
      setNotes(goal?.notes ?? "");
    }
  }, [open, goal?.id]);

  const tgt = Number(target);
  const sv = Number(saved);
  const mly = Number(monthly);
  const valid = name.trim().length > 0 && tgt > 0 && sv >= 0 && mly >= 0;

  function submit() {
    if (!valid) return;
    upsert.mutate(
      {
        id: goal?.id,
        name,
        goal_type: goalType,
        target_amount: tgt,
        saved_amount: sv,
        target_date: date || null,
        monthly_contribution: mly,
        notes,
      },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Goal" : "Add Goal"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid gap-1.5">
            <Label>Name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Emergency Fund" maxLength={80} />
          </div>
          <div className="grid gap-1.5">
            <Label>Type</Label>
            <Select value={goalType} onValueChange={(v) => setGoalType(v as GoalType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {GOAL_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{GOAL_TYPE_LABEL[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Target Amount (₹)</Label>
              <Input type="number" min={0} value={target} onChange={(e) => setTarget(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Saved Amount (₹)</Label>
              <Input type="number" min={0} value={saved} onChange={(e) => setSaved(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label>Target Date</Label>
              <DatePicker value={date ?? ""} onChange={(v) => setDate(v)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Monthly Contribution (₹)</Label>
              <Input type="number" min={0} value={monthly} onChange={(e) => setMonthly(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Notes</Label>
            <Textarea value={notes ?? ""} onChange={(e) => setNotes(e.target.value)} maxLength={500} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <ClearButton
            dirty={!!(name || notes || target || (Number(saved) > 0) || (Number(monthly) > 0) || date)}
            disabled={upsert.isPending}
            onClear={() => {
              setName("");
              setGoalType("custom");
              setTarget("");
              setSaved("0");
              setDate("");
              setMonthly("0");
              setNotes("");
            }}
          />
          <Button onClick={submit} disabled={!valid || upsert.isPending} className="bg-mint text-mint-foreground hover:bg-mint/90">
            {upsert.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {isEdit ? "Save Changes" : "Create Goal"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Projection chart shared ---------- */
function ProjectionChart({ settings, yearsSpan }: { settings: PlannerSettings; yearsSpan: number }) {
  const points = useMemo(() => {
    const span = Math.max(5, Math.min(40, yearsSpan));
    const step = Math.max(1, Math.round(span / 7));
    const arr: { year: string; corpus: number }[] = [];
    const startYear = new Date().getFullYear();
    for (let y = 0; y <= span; y += step) {
      const fv = projectCorpus(
        settings.current_corpus,
        settings.monthly_sip,
        settings.pre_return_pct,
        y
      );
      arr.push({ year: String(startYear + y), corpus: Number((fv / 100000).toFixed(2)) });
    }
    return arr;
  }, [settings, yearsSpan]);

  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={points}>
        <defs>
          <linearGradient id="proj" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#14D8CF" stopOpacity={0.4} />
            <stop offset="100%" stopColor="#14D8CF" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#1B3249" />
        <XAxis dataKey="year" stroke="#6E8294" fontSize={11}  {...smartXAxisProps} />
        <YAxis stroke="#6E8294" fontSize={11} tickFormatter={(v) => `${v}L`} />
        <RechartsTooltip
          contentStyle={{ background: "#102634", border: "1px solid #1B3249", borderRadius: 8 }}
          formatter={(v: number) => [`₹${v}L`, "Corpus"]}
        />
        <Area type="monotone" dataKey="corpus" stroke="#14D8CF" strokeWidth={2.5} fill="url(#proj)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/* ---------- RETIREMENT ---------- */
type RetInputs = {
  current_age: number;
  retirement_age: number;
  life_expectancy: number;
  monthly_expense: number;
  inflation_pct: number;
  pre_return_pct: number;
  post_return_pct: number;
  current_corpus: number;
  monthly_sip: number;
};
const BLANK_RET: RetInputs = {
  current_age: 0,
  retirement_age: 0,
  life_expectancy: 85,
  monthly_expense: 0,
  inflation_pct: 6,
  pre_return_pct: 12,
  post_return_pct: 7,
  current_corpus: 0,
  monthly_sip: 0,
};

function RetirementView() {
  const { data: savedPlan, isLoading, error, refetch } = useRetirementPlan();
  const save = useSaveRetirementPlan();
  const investmentsQ = useInvestments();
  const [inputs, setInputs] = useState<RetInputs | null>(null);
  const [cleared, setCleared] = useState(() => readClearMarker(RETIREMENT_CLEAR_KEY));
  const [calculated, setCalculated] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const savedPlanToLoad = !cleared ? savedPlan : null;

  // Hydrate only an explicitly saved retirement plan.
  const effective: RetInputs = inputs ?? (savedPlanToLoad
    ? {
        current_age: savedPlanToLoad.current_age,
        retirement_age: savedPlanToLoad.retirement_age,
        life_expectancy: savedPlanToLoad.life_expectancy,
        monthly_expense: savedPlanToLoad.monthly_expense,
        inflation_pct: savedPlanToLoad.inflation_pct,
        pre_return_pct: savedPlanToLoad.pre_return_pct,
        post_return_pct: savedPlanToLoad.post_return_pct,
        current_corpus: savedPlanToLoad.current_corpus,
        monthly_sip: savedPlanToLoad.monthly_sip,
      }
    : BLANK_RET);

  const required = {
    current_age: effective.current_age > 0,
    retirement_age: effective.retirement_age > effective.current_age,
    life_expectancy: effective.life_expectancy > effective.retirement_age,
    monthly_expense: effective.monthly_expense > 0,
    inflation_pct: effective.inflation_pct > 0,
    pre_return_pct: effective.pre_return_pct > 0,
    post_return_pct: effective.post_return_pct > 0,
  };
  const hasRequiredInputs = Object.values(required).every(Boolean);
  const canCompute = (calculated || (!!savedPlanToLoad && inputs === null)) && hasRequiredInputs;

  const s: PlannerSettings = { user_id: "", ...BLANK_SETTINGS, ...effective, created_at: "", updated_at: "" };
  const yearsToRet = Math.max(0, effective.retirement_age - effective.current_age);
  const target = canCompute ? retirementCorpusNeeded(s) : 0;
  const projected = canCompute ? projectCorpus(effective.current_corpus, effective.monthly_sip, effective.pre_return_pct, yearsToRet) : 0;
  const readiness = target > 0 ? Math.min(100, (projected / target) * 100) : 0;

  const chartData = useMemo(() => {
    if (!canCompute) return [];
    const arr: { age: number; corpus: number; target: number }[] = [];
    const span = Math.max(5, effective.life_expectancy - effective.current_age);
    const step = Math.max(1, Math.round(span / 8));
    for (let y = 0; y <= span; y += step) {
      const age = effective.current_age + y;
      const corpus = projectCorpus(effective.current_corpus, effective.monthly_sip, effective.pre_return_pct, Math.min(y, yearsToRet));
      const tgt = target * Math.pow(1 + effective.inflation_pct / 100, Math.max(0, y - yearsToRet)) * (y >= yearsToRet ? 1 : y / Math.max(1, yearsToRet));
      arr.push({ age, corpus: Number((corpus / 100000).toFixed(2)), target: Number((tgt / 100000).toFixed(2)) });
    }
    return arr;
  }, [effective, yearsToRet, target, canCompute]);

  const recommendedSip = useMemo(() => {
    if (!canCompute) return 0;
    const r = effective.pre_return_pct / 100 / 12;
    const n = yearsToRet * 12;
    if (n <= 0) return 0;
    const remaining = target - effective.current_corpus * Math.pow(1 + r, n);
    if (remaining <= 0) return 0;
    if (r === 0) return remaining / n;
    return remaining / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
  }, [effective, yearsToRet, target, canCompute]);

  // Linked retirement assets from the user's Wealth data.
  const linkedAssets = useMemo(() => {
    const items = investmentsQ.data ?? [];
    const re = /epf|nps|ppf|retire|pension|sgb|sovereign gold/i;
    return items
      .filter((i) => {
        const hay = `${i.name ?? ""} ${i.sub_category ?? ""} ${i.category ?? ""}`;
        return re.test(hay);
      })
      .map((i) => ({
        id: i.id,
        name: i.name,
        sub_category: i.sub_category ?? i.category,
        value: i.current_value ?? 0,
      }));
  }, [investmentsQ.data]);
  const linkedTotal = useMemo(() => linkedAssets.reduce((s, a) => s + a.value, 0), [linkedAssets]);

  // Progress summary metrics.
  const remainingCorpus = Math.max(0, target - effective.current_corpus);
  const savingsProgress = target > 0 ? Math.min(100, (effective.current_corpus / target) * 100) : 0;
  const planStart = savedPlanToLoad?.created_at ? new Date(savedPlanToLoad.created_at) : null;
  const elapsedYears = planStart ? Math.max(0, (Date.now() - planStart.getTime()) / (365.25 * 86400000)) : 0;
  const timeProgress = yearsToRet + elapsedYears > 0
    ? Math.min(100, (elapsedYears / (elapsedYears + yearsToRet)) * 100)
    : 0;
  const yearsRemaining = Math.floor(yearsToRet);
  const monthsRemaining = Math.round((yearsToRet - yearsRemaining) * 12);
  const targetDate = useMemo(() => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + Math.floor(yearsToRet));
    d.setMonth(d.getMonth() + Math.round((yearsToRet - Math.floor(yearsToRet)) * 12));
    return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  }, [yearsToRet]);
  const readinessRatio = target > 0 ? projected / target : 0;
  const status: { label: string; tone: "positive" | "warn" | "negative" } =
    readinessRatio >= 1.1 ? { label: "Ahead of Target", tone: "positive" }
    : readinessRatio >= 0.9 ? { label: "On Track", tone: "positive" }
    : readinessRatio >= 0.6 ? { label: "Behind Target", tone: "warn" }
    : { label: "Behind Target", tone: "negative" };
  const monthlyRetirementIncome = canCompute
    ? (projected * (effective.post_return_pct / 100)) / 12
    : 0;

  if (isLoading) return <LoadingBlock label="Loading plan…" />;
  if (error) return <ErrorBlock error={error as Error} onRetry={() => refetch()} />;

  function patch<K extends keyof RetInputs>(k: K, v: RetInputs[K]) {
    setCalculated(false);
    setInputs({ ...effective, [k]: v });
  }
  function clearAll() {
    setInputs(BLANK_RET);
    setCleared(true);
    setCalculated(false);
    setAttempted(false);
    writeClearMarker(RETIREMENT_CLEAR_KEY, true);
  }
  function calculate() {
    setAttempted(true);
    setCalculated(hasRequiredInputs);
  }
  function persist() {
    save.mutate(
      effective,
      {
        onSuccess: () => {
          setInputs(null);
          setCleared(false);
          setCalculated(true);
          setAttempted(false);
          writeClearMarker(RETIREMENT_CLEAR_KEY, false);
        },
      }
    );
  }

  const hasAnyInput = Object.values(effective).some((v) => v > 0);

  return (
    <div className="space-y-6">
      {canCompute ? (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi icon={Calendar} label="Retirement Age" value={String(effective.retirement_age)} delta={`${yearsToRet} yrs to go`} tone="mint" />
            <Kpi
              icon={Target}
              label="Required Retirement Corpus"
              value={inr(target)}
              delta={`Monthly need ${inr(effective.monthly_expense)}`}
              tone="warn"
              tooltip="Inflation-adjusted corpus needed at retirement to sustain your monthly expenses through life expectancy at the post-retirement return."
            />
            <Kpi
              icon={PiggyBank}
              label="Projected Retirement Corpus"
              value={inr(projected)}
              delta={`${readiness.toFixed(1)}% of target`}
              tone={readiness >= 80 ? "positive" : "warn"}
              tooltip="Estimated corpus you will have at retirement based on your current corpus, monthly SIP and pre-retirement return."
            />
            <Kpi
              icon={TrendingUp}
              label="Required Monthly SIP"
              value={inr(recommendedSip)}
              delta={`Currently investing ${inr(effective.monthly_sip)}`}
              tone={effective.monthly_sip >= recommendedSip ? "positive" : "negative"}
              tooltip="Monthly SIP needed from today to cover the remaining corpus by retirement, accounting for growth of your existing corpus."
            />
          </div>

          {/* Progress Summary */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-display text-base font-semibold">Progress Summary</div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold",
                  status.tone === "positive" && "bg-success/15 text-success",
                  status.tone === "warn" && "bg-amber-500/15 text-amber-400",
                  status.tone === "negative" && "bg-destructive/15 text-destructive",
                )}
              >
                {status.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <SummaryItem label="Current Retirement Corpus" value={inr(effective.current_corpus)} />
              <SummaryItem label="Target Retirement Corpus" value={inr(target)} />
              <SummaryItem label="Remaining Corpus" value={inr(remainingCorpus)} />
              <SummaryItem label="Years / Months Remaining" value={`${yearsRemaining}y ${monthsRemaining}m`} />
              <SummaryItem label="Target Retirement Date" value={targetDate} />
              <SummaryItem label="Est. Monthly Retirement Income" value={inr(monthlyRetirementIncome)} />
            </div>
            <div className="mt-5 space-y-4">
              <ProgressBar
                label="Savings Progress"
                pct={savingsProgress}
                tooltip="Savings Progress = Current Corpus ÷ Required Retirement Corpus."
              />
              <ProgressBar
                label="Time Progress"
                pct={timeProgress}
                tone="mint"
                tooltip="Time Progress = Time elapsed since you started this plan ÷ Total planning duration."
              />
            </div>
          </div>

          {/* Linked Assets */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-mint" />
                <div className="font-display text-base font-semibold">Linked Retirement Assets</div>
              </div>
              <div className="text-sm font-semibold text-mint">{inr(linkedTotal)}</div>
            </div>
            {linkedAssets.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No linked retirement assets found. Add investments tagged as EPF, NPS, PPF, SGB or Retirement funds under Wealth to link them here.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {linkedAssets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{a.name}</div>
                      <div className="text-[11px] text-muted-foreground">{a.sub_category}</div>
                    </div>
                    <div className="font-semibold">{inr(a.value)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calculation Breakdown */}
          <div className="rounded-2xl border border-border bg-card">
            <button
              type="button"
              onClick={() => setBreakdownOpen((v) => !v)}
              className="flex w-full items-center justify-between p-5 text-left"
            >
              <div className="font-display text-base font-semibold">Calculation Breakdown</div>
              {breakdownOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {breakdownOpen && (
              <div className="grid grid-cols-1 gap-2 border-t border-border px-5 py-4 text-xs sm:grid-cols-2">
                <BreakRow k="Current Age" v={`${effective.current_age} yrs`} />
                <BreakRow k="Retirement Age" v={`${effective.retirement_age} yrs`} />
                <BreakRow k="Life Expectancy" v={`${effective.life_expectancy} yrs`} />
                <BreakRow k="Current Monthly Expenses" v={inr(effective.monthly_expense)} />
                <BreakRow k="Inflation Rate" v={`${effective.inflation_pct}% p.a.`} />
                <BreakRow k="Pre-Retirement Return" v={`${effective.pre_return_pct}% p.a.`} />
                <BreakRow k="Post-Retirement Return" v={`${effective.post_return_pct}% p.a.`} />
                <BreakRow k="Current Retirement Corpus" v={inr(effective.current_corpus)} />
                <BreakRow k="Required Retirement Corpus" v={inr(target)} />
                <BreakRow k="Remaining Corpus" v={inr(remainingCorpus)} />
                <BreakRow k="Required Monthly SIP" v={inr(recommendedSip)} />
                <BreakRow k="Est. Monthly Retirement Income" v={inr(monthlyRetirementIncome)} />
              </div>
            )}
          </div>

          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="font-display text-base font-semibold">Readiness Score</div>
              <div className="text-sm font-semibold text-mint">{readiness.toFixed(1)}%</div>
            </div>
            <div className="h-3 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-gradient-to-r from-mint to-emerald-400" style={{ width: `${readiness}%` }} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">Projected corpus at retirement vs inflation-adjusted target.</div>
          </div>
        </>
      ) : null}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 font-display text-base font-semibold">Retirement Projection (₹ Lakhs)</div>
          {canCompute ? (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1B3249" />
                <XAxis dataKey="age" stroke="#6E8294" fontSize={11} tickFormatter={(v) => `Age ${v}`} {...smartXAxisProps} />
                <YAxis stroke="#6E8294" fontSize={11} tickFormatter={(v) => `${v}L`} />
                <RechartsTooltip contentStyle={{ background: "#102634", border: "1px solid #1B3249", borderRadius: 8 }} formatter={(v: number) => `₹${v}L`} />
                <Legend />
                <Line type="monotone" dataKey="corpus" stroke="#14D8CF" strokeWidth={2.5} name="Projected" dot={false} />
                <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 5" name="Target" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-[280px] place-items-center rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              Enter your current age, retirement age, life expectancy, monthly expense, inflation and expected returns to see your projection.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 font-display text-base font-semibold">Assumptions</div>
          <p className="mb-4 text-[11px] text-muted-foreground">
            <span className="text-destructive">*</span> Required fields
          </p>
          <div className="space-y-3">
            <FieldNum
              label="Current Age"
              value={effective.current_age}
              onChange={(v) => patch("current_age", v)}
              required
              error={attempted && !required.current_age}
              tooltip="Your age today. Used to calculate years left to build the retirement corpus."
            />
            <FieldNum
              label="Retirement Age"
              value={effective.retirement_age}
              onChange={(v) => patch("retirement_age", v)}
              required
              error={attempted && !required.retirement_age}
              tooltip="The age when you plan to stop working and start using the retirement corpus."
            />
            <FieldNum
              label="Life Expectancy"
              value={effective.life_expectancy}
              onChange={(v) => patch("life_expectancy", v)}
              required
              error={attempted && !required.life_expectancy}
              tooltip="Estimated age until when the corpus needs to support you."
            />
            <FieldNum
              label="Monthly Expense (today, ₹)"
              value={effective.monthly_expense}
              step={1000}
              onChange={(v) => patch("monthly_expense", v)}
              required
              error={attempted && !required.monthly_expense}
              tooltip="Your current monthly living expenses. Future expenses are inflated at the assumed inflation rate."
            />
            <FieldNum
              label="Inflation (%)"
              value={effective.inflation_pct}
              step={0.1}
              onChange={(v) => patch("inflation_pct", v)}
              required
              error={attempted && !required.inflation_pct}
              tooltip="Expected annual inflation. Used to inflate future expenses and reduce the real post-retirement return."
            />
            <FieldNum
              label="Pre-Ret Return (%)"
              value={effective.pre_return_pct}
              step={0.1}
              onChange={(v) => patch("pre_return_pct", v)}
              required
              error={attempted && !required.pre_return_pct}
              tooltip="Expected annual return on investments while you are still accumulating the corpus."
            />
            <FieldNum
              label="Post-Ret Return (%)"
              value={effective.post_return_pct}
              step={0.1}
              onChange={(v) => patch("post_return_pct", v)}
              required
              error={attempted && !required.post_return_pct}
              tooltip="Expected annual return on the corpus after retirement. Usually lower than pre-retirement returns."
            />
            <FieldNum
              label="Current Corpus (₹)"
              value={effective.current_corpus}
              step={10000}
              onChange={(v) => patch("current_corpus", v)}
              optional
              tooltip="Money already saved for retirement. Leave blank if you are starting from zero."
            />
            <FieldNum
              label="Monthly SIP (₹)"
              value={effective.monthly_sip}
              step={1000}
              onChange={(v) => patch("monthly_sip", v)}
              optional
              tooltip="Regular monthly contribution you plan to make until retirement."
            />
          </div>
          {attempted && !hasRequiredInputs && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              Please complete all required fields.
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!hasAnyInput || save.isPending}
              onClick={clearAll}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={save.isPending}
              onClick={calculate}
            >
              Calculate
            </Button>
            <Button
              className="flex-1 bg-mint text-mint-foreground hover:bg-mint/90"
              disabled={!hasRequiredInputs || save.isPending}
              onClick={persist}
            >
              {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Save Plan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldNum({
  label,
  value,
  onChange,
  step = 1,
  required,
  optional,
  tooltip,
  error,
  min,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  required?: boolean;
  optional?: boolean;
  tooltip?: string;
  error?: boolean;
  min?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
      <span className="flex items-center gap-1 text-xs text-muted-foreground">
        {label}
        {required && <span className="text-destructive">*</span>}
        {optional && <span className="text-[10px] text-muted-foreground/70">(optional)</span>}
        {tooltip && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="ml-0.5 text-muted-foreground/70 hover:text-foreground">
                <Info className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top" className="max-w-xs text-xs">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        )}
      </span>
      <Input
        type="number"
        step={step}
        min={min}
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className={cn(
          "h-7 w-28 text-right text-xs",
          error && "border-destructive ring-1 ring-destructive",
        )}
      />
    </div>
  );
}

/* ---------- FIRE ---------- */

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-surface-2/40 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-sm font-semibold text-foreground">{value}</div>
    </div>
  );
}

function ProgressBar({
  label, pct, tone = "positive", tooltip,
}: { label: string; pct: number; tone?: "positive" | "mint"; tooltip?: string }) {
  const bar = tone === "mint" ? "bg-mint" : "bg-gradient-to-r from-success to-emerald-400";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span className="inline-flex items-center gap-1 text-muted-foreground">
          {label}
          {tooltip && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground/70 hover:text-foreground">
                  <Info className="h-3 w-3" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs text-xs">{tooltip}</TooltipContent>
            </Tooltip>
          )}
        </span>
        <span className="font-semibold text-foreground">{pct.toFixed(1)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className={cn("h-full transition-all", bar)} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
      </div>
    </div>
  );
}

function BreakRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-surface-2/30 px-3 py-2">
      <span className="text-muted-foreground">{k}</span>
      <span className="font-medium text-foreground">{v}</span>
    </div>
  );
}

type FireInputs = {
  current_age: number;
  monthly_expense: number;
  current_corpus: number;
  monthly_sip: number;
  pre_return_pct: number;
  withdrawal_rate_pct: number;
  inflation_pct: number;
};
const BLANK_FIRE: FireInputs = {
  current_age: 0,
  monthly_expense: 0,
  current_corpus: 0,
  monthly_sip: 0,
  pre_return_pct: 12,
  withdrawal_rate_pct: 4,
  inflation_pct: 6,
};

const SWR_OPTIONS = ["3", "3.5", "4", "5"] as const;

function FireView() {
  const { data: savedPlan, isLoading, error, refetch } = useFirePlan();
  const save = useSaveFirePlan();
  const investmentsQ = useInvestments();
  const [inputs, setInputs] = useState<FireInputs | null>(null);
  const [cleared, setCleared] = useState(() => readClearMarker(FIRE_CLEAR_KEY));
  const [calculated, setCalculated] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const [desiredFireAge, setDesiredFireAge] = useState<number>(0);
  const [breakdownOpen, setBreakdownOpen] = useState(false);
  const savedPlanToLoad = !cleared ? savedPlan : null;

  const effective: FireInputs = inputs ?? (savedPlanToLoad
    ? {
        current_age: savedPlanToLoad.current_age,
        monthly_expense: savedPlanToLoad.monthly_expense,
        current_corpus: savedPlanToLoad.current_corpus,
        monthly_sip: savedPlanToLoad.monthly_sip,
        pre_return_pct: savedPlanToLoad.pre_return_pct,
        withdrawal_rate_pct: savedPlanToLoad.withdrawal_rate_pct,
        inflation_pct: savedPlanToLoad.inflation_pct,
      }
    : BLANK_FIRE);

  const required = {
    current_age: effective.current_age > 0,
    monthly_expense: effective.monthly_expense > 0,
    current_corpus: effective.current_corpus > 0,
    pre_return_pct: effective.pre_return_pct > 0,
    inflation_pct: effective.inflation_pct > 0,
    withdrawal_rate_pct: effective.withdrawal_rate_pct > 0,
  };
  const hasRequiredInputs = Object.values(required).every(Boolean);
  const canCompute = (calculated || (!!savedPlanToLoad && inputs === null)) && hasRequiredInputs;

  const s: PlannerSettings = { user_id: "", ...BLANK_SETTINGS, ...effective, created_at: "", updated_at: "" };
  const fireTarget = canCompute ? fireNumber(s) : 0;
  const yrs = canCompute ? yearsToReach(effective.current_corpus, effective.monthly_sip, effective.pre_return_pct, fireTarget) : Infinity;
  const pct = fireTarget > 0 ? Math.min(100, (effective.current_corpus / fireTarget) * 100) : 0;

  const estimatedFireAge = Number.isFinite(yrs) ? Math.round(effective.current_age + yrs) : 0;
  const yearsRemaining = Number.isFinite(yrs) ? Math.floor(yrs) : 0;
  const monthsRemaining = Number.isFinite(yrs) ? Math.round((yrs - yearsRemaining) * 12) : 0;
  const remainingCorpus = Math.max(0, fireTarget - effective.current_corpus);

  // Required monthly SIP to reach FIRE by desired age (or estimated age if no desired age).
  const targetYears = desiredFireAge > effective.current_age
    ? desiredFireAge - effective.current_age
    : (Number.isFinite(yrs) ? yrs : 0);
  const recommendedSip = useMemo(() => {
    if (!canCompute || targetYears <= 0) return 0;
    const r = effective.pre_return_pct / 100 / 12;
    const n = targetYears * 12;
    const fvExisting = effective.current_corpus * Math.pow(1 + r, n);
    const remaining = fireTarget - fvExisting;
    if (remaining <= 0) return 0;
    if (r === 0) return remaining / n;
    return remaining / (((Math.pow(1 + r, n) - 1) / r) * (1 + r));
  }, [canCompute, targetYears, effective.pre_return_pct, effective.current_corpus, fireTarget]);

  // Projected corpus by desired FIRE age (for status vs desired age).
  const projectedByTarget = canCompute && targetYears > 0
    ? projectCorpus(effective.current_corpus, effective.monthly_sip, effective.pre_return_pct, targetYears)
    : 0;
  const readinessRatio = fireTarget > 0 ? projectedByTarget / fireTarget : 0;
  const status: { label: string; tone: "positive" | "warn" | "negative" } =
    readinessRatio >= 1.1 ? { label: "Ahead of Target", tone: "positive" }
    : readinessRatio >= 0.9 ? { label: "On Track", tone: "positive" }
    : readinessRatio >= 0.6 ? { label: "Behind Target", tone: "warn" }
    : { label: "Behind Target", tone: "negative" };

  // Time progress: elapsed since plan start relative to total planning horizon.
  const planStart = savedPlanToLoad?.created_at ? new Date(savedPlanToLoad.created_at) : null;
  const elapsedYears = planStart ? Math.max(0, (Date.now() - planStart.getTime()) / (365.25 * 86400000)) : 0;
  const totalHorizon = elapsedYears + (Number.isFinite(yrs) ? yrs : targetYears);
  const timeProgress = totalHorizon > 0 ? Math.min(100, (elapsedYears / totalHorizon) * 100) : 0;

  // Linked investable assets: equity, mutual funds, ETFs, EPF, NPS, index/global funds etc.
  const linkedAssets = useMemo(() => {
    const items = investmentsQ.data ?? [];
    const re = /equity|mutual|mf|etf|index|epf|nps|ppf|large cap|mid cap|small cap|flexi|multi cap|elss|contra|value|dividend|focused|hybrid|balanced|global|international|us equity|emerging|developed|sgb|sovereign gold/i;
    return items
      .filter((i) => {
        const hay = `${i.name ?? ""} ${i.sub_category ?? ""} ${i.category ?? ""}`;
        return re.test(hay);
      })
      .map((i) => ({
        id: i.id,
        name: i.name,
        sub_category: i.sub_category ?? i.category,
        value: i.current_value ?? 0,
      }));
  }, [investmentsQ.data]);
  const linkedTotal = useMemo(() => linkedAssets.reduce((s, a) => s + a.value, 0), [linkedAssets]);

  if (isLoading) return <LoadingBlock label="Loading plan…" />;
  if (error) return <ErrorBlock error={error as Error} onRetry={() => refetch()} />;

  function patch<K extends keyof FireInputs>(k: K, v: FireInputs[K]) {
    setCalculated(false);
    setInputs({ ...effective, [k]: v });
  }
  function clearAll() {
    setInputs(BLANK_FIRE);
    setCleared(true);
    setCalculated(false);
    setAttempted(false);
    writeClearMarker(FIRE_CLEAR_KEY, true);
  }
  function calculate() {
    setAttempted(true);
    setCalculated(hasRequiredInputs);
  }
  function persist() {
    save.mutate(
      effective,
      {
        onSuccess: () => {
          setInputs(null);
          setCleared(false);
          setCalculated(true);
          setAttempted(false);
          writeClearMarker(FIRE_CLEAR_KEY, false);
        },
      }
    );
  }

  const hasAnyInput = Object.values(effective).some((v) => v > 0);

  return (
    <div className="space-y-6">
      {canCompute && (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi
              icon={Flame}
              label="FIRE Number"
              value={inr(fireTarget)}
              delta={`Inflation-adj @ ${effective.withdrawal_rate_pct}% SWR`}
              tone="warn"
              tooltip="Required FIRE corpus = inflation-adjusted annual expenses ÷ Safe Withdrawal Rate."
            />
            <Kpi
              icon={PiggyBank}
              label="Current Investable Corpus"
              value={inr(effective.current_corpus)}
              delta={`${pct.toFixed(1)}% of FIRE number`}
              tone="mint"
              tooltip="Money you have today across investable assets used to reach FIRE."
            />
            <Kpi
              icon={Calendar}
              label="Years to FIRE"
              value={Number.isFinite(yrs) ? yrs.toFixed(1) : "—"}
              delta={Number.isFinite(yrs) ? `Est. age ${estimatedFireAge}` : "Add a SIP to project"}
              tone="mint"
            />
            <Kpi
              icon={TrendingUp}
              label="Required Monthly SIP"
              value={inr(recommendedSip)}
              delta={`Currently investing ${inr(effective.monthly_sip)}`}
              tone={effective.monthly_sip >= recommendedSip ? "positive" : "negative"}
              tooltip="Monthly SIP needed from today to hit your FIRE number by the desired (or estimated) FIRE age, accounting for existing corpus growth."
            />
          </div>

          {/* Progress Summary */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-4 flex items-center justify-between">
              <div className="font-display text-base font-semibold">Progress Summary</div>
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-[11px] font-semibold",
                  status.tone === "positive" && "bg-success/15 text-success",
                  status.tone === "warn" && "bg-amber-500/15 text-amber-400",
                  status.tone === "negative" && "bg-destructive/15 text-destructive",
                )}
              >
                {status.label}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
              <SummaryItem label="Current Investable Corpus" value={inr(effective.current_corpus)} />
              <SummaryItem label="Required FIRE Corpus" value={inr(fireTarget)} />
              <SummaryItem label="Remaining Corpus" value={inr(remainingCorpus)} />
              <SummaryItem label="Estimated FIRE Age" value={Number.isFinite(yrs) ? String(estimatedFireAge) : "—"} />
              <SummaryItem label="Years / Months Remaining" value={Number.isFinite(yrs) ? `${yearsRemaining}y ${monthsRemaining}m` : "—"} />
              <SummaryItem label="Annual Expense" value={inrFull(effective.monthly_expense * 12)} />
            </div>
            <div className="mt-5 space-y-4">
              <ProgressBar
                label="FIRE Progress"
                pct={pct}
                tooltip="FIRE Progress = Current Investable Corpus ÷ Required FIRE Corpus."
              />
              <ProgressBar
                label="Time Progress"
                pct={timeProgress}
                tone="mint"
                tooltip="Time Progress = Time elapsed since you started this plan ÷ Total FIRE planning duration."
              />
            </div>
          </div>

          {/* Linked Assets */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="h-4 w-4 text-mint" />
                <div className="font-display text-base font-semibold">Linked Investable Assets</div>
              </div>
              <div className="text-sm font-semibold text-mint">{inr(linkedTotal)}</div>
            </div>
            {linkedAssets.length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No linked investable assets found. Add Equity, Mutual Funds, ETFs, EPF or NPS investments under Wealth to link them here.
              </div>
            ) : (
              <div className="divide-y divide-border/60">
                {linkedAssets.map((a) => (
                  <div key={a.id} className="flex items-center justify-between py-2 text-sm">
                    <div className="min-w-0">
                      <div className="truncate font-medium">{a.name}</div>
                      <div className="text-[11px] text-muted-foreground">{a.sub_category}</div>
                    </div>
                    <div className="font-semibold">{inr(a.value)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Calculation Breakdown */}
          <div className="rounded-2xl border border-border bg-card">
            <button
              type="button"
              onClick={() => setBreakdownOpen((v) => !v)}
              className="flex w-full items-center justify-between p-5 text-left"
            >
              <div className="font-display text-base font-semibold">Calculation Breakdown</div>
              {breakdownOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
            </button>
            {breakdownOpen && (
              <div className="grid grid-cols-1 gap-2 border-t border-border px-5 py-4 text-xs sm:grid-cols-2">
                <BreakRow k="Current Age" v={`${effective.current_age} yrs`} />
                <BreakRow k="Desired FIRE Age" v={desiredFireAge > 0 ? `${desiredFireAge} yrs` : "—"} />
                <BreakRow k="Current Monthly Expenses" v={inr(effective.monthly_expense)} />
                <BreakRow k="Annual Expenses" v={inrFull(effective.monthly_expense * 12)} />
                <BreakRow k="Inflation Rate" v={`${effective.inflation_pct}% p.a.`} />
                <BreakRow k="Expected Annual Return" v={`${effective.pre_return_pct}% p.a.`} />
                <BreakRow k="Safe Withdrawal Rate (SWR)" v={`${effective.withdrawal_rate_pct}%`} />
                <BreakRow k="Current Investable Corpus" v={inr(effective.current_corpus)} />
                <BreakRow k="Required FIRE Corpus" v={inr(fireTarget)} />
                <BreakRow k="Remaining Corpus" v={inr(remainingCorpus)} />
                <BreakRow k="Required Monthly SIP" v={inr(recommendedSip)} />
                <BreakRow k="Estimated FIRE Age" v={Number.isFinite(yrs) ? String(estimatedFireAge) : "—"} />
              </div>
            )}
          </div>
        </>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 lg:col-span-2">
          <div className="mb-4 font-display text-base font-semibold">FIRE Trajectory</div>
          {canCompute ? (
            <ProjectionChart
              settings={{ user_id: "", ...BLANK_SETTINGS, ...effective, created_at: "", updated_at: "" } as PlannerSettings}
              yearsSpan={Math.max(8, Number.isFinite(yrs) ? Math.ceil(yrs) + 2 : 25)}
            />
          ) : (
            <div className="grid h-[260px] place-items-center rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              Enter your age, expenses, corpus, expected return, inflation and withdrawal rate to see your FIRE trajectory.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-2 font-display text-base font-semibold">FIRE Calculator</div>
          <p className="mb-4 text-[11px] text-muted-foreground">
            <span className="text-destructive">*</span> Required fields
          </p>
          <div className="space-y-3">
            <FieldNum
              label="Current Age"
              value={effective.current_age}
              onChange={(v) => patch("current_age", v)}
              required
              error={attempted && !required.current_age}
              tooltip="Your age today. Used to estimate the age at which you can achieve FIRE."
            />
            <FieldNum
              label="Desired FIRE Age"
              value={desiredFireAge}
              onChange={(v) => { setCalculated(false); setDesiredFireAge(v); }}
              optional
              tooltip="Target age to achieve FIRE. Used to compute the Required Monthly SIP and On-Track status."
            />
            <FieldNum
              label="Monthly Expense (₹)"
              value={effective.monthly_expense}
              step={1000}
              onChange={(v) => patch("monthly_expense", v)}
              required
              error={attempted && !required.monthly_expense}
              tooltip="Your current monthly expenses. Annual expenses are divided by the SWR to estimate the FIRE number."
            />
            <FieldNum
              label="Current Corpus (₹)"
              value={effective.current_corpus}
              step={10000}
              onChange={(v) => patch("current_corpus", v)}
              required
              error={attempted && !required.current_corpus}
              tooltip="Investable assets you already have. Can be zero if you are just starting."
            />
            <FieldNum
              label="Expected Return (%)"
              value={effective.pre_return_pct}
              step={0.1}
              onChange={(v) => patch("pre_return_pct", v)}
              required
              error={attempted && !required.pre_return_pct}
              tooltip="Expected annual return on your investments while building the FIRE corpus."
            />
            <FieldNum
              label="Inflation (%)"
              value={effective.inflation_pct}
              step={0.1}
              onChange={(v) => patch("inflation_pct", v)}
              required
              error={attempted && !required.inflation_pct}
              tooltip="Expected annual inflation. The FIRE target is inflated by the years needed to reach it."
            />
            <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2">
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                Safe Withdrawal Rate (SWR)
                <span className="text-destructive">*</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button type="button" className="ml-0.5 text-muted-foreground/70 hover:text-foreground">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-xs">
                    Percentage of your corpus you can safely withdraw annually. 4% is the classic benchmark; 3–3.5% is more conservative.
                  </TooltipContent>
                </Tooltip>
              </span>
              <Select
                value={String(effective.withdrawal_rate_pct || "")}
                onValueChange={(v) => patch("withdrawal_rate_pct", Number(v))}
              >
                <SelectTrigger className={cn("h-7 w-28 text-xs", attempted && !required.withdrawal_rate_pct && "border-destructive ring-1 ring-destructive")}>
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {SWR_OPTIONS.map((o) => (
                    <SelectItem key={o} value={o}>{o}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <FieldNum
              label="Monthly SIP (₹)"
              value={effective.monthly_sip}
              step={1000}
              onChange={(v) => patch("monthly_sip", v)}
              optional
              tooltip="Monthly contribution to your FIRE corpus. Leave blank if you are not adding regularly."
            />
          </div>
          {attempted && !hasRequiredInputs && (
            <div className="mt-3 flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3.5 w-3.5" />
              Please complete all required fields.
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              disabled={!hasAnyInput || save.isPending}
              onClick={clearAll}
            >
              Clear
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              disabled={save.isPending}
              onClick={calculate}
            >
              Calculate
            </Button>
            <Button
              className="flex-1 bg-mint text-mint-foreground hover:bg-mint/90"
              disabled={!hasRequiredInputs || save.isPending}
              onClick={persist}
            >
              {save.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Save Plan
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

// silence "unused" for Dialog trigger import without using it here
void DialogTrigger;