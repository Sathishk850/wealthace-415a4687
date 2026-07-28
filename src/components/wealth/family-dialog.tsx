import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  RELATIONSHIPS, type FamilyMember, type FamilyMemberInput, useUpsertFamilyMember,
} from "@/lib/wealth-api";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  existing?: FamilyMember | null;
};

const empty: FamilyMemberInput = {
  name: "",
  relationship: "Self",
  date_of_birth: null,
  gender: null,
  is_dependent: false,
  is_nominee: false,
  pan: "",
  aadhaar_masked: "",
  email: "",
  phone: "",
  notes: "",
};

export function FamilyDialog({ open, onOpenChange, existing }: Props) {
  const [form, setForm] = useState<FamilyMemberInput>(empty);
  const upsert = useUpsertFamilyMember();

  useEffect(() => {
    if (!open) return;
    setForm(
      existing
        ? {
            id: existing.id,
            name: existing.name,
            relationship: existing.relationship,
            date_of_birth: existing.date_of_birth,
            gender: existing.gender,
            is_dependent: existing.is_dependent,
            is_nominee: existing.is_nominee,
            pan: existing.pan ?? "",
            aadhaar_masked: existing.aadhaar_masked ?? "",
            email: existing.email ?? "",
            phone: existing.phone ?? "",
            notes: existing.notes ?? "",
          }
        : empty,
    );
  }, [open, existing]);

  const submit = async (keepOpen = false) => {
    if (!form.name.trim()) return toast.error("Name is required");
    try {
      await upsert.mutateAsync(form);
      if (keepOpen && !existing) setForm(empty);
      else onOpenChange(false);
    } catch {
      /* hook toast */
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{existing ? "Edit Family Member" : "Add Family Member"}</DialogTitle>
          <DialogDescription>
            Track family members, dependents and nominees linked to your wealth.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name *" className="sm:col-span-2">
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Full name"
              maxLength={120}
            />
          </Field>
          <Field label="Relationship *">
            <Select value={form.relationship} onValueChange={(v) => setForm({ ...form, relationship: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELATIONSHIPS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Date of birth">
            <DatePicker
              value={form.date_of_birth ?? ""}
              onChange={(v) => setForm({ ...form, date_of_birth: v || null })}
            />
          </Field>
          <Field label="Gender">
            <Select value={form.gender ?? "unspecified"} onValueChange={(v) => setForm({ ...form, gender: v === "unspecified" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Prefer not to say</SelectItem>
                <SelectItem value="male">Male</SelectItem>
                <SelectItem value="female">Female</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field label="Email">
            <Input
              type="email"
              value={form.email ?? ""}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <Input
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="PAN">
            <Input
              value={form.pan ?? ""}
              onChange={(e) => setForm({ ...form, pan: e.target.value.toUpperCase() })}
              maxLength={10}
              placeholder="ABCDE1234F"
            />
          </Field>
          <Field label="Aadhaar (masked)">
            <Input
              value={form.aadhaar_masked ?? ""}
              onChange={(e) => setForm({ ...form, aadhaar_masked: e.target.value })}
              placeholder="XXXX XXXX 1234"
            />
          </Field>

          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2">
            <div>
              <div className="text-sm text-foreground">Dependent</div>
              <div className="text-[10px] text-muted-foreground">Financially dependent on you</div>
            </div>
            <Switch
              checked={!!form.is_dependent}
              onCheckedChange={(v) => setForm({ ...form, is_dependent: v })}
            />
          </div>
          <div className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-3 py-2">
            <div>
              <div className="text-sm text-foreground">Nominee</div>
              <div className="text-[10px] text-muted-foreground">Listed as nominee anywhere</div>
            </div>
            <Switch
              checked={!!form.is_nominee}
              onCheckedChange={(v) => setForm({ ...form, is_nominee: v })}
            />
          </div>

          <Field label="Notes" className="sm:col-span-2">
            <Textarea
              rows={2}
              value={form.notes ?? ""}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={upsert.isPending}>Cancel</Button>
          {!existing && (
            <Button variant="outline" onClick={() => submit(true)} disabled={upsert.isPending}>
              {upsert.isPending ? "Saving…" : "Save & Add"}
            </Button>
          )}
          <Button
            className="bg-mint text-[#04121C] hover:brightness-110"
            onClick={() => submit(false)}
            disabled={upsert.isPending}
          >
            {upsert.isPending ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-xs">{label}</Label>
      {children}
    </div>
  );
}