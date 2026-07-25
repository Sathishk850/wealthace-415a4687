import { createFileRoute } from "@tanstack/react-router";
import { WhatsNewPage } from "@/components/settings/whats-new-page";

export const Route = createFileRoute("/_app/whats-new")({
  head: () => ({
    meta: [
      { title: "What's New · FinVista" },
      { name: "description", content: "Latest features, improvements and fixes in FinVista." },
    ],
  }),
  component: WhatsNewPage,
});
