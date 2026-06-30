import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { TextTabs } from "@/components/text-tabs";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/settings")({
  head: () => ({
    meta: [
      { title: "Settings · FinVista" },
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
          { value: "notifications", label: "Notifications" },
          { value: "appearance", label: "Appearance" },
          { value: "security", label: "Security" },
          { value: "data", label: "Data & Backup" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="mt-4">
        {tab === "general" && <GeneralTab />}
        {tab === "notifications" && <NotificationPreferencesForm />}
        {tab === "appearance" && <AppearanceTab />}
        {tab === "security" && <SecurityTab />}
        {tab === "data" && <DataTab />}
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
  { v: "MM/DD/YYYY", l: "MM/DD/YYYY (06/30/2026)" },
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
  date_format: "MM/DD/YYYY",
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
          <p className="text-xs text-muted-foreground">Choose how FinTrack looks on this account.</p>
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
      <PlaceholderCard
        title="Account security"
        items={[
          "Change Password",
          "PIN Login (enable / create / change / reset)",
          "Active Sessions",
          "Login History",
          "Delete Account",
        ]}
      />
    </div>
  );
}

function DataTab() {
  return (
    <div className="space-y-4">
      <PlaceholderCard
        title="Data management"
        items={["Import Data", "Export Data", "Backup", "Restore"]}
      />
    </div>
  );
}