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

function AppearanceTab() {
  return (
    <div className="space-y-4">
      <PlaceholderCard
        title="Display"
        items={["Theme (Dark / Light / System)", "Dashboard Preferences", "Chart Preferences"]}
      />
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