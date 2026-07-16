import * as React from "react";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ClearButton } from "@/components/clear-button";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import {
  REMINDER_KINDS,
  REMINDER_KIND_LABEL,
  type Reminder,
  type ReminderKind,
  type Recurrence,
  useUpsertReminder,
  useDeleteReminder,
} from "@/lib/tools-api";
import { Trash2 } from "lucide-react";

const RECS: { value: Recurrence; label: string }[] = [
  { value: "none", label: "One-time" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "yearly", label: "Yearly" },
];

export function ReminderDialog({
  open,
  onOpenChange,
  reminder,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reminder?: Reminder;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [kind, setKind] = useState<ReminderKind>("custom");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [dueDate, setDueDate] = useState<string>(today);
  const [recurrence, setRecurrence] = useState<Recurrence>("monthly");
  const [notifyDays, setNotifyDays] = useState<number>(1);
  const [notifyEnabled, setNotifyEnabled] = useState(true);
  const [notes, setNotes] = useState("");

  const upsert = useUpsertReminder();
  const del = useDeleteReminder();

  useEffect(() => {
    if (!open) return;
    if (reminder) {
      setKind(reminder.kind);
      setTitle(reminder.title);
      setAmount(Number(reminder.amount));
      setDueDate(reminder.due_date);
      setRecurrence(reminder.recurrence);
      setNotifyDays(reminder.notify_days_before);
      setNotifyEnabled(reminder.notify_enabled);
      setNotes(reminder.notes ?? "");
    } else {
      setKind("custom");
      setTitle("");
      setAmount(0);
      setDueDate(today);
      setRecurrence("monthly");
      setNotifyDays(1);
      setNotifyEnabled(true);
      setNotes("");
    }
  }, [open, reminder, today]);

  const submit = async () => {
    if (!title.trim()) return;
    await upsert.mutateAsync({
      id: reminder?.id,
      kind,
      title,
      amount,
      due_date: dueDate,
      recurrence,
      notify_days_before: notifyDays,
      notify_enabled: notifyEnabled,
      notes,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{reminder ? "Edit Reminder" : "New Reminder"}</DialogTitle>
          <DialogDescription>
            Stay on top of SIPs, EMIs, premiums, bills and more.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid gap-1.5">
            <Label className="text-xs text-[var(--text-muted)]">Type</Label>
            <Select value={kind} onValueChange={(v) => setKind(v as ReminderKind)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REMINDER_KINDS.map((k) => (
                  <SelectItem key={k} value={k}>{REMINDER_KIND_LABEL[k]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-[var(--text-muted)]">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. HDFC Mutual Fund SIP" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs text-[var(--text-muted)]">Amount (₹)</Label>
              <Input type="number" value={amount || ""} onChange={(e) => setAmount(parseFloat(e.target.value) || 0)} />
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-[var(--text-muted)]">Due Date</Label>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label className="text-xs text-[var(--text-muted)]">Repeat</Label>
              <Select value={recurrence} onValueChange={(v) => setRecurrence(v as Recurrence)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label className="text-xs text-[var(--text-muted)]">Notify (days before)</Label>
              <Input type="number" min={0} value={notifyDays || ""} onChange={(e) => setNotifyDays(parseInt(e.target.value) || 0)} />
            </div>
          </div>
          <div className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--bg-primary)]/30 px-3 py-2">
            <Label className="text-sm">Notifications</Label>
            <Switch checked={notifyEnabled} onCheckedChange={setNotifyEnabled} />
          </div>
          <div className="grid gap-1.5">
            <Label className="text-xs text-[var(--text-muted)]">Notes</Label>
            <Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        <DialogFooter className="flex sm:justify-between gap-2">
          {reminder ? (
            <Button
              variant="outline"
              className="border-destructive/40 text-destructive hover:bg-destructive/10"
              onClick={async () => {
                await del.mutateAsync(reminder.id);
                onOpenChange(false);
              }}
            >
              <Trash2 className="mr-1.5 h-4 w-4" /> Delete
            </Button>
          ) : <span />}
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
            <ClearButton
              dirty={!!(title || amount || notes)}
              onClear={() => {
                setKind("custom");
                setTitle("");
                setAmount(0);
                setDueDate(today);
                setRecurrence("monthly");
                setNotifyDays(1);
                setNotifyEnabled(true);
                setNotes("");
              }}
            />
            <Button
              className="bg-mint text-mint-foreground hover:bg-mint/90"
              onClick={submit}
              disabled={upsert.isPending || !title.trim()}
            >
              {reminder ? "Save Changes" : "Create Reminder"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}