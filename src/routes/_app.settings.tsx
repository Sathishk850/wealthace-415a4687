import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { TextTabs } from "@/components/text-tabs";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";
import { PaymentAccountsPanel } from "@/components/payment/payment-accounts-panel";
import { WhatsNewPage } from "@/components/settings/whats-new-page";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
import { getPinStatus, setPin, disablePin, deleteAccount } from "@/lib/pin.functions";
import { Input } from "@/components/ui/input";
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

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings · Wealth Ace" },
      { name: "description", content: "Manage your account and preferences." },
    ],
  }),
  component: Settings,
});

function Settings() {
  const [tab, setTab] = useState("general");
  return (
    <>
      <PageHeader title="Settings" description="Manage your account and preferences." />
      <TextTabs
        items={[
          { value: "general", label: "General" },
          { value: "payments", label: "Payments" },
          { value: "notifications", label: "Notifications" },
          { value: "appearance", label: "Appearance" },
          { value: "security", label: "Security" },
          { value: "data", label: "Data & Backup" },
          { value: "whats-new", label: "What's New" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="mt-4">
        {tab === "general" && <GeneralTab />}
        {tab === "payments" && <PaymentAccountsPanel />}
        {tab === "notifications" && <NotificationPreferencesForm />}
        {tab === "appearance" && <AppearanceTab />}
        {tab === "security" && <SecurityTab />}
        {tab === "data" && <DataTab />}
        {tab === "whats-new" && <WhatsNewPage showHeader={false} />}
      </div>
    </>
  );
}

function PlaceholderCard({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="glass-card border-[var(--border)] p-5">
      <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
      <ul className="ml-5 list-disc space-y-1 text-sm text-muted-foreground">
        {items.map((i) => <li key={i}>{i}</li>)}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Coming soon — wiring in the next phase.</p>
    </Card>
  );
}

const CURRENCIES = [
  { v: "USD", l: "USD — US Dollar" },
  { v: "EUR", l: "EUR — Euro" },
  { v: "GBP", l: "GBP — British Pound" },
  { v: "INR", l: "INR — Indian Rupee" },
  { v: "JPY", l: "JPY — Japanese Yen" },
  { v: "AUD", l: "AUD — Australian Dollar" },
  { v: "CAD", l: "CAD — Canadian Dollar" },
  { v: "SGD", l: "SGD — Singapore Dollar" },
  { v: "AED", l: "AED — UAE Dirham" },
  { v: "CHF", l: "CHF — Swiss Franc" },
];
const LANGUAGES = [
  { v: "en", l: "English" },
  { v: "es", l: "Español" },
  { v: "fr", l: "Français" },
  { v: "de", l: "Deutsch" },
  { v: "hi", l: "हिन्दी" },
  { v: "zh", l: "中文" },
  { v: "ja", l: "日本語" },
  { v: "pt", l: "Português" },
];
const TIMEZONES = [
  "UTC","America/New_York","America/Chicago","America/Denver","America/Los_Angeles",
  "Europe/London","Europe/Paris","Europe/Berlin","Asia/Dubai","Asia/Kolkata",
  "Asia/Singapore","Asia/Tokyo","Australia/Sydney",
];
const DATE_FORMATS = [
  { v: "DD/MM/YYYY", l: "DD/MM/YYYY (30/06/2026)" },
  { v: "YYYY-MM-DD", l: "YYYY-MM-DD (2026-06-30)" },
  { v: "DD MMM YYYY", l: "DD MMM YYYY (30 Jun 2026)" },
];
const NUMBER_FORMATS = [
  { v: "en-US", l: "1,234,567.89" },
  { v: "de-DE", l: "1.234.567,89" },
  { v: "en-IN", l: "12,34,567.89" },
  { v: "fr-FR", l: "1 234 567,89" },
];

type Prefs = {
  currency: string;
  language: string;
  timezone: string;
  date_format: string;
  number_format: string;
};

const DEFAULTS: Prefs = {
  currency: "USD",
  language: "en",
  timezone: "UTC",
  date_format: "DD/MM/YYYY",
  number_format: "en-US",
};

function GeneralTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Prefs>(DEFAULTS);

  const userQuery = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });

  const prefsQuery = useQuery({
    queryKey: ["profile-prefs", userQuery.data?.id],
    enabled: !!userQuery.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("currency, language, timezone, date_format, number_format")
        .eq("user_id", userQuery.data!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Prefs | null) ?? null;
    },
  });

  useEffect(() => {
    if (prefsQuery.data) setForm({ ...DEFAULTS, ...prefsQuery.data });
  }, [prefsQuery.data]);

  const save = useMutation({
    mutationFn: async () => {
      const userId = userQuery.data?.id;
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase
        .from("profiles")
        .upsert({ user_id: userId, ...form });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Preferences saved");
      qc.invalidateQueries({ queryKey: ["profile-prefs"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const set = <K extends keyof Prefs>(k: K, v: Prefs[K]) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <Card className="glass-card border-[var(--border)] p-6">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-foreground">Regional preferences</h3>
        <p className="text-xs text-muted-foreground">Controls how amounts, dates, and numbers display across the app.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <SelectField label="Currency" value={form.currency} onChange={(v) => set("currency", v)}
          options={CURRENCIES.map((c) => ({ value: c.v, label: c.l }))} />
        <SelectField label="Language" value={form.language} onChange={(v) => set("language", v)}
          options={LANGUAGES.map((c) => ({ value: c.v, label: c.l }))} />
        <SelectField label="Time Zone" value={form.timezone} onChange={(v) => set("timezone", v)}
          options={TIMEZONES.map((t) => ({ value: t, label: t }))} />
        <SelectField label="Date Format" value={form.date_format} onChange={(v) => set("date_format", v)}
          options={DATE_FORMATS.map((c) => ({ value: c.v, label: c.l }))} />
        <SelectField label="Number Format" value={form.number_format} onChange={(v) => set("number_format", v)}
          options={NUMBER_FORMATS.map((c) => ({ value: c.v, label: c.l }))} />
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={() => save.mutate()} disabled={save.isPending || prefsQuery.isLoading}>
          {save.isPending ? "Saving…" : "Save preferences"}
        </Button>
      </div>
    </Card>
  );
}

function SelectField({
  label, value, onChange, options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

type Appearance = {
  theme: "system" | "light" | "dark";
  compact_mode: boolean;
  default_chart_range: string;
  chart_animations: boolean;
};

const APPEARANCE_DEFAULTS: Appearance = {
  theme: "system",
  compact_mode: false,
  default_chart_range: "3M",
  chart_animations: true,
};

const CHART_RANGES = ["1M", "3M", "6M", "1Y"];

function applyTheme(theme: Appearance["theme"]) {
  if (typeof window === "undefined") return;
  const root = document.documentElement;
  let mode: "dark" | "light" = "dark";
  if (theme === "system") {
    mode = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } else {
    mode = theme;
  }
  root.classList.toggle("dark", mode === "dark");
  try { window.localStorage.setItem("fv-theme", mode); } catch {}
}

function AppearanceTab() {
  const qc = useQueryClient();
  const [form, setForm] = useState<Appearance>(APPEARANCE_DEFAULTS);

  const userQuery = useQuery({
    queryKey: ["auth-user"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      return data.user;
    },
  });

  const prefsQuery = useQuery({
    queryKey: ["profile-appearance", userQuery.data?.id],
    enabled: !!userQuery.data?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("theme, compact_mode, default_chart_range, chart_animations")
        .eq("user_id", userQuery.data!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as Appearance | null) ?? null;
    },
  });

  useEffect(() => {
    if (prefsQuery.data) setForm({ ...APPEARANCE_DEFAULTS, ...prefsQuery.data });
  }, [prefsQuery.data]);

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("compact", form.compact_mode);
  }, [form.compact_mode]);

  const save = useMutation({
    mutationFn: async () => {
      const userId = userQuery.data?.id;
      if (!userId) throw new Error("Not signed in");
      const { error } = await supabase.from("profiles").upsert({ user_id: userId, ...form });
      if (error) throw error;
    },
    onSuccess: () => {
      applyTheme(form.theme);
      toast.success("Appearance saved");
      qc.invalidateQueries({ queryKey: ["profile-appearance"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed to save"),
  });

  const set = <K extends keyof Appearance>(k: K, v: Appearance[K]) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="space-y-4">
      <Card className="glass-card border-[var(--border)] p-6">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-foreground">Theme</h3>
          <p className="text-xs text-muted-foreground">Choose how Wealth Ace looks on this account.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {(["system", "light", "dark"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { set("theme", t); applyTheme(t); }}
              className={`rounded-lg border px-4 py-3 text-left text-sm transition ${
                form.theme === t
                  ? "border-[var(--primary)] bg-[var(--primary)]/10 text-foreground"
                  : "border-border bg-surface/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              <div className="font-medium capitalize">{t}</div>
              <div className="text-xs text-muted-foreground">
                {t === "system" ? "Match device" : t === "light" ? "Always light" : "Always dark"}
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="glass-card border-[var(--border)] p-6">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-foreground">Dashboard & charts</h3>
          <p className="text-xs text-muted-foreground">Defaults applied when opening modules and charts.</p>
        </div>
        <div className="space-y-5">
          <ToggleRow
            label="Compact mode"
            description="Tighter spacing across tables and cards."
            checked={form.compact_mode}
            onChange={(v) => set("compact_mode", v)}
          />
          <ToggleRow
            label="Chart animations"
            description="Smooth entry transitions on charts."
            checked={form.chart_animations}
            onChange={(v) => set("chart_animations", v)}
          />
          <div className="grid gap-1.5 sm:max-w-xs">
            <Label className="text-xs font-medium text-muted-foreground">Default chart range</Label>
            <Select value={form.default_chart_range} onValueChange={(v) => set("default_chart_range", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHART_RANGES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="mt-6 flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending || prefsQuery.isLoading}>
            {save.isPending ? "Saving…" : "Save appearance"}
          </Button>
        </div>
      </Card>
    </div>
  );
}

function ToggleRow({
  label, description, checked, onChange,
}: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <div className="text-sm font-medium text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

function SecurityTab() {
  return (
    <div className="space-y-4">
      <ChangePasswordCard />
      <PinCard />
      <DangerZoneCard />
    </div>
  );
}

function ChangePasswordCard() {
  const [pw, setPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (pw.length < 8) return toast.error("Password must be at least 8 characters");
    if (pw !== confirm) return toast.error("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Password updated");
    setPw(""); setConfirm("");
  };

  return (
    <Card className="glass-card border-[var(--border)] p-6">
      <div className="mb-5">
        <h3 className="text-sm font-semibold text-foreground">Change password</h3>
        <p className="text-xs text-muted-foreground">Use at least 8 characters with a mix of letters and numbers.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">New password</Label>
          <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Confirm new password</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" />
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <Button onClick={submit} disabled={busy || !pw || !confirm}>
          {busy ? "Updating…" : "Update password"}
        </Button>
      </div>
    </Card>
  );
}

function PinCard() {
  const qc = useQueryClient();
  const fetchStatus = useServerFn(getPinStatus);
  const setPinFn = useServerFn(setPin);
  const disablePinFn = useServerFn(disablePin);

  const status = useQuery({ queryKey: ["pin-status"], queryFn: () => fetchStatus() });
  const enabled = !!status.data?.enabled;

  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");

  const reset = () => { setCurrentPin(""); setNewPin(""); setConfirmPin(""); };

  const save = useMutation({
    mutationFn: async () => {
      if (!/^\d{4}$/.test(newPin)) throw new Error("PIN must be exactly 4 digits");
      if (newPin !== confirmPin) throw new Error("PINs don't match");
      await setPinFn({ data: enabled ? { pin: newPin, currentPin } : { pin: newPin } });
    },
    onSuccess: () => {
      toast.success(enabled ? "PIN updated" : "PIN enabled");
      reset();
      qc.invalidateQueries({ queryKey: ["pin-status"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  const disable = useMutation({
    mutationFn: async () => {
      if (!/^\d{4}$/.test(currentPin)) throw new Error("Enter your current 4-digit PIN");
      await disablePinFn({ data: { currentPin } });
    },
    onSuccess: () => {
      toast.success("PIN disabled");
      reset();
      qc.invalidateQueries({ queryKey: ["pin-status"] });
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Failed"),
  });

  return (
    <Card className="glass-card border-[var(--border)] p-6">
      <div className="mb-5 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">PIN login</h3>
          <p className="text-xs text-muted-foreground">
            Quick 4-digit unlock. Hashed server-side; never stored in plain text.
          </p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-xs ${enabled ? "bg-[var(--primary)]/15 text-[var(--primary)]" : "bg-surface/40 text-muted-foreground border border-border"}`}>
          {status.isLoading ? "…" : enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {enabled && (
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-muted-foreground">Current PIN</Label>
            <Input inputMode="numeric" maxLength={4} type="password" autoComplete="off" onPaste={(e) => e.preventDefault()} value={currentPin} onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
          </div>
        )}
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">{enabled ? "New PIN" : "Create PIN"}</Label>
          <Input inputMode="numeric" maxLength={4} type="password" autoComplete="off" onPaste={(e) => e.preventDefault()} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium text-muted-foreground">Confirm PIN</Label>
          <Input inputMode="numeric" maxLength={4} type="password" autoComplete="off" onPaste={(e) => e.preventDefault()} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 4))} />
        </div>
      </div>

      <div className="mt-6 flex flex-wrap justify-end gap-2">
        {enabled && (
          <Button variant="outline" onClick={() => disable.mutate()} disabled={disable.isPending || !currentPin}>
            {disable.isPending ? "Disabling…" : "Disable PIN"}
          </Button>
        )}
        <Button onClick={() => save.mutate()} disabled={save.isPending || !newPin || !confirmPin}>
          {save.isPending ? "Saving…" : enabled ? "Change PIN" : "Enable PIN"}
        </Button>
      </div>
    </Card>
  );
}

function DangerZoneCard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const deleteFn = useServerFn(deleteAccount);
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const onConfirm = async () => {
    setBusy(true);
    try {
      await deleteFn();
      await qc.cancelQueries();
      qc.clear();
      await supabase.auth.signOut();
      toast.success("Account deleted");
      navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete account");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="glass-card border border-destructive/40 p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-destructive">Delete account</h3>
        <p className="text-xs text-muted-foreground">
          Permanently removes your account and all associated data. This cannot be undone.
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Delete my account</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete account?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete your account, profile, and all financial data. Type
              <span className="font-semibold text-foreground"> DELETE </span>
              below to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="DELETE" />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "DELETE" || busy}
              onClick={(e) => { e.preventDefault(); onConfirm(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Deleting…" : "Delete forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}

function DataTab() {
  return (
    <div className="space-y-4">
      <ExportBackupCard />
      <RestoreCard />
      <WipeCard />
    </div>
  );
}

const USER_TABLES = [
  "money_budgets",
  "money_categories",
  "money_transactions",
  "planner_goals",
  "planner_settings",
  "wealth_accounts",
  "wealth_assets",
  "wealth_family_members",
  "wealth_insurance",
  "wealth_investments",
  "wealth_investment_txns",
  "wealth_liabilities",
  "tools_reminders",
  "tools_saved_calculations",
  "tools_activity",
  "notification_preferences",
  "scheduled_reports",
] as const;

type TableName = (typeof USER_TABLES)[number];

function downloadBlob(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function toCSV(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const cols = Array.from(rows.reduce((s, r) => { Object.keys(r).forEach((k) => s.add(k)); return s; }, new Set<string>()));
  const esc = (v: unknown) => {
    if (v === null || v === undefined) return "";
    const s = typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [cols.join(","), ...rows.map((r) => cols.map((c) => esc(r[c])).join(","))].join("\n");
}

async function fetchAllUserData() {
  const out: Record<string, Record<string, unknown>[]> = {};
  for (const t of USER_TABLES) {
    // RLS scopes to current user
    const { data, error } = await supabase.from(t as TableName).select("*");
    if (error) throw new Error(`${t}: ${error.message}`);
    out[t] = (data ?? []) as Record<string, unknown>[];
  }
  return out;
}

function ExportBackupCard() {
  const [busy, setBusy] = useState<string | null>(null);

  const exportJSON = async () => {
    setBusy("json");
    try {
      const data = await fetchAllUserData();
      const payload = { version: 1, exported_at: new Date().toISOString(), data };
      downloadBlob(`wealth-ace-backup-${new Date().toISOString().slice(0, 10)}.json`,
        JSON.stringify(payload, null, 2), "application/json");
      toast.success("Backup downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally { setBusy(null); }
  };

  const exportCSV = async () => {
    setBusy("csv");
    try {
      const data = await fetchAllUserData();
      const stamp = new Date().toISOString().slice(0, 10);
      // Bundle as multiple CSVs concatenated with headers, plus one combined zip-like text? Simplest: download each non-empty table.
      let any = false;
      for (const [t, rows] of Object.entries(data)) {
        if (!rows.length) continue;
        any = true;
        downloadBlob(`${t}-${stamp}.csv`, toCSV(rows), "text/csv");
      }
      if (!any) toast.info("No data to export");
      else toast.success("CSV files downloaded");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally { setBusy(null); }
  };

  return (
    <Card className="glass-card border-[var(--border)] p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Export & backup</h3>
        <p className="text-xs text-muted-foreground">
          Download a full backup of your data. JSON preserves structure for restore; CSV is one file per module.
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button onClick={exportJSON} disabled={!!busy}>
          {busy === "json" ? "Preparing…" : "Download JSON backup"}
        </Button>
        <Button variant="outline" onClick={exportCSV} disabled={!!busy}>
          {busy === "csv" ? "Preparing…" : "Download CSV files"}
        </Button>
      </div>
    </Card>
  );
}

function RestoreCard() {
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"merge" | "replace">("merge");

  const onFile = async (file: File) => {
    setBusy(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { version?: number; data?: Record<string, Record<string, unknown>[]> };
      if (!parsed?.data || typeof parsed.data !== "object") throw new Error("Invalid backup file");
      const { data: userData } = await supabase.auth.getUser();
      const uid = userData.user?.id;
      if (!uid) throw new Error("Not signed in");

      let inserted = 0;
      for (const t of USER_TABLES) {
        const rows = parsed.data[t];
        if (!Array.isArray(rows) || !rows.length) continue;
        if (mode === "replace") {
          const { error: delErr } = await supabase.from(t as TableName).delete().eq("user_id", uid);
          if (delErr) throw new Error(`${t}: ${delErr.message}`);
        }
        // Rewrite user_id to current user; let server regenerate timestamps
        const cleaned = rows.map((r) => ({ ...r, user_id: uid }));
        const { error } = await supabase.from(t as TableName).upsert(cleaned as never);
        if (error) throw new Error(`${t}: ${error.message}`);
        inserted += cleaned.length;
      }
      toast.success(`Restored ${inserted} records`);
      qc.invalidateQueries();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Restore failed");
    } finally { setBusy(false); }
  };

  return (
    <Card className="glass-card border-[var(--border)] p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">Restore from backup</h3>
        <p className="text-xs text-muted-foreground">
          Upload a JSON backup previously exported from Wealth Ace.
        </p>
      </div>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => setMode("merge")}
          className={`rounded-lg border px-4 py-3 text-left text-sm transition ${mode === "merge" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <div className="font-medium">Merge</div>
          <div className="text-xs text-muted-foreground">Add records; existing ones update by id.</div>
        </button>
        <button
          type="button"
          onClick={() => setMode("replace")}
          className={`rounded-lg border px-4 py-3 text-left text-sm transition ${mode === "replace" ? "border-[var(--primary)] bg-[var(--primary)]/10 text-foreground" : "border-border text-muted-foreground hover:text-foreground"}`}
        >
          <div className="font-medium">Replace</div>
          <div className="text-xs text-muted-foreground">Wipe current data per module before restoring.</div>
        </button>
      </div>
      <label className="inline-flex">
        <input
          type="file"
          accept="application/json"
          className="hidden"
          disabled={busy}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); e.target.value = ""; }}
        />
        <span className={`inline-flex h-10 cursor-pointer items-center rounded-md border border-border px-4 text-sm font-medium hover:bg-surface/60 ${busy ? "pointer-events-none opacity-60" : ""}`}>
          {busy ? "Restoring…" : "Choose backup file"}
        </span>
      </label>
    </Card>
  );
}

function WipeCard() {
  const qc = useQueryClient();
  const [confirmText, setConfirmText] = useState("");
  const [busy, setBusy] = useState(false);

  const onWipe = async () => {
    setBusy(true);
    try {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id;
      if (!uid) throw new Error("Not signed in");
      for (const t of USER_TABLES) {
        const { error } = await supabase.from(t as TableName).delete().eq("user_id", uid);
        if (error) throw new Error(`${t}: ${error.message}`);
      }
      toast.success("All data wiped");
      qc.invalidateQueries();
      setConfirmText("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  return (
    <Card className="glass-card border border-destructive/40 p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-destructive">Wipe all data</h3>
        <p className="text-xs text-muted-foreground">
          Removes every record across modules but keeps your account. Export a backup first.
        </p>
      </div>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="destructive">Wipe my data</Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Wipe all financial data?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes transactions, goals, assets, reminders, and more. Type
              <span className="font-semibold text-foreground"> WIPE </span>
              below to confirm.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input value={confirmText} onChange={(e) => setConfirmText(e.target.value)} placeholder="WIPE" />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText("")}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={confirmText !== "WIPE" || busy}
              onClick={(e) => { e.preventDefault(); onWipe(); }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {busy ? "Wiping…" : "Wipe forever"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}