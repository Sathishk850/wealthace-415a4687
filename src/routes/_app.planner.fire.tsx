import { createFileRoute } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { PageHeader, StatCard } from "@/components/page-header";

export const Route = createFileRoute("/_app/planner/fire")({
  head: () => ({
    meta: [
      { title: "FIRE · FinVista" },
      { name: "description", content: "Track progress toward Financial Independence, Retire Early." },
    ],
  }),
  component: Fire,
});

function Fire() {
  return (
    <>
      <PageHeader title="FIRE" description="Financial Independence, Retire Early — your projection." />
      <div className="mb-6 rounded-3xl border border-mint/20 bg-gradient-to-br from-surface to-mint/10 p-6">
        <div className="flex items-center gap-2 text-mint">
          <Flame className="h-4 w-4" />
          <span className="text-xs font-semibold uppercase tracking-widest">FIRE Number</span>
        </div>
        <div className="mt-2 font-display text-4xl font-extrabold tracking-tight md:text-5xl">₹ 4.2 Cr</div>
        <p className="mt-1 text-sm text-muted-foreground">At 4% safe withdrawal · projected age 47</p>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Current corpus" value="₹ 48.7L" tone="mint" />
        <StatCard label="Monthly invest" value="₹ 65K" tone="positive" />
        <StatCard label="Years to FIRE" value="14.2" />
        <StatCard label="Progress" value="11.6%" tone="positive" />
      </div>
    </>
  );
}