import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { AlertTriangle, Lightbulb, PieChart as PieIcon, Target } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { inr, inrCompact } from "@/lib/wealth-api";

export type AllocationSlice = {
  name: string;
  amt: number;
  pct: number;
  color: string;
  /** Holdings that make up this slice (optional, shown as sub-rows). */
  holdings?: { id: string; name: string; amt: number }[];
};

type Insight = { tone: "warn" | "info" | "good"; title: string; body: string };

function buildInsights(data: AllocationSlice[], label: string): Insight[] {
  const out: Insight[] = [];
  if (data.length === 0) return out;
  const top = data[0];
  if (top.pct >= 40) {
    out.push({
      tone: "warn",
      title: `Heavy ${top.name} concentration`,
      body: `${top.pct.toFixed(2)}% of your portfolio sits in ${top.name}. High concentration increases risk during downturns.`,
    });
  } else {
    out.push({
      tone: "good",
      title: "Reasonably spread",
      body: `Largest ${label.toLowerCase()} exposure is ${top.name} at ${top.pct.toFixed(2)}%, within a comfortable band.`,
    });
  }
  if (data.length <= 2) {
    out.push({
      tone: "warn",
      title: "Low diversification",
      body: `Only ${data.length} ${label.toLowerCase()} bucket${data.length === 1 ? "" : "s"} in play. Adding more reduces single-bucket shocks.`,
    });
  }
  const tiny = data.filter((d) => d.pct > 0 && d.pct < 5);
  if (tiny.length) {
    out.push({
      tone: "info",
      title: "Very small positions",
      body: `${tiny.map((t) => t.name).join(", ")} each hold under 5%. Consider consolidating so they can move the needle.`,
    });
  }
  const smallest = data[data.length - 1];
  if (data.length > 2) {
    out.push({
      tone: "info",
      title: "Next investment",
      body: `Routing your next SIP or lump-sum to ${smallest.name} (${smallest.pct.toFixed(2)}%) gives the biggest balance improvement.`,
    });
  }
  return out;
}

export function AllocationDetailsDialog({
  open,
  onOpenChange,
  title,
  data,
  total,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  data: AllocationSlice[];
  total: number;
}) {
  const insights = buildInsights(data, title.replace(/\s*Allocation$/i, ""));
  const needsAttention = insights.some((i) => i.tone === "warn");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100vw-1.5rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0">
        <DialogHeader className="shrink-0 border-b border-border px-6 py-4 text-left">
          <DialogTitle className="flex items-center gap-2 text-base font-bold text-foreground">
            <PieIcon className="h-4 w-4 text-mint" /> {title}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Full breakdown with portfolio insights · Total {inr(total)}
          </DialogDescription>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
          {data.length === 0 ? (
            <div className="grid h-32 place-items-center text-sm text-muted-foreground">
              No allocation data yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
              {/* LEFT — current allocation */}
              <div className="space-y-4 lg:col-span-2">
                {needsAttention ? (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/30 bg-amber-500/[0.07] px-3 py-2.5 text-xs text-amber-300">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>Needs attention — allocation is uneven across buckets.</span>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-5">
                  <div className="relative h-[170px] w-[170px] shrink-0">
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie
                          data={data}
                          dataKey="amt"
                          innerRadius={56}
                          outerRadius={82}
                          paddingAngle={2}
                          stroke="none"
                        >
                          {data.map((d) => (
                            <Cell key={d.name} fill={d.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                          Total
                        </div>
                        <div className="font-display text-sm font-bold text-foreground">
                          {inrCompact(total)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="min-w-[180px] flex-1 space-y-1.5">
                    {data.map((d) => (
                      <div key={d.name} className="flex items-center gap-2 text-xs">
                        <span
                          className="h-2 w-2 shrink-0 rounded-full"
                          style={{ background: d.color }}
                        />
                        <span className="min-w-0 flex-1 truncate text-foreground">{d.name}</span>
                        <span className="shrink-0 font-medium text-muted-foreground">
                          {d.pct.toFixed(2)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="overflow-hidden rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-surface-2/40 text-left text-[10px] uppercase tracking-wider text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Category</th>
                        <th className="px-3 py-2 text-right font-medium">Current Value</th>
                        <th className="px-3 py-2 text-right font-medium">Allocation</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.map((d) => (
                        <tr key={d.name} className="border-b border-border/50 last:border-0">
                          <td className="px-3 py-2.5">
                            <span className="flex items-center gap-2 text-xs text-foreground">
                              <span
                                className="h-2 w-2 shrink-0 rounded-sm"
                                style={{ background: d.color }}
                              />
                              {d.name}
                            </span>
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs text-foreground">
                            {inr(d.amt)}
                          </td>
                          <td className="px-3 py-2.5 text-right text-xs font-semibold text-foreground">
                            {d.pct.toFixed(2)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* RIGHT — insights */}
              <div className="rounded-xl border border-border bg-surface-2/30 p-4">
                <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                  <Target className="h-4 w-4 text-mint" /> Insights
                </div>
                <div className="space-y-2.5">
                  {insights.map((it, i) => (
                    <div
                      key={i}
                      className={`rounded-lg border-l-2 bg-card px-3 py-2.5 ${
                        it.tone === "warn"
                          ? "border-amber-400"
                          : it.tone === "good"
                            ? "border-emerald-400"
                            : "border-mint"
                      }`}
                    >
                      <div className="flex items-start gap-2">
                        {it.tone === "warn" ? (
                          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
                        ) : (
                          <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-mint" />
                        )}
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-foreground">{it.title}</div>
                          <p className="mt-0.5 text-[11px] leading-relaxed text-muted-foreground">
                            {it.body}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
