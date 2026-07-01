import * as React from "react";
import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Bell,
  Plus,
  CalendarDays,
  List,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Search,
  Repeat,
} from "lucide-react";
import {
  useReminders,
  useCompleteReminder,
  REMINDER_KIND_LABEL,
  type Reminder,
  inr,
  daysUntil,
} from "@/lib/tools-api";
import { TextTabs } from "@/components/text-tabs";
import { ReminderDialog } from "@/components/reminder-dialog";

export function RemindersView() {
  const q = useReminders();
  const complete = useCompleteReminder();
  const [view, setView] = useState<"list" | "calendar">("list");
  const [tab, setTab] = useState<"upcoming" | "completed" | "all">("upcoming");
  const [search, setSearch] = useState("");
  const [dialog, setDialog] = useState<{ open: boolean; reminder?: Reminder }>({ open: false });

  const reminders = useMemo(() => {
    const list = q.data ?? [];
    return list.filter((r) => {
      if (tab === "upcoming" && r.status !== "upcoming") return false;
      if (tab === "completed" && r.status !== "completed") return false;
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [q.data, tab, search]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bell className="h-4 w-4 text-[var(--primary)]" />
          <h3 className="text-sm font-semibold text-[var(--text-main)]">Reminders</h3>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <div className="relative min-w-0 flex-1 sm:flex-none">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--text-muted)]" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="h-8 w-full pl-8 bg-[var(--bg-primary)]/40 text-xs sm:w-44"
            />
          </div>
          <div className="flex items-center rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/30 p-0.5">
            <button
              onClick={() => setView("list")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition ${view === "list" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--text-muted)]"}`}
            >
              <List className="h-3.5 w-3.5" /> List
            </button>
            <button
              onClick={() => setView("calendar")}
              className={`flex items-center gap-1 rounded-md px-2 py-1 text-xs transition ${view === "calendar" ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "text-[var(--text-muted)]"}`}
            >
              <CalendarDays className="h-3.5 w-3.5" /> Calendar
            </button>
          </div>
          <Button
            size="sm"
            className="h-8 gap-1.5 bg-mint text-mint-foreground hover:bg-mint/90"
            onClick={() => setDialog({ open: true })}
          >
            <Plus className="h-3.5 w-3.5" /> New Reminder
          </Button>
        </div>
      </div>

      <TextTabs
        items={[
          { value: "upcoming", label: "Upcoming" },
          { value: "completed", label: "Completed" },
          { value: "all", label: "All" },
        ]}
        value={tab}
        onChange={setTab}
      />

      {q.isLoading && (
        <Card className="glass-card flex items-center justify-center border-[var(--border)] p-10">
          <Loader2 className="h-5 w-5 animate-spin text-[var(--primary)]" />
        </Card>
      )}
      {q.error && (
        <Card className="glass-card border-[var(--border)] p-6">
          <div className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="h-4 w-4" /> Failed to load reminders.
          </div>
        </Card>
      )}
      {!q.isLoading && !q.error && reminders.length === 0 && (
        <Card className="glass-card border-[var(--border)] p-8 text-center">
          <Bell className="mx-auto h-7 w-7 text-[var(--primary)]" />
          <h4 className="mt-3 text-sm font-semibold text-[var(--text-main)]">No reminders yet</h4>
          <p className="mt-1 text-xs text-[var(--text-muted)]">
            Add reminders for SIPs, EMIs, premiums, bills and more.
          </p>
        </Card>
      )}

      {!q.isLoading && !q.error && reminders.length > 0 && view === "list" && (
        <Card className="glass-card border-[var(--border)] divide-y divide-[var(--border)]">
          {reminders.map((r) => (
            <ReminderRow
              key={r.id}
              reminder={r}
              onEdit={() => setDialog({ open: true, reminder: r })}
              onComplete={() => complete.mutate(r)}
            />
          ))}
        </Card>
      )}

      {!q.isLoading && !q.error && reminders.length > 0 && view === "calendar" && (
        <CalendarGrid
          reminders={reminders}
          onPick={(r) => setDialog({ open: true, reminder: r })}
        />
      )}

      <ReminderDialog
        open={dialog.open}
        onOpenChange={(o) => setDialog({ open: o, reminder: o ? dialog.reminder : undefined })}
        reminder={dialog.reminder}
      />
    </div>
  );
}

function ReminderRow({
  reminder,
  onEdit,
  onComplete,
}: {
  reminder: Reminder;
  onEdit: () => void;
  onComplete: () => void;
}) {
  const dleft = daysUntil(reminder.due_date);
  const overdue = reminder.status === "upcoming" && dleft < 0;
  const due = reminder.status === "upcoming" && dleft >= 0 && dleft <= reminder.notify_days_before;
  const tone = overdue ? "destructive" : due ? "warn" : "muted";
  return (
    <div className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
      <button onClick={onEdit} className="flex items-start gap-3 text-left min-w-0">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
          <Bell className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="text-sm font-semibold text-[var(--text-main)]">{reminder.title}</h4>
            <Badge variant="outline" className="border-[var(--border)] text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
              {REMINDER_KIND_LABEL[reminder.kind]}
            </Badge>
            {reminder.recurrence !== "none" && (
              <Badge variant="outline" className="border-[var(--border)] gap-1 text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
                <Repeat className="h-2.5 w-2.5" />
                {reminder.recurrence}
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-muted)]">
            {reminder.amount > 0 ? `${inr(reminder.amount)} · ` : ""}
            Due {reminder.due_date}
            {reminder.status === "upcoming" && (
              <span className={
                tone === "destructive" ? " text-destructive" :
                tone === "warn" ? " text-amber-400" : ""
              }>
                {" · "}
                {dleft === 0 ? "Today" : dleft > 0 ? `in ${dleft} day${dleft === 1 ? "" : "s"}` : `${Math.abs(dleft)} day${Math.abs(dleft) === 1 ? "" : "s"} overdue`}
              </span>
            )}
            {reminder.status === "completed" && " · Completed"}
          </p>
        </div>
      </button>
      <div className="flex shrink-0 gap-1.5">
        {reminder.status === "upcoming" && (
          <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={onComplete}>
            <CheckCircle2 className="h-3.5 w-3.5" /> {reminder.recurrence === "none" ? "Done" : "Mark Paid"}
          </Button>
        )}
        <Button size="sm" variant="outline" className="h-8" onClick={onEdit}>
          Edit
        </Button>
      </div>
    </div>
  );
}

function CalendarGrid({ reminders, onPick }: { reminders: Reminder[]; onPick: (r: Reminder) => void }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });
  const monthLabel = cursor.toLocaleString(undefined, { month: "long", year: "numeric" });
  const firstWeekday = cursor.getDay();
  const daysInMonth = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
  const cells: { date: string | null; items: Reminder[] }[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push({ date: null, items: [] });
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    cells.push({ date: iso, items: reminders.filter((r) => r.due_date === iso) });
  }
  const today = new Date().toISOString().slice(0, 10);
  return (
    <Card className="glass-card border-[var(--border)] p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold text-[var(--text-main)]">{monthLabel}</div>
        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1))}>
            Prev
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => { const d = new Date(); d.setDate(1); setCursor(d); }}>
            Today
          </Button>
          <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1))}>
            Next
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] uppercase tracking-wide text-[var(--text-muted)]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => <div key={d} className="py-1">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((c, i) => (
          <div
            key={i}
            className={`min-h-[68px] rounded-md border p-1.5 text-left text-[11px] ${
              c.date === today ? "border-[var(--primary)]/50 bg-[var(--primary)]/5" : "border-[var(--border)] bg-[var(--bg-primary)]/30"
            } ${!c.date ? "opacity-40" : ""}`}
          >
            {c.date && (
              <>
                <div className="text-[var(--text-muted)]">{Number(c.date.slice(-2))}</div>
                <div className="mt-1 space-y-0.5">
                  {c.items.slice(0, 3).map((r) => (
                    <button
                      key={r.id}
                      onClick={() => onPick(r)}
                      className="block w-full truncate rounded bg-[var(--primary)]/15 px-1 py-0.5 text-left text-[10px] text-[var(--primary)] hover:bg-[var(--primary)]/25"
                      title={r.title}
                    >
                      {r.title}
                    </button>
                  ))}
                  {c.items.length > 3 && (
                    <div className="text-[10px] text-[var(--text-muted)]">+{c.items.length - 3} more</div>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}