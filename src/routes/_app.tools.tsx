import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/_app/tools")({
  head: () => ({
    meta: [
      { title: "Tools · Wealth Ace" },
      { name: "description", content: "Reports, reminders, financial calculators and AI insights." },
    ],
  }),
  component: ToolsLayout,
});

function ToolsLayout() {
  return <Outlet />;
}
