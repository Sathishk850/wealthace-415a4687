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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

export const Route = createFileRoute("/_app/planner")({
  head: () => ({
    meta: [
      { title: "Planner · FinVista" },
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
    <>
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
      {tab === "retirement" && <RetirementView />}
      {tab === "fire" && <FireView />}

      <GoalDialog
        open={goalDialog.open}
        onOpenChange={(open) => setGoalDialog({ open, goal: open ? goalDialog.goal : undefined })}
        goal={goalDialog.goal}
      />
    </>
  );
}

/* ---------- KPI ---------- */
function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  tone = "mint",
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  delta?: string;
  tone?: "mint" | "positive" | "negative" | "warn";
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
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
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

  const canComputeFire = !!firePlan && fireSettings.current_age > 0 && fireSettings.monthly_expense > 0 && fireSettings.withdrawal_rate_pct > 0 && fireSettings.pre_return_pct > 0;
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
              <Input type="date" value={date ?? ""} onChange={(e) => setDate(e.target.value)} />
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
        <Tooltip
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
  life_expectancy: 0,
  monthly_expense: 0,
  inflation_pct: 0,
  pre_return_pct: 0,
  post_return_pct: 0,
  current_corpus: 0,
  monthly_sip: 0,
};

function RetirementView() {
  const { data: savedPlan, isLoading, error, refetch } = useRetirementPlan();
  const save = useSaveRetirementPlan();
  const [inputs, setInputs] = useState<RetInputs | null>(null);
  const [cleared, setCleared] = useState(() => readClearMarker(RETIREMENT_CLEAR_KEY));
  const [calculated, setCalculated] = useState(false);
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

  const hasRequiredInputs =
    effective.current_age > 0 &&
    effective.retirement_age > effective.current_age &&
    effective.monthly_expense > 0 &&
    effective.life_expectancy > effective.retirement_age;
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
    writeClearMarker(RETIREMENT_CLEAR_KEY, true);
  }
  function calculate() {
    setCalculated(true);
  }
  function persist() {
    save.mutate(
      effective,
      {
        onSuccess: () => {
          setInputs(null);
          setCleared(false);
          setCalculated(true);
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
            <Kpi icon={Target} label="Target Corpus" value={inr(target)} delta={`Monthly need ${inr(effective.monthly_expense)}`} tone="warn" />
            <Kpi icon={PiggyBank} label="Projected Corpus" value={inr(projected)} delta={`${readiness.toFixed(1)}% of target`} tone={readiness >= 80 ? "positive" : "warn"} />
            <Kpi icon={TrendingUp} label="Monthly SIP" value={inr(effective.monthly_sip)} delta={`Recommended ${inr(recommendedSip)}`} tone={effective.monthly_sip >= recommendedSip ? "positive" : "negative"} />
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
                <Tooltip contentStyle={{ background: "#102634", border: "1px solid #1B3249", borderRadius: 8 }} formatter={(v: number) => `₹${v}L`} />
                <Legend />
                <Line type="monotone" dataKey="corpus" stroke="#14D8CF" strokeWidth={2.5} name="Projected" dot={false} />
                <Line type="monotone" dataKey="target" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 5" name="Target" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="grid h-[280px] place-items-center rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
              Enter your current age, retirement age, life expectancy and monthly expense to see your projection.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 font-display text-base font-semibold">Assumptions</div>
          <div className="space-y-3">
            <FieldNum label="Current Age" value={effective.current_age} onChange={(v) => patch("current_age", v)} />
            <FieldNum label="Retirement Age" value={effective.retirement_age} onChange={(v) => patch("retirement_age", v)} />
            <FieldNum label="Life Expectancy" value={effective.life_expectancy} onChange={(v) => patch("life_expectancy", v)} />
            <FieldNum label="Monthly Expense (today, ₹)" value={effective.monthly_expense} step={1000} onChange={(v) => patch("monthly_expense", v)} />
            <FieldNum label="Inflation (%)" value={effective.inflation_pct} step={0.1} onChange={(v) => patch("inflation_pct", v)} />
            <FieldNum label="Pre-Ret Return (%)" value={effective.pre_return_pct} step={0.1} onChange={(v) => patch("pre_return_pct", v)} />
            <FieldNum label="Post-Ret Return (%)" value={effective.post_return_pct} step={0.1} onChange={(v) => patch("post_return_pct", v)} />
            <FieldNum label="Current Corpus (₹)" value={effective.current_corpus} step={10000} onChange={(v) => patch("current_corpus", v)} />
            <FieldNum label="Monthly SIP (₹)" value={effective.monthly_sip} step={1000} onChange={(v) => patch("monthly_sip", v)} />
          </div>
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
              disabled={!hasRequiredInputs || save.isPending}
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
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border/60 pb-2 last:border-0">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Input
        type="number"
        step={step}
        value={value === 0 ? "" : value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
        className="h-7 w-28 text-right text-xs"
      />
    </div>
  );
}

/* ---------- FIRE ---------- */
type FireInputs = {
  current_age: number;
  monthly_expense: number;
  current_corpus: number;
  monthly_sip: number;
  pre_return_pct: number;
  withdrawal_rate_pct: number;
};
const BLANK_FIRE: FireInputs = {
  current_age: 0,
  monthly_expense: 0,
  current_corpus: 0,
  monthly_sip: 0,
  pre_return_pct: 0,
  withdrawal_rate_pct: 0,
};

function FireView() {
  const { data: savedPlan, isLoading, error, refetch } = useFirePlan();
  const save = useSaveFirePlan();
  const [inputs, setInputs] = useState<FireInputs | null>(null);
  const [cleared, setCleared] = useState(() => readClearMarker(FIRE_CLEAR_KEY));
  const [calculated, setCalculated] = useState(false);
  const savedPlanToLoad = !cleared ? savedPlan : null;

  const effective: FireInputs = inputs ?? (savedPlanToLoad
    ? {
        current_age: savedPlanToLoad.current_age,
        monthly_expense: savedPlanToLoad.monthly_expense,
        current_corpus: savedPlanToLoad.current_corpus,
        monthly_sip: savedPlanToLoad.monthly_sip,
        pre_return_pct: savedPlanToLoad.pre_return_pct,
        withdrawal_rate_pct: savedPlanToLoad.withdrawal_rate_pct,
      }
    : BLANK_FIRE);

  const hasRequiredInputs =
    effective.current_age > 0 &&
    effective.monthly_expense > 0 &&
    effective.withdrawal_rate_pct > 0 &&
    effective.pre_return_pct > 0;
  const canCompute = (calculated || (!!savedPlanToLoad && inputs === null)) && hasRequiredInputs;

  const fireTarget = canCompute ? (effective.monthly_expense * 12) / (effective.withdrawal_rate_pct / 100) : 0;
  const yrs = canCompute ? yearsToReach(effective.current_corpus, effective.monthly_sip, effective.pre_return_pct, fireTarget) : Infinity;
  const pct = fireTarget > 0 ? Math.min(100, (effective.current_corpus / fireTarget) * 100) : 0;

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
    writeClearMarker(FIRE_CLEAR_KEY, true);
  }
  function calculate() {
    setCalculated(true);
  }
  function persist() {
    save.mutate(
      effective,
      {
        onSuccess: () => {
          setInputs(null);
          setCleared(false);
          setCalculated(true);
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
          <div className="rounded-3xl border border-mint/30 bg-gradient-to-br from-card via-card to-mint/10 p-6">
            <div className="flex items-center gap-2 text-mint">
              <Flame className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">FIRE Number</span>
            </div>
            <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="font-display text-4xl font-extrabold tracking-tight md:text-5xl">{inr(fireTarget)}</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  25× annual expense at {effective.withdrawal_rate_pct}% safe withdrawal · projected age {Number.isFinite(yrs) ? Math.round(effective.current_age + yrs) : "—"}
                </p>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Progress</div>
                <div className="font-display text-2xl font-bold text-mint">{pct.toFixed(1)}%</div>
              </div>
            </div>
            <div className="mt-4 h-3 overflow-hidden rounded-full bg-surface-2">
              <div className="h-full bg-gradient-to-r from-mint to-emerald-400" style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Kpi icon={PiggyBank} label="Current Corpus" value={inr(effective.current_corpus)} tone="mint" />
            <Kpi icon={Calendar} label="Years to FIRE" value={Number.isFinite(yrs) ? yrs.toFixed(1) : "—"} tone="warn" />
            <Kpi icon={TrendingUp} label="Monthly SIP" value={inr(effective.monthly_sip)} tone="positive" />
            <Kpi icon={Target} label="Annual Expense" value={inrFull(effective.monthly_expense * 12)} tone="mint" />
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
              Enter your age, expenses, expected return and withdrawal rate to see your FIRE trajectory.
            </div>
          )}
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-4 font-display text-base font-semibold">FIRE Calculator</div>
          <div className="space-y-3">
            <FieldNum label="Current Age" value={effective.current_age} onChange={(v) => patch("current_age", v)} />
            <FieldNum label="Monthly Expense (₹)" value={effective.monthly_expense} step={1000} onChange={(v) => patch("monthly_expense", v)} />
            <FieldNum label="Current Corpus (₹)" value={effective.current_corpus} step={10000} onChange={(v) => patch("current_corpus", v)} />
            <FieldNum label="Monthly SIP (₹)" value={effective.monthly_sip} step={1000} onChange={(v) => patch("monthly_sip", v)} />
            <FieldNum label="Expected Return (%)" value={effective.pre_return_pct} step={0.1} onChange={(v) => patch("pre_return_pct", v)} />
            <FieldNum label="Withdrawal Rate (%)" value={effective.withdrawal_rate_pct} step={0.1} onChange={(v) => patch("withdrawal_rate_pct", v)} />
          </div>
          {canCompute && (
            <div className="mt-3 rounded-xl border border-border/60 bg-surface-2/40 p-3">
              <div className="text-xs text-muted-foreground">Estimated FIRE Age</div>
              <div className="mt-1 font-display text-2xl font-bold text-mint">
                {Number.isFinite(yrs) ? Math.round(effective.current_age + yrs) : "—"}
              </div>
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
              disabled={!hasRequiredInputs || save.isPending}
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