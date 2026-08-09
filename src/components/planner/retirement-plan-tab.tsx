import { useState, useMemo, useCallback, type CSSProperties } from "react";
import { C, useThemeVersion } from "./palette";
import InfoTooltip from "./info-tooltip";
import { WEALTH_PLANNER_TOOLTIPS, type TooltipEntry } from "./tooltips";
import fingerprintAsset from "@/assets/wealth-ace-icon-t.png.asset.json";

const RT = WEALTH_PLANNER_TOOLTIPS.retirement;

const BrandIcon = ({ size = 22 }: { size?: number }) => (
  <img src={fingerprintAsset.url} alt="Wealth Ace" width={size} height={size} style={{ display: "inline-block", verticalAlign: "middle", objectFit: "contain" }} />
);



const formatINR = (n: number | undefined | null) => {
  if (n === null || n === undefined || isNaN(n) || !isFinite(n)) return "—";
  const abs = Math.abs(n);
  if (abs >= 1e7) return `₹${(n / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(n / 1e5).toFixed(2)} L`;
  return `₹${Math.round(n).toLocaleString("en-IN")}`;
};

const uid = () => Math.random().toString(36).slice(2, 9);
const now = () => new Date().toISOString();
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

type Inputs = {
  currentAge: number;
  retirementAge: number;
  currentSavings: number;
  monthlySIP: number;
  preReturnRate: number;
  postReturnRate: number;
  inflationRate: number;
  monthlyExpenses: number;
  withdrawalRate: number;
};

type Results = {
  years: number;
  fvLump: number;
  fvSIP: number;
  projectedCorpus: number;
  inflatedMonthly: number;
  annualAtRet: number;
  requiredCorpus: number;
  surplus: number;
  coverage: number;
  additionalSIP: number;
  sustainable: number;
};

type Scenario = {
  id: string;
  name: string;
  inputs: Inputs;
  results: Results;
  createdAt?: string;
  updatedAt?: string;
};

function calcRetirement(inp: Inputs): Results | null {
  const {
    currentAge, retirementAge, currentSavings, monthlySIP,
    preReturnRate, postReturnRate, inflationRate, monthlyExpenses, withdrawalRate,
  } = inp;

  const years = retirementAge - currentAge;
  if (years <= 0) return null;

  const r = preReturnRate / 100;
  const rm = r / 12;
  const months = years * 12;

  const fvLump = currentSavings * Math.pow(1 + r, years);
  const fvSIP = rm > 0
    ? monthlySIP * ((Math.pow(1 + rm, months) - 1) / rm) * (1 + rm)
    : monthlySIP * months;

  const projectedCorpus = fvLump + fvSIP;

  const inflatedMonthly = monthlyExpenses * Math.pow(1 + inflationRate / 100, years);
  const annualAtRet = inflatedMonthly * 12;

  const requiredCorpus = annualAtRet / (withdrawalRate / 100);
  const surplus = projectedCorpus - requiredCorpus;
  const coverage = requiredCorpus > 0 ? (projectedCorpus / requiredCorpus) * 100 : 0;

  let additionalSIP = 0;
  if (surplus < 0 && rm > 0) {
    const need = -surplus;
    additionalSIP = (need * rm) / ((Math.pow(1 + rm, months) - 1) * (1 + rm));
  }

  let corpusLeft = projectedCorpus;
  let sustainable = 0;
  const postR = postReturnRate / 100;
  while (corpusLeft > 0 && sustainable < 60) {
    corpusLeft = corpusLeft * (1 + postR) - annualAtRet * Math.pow(1 + inflationRate / 100, sustainable);
    sustainable++;
  }

  return {
    years, fvLump, fvSIP, projectedCorpus,
    inflatedMonthly, annualAtRet, requiredCorpus,
    surplus, coverage, additionalSIP, sustainable,
  };
}

const getInputStyle = (): CSSProperties => ({
  width: "100%", padding: "10px 12px", borderRadius: "10px",
  background: C.inputBg, border: `1px solid ${C.inputBorder}`,
  color: C.textPrimary, fontSize: "14px", outline: "none",
  boxSizing: "border-box", transition: "border-color 0.2s",
});
const getLabelStyle = (): CSSProperties => ({
  display: "block", fontSize: "12px", color: C.textMuted,
  marginBottom: "6px", fontWeight: 500,
});

