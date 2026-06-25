import { createFileRoute } from "@tanstack/react-router";
import { Camera } from "lucide-react";
import { PageHeader, StatCard } from "@/components/page-header";

export const Route = createFileRoute("/_app/dashboard/networth")({
  head: () => ({
    meta: [
      { title: "Net Worth · FinVista" },
      { name: "description", content: "Net worth history and snapshots over time." },
    ],
  }),
  component: NetWorth,
});

function NetWorth() {
  return (
    <>
      <PageHeader
        title="Net Worth"
        description="History of your net worth snapshots."
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-mint-foreground">
            <Camera className="h-3.5 w-3.5" /> Snap
          </button>
        }
      />
      <div className="mb-6 rounded-3xl border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-widest text-mint">Today</div>
        <div className="mt-1 font-display text-4xl font-extrabold">₹ 48,72,510</div>
        <div className="mt-6 h-32 rounded-xl bg-[linear-gradient(180deg,color-mix(in_oklab,var(--mint)_25%,transparent),transparent)] [clip-path:polygon(0_80%,10%_70%,22%_72%,34%_55%,48%_60%,60%_40%,72%_46%,84%_24%,100%_15%,100%_100%,0_100%)]" />
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="1M change" value="+₹ 1.95L" tone="positive" />
        <StatCard label="3M change" value="+₹ 4.2L" tone="positive" />
        <StatCard label="1Y change" value="+₹ 12.8L" tone="positive" />
        <StatCard label="All-time high" value="₹ 48.7L" tone="mint" />
      </div>
    </>
  );
}