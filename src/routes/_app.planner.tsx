import { createFileRoute } from "@tanstack/react-router";
import { Target, Wallet, Flame } from "lucide-react";
import { PageHeader, ModuleCard } from "@/components/page-header";

export const Route = createFileRoute("/_app/planner")({
  head: () => ({
    meta: [
      { title: "Planner · FinVista" },
      { name: "description", content: "Set goals, budgets and your FIRE roadmap." },
    ],
  }),
  component: Planner,
});

function Planner() {
  return (
    <>
      <PageHeader title="Planner" description="Goals, budgets and your path to FIRE." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <ModuleCard title="Goals" description="Emergency, education, home, vehicle, retirement" icon={Target} />
        <ModuleCard title="Budgets" description="Groceries, travel, shopping, entertainment" icon={Wallet} />
        <ModuleCard title="FIRE" description="Financial Independence, Retire Early" icon={Flame} />
      </div>
    </>
  );
}