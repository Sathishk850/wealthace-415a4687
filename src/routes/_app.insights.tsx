import { createFileRoute, redirect } from "@tanstack/react-router";

/** Insights now lives inside Tools. Keep the old URL working. */
export const Route = createFileRoute("/_app/insights")({
  beforeLoad: () => {
    throw redirect({ to: "/tools", search: { tab: "insights" } as never, replace: true });
  },
  component: () => null,
});
