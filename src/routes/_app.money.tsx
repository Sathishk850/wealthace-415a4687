import { createFileRoute } from "@tanstack/react-router";
import { TrendingUp, TrendingDown, ArrowLeftRight, LineChart } from "lucide-react";
import { PageHeader, ModuleCard } from "@/components/page-header";

export const Route = createFileRoute("/_app/money")({
  head: () => ({
    meta: [
      { title: "Money · FinVista" },
      { name: "description", content: "Track cashflow, income, expenses and every transaction." },
    ],
  }),
  component: Money,
});

function Money() {
  return (
    <>
      <PageHeader title="Money" description="Cashflow, income, expenses and transactions." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ModuleCard title="Cashflow" description="Income vs expense trends" icon={LineChart} />
        <ModuleCard title="Income" description="Salary, business, freelance, rental, dividend" icon={TrendingUp} />
        <ModuleCard title="Expenses" description="Rent, EMI, food, bills, travel, more" icon={TrendingDown} />
        <ModuleCard title="Transactions" description="All money in & out, import/export" icon={ArrowLeftRight} />
      </div>
    </>
  );
}