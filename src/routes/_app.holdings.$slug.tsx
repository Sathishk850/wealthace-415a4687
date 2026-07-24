import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowUpRight, ArrowDownRight, Save, Trash2 } from "lucide-react";
import { useInvestments, useUpsertInvestment, useDeleteInvestment, formatDate, amountIn, priceIn, CURRENCY_SYMBOL, type Currency } from "@/lib/wealth-api";

export const Route = createFileRoute("/_app/holdings/$slug")({
  head: () => ({
    meta: [
      { title: "Holding · FinVista" },
      { name: "description", content: "View and edit holding details." },
    ],
  }),
  component: HoldingDetail,
  notFoundComponent: () => (
    <div className="p-8 text-sm text-muted-foreground">Holding not found.</div>
  ),
  errorComponent: ({ error }) => (
    <div className="p-8 text-sm text-rose-400">{error.message}</div>
  ),
});


function HoldingDetail() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const { data: investments = [], isLoading } = useInvestments();
  const upsert = useUpsertInvestment();
  const del = useDeleteInvestment();

  const initial = useMemo(() => investments.find((h) => h.id === slug), [investments, slug]);

  const [edit, setEdit] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "",
    quantity: 0,
    avg_price: 0,
    current_price: 0,
  });

  useEffect(() => {
    if (initial) {
      setForm({
        name: initial.name,
        category: initial.category,
        quantity: initial.quantity,
        avg_price: initial.avg_price,
        current_price: initial.current_price,
      });
    }
  }, [initial]);

  if (isLoading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

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

  const invested = form.quantity * form.avg_price;
  const current = form.quantity * form.current_price;
  const pnl = current - invested;
  const ret = invested > 0 ? (pnl / invested) * 100 : 0;
  const up = pnl >= 0;

  const save = async () => {
    await upsert.mutateAsync({
      id: initial.id,
      name: form.name,
      category: form.category,
      quantity: form.quantity,
      avg_price: form.avg_price,
      current_price: form.current_price,
    });
    setEdit(false);
  };

  const remove = async () => {
    if (!confirm("Delete this holding?")) return;
    await del.mutateAsync(initial.id);
    navigate({ to: "/wealth" });
  };

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
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-mint/15 text-sm font-bold text-mint">
              {initial.name.slice(0, 1)}
            </span>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">{initial.name}</h1>
              <div className="text-xs text-muted-foreground">
                {initial.category}
                {initial.sub_category ? ` · ${initial.sub_category}` : ""}
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {edit ? (
            <>
              <button
                onClick={() => setEdit(false)}
                disabled={upsert.isPending}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={upsert.isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-mint px-3 py-2 text-xs font-semibold text-[#04121C] hover:brightness-110"
              >
                <Save className="h-3.5 w-3.5" /> {upsert.isPending ? "Saving…" : "Save"}
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setEdit(true)}
                className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-surface-2"
              >
                Edit
              </button>
              <button
                onClick={remove}
                disabled={del.isPending}
                className="inline-flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs font-medium text-rose-400 hover:bg-rose-500/20"
              >
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
        <Stat
          label="Returns %"
          value={(up ? "+" : "") + ret.toFixed(2) + "%"}
          tone={up ? "text-emerald-400" : "text-rose-400"}
        />
      </div>

      <div className="rounded-2xl border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-foreground">Holding Details</h3>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Name" value={form.name} edit={edit} onChange={(v) => setForm({ ...form, name: v })} />
          <Field label="Category" value={form.category} edit={edit} onChange={(v) => setForm({ ...form, category: v })} />
          <Field label="Quantity" value={String(form.quantity)} edit={edit} onChange={(v) => setForm({ ...form, quantity: Number(v) || 0 })} numeric />
          <Field label="Avg Price" value={String(form.avg_price)} edit={edit} onChange={(v) => setForm({ ...form, avg_price: Number(v) || 0 })} numeric />
          <Field label="Current Price" value={String(form.current_price)} edit={edit} onChange={(v) => setForm({ ...form, current_price: Number(v) || 0 })} numeric />
          <Field label="Last Updated" value={formatDate(initial.last_updated)} edit={false} onChange={() => {}} />
        </div>
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
          step={numeric ? "0.01" : undefined}
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
