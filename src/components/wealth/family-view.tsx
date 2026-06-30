import { useMemo, useState } from "react";
import {
  PieChart, Pie, Cell, ResponsiveContainer,
} from "recharts";
import {
  Users, ShieldCheck, HeartHandshake, Cake, Info, Search, ChevronDown, ArrowUpDown,
  ChevronLeft, ChevronRight, MoreVertical, Pencil, Trash2, Mail, Phone,
} from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { FamilyDialog } from "@/components/wealth/family-dialog";
import { IoMenu } from "@/components/wealth/io-menu";
import {
  RELATIONSHIPS, type FamilyMember, type FamilyMemberInput,
  ageFromDob, formatDate, inrCompact,
  useAccounts, useAssets, useBulkInsertFamily, useDeleteFamilyMember, useFamily,
  useInvestments,
} from "@/lib/wealth-api";
import { exportCsv, exportJson, exportPdf, exportXlsx, pickAndParse } from "@/lib/wealth-io";
import { toast } from "sonner";

const TINTS = [
  "bg-mint/15 text-mint",
  "bg-blue-500/15 text-blue-400",
  "bg-violet-500/15 text-violet-300",
  "bg-amber-500/15 text-amber-300",
  "bg-emerald-500/15 text-emerald-400",
  "bg-rose-500/15 text-rose-300",
  "bg-cyan-500/15 text-cyan-300",
];
const PIE = ["#14D8CF", "#3B82F6", "#8B5CF6", "#F59E0B", "#10B981", "#EF4444", "#F97316"];
const PAGE = 8;

type Sort = "name_asc" | "age_desc" | "age_asc" | "relationship";

