import { createFileRoute } from "@tanstack/react-router";
import { Camera, TrendingUp } from "lucide-react";
import { PageHeader, StatCard } from "@/components/page-header";
import { useAssets, useLiabilities, inr } from "@/lib/wealth-api";

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
  const { data: assets = [], isLoading: la } = useAssets();
  const { data: liabilities = [], isLoading: ll } = useLiabilities();
  const loading = la || ll;

  const totalAssets = assets.reduce((s, a) => s + (a.current_value || 0), 0);
  const totalLiab = liabilities.reduce((s, l) => s + (l.outstanding || 0), 0);
  const netWorth = totalAssets - totalLiab;

  return (
    <>
      <PageHeader
        title="Net Worth"
        description="A live view of what you own minus what you owe."
        actions={
          <button className="inline-flex items-center gap-1.5 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-mint-foreground">
            <Camera className="h-3.5 w-3.5" /> Snap
          </button>
        }
      />
      <div className="mb-6 rounded-3xl border border-border bg-card p-6">
        <div className="text-xs uppercase tracking-widest text-mint">Today</div>
        <div className="mt-1 font-display text-4xl font-extrabold">
          {loading ? "—" : inr(netWorth)}
        </div>
        {netWorth === 0 && !loading ? (
          <div className="mt-6 grid h-32 place-items-center rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
            <div>
              <TrendingUp className="mx-auto mb-2 h-5 w-5 text-mint" />
              Add your first asset or liability in Wealth to start building your net-worth history.
            </div>
          </div>
        ) : (
          <div className="mt-6 h-32 rounded-xl border border-dashed border-border" />
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Total assets" value={loading ? "—" : inr(totalAssets)} tone="mint" />
        <StatCard label="Total liabilities" value={loading ? "—" : inr(totalLiab)} />
        <StatCard label="Assets tracked" value={loading ? "—" : String(assets.length)} />
        <StatCard label="Liabilities tracked" value={loading ? "—" : String(liabilities.length)} />
      </div>
    </>
  );
}
