import { useMemo, useState } from "react";
import { smartXAxisProps } from "@/lib/chart-axis";
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import {
  Shield, ShieldCheck, Calendar, FileText, Info, Search, ChevronDown, ArrowUpDown,
  ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2, Bell, Car, HeartPulse, Home, Heart, Plane, Briefcase,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { InsuranceDialog } from "@/components/wealth/insurance-dialog";
import { IoMenu } from "@/components/wealth/io-menu";
import {
  type Insurance, type InsuranceInput, INSURANCE_TYPES,
  daysUntil, formatDate, groupByCategory, inr, inrCompact,
  useBulkInsertInsurance, useDeleteInsurance, useInsurance,
} from "@/lib/wealth-api";
import { exportCsv, exportJson, exportPdf, exportXlsx, pickAndParse } from "@/lib/wealth-io";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toolsKeys } from "@/lib/tools-api";
import { toast } from "sonner";

const ICONS: Record<string, { Icon: any; tint: string }> = {
  "Term Life":         { Icon: ShieldCheck, tint: "bg-blue-500/10 text-blue-400" },
  "Health":            { Icon: HeartPulse,  tint: "bg-emerald-500/10 text-emerald-400" },
  "Vehicle":           { Icon: Car,         tint: "bg-amber-500/10 text-amber-400" },
  "Personal Accident": { Icon: Heart,       tint: "bg-violet-500/10 text-violet-400" },
  "Property":          { Icon: Home,        tint: "bg-blue-500/10 text-blue-400" },
  "Travel":            { Icon: Plane,       tint: "bg-cyan-500/10 text-cyan-400" },
  "Other":             { Icon: Briefcase,   tint: "bg-slate-500/10 text-slate-300" },
};
const PIE = ["#3B82F6", "#14D8CF", "#F59E0B", "#8B5CF6", "#10B981", "#F97316", "#EF4444"];
const PAGE = 8;

type Sort = "next_due" | "name_asc" | "coverage_desc" | "premium_desc";

