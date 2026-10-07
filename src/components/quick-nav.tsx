import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Search } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { SHORTCUTS, SHORTCUT_GROUPS, type Shortcut } from "@/lib/shortcuts";
import { supabase } from "@/integrations/supabase/client";
import { inrCompact } from "@/lib/wealth-api";

export function navigateToShortcut(
  navigate: ReturnType<typeof useNavigate>,
  s: Shortcut,
) {
  const [to, hash] = s.path.split("#");
  navigate({ to, ...(hash ? { hash } : {}) } as never);
}

type Hit = { id: string; title: string; meta: string; to: string; search?: Record<string, string> };
type Results = { investments: Hit[]; transactions: Hit[]; goals: Hit[]; liabilities: Hit[]; recurring: Hit[] };
const EMPTY: Results = { investments: [], transactions: [], goals: [], liabilities: [], recurring: [] };

const fmtDate = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${y}`;
};

async function searchData(raw: string): Promise<Results> {
  // Strip characters that would break PostgREST filter syntax.
  const q = raw.replace(/[%,()*{}"\\]/g, " ").trim();
  if (q.length < 2) return EMPTY;
  const like = `%${q}%`;
  const [inv, assets, tx, goals, liab, rec] = await Promise.all([
    supabase.from("wealth_investments").select("id, name, symbol, current_value").or(`name.ilike.${like},symbol.ilike.${like}`).limit(5),
    supabase.from("wealth_assets").select("id, name, current_value").ilike("name", like).limit(3),
    supabase
      .from("money_transactions")
      .select("id, merchant, amount, kind, occurred_on")
      .or(`merchant.ilike.${like},note.ilike.${like},tags.cs.{"${q}"}`)
      .order("occurred_on", { ascending: false })
      .limit(5),
    supabase.from("planner_goals").select("id, name, target_amount, saved_amount").ilike("name", like).limit(3),
    supabase.from("wealth_liabilities").select("id, name, outstanding, lender").or(`name.ilike.${like},lender.ilike.${like}`).limit(3),
    supabase.from("tools_reminders").select("id, title, amount, recurrence").ilike("title", like).neq("recurrence", "none").limit(3),
  ]);
  return {
    investments: [
      ...(inv.data ?? []).map((r) => ({ id: `i-${r.id}`, title: r.name, meta: inrCompact(Number(r.current_value) || 0), to: "/wealth", search: { tab: "assets" } })),
      ...(assets.data ?? []).map((r) => ({ id: `a-${r.id}`, title: r.name, meta: inrCompact(Number(r.current_value) || 0), to: "/wealth", search: { tab: "assets" } })),
    ],
    transactions: (tx.data ?? []).map((r) => ({
      id: `t-${r.id}`,
      title: r.merchant,
      meta: `${r.kind === "income" ? "+" : "-"}${inrCompact(Number(r.amount) || 0)} · ${fmtDate(r.occurred_on)}`,
      to: "/money",
    })),
    goals: (goals.data ?? []).map((r) => {
      const t = Number(r.target_amount) || 0;
      const pct = t > 0 ? Math.min(100, ((Number(r.saved_amount) || 0) / t) * 100) : 0;
      return { id: `g-${r.id}`, title: r.name, meta: `${pct.toFixed(0)}%`, to: "/planner" };
    }),
    liabilities: (liab.data ?? []).map((r) => ({ id: `l-${r.id}`, title: r.name, meta: inrCompact(Number(r.outstanding) || 0), to: "/wealth", search: { tab: "liabilities" } })),
    recurring: (rec.data ?? []).map((r) => ({ id: `r-${r.id}`, title: r.title, meta: r.recurrence, to: "/tools" })),
  };
}

/**
 * Global quick navigation + data search. Opens with Cmd/Ctrl+K (or the header
 * button); jumps to pages and searches investments, transactions, goals,
 * liabilities and recurring reminders.
 */
export function QuickNav() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Results>(EMPTY);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const t = setTimeout(() => {
      searchData(query)
        .then((r) => !cancelled && setResults(r))
        .catch(() => !cancelled && setResults(EMPTY));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, open]);

  const grouped = useMemo(
    () =>
      SHORTCUT_GROUPS.map((g) => ({
        group: g,
        items: SHORTCUTS.filter((s) => s.group === g),
      })).filter((g) => g.items.length > 0),
    [],
  );

  const dataGroups: { heading: string; items: Hit[] }[] = [
    { heading: "Investments & Assets", items: results.investments },
    { heading: "Transactions", items: results.transactions },
    { heading: "Goals", items: results.goals },
    { heading: "Liabilities", items: results.liabilities },
    { heading: "Recurring", items: results.recurring },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Quick navigation"
        title="Quick navigation (Ctrl/Cmd + K)"
        className="grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition-all duration-200 hover:bg-[rgba(33,219,210,0.12)] hover:text-[#21DBD2]"
      >
        <Search className="h-4 w-4" />
      </button>

      <CommandDialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setQuery("");
            setResults(EMPTY);
          }
        }}
      >
        <CommandInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search pages, holdings, transactions, goals…"
        />
        <CommandList>
          <CommandEmpty>No matches.</CommandEmpty>
          {dataGroups.map(({ heading, items }) =>
            items.length === 0 ? null : (
              <CommandGroup key={heading} heading={heading}>
                {items.map((h) => (
                  <CommandItem
                    key={h.id}
                    value={`${h.id} ${h.title} ${query}`}
                    onSelect={() => {
                      setOpen(false);
                      navigate({ to: h.to, ...(h.search ? { search: h.search } : {}) } as never);
                    }}
                  >
                    <span className="truncate">{h.title}</span>
                    <span className="ml-auto shrink-0 font-mono text-[10px] text-muted-foreground">{h.meta}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ),
          )}
          {grouped.map(({ group, items }) => (
            <CommandGroup key={group} heading={group}>
              {items.map((s) => (
                <CommandItem
                  key={s.id}
                  value={`${s.label} ${s.group} ${s.keywords ?? ""}`}
                  onSelect={() => {
                    setOpen(false);
                    navigateToShortcut(navigate, s);
                  }}
                >
                  {s.label}
                  <span className="ml-auto text-[10px] text-muted-foreground">{s.path}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  );
}