export function FamilyView({
  registerAdd,
}: {
  registerAdd?: (open: () => void) => void;
}) {
  const { data: rows = [], isLoading, isError, error, refetch } = useFamily();
  const { data: assets = [] } = useAssets();
  const { data: accounts = [] } = useAccounts();
  const { data: investments = [] } = useInvestments();
  const bulkInsert = useBulkInsertFamily();
  const del = useDeleteFamilyMember();

  const [search, setSearch] = useState("");
  const [rel, setRel] = useState<string>("all");
  const [filter, setFilter] = useState<string>("all"); // all | dependents | nominees
  const [sort, setSort] = useState<Sort>("name_asc");
  const [page, setPage] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [confirm, setConfirm] = useState<FamilyMember | null>(null);

  if (registerAdd) {
    registerAdd(() => {
      setEditing(null);
      setDialogOpen(true);
    });
  }

  /* ===== Per-member net worth (from owner_member_id linkage) ===== */
  const netByMember = useMemo(() => {
    const m = new Map<string, number>();
    const add = (k: string | null, v: number) => {
      if (!k) return;
      m.set(k, (m.get(k) || 0) + v);
    };
    for (const a of assets) add(a.owner_member_id, a.current_value || 0);
    for (const a of accounts) add(a.owner_member_id, a.balance || 0);
    for (const i of investments) add(i.owner_member_id, i.current_value || 0);
    return m;
  }, [assets, accounts, investments]);

  const totals = useMemo(() => {
    const dependents = rows.filter((r) => r.is_dependent).length;
    const nominees = rows.filter((r) => r.is_nominee).length;
    const ages = rows.map((r) => ageFromDob(r.date_of_birth)).filter((a): a is number => a != null);
    const avgAge = ages.length ? Math.round(ages.reduce((s, n) => s + n, 0) / ages.length) : 0;
    return { dependents, nominees, avgAge };
  }, [rows]);

  const alloc = useMemo(() => {
    const totalWealth = Array.from(netByMember.values()).reduce((s, v) => s + v, 0);
    const items = rows
      .map((r, i) => {
        const amt = netByMember.get(r.id) || 0;
        return {
          name: r.name,
          amt,
          pct: totalWealth ? (amt / totalWealth) * 100 : 0,
          color: PIE[i % PIE.length],
        };
      })
      .filter((r) => r.amt > 0)
      .sort((a, b) => b.amt - a.amt);
    return { totalWealth, items };
  }, [rows, netByMember]);

  const filtered = useMemo(() => {
    let r = rows;
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((x) =>
        x.name.toLowerCase().includes(q) ||
        x.relationship.toLowerCase().includes(q) ||
        (x.email ?? "").toLowerCase().includes(q),
      );
    }
    if (rel !== "all") r = r.filter((x) => x.relationship === rel);
    if (filter === "dependents") r = r.filter((x) => x.is_dependent);
    if (filter === "nominees") r = r.filter((x) => x.is_nominee);
    const sorted = [...r];
    sorted.sort((a, b) => {
      const ageA = ageFromDob(a.date_of_birth) ?? -1;
      const ageB = ageFromDob(b.date_of_birth) ?? -1;
      switch (sort) {
        case "age_desc": return ageB - ageA;
        case "age_asc": return ageA - ageB;
        case "relationship": return a.relationship.localeCompare(b.relationship);
        default: return a.name.localeCompare(b.name);
      }
    });
    return sorted;
  }, [rows, search, rel, filter, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const pageRows = filtered.slice((page - 1) * PAGE, page * PAGE);
  if (page > pageCount) setTimeout(() => setPage(1), 0);

  const exportCols = [
    { key: "name", label: "Name" },
    { key: "relationship", label: "Relationship" },
    { key: "date_of_birth", label: "DOB" },
    { key: "gender", label: "Gender" },
    { key: "is_dependent", label: "Dependent" },
    { key: "is_nominee", label: "Nominee" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "pan", label: "PAN" },
    { key: "aadhaar_masked", label: "Aadhaar" },
    { key: "notes", label: "Notes" },
  ] as const;

  const handleImport = async () => {
    const parsed = await pickAndParse();
    if (!parsed || !parsed.length) return;
    const truthy = (v: any) => v === true || String(v).toLowerCase() === "true" || v === 1 || v === "1" || String(v).toLowerCase() === "yes";
    const mapped: FamilyMemberInput[] = parsed
      .map((r: any) => ({
        name: String(r.Name ?? r.name ?? "").trim(),
        relationship: String(r.Relationship ?? r.relationship ?? "Other") || "Other",
        date_of_birth: r.DOB ?? r.date_of_birth ?? null,
        gender: r.Gender ?? r.gender ?? null,
        is_dependent: truthy(r.Dependent ?? r.is_dependent),
        is_nominee: truthy(r.Nominee ?? r.is_nominee),
        email: r.Email ?? r.email ?? null,
        phone: r.Phone ?? r.phone ?? null,
        pan: r.PAN ?? r.pan ?? null,
        aadhaar_masked: r.Aadhaar ?? r.aadhaar_masked ?? null,
        notes: r.Notes ?? r.notes ?? null,
      }))
      .filter((r) => r.name);
    if (!mapped.length) return toast.error("No valid rows found");
    await bulkInsert.mutateAsync(mapped);
  };

  if (isError)
    return <ErrorPanel message={(error as Error)?.message || "Failed to load family members"} onRetry={() => refetch()} />;

  const empty = !isLoading && rows.length === 0;

  return (
    <>
      <div>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">Family</h2>
        <p className="mt-1 text-sm text-muted-foreground">Members, dependents and nominees linked across your wealth.</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Total Members" value={isLoading ? "…" : String(rows.length)} sub={`${totals.dependents} dependent${totals.dependents === 1 ? "" : "s"}`} icon={Users} tint="bg-mint/10 text-mint" />
        <Stat label="Dependents" value={String(totals.dependents)} sub={rows.length ? `${Math.round((totals.dependents / rows.length) * 100)}% of family` : "—"} icon={HeartHandshake} tint="bg-violet-500/10 text-violet-300" />
        <Stat label="Nominees" value={String(totals.nominees)} sub={rows.length ? `${Math.round((totals.nominees / rows.length) * 100)}% covered` : "—"} icon={ShieldCheck} tint="bg-emerald-500/10 text-emerald-400" />
        <Stat label="Average Age" value={totals.avgAge ? `${totals.avgAge} yr` : "—"} sub="Across members with DOB" icon={Cake} tint="bg-amber-500/10 text-amber-400" />
      </div>

      {empty ? (
        <Empty primary="No members yet" secondary="Add family members to link them to assets, accounts and nominees." cta={{ label: "Add member", onClick: () => { setEditing(null); setDialogOpen(true); } }} />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-4">
            <div className="rounded-2xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold text-foreground">Wealth Distribution</h3>
              {alloc.items.length === 0 ? (
                <EmptyMini label="Link assets, accounts or investments to a member to see distribution." />
              ) : (
                <div className="mt-4 flex items-center gap-4">
                  <div className="relative h-[170px] w-[170px] shrink-0">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={alloc.items} dataKey="amt" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="none">
                          {alloc.items.map((a) => <Cell key={a.name} fill={a.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                      <div>
                        <div className="font-display text-sm font-bold text-foreground">{inrCompact(alloc.totalWealth)}</div>
                        <div className="text-[10px] text-muted-foreground">Family Wealth</div>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-0 flex-1 space-y-2.5">
                    {alloc.items.map((a) => (
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
              )}
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm font-semibold text-foreground">Family Members ({filtered.length})</h3>
              <div className="relative ml-2 flex-1 min-w-[180px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                  placeholder="Search members..."
                  className="w-full rounded-xl border border-border bg-surface-2 py-2 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-mint/50 focus:outline-none"
                />
              </div>
              <FilterDropdown
                label={rel === "all" ? "All Relations" : rel}
                value={rel}
                onChange={(v) => { setRel(v); setPage(1); }}
                options={[{ value: "all", label: "All Relations" }, ...RELATIONSHIPS.map((c) => ({ value: c, label: c }))]}
              />
              <FilterDropdown
                label={filter === "all" ? "All" : titleCase(filter)}
                value={filter}
                onChange={(v) => { setFilter(v); setPage(1); }}
                options={[
                  { value: "all", label: "All" },
                  { value: "dependents", label: "Dependents" },
                  { value: "nominees", label: "Nominees" },
                ]}
              />
              <FilterDropdown
                label={`Sort: ${sortLabel(sort)}`}
                value={sort}
                onChange={(v) => setSort(v as Sort)}
                icon={ArrowUpDown}
                options={[
                  { value: "name_asc", label: "Name (A→Z)" },
                  { value: "age_desc", label: "Age ↓" },
                  { value: "age_asc", label: "Age ↑" },
                  { value: "relationship", label: "Relationship" },
                ]}
              />
              <IoMenu
                onImport={handleImport}
                onExportCsv={() => exportCsv("family", exportCols as any, filtered)}
                onExportXlsx={() => exportXlsx("family", exportCols as any, filtered)}
                onExportJson={() => exportJson("family", filtered)}
                onExportPdf={() =>
                  exportPdf("Family Members", exportCols as any, filtered, {
                    subtitle: `${filtered.length} member${filtered.length === 1 ? "" : "s"} · ${totals.dependents} dependents · ${totals.nominees} nominees`,
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
                        <th className="py-3 pl-2 font-medium">Member</th>
                        <th className="py-3 font-medium">Relationship</th>
                        <th className="py-3 font-medium">Age</th>
                        <th className="py-3 font-medium">Contact</th>
                        <th className="py-3 font-medium">Net Worth</th>
                        <th className="py-3 font-medium">Flags</th>
                        <th className="py-3 pr-2 font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((m, i) => {
                        const age = ageFromDob(m.date_of_birth);
                        const nw = netByMember.get(m.id) || 0;
                        return (
                          <tr key={m.id} className="border-b border-border/50 last:border-0 hover:bg-surface-2/40">
                            <td className="py-3 pl-2">
                              <div className="flex items-center gap-3">
                                <div className={`grid h-9 w-9 place-items-center rounded-full ${TINTS[((page - 1) * PAGE + i) % TINTS.length]} text-xs font-semibold`}>
                                  {initials(m.name)}
                                </div>
                                <div className="min-w-0">
                                  <div className="font-medium text-foreground truncate">{m.name}</div>
                                  {m.date_of_birth && (
                                    <div className="text-[10px] text-muted-foreground">{formatDate(m.date_of_birth)}</div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-3 text-muted-foreground">{m.relationship}</td>
                            <td className="py-3 text-muted-foreground tabular-nums">{age != null ? `${age} yr` : "—"}</td>
                            <td className="py-3 text-muted-foreground">
                              <div className="flex flex-col gap-0.5">
                                {m.email && (
                                  <a href={`mailto:${m.email}`} className="inline-flex items-center gap-1 text-xs hover:text-mint">
                                    <Mail className="h-3 w-3" /> {m.email}
                                  </a>
                                )}
                                {m.phone && (
                                  <a href={`tel:${m.phone}`} className="inline-flex items-center gap-1 text-xs hover:text-mint">
                                    <Phone className="h-3 w-3" /> {m.phone}
                                  </a>
                                )}
                                {!m.email && !m.phone && <span className="text-xs">—</span>}
                              </div>
                            </td>
                            <td className="py-3 text-foreground tabular-nums font-medium">{nw > 0 ? inrCompact(nw) : "—"}</td>
                            <td className="py-3">
                              <div className="flex flex-wrap gap-1">
                                {m.is_dependent && <Pill tint="bg-violet-500/15 text-violet-300">Dependent</Pill>}
                                {m.is_nominee && <Pill tint="bg-emerald-500/15 text-emerald-400">Nominee</Pill>}
                                {!m.is_dependent && !m.is_nominee && <span className="text-xs text-muted-foreground">—</span>}
                              </div>
                            </td>
                            <td className="py-3 pr-2">
                              <RowMenu
                                onEdit={() => { setEditing(m); setDialogOpen(true); }}
                                onDelete={() => setConfirm(m)}
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
            Tag members as nominees to ensure claim continuity across investments and policies.
          </div>
        </>
      )}

      <FamilyDialog
        open={dialogOpen}
        onOpenChange={(v) => { setDialogOpen(v); if (!v) setEditing(null); }}
        existing={editing}
      />

      <AlertDialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove member?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <strong>{confirm?.name}</strong>. Linked assets/accounts will keep working but lose owner attribution.
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
              {del.isPending ? "Removing…" : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

/* =============== Helpers =============== */
function initials(name: string) {
  return name.split(" ").map((p) => p[0] ?? "").slice(0, 2).join("").toUpperCase();
}

function Stat({ label, value, sub, icon: Icon, tint }: { label: string; value: string; sub: string; icon: any; tint: string }) {
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
          <div className="mt-1 text-xs font-medium text-muted-foreground">{sub}</div>
        </div>
      </div>
    </div>
  );
}

function Pill({ children, tint }: { children: React.ReactNode; tint: string }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${tint}`}>{children}</span>
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

function RowMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="rounded-lg p-1.5 text-muted-foreground hover:bg-surface-2 hover:text-foreground">
          <MoreVertical className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem onClick={onEdit} className="gap-2 text-sm">
          <Pencil className="h-4 w-4" /> Edit
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onDelete} className="gap-2 text-sm text-rose-400 focus:text-rose-400">
          <Trash2 className="h-4 w-4" /> Remove
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
  return <div className="mt-4 grid h-full place-items-center text-xs text-muted-foreground">{label}</div>;
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
    case "age_desc": return "Age ↓";
    case "age_asc": return "Age ↑";
    case "relationship": return "Relationship";
    default: return "Name ↑";
  }
}

function titleCase(s: string) {
  return s.replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}