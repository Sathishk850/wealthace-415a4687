import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

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
  return (
    <>
      <PageHeader title="Settings" description="Manage your account and preferences." />
      <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground">
        Settings coming soon.
      </div>
    </>
  );
}