export function InsuranceView({
  registerAdd,
}: {
  registerAdd?: (open: () => void) => void;
}) {
  const { data: rows = [], isLoading, isError, error, refetch } = useInsurance();
  const bulkInsert = useBulkInsertInsurance();
  const del = useDeleteInsurance();
  const createReminder = useCreateRenewalReminder();

  const [search, setSearch] = useState("");
  const [type, setType] = useState<string>("all");
  const [status, setStatus] = useState<string>("all");
  const [sort, setSort] = useState<Sort>("next_due");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Insurance | null>(null);
  const [confirm, setConfirm] = useState<Insurance | null>(null);

  if (registerAdd) {
    registerAdd(() => {
      setEditing(null);
      setDialogOpen(true);
    });
  }

  /* ===== Derived ===== */
  const totalCoverage = useMemo(() => rows.reduce((s, r) => s + (r.coverage_amount || 0), 0), [rows]);
  const activeCount = rows.filter((r) => r.status === "active").length;
  const annualPremium = useMemo(
    () => rows.reduce((s, r) => s + premiumPerYear(r), 0),
    [rows],
  );
  const dueSoon = useMemo(() => {
    let total = 0;
    for (const r of rows) {
      const d = daysUntil(r.renewal_date);
      if (d != null && d >= 0 && d <= 30) total += r.premium_amount || 0;
    }
    return total;
  }, [rows]);

  const alloc = useMemo(() => {
    return groupByCategory(
      rows.map((r) => ({ ...r, category: r.policy_type })),
      (r) => r.coverage_amount,
    ).map((a, i) => ({ ...a, color: PIE[i % PIE.length] }));
  }, [rows]);

  const timeline = useMemo(() => buildPremiumTimeline(rows), [rows]);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.policy_name.toLowerCase().includes(q) ||
          x.policy_type.toLowerCase().includes(q) ||
          (x.provider ?? "").toLowerCase().includes(q) ||
          (x.policy_number ?? "").toLowerCase().includes(q),
      );
    }
    if (type !== "all") r = r.filter((x) => x.policy_type === type);
    if (status !== "all") r = r.filter((x) => x.status === status);
    const sorted = [...r];
    sorted.sort((a, b) => {
      switch (sort) {
        case "name_asc": return a.policy_name.localeCompare(b.policy_name);
        case "coverage_desc": return b.coverage_amount - a.coverage_amount;
        case "premium_desc": return (b.premium_amount || 0) - (a.premium_amount || 0);
        default: return (a.renewal_date ?? "9999").localeCompare(b.renewal_date ?? "9999");
      }
    });
    return sorted;
  }, [rows, search, type, status, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice((page - 1) * PAGE, page * PAGE);
  if (page > pageCount) setTimeout(() => setPage(1), 0);

  /* ===== Import / Export ===== */
  const exportCols = [
    { key: "policy_name", label: "Policy Name" },
    { key: "policy_type", label: "Type" },
    { key: "provider", label: "Provider" },
    { key: "policy_number", label: "Policy Number" },
    { key: "coverage_amount", label: "Coverage" },
    { key: "premium_amount", label: "Premium" },
    { key: "premium_frequency", label: "Frequency" },
    { key: "start_date", label: "Start Date" },
    { key: "renewal_date", label: "Renewal Date" },
    { key: "end_date", label: "End Date" },
    { key: "status", label: "Status" },
    { key: "notes", label: "Notes" },
  ] as const;

  const handleImport = async () => {
    const parsed = await pickAndParse();
    if (!parsed || !parsed.length) return;
    const mapped: InsuranceInput[] = parsed
      .map((r: any) => ({
        policy_name: String(r["Policy Name"] ?? r.policy_name ?? "").trim(),
        policy_type: String(r.Type ?? r.policy_type ?? "Other").trim() || "Other",
        provider: r.Provider ?? r.provider ?? null,
        policy_number: r["Policy Number"] ?? r.policy_number ?? null,
        coverage_amount: Number(r.Coverage ?? r.coverage_amount ?? 0) || 0,
        premium_amount:
          r.Premium === "" || r.premium_amount === ""
            ? null
            : Number(r.Premium ?? r.premium_amount ?? 0) || null,
        premium_frequency: r.Frequency ?? r.premium_frequency ?? "yearly",
        start_date: r["Start Date"] ?? r.start_date ?? null,
        renewal_date: r["Renewal Date"] ?? r.renewal_date ?? null,
        end_date: r["End Date"] ?? r.end_date ?? null,
        status: (r.Status ?? r.status ?? "active") || "active",
        notes: r.Notes ?? r.notes ?? null,
      }))
      .filter((r) => r.policy_name);
    if (!mapped.length) return toast.error("No valid rows found");
    await bulkInsert.mutateAsync(mapped);
  };

  if (isError)
    return <ErrorPanel message={(error as Error)?.message || "Failed to load policies"} onRetry={() => refetch()} />;

  const empty = !isLoading && rows.length === 0;

  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Insurance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Track your insurance policies and stay protected.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Coverage" value={isLoading ? "…" : inr(totalCoverage)} sub={`Across ${rows.length} Polic${rows.length === 1 ? "y" : "ies"}`} icon={Shield} tint="bg-blue-500/10 text-blue-400" />
        <Stat label="Active Policies" value={String(activeCount)} sub={rows.length ? `${Math.round((activeCount / rows.length) * 100)}% of total` : "—"} icon={ShieldCheck} tint="bg-emerald-500/10 text-emerald-400" subClass="text-mint" />
        <Stat label="Upcoming Premium" value={isLoading ? "…" : inr(dueSoon)} sub="Due in next 30 days" icon={Calendar} tint="bg-amber-500/10 text-amber-400" />
        <Stat label="Total Annual Premium" value={isLoading ? "…" : inr(annualPremium)} sub="Across all policies" icon={FileText} tint="bg-violet-500/10 text-violet-400" />
      </div>

      {empty ? (
        <Empty primary="No policies yet" secondary="Add your first insurance policy to start tracking coverage and renewals." cta={{ label: "Add policy", onClick: () => { setEditing(null); setDialogOpen(true); } }} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Insurance Coverage Overview</h3>
              <div className="mt-4 flex items-center gap-4">
                <div className="relative h-[170px] w-[170px] shrink-0">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={alloc} dataKey="amt" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="none">
                        {alloc.map((a) => (<Cell key={a.name} fill={a.color} />))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                    <div>
                      <div className="font-display text-sm font-bold text-foreground">{inrCompact(totalCoverage)}</div>
                      <div className="text-[10px] text-muted-foreground">Total Coverage</div>
                    </div>
                  </div>
                </div>
                <div className="min-w-0 flex-1 space-y-2.5">
                  {alloc.map((a) => (
                    <div key={a.name} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 text-xs">
                      <div className="flex min-w-0 items-center gap-2">
                        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: a.color }} />
                        <span className="truncate text-foreground">{a.name}</span>
                      </div>
                      <span className="shrink-0 text-right font-medium text-foreground">{inrCompact(a.amt)}</span>
                      <span className="shrink-0 font-medium text-muted-foreground">{a.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Premium Due Timeline</h3>
                <button className="inline-flex items-center gap-1 rounded-lg border border-border bg-surface-2 px-2.5 py-1 text-xs text-muted-foreground">
                  Next 6 Months <ChevronDown className="h-3 w-3" />
                </button>
              </div>
              <div className="h-[220px]">
                {timeline.every((t) => t.v === 0) ? (
                  <EmptyMini label="No premiums due in the next 6 months" />
                ) : (
                  <ResponsiveContainer>
                    <BarChart data={timeline} margin={{ top: 16, right: 8, left: -10, bottom: 0 }}>
                      <CartesianGrid stroke="#1B3249" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="m" tick={{ fill: "#6E8294", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#6E8294", fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `₹${Math.round((v as number) / 1000)}K`} />
                      <Tooltip cursor={{ fill: "#14D8CF10" }} contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v: number) => [inr(v), "Premium"]} />
                      <Bar dataKey="v" radius={[6, 6, 0, 0]} maxBarSize={42}>
                        {timeline.map((d) => (
                          <Cell key={d.m} fill={d.due ? "#EF4444" : "#10B981"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Your Policies ({filtered.length})</h3>
              <div className="relative ml-2 flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search policies..."
                  className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
                />
              </div>
              <FilterDropdown
                label={type === "all" ? "All Types" : type}
                value={type}
                onChange={(v) => { setType(v); setPage(1); }}
                options={[{ value: "all", label: "All Types" }, ...INSURANCE_TYPES.map((c) => ({ value: c, label: c }))]}
              />
              <FilterDropdown
                label={status === "all" ? "All Status" : titleCase(status)}
                value={status}
                onChange={(v) => { setStatus(v); setPage(1); }}
                options={[
                  { value: "all", label: "All Status" },
                  { value: "active", label: "Active" },
                  { value: "lapsed", label: "Lapsed" },
                  { value: "expired", label: "Expired" },
                  { value: "surrendered", label: "Surrendered" },
                ]}
              />
              <FilterDropdown
                label={`Sort: ${sortLabel(sort)}`}
                value={sort}
                onChange={(v) => setSort(v as Sort)}
                icon={ArrowUpDown}
                options={[
                  { value: "next_due", label: "Next due" },
                  { value: "name_asc", label: "Name (A→Z)" },
                  { value: "coverage_desc", label: "Coverage ↓" },
                  { value: "premium_desc", label: "Premium ↓" },
                ]}
              />
              <IoMenu
                onImport={handleImport}
                onExportCsv={() => exportCsv("insurance", exportCols as any, filtered)}
                onExportXlsx={() => exportXlsx("insurance", exportCols as any, filtered)}
                onExportJson={() => exportJson("insurance", filtered)}
                onExportPdf={() =>
                  exportPdf("Insurance Policies", exportCols as any, filtered, {
                    subtitle: `Total coverage ${inr(totalCoverage)} · ${filtered.length} polic${filtered.length === 1 ? "y" : "ies"}`,
                  })
                }
              />
            </div>

            {isLoading ? (
              <TableSkeleton />
            ) : filtered.length === 0 ? (
              <Empty primary="No matches" secondary="Try clearing filters or search." />
            ) : (
              <>
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="py-3 pl-2 font-medium">Policy Name</th>
                        <th className="py-3 font-medium">Type</th>
                        <th className="py-3 font-medium">Provider</th>
                        <th className="py-3 font-medium">Policy Number</th>
                        <th className="py-3 font-medium">Coverage</th>
                        <th className="py-3 font-medium">Premium</th>
                        <th className="py-3 font-medium">Next Due</th>
                        <th className="py-3 font-medium">Status</th>
                        <th className="py-3 pr-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((p) => {
                        const meta = ICONS[p.policy_type] ?? ICONS.Other;
                        const days = daysUntil(p.renewal_date);
                        const dueLabel =
                          days == null
                            ? "—"
                            : days < 0
                              ? `Overdue by ${Math.abs(days)}d`
                              : days === 0
                                ? "Due today"
                                : `In ${days} day${days === 1 ? "" : "s"}`;
                        const dueTone =
                          days != null && days <= 7 ? "text-rose-400"
                          : days != null && days <= 30 ? "text-amber-400"
                          : "text-muted-foreground";
                        return (
                          <tr key={p.id} className="border-b border-border/50 last:border-0 hover:bg-surface-2/40">
                            <td className="py-3 pl-2">
                              <div className="flex items-center gap-3">
                                <div className={`grid h-8 w-8 place-items-center rounded-lg ${meta.tint}`}>
                                  <meta.Icon className="h-4 w-4" />
                                </div>
                                <span className="font-medium text-foreground">{p.policy_name}</span>
                              </div>
                            </td>
                            <td className="py-3 text-muted-foreground">{p.policy_type}</td>
                            <td className="py-3 text-muted-foreground">{p.provider ?? "—"}</td>
                            <td className="py-3 text-muted-foreground">{p.policy_number ?? "—"}</td>
                            <td className="py-3 font-medium text-foreground">{inr(p.coverage_amount)}</td>
                            <td className="py-3 text-foreground">{p.premium_amount != null ? inr(p.premium_amount) : "—"}</td>
                            <td className="py-3">
                              <div className="text-foreground">{formatDate(p.renewal_date)}</div>
                              <div className={`text-[10px] ${dueTone}`}>{dueLabel}</div>
                            </td>
                            <td className="py-3"><StatusPill status={p.status} /></td>
                            <td className="py-3 pr-2">
                              <RowMenu
                                onEdit={() => { setEditing(p); setDialogOpen(true); }}
                                onDelete={() => setConfirm(p)}
                                onReminder={
                                  p.renewal_date
                                    ? () => createReminder.mutate(p)
                                    : undefined
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <Pagination page={page} pageCount={pageCount} total={filtered.length} onPage={setPage} />
              </>
            )}
          </div>

          <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 text-mint" />
            Keep your policies and nominees updated to ensure claim smoothness.
          </div>
        </>
      )}

      <InsuranceDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
        existing={editing}
      />

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete policy?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{confirm?.policy_name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={del.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-rose-500 text-white hover:bg-rose-600"
              disabled={del.isPending}
              onClick={async () => {
                if (!confirm) return;
                await del.mutateAsync(confirm.id);
                setConfirm(null);
              }}
            >
              {del.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* =================== Renewal reminder integration =================== */
function useCreateRenewalReminder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Insurance) => {
      if (!p.renewal_date) throw new Error("No renewal date set");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not authenticated");
      const { error } = await supabase.from("tools_reminders").insert({
        user_id: u.user.id,
        kind: "insurance",
        title: `${p.policy_name} renewal`,
        amount: p.premium_amount ?? 0,
        due_date: p.renewal_date,
        recurrence: "yearly",
        notify_days_before: 7,
        notify_enabled: true,
        status: "upcoming",
        notes: p.provider ? `Provider: ${p.provider}` : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Renewal reminder created");
      qc.invalidateQueries({ queryKey: toolsKeys.reminders });
    },
    onError: (e: Error) => toast.error(e.message || "Failed to create reminder"),
  });
}

/* =================== Helpers =================== */
function premiumPerYear(p: Insurance) {
  const a = p.premium_amount || 0;
  switch (p.premium_frequency) {
    case "monthly": return a * 12;
    case "quarterly": return a * 4;
    case "half_yearly": return a * 2;
    case "single": return 0;
    default: return a; // yearly
  }
}

function buildPremiumTimeline(rows: Insurance[]) {
  const now = new Date();
  const months: { key: string; m: string; v: number; due: boolean }[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      m: d.toLocaleString("en-IN", { month: "short" }) + " '" + String(d.getFullYear()).slice(2),
      v: 0,
      due: i === 0,
    });
  }
  for (const r of rows) {
    if (!r.renewal_date || !r.premium_amount) continue;
    const dt = new Date(r.renewal_date);
    const key = `${dt.getFullYear()}-${dt.getMonth()}`;
    const slot = months.find((m) => m.key === key);
    if (slot) slot.v += r.premium_amount;
  }
  return months;
}

function Stat({ label, value, sub, icon: Icon, tint, subClass }: { label: string; value: string; sub: string; icon: any; tint: string; subClass?: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <div className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tint}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            {label} <Info className="h-3 w-3 opacity-60" />
          </div>
          <div className="mt-1 font-display text-xl font-bold text-foreground">{value}</div>
          <div className={`mt-1 text-xs font-medium ${subClass ?? "text-muted-foreground"}`}>{sub}</div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/15 text-emerald-400",
    lapsed: "bg-rose-500/15 text-rose-400",
    expired: "bg-amber-500/15 text-amber-400",
    surrendered: "bg-muted/30 text-muted-foreground",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? "bg-muted/30 text-muted-foreground"}`}>
      {titleCase(status)}
    </span>
  );
}

function FilterDropdown({ label, value, onChange, options, icon: Icon }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; icon?: any }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-border bg-surface-2 px-2.5 text-xs text-foreground hover:bg-surface-2/80">
          {Icon && <Icon className="h-3.5 w-3.5" />}
          {label} <ChevronDown className="h-3.5 w-3.5 opacity-70" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel className="text-xs">{label}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={value} onValueChange={onChange}>
          {options.map((o) => (
            <DropdownMenuRadioItem key={o.value} value={o.value} className="text-sm">
              {o.label}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function RowMenu({ onEdit, onDelete, onReminder }: { onEdit: () => void; onDelete: () => void; onReminder?: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuItem onClick={onEdit} className="gap-2 text-sm">
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        {onReminder && (
          <DropdownMenuItem onClick={onReminder} className="gap-2 text-sm">
            <Bell className="h-4 w-4" /> Set renewal reminder
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="gap-2 text-sm text-rose-400 focus:text-rose-400">
          <Trash2 className="h-4 w-4" /> Delete
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function Pagination({ page, pageCount, total, onPage }: { page: number; pageCount: number; total: number; onPage: (p: number) => void }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-xs">
      <div className="text-muted-foreground">
        Showing <span className="text-foreground">{(page - 1) * PAGE + 1}</span>–
        <span className="text-foreground">{Math.min(page * PAGE, total)}</span> of{" "}
        <span className="text-foreground">{total}</span>
      </div>
      <div className="flex items-center gap-1">
        <button onClick={() => onPage(Math.max(1, page - 1))} disabled={page <= 1} className="grid h-7 w-7 place-items-center rounded-md border border-border text-muted-foreground disabled:opacity-40">
          <ChevronLeft className="h-3.5 w-3.5" />
        </button>
        {Array.from({ length: pageCount }).slice(0, 6).map((_, i) => {
          const p = i + 1;
          return (
            <button key={p} onClick={() => onPage(p)} className={`h-7 min-w-7 rounded-md border border-border px-2 ${p === page ? "bg-mint/15 text-mint" : "text-muted-foreground hover:text-foreground"}`}>
              {p}
            </button>
          );
        })}
        <button onClick={() => onPage(Math.min(pageCount, page + 1))} disabled={page >= pageCount} className="grid h-7 w-7 place-items-center rounded-md border border-border text-muted-foreground disabled:opacity-40">
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

function TableSkeleton() {
  return (
    <div className="mt-4 space-y-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="h-12 animate-pulse rounded-lg bg-surface-2/60" />
      ))}
    </div>
  );
}

function Empty({ primary, secondary, cta }: { primary: string; secondary: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="mt-4 grid place-items-center rounded-xl border border-dashed border-border bg-surface-2/30 px-6 py-12 text-center">
      <div className="text-sm font-medium text-foreground">{primary}</div>
      <div className="mt-1 text-xs text-muted-foreground">{secondary}</div>
      {cta && (
        <button onClick={cta.onClick} className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-mint px-3.5 py-2 text-xs font-semibold text-[#04121C] hover:brightness-110">
          {cta.label}
        </button>
      )}
    </div>
  );
}

function EmptyMini({ label }: { label: string }) {
  return <div className="grid h-full place-items-center text-xs text-muted-foreground">{label}</div>;
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="rounded-2xl border border-rose-500/30 bg-rose-500/5 p-6 text-center">
      <div className="text-sm font-semibold text-rose-300">Couldn't load data</div>
      <div className="mt-1 text-xs text-rose-200/80">{message}</div>
      <button onClick={onRetry} className="mt-3 rounded-xl border border-rose-400/40 px-3 py-1.5 text-xs font-medium text-rose-200 hover:bg-rose-500/10">
        Retry
      </button>
    </div>
  );
}

function sortLabel(s: Sort) {
  switch (s) {
    case "name_asc": return "Name ↑";
    case "coverage_desc": return "Coverage ↓";
    case "premium_desc": return "Premium ↓";
    default: return "Next due";
  }
}

function titleCase(s: string) {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}