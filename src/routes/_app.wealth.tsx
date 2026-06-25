import { createFileRoute } from "@tanstack/react-router";
import { Building2, Banknote, TrendingUp, Shield, Landmark, Users } from "lucide-react";
import { PageHeader, ModuleCard } from "@/components/page-header";

export const Route = createFileRoute("/_app/wealth")({
  head: () => ({
    meta: [
      { title: "Wealth · FinVista" },
      { name: "description", content: "Manage assets, liabilities, investments, insurance, accounts and family wealth." },
    ],
  }),
  component: Wealth,
});

function Wealth() {
  return (
    <>
      <PageHeader title="Wealth" description="Assets, liabilities, investments, insurance, accounts and family." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        <ModuleCard title="Assets" description="Real estate, vehicle, EPF, PPF" icon={Building2} />
        <ModuleCard title="Liabilities" description="Loans, EMIs, credit cards, debt" icon={Banknote} />
        <ModuleCard title="Investments" description="Stocks, ETF, MF, gold, crypto, bonds" icon={TrendingUp} />
        <ModuleCard title="Insurance" description="Policies, coverage, claim history" icon={Shield} />
        <ModuleCard title="Accounts" description="Bank, Demat, Post office, EPF, PPF" icon={Landmark} />
        <ModuleCard title="Family" description="Family net worth & joint expenses" icon={Users} />
      </div>
    </>
  );
}