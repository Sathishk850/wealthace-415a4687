import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { TextTabs } from "@/components/text-tabs";
import { NotificationPreferencesForm } from "@/components/notification-preferences-form";

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
  const [tab, setTab] = useState("notifications");
  return (
    <>
      <PageHeader title="Settings" description="Manage your account and preferences." />
      <TextTabs
        items={[
          { value: "notifications", label: "Notifications" },
          { value: "account", label: "Account" },
        ]}
        value={tab}
        onChange={setTab}
      />
      <div className="mt-4">
        {tab === "notifications" ? (
          <NotificationPreferencesForm />
        ) : (
          <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground">
            Account settings coming soon.
          </div>
        )}
      </div>
    </>
  );
}