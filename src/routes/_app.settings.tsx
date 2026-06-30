import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { TextTabs } from "@/components/text-tabs";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";
import { Card } from "@/components/ui/card";

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

function GeneralTab() {
  return (
    <div className="space-y-4">
      <PlaceholderCard
        title="Regional preferences"
        items={["Currency", "Language", "Time Zone", "Date Format", "Number Format"]}
      />
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