function NumInput({
  label, value, onChange, min, max, step = 1, prefix, suffix, tip,
}: {
  label: string; value: number; onChange: (v: number) => void;
  min?: number; max?: number; step?: number; prefix?: string; suffix?: string;
  tip?: TooltipEntry;
}) {
  return (
    <div>
      <label style={{ ...getLabelStyle(), display: "flex", alignItems: "center" }}>
        <span>{label}</span>
        {tip && <InfoTooltip tip={tip} ariaLabel={`About ${label}`} />}
      </label>
      <div style={{ position: "relative" }}>

        {prefix && (
          <span style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: C.textDim, fontSize: "13px", userSelect: "none" }}>
            {prefix}
          </span>
        )}
        <input
          type="number"
          value={value}
          min={min} max={max} step={step}
          onChange={(e) => onChange(Number(e.target.value))}
          style={{ ...getInputStyle(), paddingLeft: prefix ? "28px" : "12px", paddingRight: suffix ? "44px" : "12px" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = C.focusBorder; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = C.inputBorder; }}
        />
        {suffix && (
          <span style={{ position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)", color: C.textDim, fontSize: "13px", userSelect: "none" }}>
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

function ResultTile({ label, value, sub, color = C.teal, tip }: { label: string; value: string; sub?: string; color?: string; tip?: TooltipEntry }) {
  return (
    <div style={{ borderRadius: "14px", padding: "16px", background: `${color}18`, border: `1px solid ${color}44`, position: "relative" }}>
      <div style={{ fontSize: "11px", color: C.textMuted, fontWeight: 500, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center" }}>
        <span>{label}</span>
        {tip && <InfoTooltip tip={tip} ariaLabel={`About ${label}`} />}
      </div>
      <div style={{ fontSize: "20px", fontWeight: 700, color }}>{value}</div>
      {sub && <div style={{ fontSize: "11px", color: C.textDim, marginTop: "3px" }}>{sub}</div>}
    </div>
  );
}


function ProgressBar({ pct, gradient }: { pct: number; gradient: string }) {
  return (
    <div style={{ height: "8px", borderRadius: "4px", background: C.divider, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(Math.max(pct, 0), 100)}%`, background: gradient, borderRadius: "4px", transition: "width 0.5s ease" }} />
    </div>
  );
}

function Btn({
  variant = "ghost", onClick, children, small,
}: {
  variant?: "primary" | "teal" | "danger" | "ghost";
  onClick?: () => void; children: React.ReactNode; small?: boolean;
}) {
  const base: CSSProperties = {
    borderRadius: "10px", border: "none", cursor: "pointer",
    fontWeight: 600, transition: "all 0.2s", whiteSpace: "nowrap",
    padding: small ? "7px 14px" : "10px 18px",
    fontSize: small ? "12px" : "13px",
  };
  const styles: Record<string, CSSProperties> = {
    primary: { ...base, background: `linear-gradient(135deg,${C.teal},${C.blue})`, color: C.primaryBtnText },
    teal: { ...base, background: "rgba(0,212,170,0.15)", color: C.teal, border: "1px solid rgba(0,212,170,0.3)" },
    danger: { ...base, background: "rgba(239,68,68,0.12)", color: C.danger, border: "1px solid rgba(239,68,68,0.3)" },
    ghost: { ...base, background: C.inputBg, color: C.textMuted, border: `1px solid ${C.inputBorder}` },
  };
  return <button style={styles[variant] || styles.ghost} onClick={onClick}>{children}</button>;
}

function StatusBadge({ ok }: { ok: boolean }) {
  return (
    <span style={{
      padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
      background: ok ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.12)",
      color: ok ? C.success : C.danger,
      border: `1px solid ${ok ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
    }}>
      {ok ? "✅ On Track" : "⚠️ Deficit"}
    </span>
  );
}

function ScenarioCard({
  sc, onLoad, onDelete, isEditing,
}: { sc: Scenario; onLoad: (sc: Scenario) => void; onDelete: (id: string) => void; isEditing: boolean }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const r = sc.results;

  return (
    <div style={{
      background: C.softBg, borderRadius: "14px",
      border: `1px solid ${isEditing ? "rgba(0,212,170,0.4)" : C.divider}`,
      padding: "16px", marginBottom: "10px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ fontWeight: 700, color: C.textPrimary, fontSize: "15px", marginBottom: "3px" }}>
            {sc.name}
            {isEditing && (
              <span style={{ marginLeft: "8px", fontSize: "11px", color: C.teal, background: "rgba(0,212,170,0.1)", padding: "2px 8px", borderRadius: "10px", border: "1px solid rgba(0,212,170,0.3)" }}>
                Editing
              </span>
            )}
          </div>
          <div style={{ fontSize: "12px", color: C.textDim }}>
            Retire at {sc.inputs.retirementAge} · SIP ₹{sc.inputs.monthlySIP.toLocaleString("en-IN")}/mo · {sc.inputs.preReturnRate}% pre-ret. return
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <StatusBadge ok={r?.surplus >= 0} />
          <Btn variant="teal" small onClick={() => onLoad(sc)}>✏️ Load &amp; Edit</Btn>
          {confirmDel ? (
            <>
              <Btn variant="danger" small onClick={() => { onDelete(sc.id); setConfirmDel(false); }}>Confirm</Btn>
              <Btn variant="ghost" small onClick={() => setConfirmDel(false)}>Cancel</Btn>
            </>
          ) : (
            <Btn variant="ghost" small onClick={() => setConfirmDel(true)}>
              <span style={{ color: C.danger }}>🗑️</span>
            </Btn>
          )}
        </div>
      </div>

      <div style={{ marginTop: "12px", display: "flex", gap: "20px", flexWrap: "wrap" }}>
        <span style={{ fontSize: "12px", color: C.textMuted }}>
          Projected: <strong style={{ color: C.teal }}>{formatINR(r?.projectedCorpus)}</strong>
        </span>
        <span style={{ fontSize: "12px", color: C.textMuted }}>
          Required: <strong style={{ color: C.textPrimary }}>{formatINR(r?.requiredCorpus)}</strong>
        </span>
        <span style={{ fontSize: "12px", color: C.textMuted }}>
          Coverage: <strong style={{ color: r?.coverage >= 100 ? C.success : C.danger }}>{r?.coverage?.toFixed(1)}%</strong>
        </span>
        <span style={{ fontSize: "12px", color: C.textDim }}>
          {sc.updatedAt ? `Updated ${fmtDate(sc.updatedAt)}` : sc.createdAt ? `Saved ${fmtDate(sc.createdAt)}` : ""}
        </span>
      </div>

      <div style={{ marginTop: "10px" }}>
        <ProgressBar
          pct={r?.coverage}
          gradient={r?.coverage >= 100 ? `linear-gradient(90deg,${C.success},#059669)` : `linear-gradient(90deg,${C.danger},#F97316)`}
        />
      </div>
    </div>
  );
}

function ScenarioPersister({
  editId, name, onChange, onSave, onCancel,
}: { editId: string | null; name: string; onChange: (v: string) => void; onSave: () => void; onCancel: () => void }) {
  return (
    <div style={{ display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
      <input
        value={name}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSave()}
        placeholder={editId ? "Update scenario name…" : 'Name this plan (e.g. "Conservative Base")'}
        style={{ ...getInputStyle(), flex: 1, minWidth: "200px" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = C.focusBorder; }}
        onBlur={(e) => { e.currentTarget.style.borderColor = C.inputBorder; }}
      />
      <Btn variant="primary" onClick={onSave}>
        {editId ? "✏️ Update Scenario" : "💾 Save Scenario"}
      </Btn>
      <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
    </div>
  );
}

const DEFAULT_INPUTS: Inputs = {
  currentAge: 30,
  retirementAge: 60,
  currentSavings: 500000,
  monthlySIP: 25000,
  preReturnRate: 12,
  postReturnRate: 7,
  inflationRate: 6,
  monthlyExpenses: 50000,
  withdrawalRate: 4,
};

export default function RetirementPlanTab() {
  useThemeVersion();
  const [inp, setInp] = useState<Inputs>(DEFAULT_INPUTS);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [saving, setSaving] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const res = useMemo(() => calcRetirement(inp), [inp]);
  const set = useCallback(
    (k: keyof Inputs) => (v: number) => setInp((p) => ({ ...p, [k]: v })),
    []
  );

  const handleSave = () => {
    if (!res) return;
    const name = scenarioName.trim() || `Plan ${scenarios.length + 1}`;
    if (editId) {
      setScenarios((s) =>
        s.map((sc) =>
          sc.id === editId
            ? { ...sc, name, inputs: { ...inp }, results: { ...res }, updatedAt: now() }
            : sc
        )
      );
    } else {
      setScenarios((s) => [
        ...s,
        { id: uid(), name, inputs: { ...inp }, results: { ...res }, createdAt: now() },
      ]);
    }
    setSaving(false); setEditId(null); setScenarioName("");
  };

  const handleLoad = (sc: Scenario) => {
    setInp({ ...sc.inputs });
    setEditId(sc.id);
    setScenarioName(sc.name);
    setSaving(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = (id: string) => {
    setScenarios((s) => s.filter((sc) => sc.id !== id));
    if (editId === id) { setEditId(null); setSaving(false); setScenarioName(""); }
  };

  const handleCancelSave = () => {
    setSaving(false); setEditId(null); setScenarioName("");
  };

  const handleReset = () => {
    setInp(DEFAULT_INPUTS);
    setEditId(null); setSaving(false); setScenarioName("");
  };

  const card: CSSProperties = {
    background: C.navyCard, backdropFilter: "blur(20px)",
    borderRadius: "18px", border: "1px solid rgba(0,212,170,0.12)",
    padding: "24px", marginBottom: "20px",
  };
  const g2: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "16px" };
  const g3: CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "16px" };
  const sectionTitle: CSSProperties = {
    fontSize: "17px", fontWeight: 700, color: C.textPrimary,
    display: "flex", alignItems: "center", gap: "8px", marginBottom: "20px",
  };

  if (!res) {
    return (
      <div style={{ ...card, textAlign: "center", color: C.warning }}>
        ⚠️ Retirement age must be greater than current age.
      </div>
    );
  }

  const isOnTrack = res.surplus >= 0;

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,sans-serif", color: C.textPrimary, background: C.bgGradient, padding: "20px", borderRadius: "16px", border: `1px solid ${C.divider}` }}>
      <div style={card}>
        <div style={sectionTitle}>
          <BrandIcon />
          <span>Retirement Calculator</span>
          <span style={{ marginLeft: "auto", fontSize: "12px", fontWeight: 500, color: C.textDim, background: "rgba(0,212,170,0.08)", padding: "4px 12px", borderRadius: "20px", border: "1px solid rgba(0,212,170,0.15)" }}>
            {res.years} yrs to retirement
          </span>
          <button onClick={handleReset} style={{ fontSize: "11px", color: C.textDim, background: "none", border: `1px solid ${C.inputBorder}`, borderRadius: "8px", padding: "4px 10px", cursor: "pointer" }}>
            Reset
          </button>
        </div>

        <div style={g2}>
          <NumInput label="Current Age" value={inp.currentAge} onChange={set("currentAge")} min={18} max={80} suffix="yrs" tip={RT.inputs.currentAge} />
          <NumInput label="Retirement Age" value={inp.retirementAge} onChange={set("retirementAge")} min={inp.currentAge + 1} max={85} suffix="yrs" tip={RT.inputs.retirementAge} />
        </div>

        <div style={g3}>
          <NumInput label="Current Savings" value={inp.currentSavings} onChange={set("currentSavings")} min={0} step={50000} prefix="₹" tip={RT.inputs.currentSavings} />
          <NumInput label="Monthly SIP" value={inp.monthlySIP} onChange={set("monthlySIP")} min={0} step={1000} prefix="₹" tip={RT.inputs.monthlySIP} />
          <NumInput label="Monthly Expenses Today" value={inp.monthlyExpenses} onChange={set("monthlyExpenses")} min={0} step={5000} prefix="₹" tip={RT.inputs.monthlyExpenses} />
        </div>

        <div style={g3}>
          <NumInput label="Pre-Retirement Return" value={inp.preReturnRate} onChange={set("preReturnRate")} min={1} max={30} step={0.5} suffix="%" tip={RT.inputs.preReturnRate} />
          <NumInput label="Post-Retirement Return" value={inp.postReturnRate} onChange={set("postReturnRate")} min={1} max={20} step={0.5} suffix="%" tip={RT.inputs.postReturnRate} />
          <NumInput label="Inflation Rate" value={inp.inflationRate} onChange={set("inflationRate")} min={1} max={15} step={0.5} suffix="%" tip={RT.inputs.inflationRate} />
        </div>

        <div style={{ maxWidth: "240px", marginBottom: "20px" }}>
          <NumInput label="Safe Withdrawal Rate (SWR)" value={inp.withdrawalRate} onChange={set("withdrawalRate")} min={1} max={10} step={0.25} suffix="%" tip={RT.inputs.withdrawalRate} />
        </div>

        <div style={{ height: "1px", background: C.inputBg, margin: "0 0 20px" }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(158px,1fr))", gap: "12px" }}>
          <ResultTile label="Projected Corpus" value={formatINR(res.projectedCorpus)} sub={`At age ${inp.retirementAge}`} color={C.teal} tip={RT.results.projectedCorpus} />
          <ResultTile label="Required Corpus" value={formatINR(res.requiredCorpus)} sub={`${inp.withdrawalRate}% SWR · 25× rule`} color={isOnTrack ? C.success : C.danger} tip={RT.results.requiredCorpus} />
          <ResultTile
            label={isOnTrack ? "✅ Surplus" : "⚠️ Shortfall"}
            value={formatINR(Math.abs(res.surplus))}
            sub={!isOnTrack ? `Add ₹${Math.round(res.additionalSIP).toLocaleString("en-IN")}/mo` : "You are on track!"}
            color={isOnTrack ? C.success : C.danger}
            tip={RT.results.surplus}
          />
          <ResultTile label="Monthly at Retirement" value={`${formatINR(res.inflatedMonthly)}/mo`} sub={`Inflation-adjusted (${inp.inflationRate}%)`} color={C.warning} tip={RT.results.monthlyAtRetirement} />
          <ResultTile label="SIP Future Value" value={formatINR(res.fvSIP)} sub={`${res.years}-yr SIP corpus`} color={C.teal} tip={RT.results.sipFutureValue} />
          <ResultTile label="Coverage" value={`${res.coverage.toFixed(1)}%`} sub="of required corpus" color={res.coverage >= 100 ? C.success : C.danger} tip={RT.results.coverage} />
        </div>


        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", color: C.textMuted }}>Corpus Coverage Progress</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: isOnTrack ? C.success : C.danger }}>
              {res.coverage.toFixed(1)}%
            </span>
          </div>
          <ProgressBar
            pct={res.coverage}
            gradient={isOnTrack ? `linear-gradient(90deg,${C.success},#059669)` : `linear-gradient(90deg,${C.danger},#F97316)`}
          />
        </div>

        {!isOnTrack && (
          <div style={{ marginTop: "16px", padding: "14px 16px", borderRadius: "12px", background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.2)" }}>
            <span style={{ fontSize: "12px", color: C.textMuted, lineHeight: 1.6 }}>
              💡 To meet your retirement goal, consider increasing your monthly SIP by{" "}
              <strong style={{ color: C.danger }}>₹{Math.round(res.additionalSIP).toLocaleString("en-IN")}/mo</strong>, reducing expenses,
              or adjusting your retirement age.
            </span>
          </div>
        )}
      </div>

      <div style={card}>
        <div style={sectionTitle}>💾 Scenario Manager</div>
        {saving ? (
          <ScenarioPersister
            editId={editId}
            name={scenarioName}
            onChange={setScenarioName}
            onSave={handleSave}
            onCancel={handleCancelSave}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Btn variant="primary" onClick={() => setSaving(true)}>+ Save This Plan</Btn>
            <span style={{ fontSize: "12px", color: C.textDim }}>
              {scenarios.length === 0 ? "No scenarios saved yet" : `${scenarios.length} scenario${scenarios.length > 1 ? "s" : ""} saved`}
            </span>
          </div>
        )}
      </div>

      {scenarios.length > 0 && (
        <div style={card}>
          <div style={sectionTitle}>📋 Saved Plans ({scenarios.length})</div>
          {scenarios.map((sc) => (
            <ScenarioCard key={sc.id} sc={sc} onLoad={handleLoad} onDelete={handleDelete} isEditing={editId === sc.id} />
          ))}
        </div>
      )}

      {scenarios.length === 0 && !saving && (
        <div style={{ textAlign: "center", padding: "24px", color: C.textDim, fontSize: "13px" }}>
          Save different scenarios (conservative, aggressive, delayed retirement…) to compare side-by-side.
        </div>
      )}
    </div>
  );
}
