import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/page-header";

export const Route = createFileRoute("/_app/feedback")({
  head: () => ({
    meta: [
      { title: "Feedback · FinTrack" },
      { name: "description", content: "Share feedback and suggestions." },
    ],
  }),
  component: Feedback,
});

function Feedback() {
  return (
    <>
      <PageHeader title="Feedback" description="Tell us what's working and what could be better." />
      <div className="glass-card rounded-2xl p-6 text-sm text-muted-foreground">
        Feedback form coming soon.
      </div>
    </>
  );
}