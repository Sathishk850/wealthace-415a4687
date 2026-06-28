import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Save, Trash2, Info } from "lucide-react";
import { HOLDINGS, findHolding } from "./_app.wealth";

export const Route = createFileRoute("/_app/holdings/$slug")({
  head: ({ params }) => {
    const h = findHolding(params.slug);
    return {
      meta: [
        { title: `${h?.name ?? "Holding"} · FinVista` },
        { name: "description", content: "View and edit holding details." },
      ],
    };
  },
  component: HoldingDetail,
  notFoundComponent: () => <div className="p-8 text-sm text-muted-foreground">Holding not found.</div>,
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-rose-400">{error.message}</div>
  ),
});

function fmtINR(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function HoldingDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const initial = HOLDINGS.find((h) => h.slug === slug);

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState(() => ({
    name: initial?.name ?? "",
    type: initial?.type ?? "",
    qty: initial?.qty ?? 0,
    avgPrice: initial?.avgPrice ?? 0,
    currentPrice: initial?.currentPrice ?? 0,
  }));

  if (!initial) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">Holding not found.</p>
        <Link to="/wealth" className="mt-3 inline-block text-xs font-medium text-mint hover:underline">
          Back to Wealth
        </Link>
      </div>
    );
  }

  const invested = form.qty * form.avgPrice;
  const current = form.qty * form.currentPrice;
  const pnl = current - invested;
  const ret = invested > 0 ? (pnl / invested) * 100 : 0;
  const up = pnl >= 0;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate({ to: "/wealth" })}
            className="grid h-9 w-9 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl text-sm font-bold text-white" style={{ background: initial.color }}>
              {initial.name.slice(0, 1)}
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{initial.name}</h1>
              <div className="text-xs text-muted-foreground">{initial.type} · {initial.sub}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {edit ? (
            <>
              <button onClick={() => setEdit(false)} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground">Cancel</button>
              <button onClick={() => setEdit(false)} className="inline-flex items-center gap-2 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-[#04121C] hover:brightness-110">
                <Save className="h-3.5 w-3.5" /> Save
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setEdit(true)} className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-2">Edit</button>
              <button className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/20">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Current Value" value={fmtINR(current)} />
        <Stat label="Invested" value={fmtINR(invested)} />
        <Stat
          label="P&L"
          value={(up ? "+" : "") + fmtINR(pnl)}
          tone={up ? "text-emerald-400" : "text-rose-400"}
          icon={up ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
        />
        <Stat label="Returns %" value={(up ? "+" : "") + ret.toFixed(2) + "%"} tone={up ? "text-emerald-400" : "text-rose-400"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Holding Details</h3>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Name" value={form.name} edit={edit} onChange={(v) => setForm({ ...form, name: v })} />
            <Field label="Type" value={form.type} edit={edit} onChange={(v) => setForm({ ...form, type: v })} />
            <Field label="Quantity" value={String(form.qty)} edit={edit} onChange={(v) => setForm({ ...form, qty: Number(v) || 0 })} numeric />
            <Field label="Avg Price" value={String(form.avgPrice)} edit={edit} onChange={(v) => setForm({ ...form, avgPrice: Number(v) || 0 })} numeric />
            <Field label="Current Price" value={String(form.currentPrice)} edit={edit} onChange={(v) => setForm({ ...form, currentPrice: Number(v) || 0 })} numeric />
            <Field label="Last Updated" value={initial.date} edit={false} onChange={() => {}} />
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-foreground">Activity</h3>
          <div className="mt-4 space-y-3 text-xs">
            {[
              { d: "11 Jun 2025", a: "Price updated", v: fmtINR(initial.currentPrice) },
              { d: "01 Jun 2025", a: "Buy", v: `${initial.qty} units @ ${fmtINR(initial.avgPrice)}` },
              { d: "15 May 2025", a: "Created", v: initial.name },
            ].map((r) => (
              <div key={r.d + r.a} className="flex items-start justify-between border-b border-border/40 pb-2 last:border-0">
                <div>
                  <div className="font-medium text-foreground">{r.a}</div>
                  <div className="text-[11px] text-muted-foreground">{r.d}</div>
                </div>
                <div className="text-right text-foreground">{r.v}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground">
        <Info className="h-3.5 w-3.5 text-mint" />
        Edits are local to this session and will not persist.
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "text-foreground", icon }: { label: string; value: string; tone?: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`mt-1 inline-flex items-center gap-1 font-display text-xl font-bold ${tone}`}>
        {icon} {value}
      </div>
    </div>
  );
}

function Field({
  label, value, edit, onChange, numeric,
}: { label: string; value: string; edit: boolean; onChange: (v: string) => void; numeric?: boolean }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      {edit ? (
        <input
          type={numeric ? "number" : "text"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-surface-2 px-3 py-2 text-sm text-foreground focus:border-mint/50 focus:outline-none"
        />
      ) : (
        <div className="mt-1 text-sm font-medium text-foreground">{value || "—"}</div>
      )}
    </div>
  );
}