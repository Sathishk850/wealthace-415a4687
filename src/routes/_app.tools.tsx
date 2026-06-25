import { createFileRoute } from "@tanstack/react-router";
import { FileText, Bell, Calculator, Sparkles } from "lucide-react";
import { PageHeader, ModuleCard } from "@/components/page-header";

export const Route = createFileRoute("/_app/tools")({
  head: () => ({
    meta: [
      { title: "Tools · FinVista" },
      { name: "description", content: "Reports, reminders, calculators and AI insights." },
    ],
  }),
  component: Tools,
});

function Tools() {
  return (
    <>
      <PageHeader title="Tools" description="Reports, reminders, calculators and AI insights." />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <ModuleCard title="Reports" description="All modules · export & import" icon={FileText} />
        <ModuleCard title="Reminders" description="SIP, EMI, loan, credit card, subscriptions" icon={Bell} />
        <ModuleCard title="SIP & EMI calc" description="Plan investments and loans" icon={Calculator} />
        <ModuleCard title="AI Insights" description="Personalised tips powered by AI" icon={Sparkles} />
      </div>
    </>
  );
}