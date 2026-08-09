import { useState, useMemo, useCallback, type CSSProperties } from "react";
import { C, useThemeVersion } from "./palette";
import InfoTooltip from "./info-tooltip";
import { WEALTH_PLANNER_TOOLTIPS, type TooltipEntry } from "./tooltips";
import fingerprintAsset from "@/assets/wealth-ace-icon-t.png.asset.json";

const FT = WEALTH_PLANNER_TOOLTIPS.fire;

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
const nowISO = () => new Date().toISOString();
const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });

type Inputs = {
  currentAge: number;
  targetFireAge: number;
  currentNetWorth: number;
  annualExpenses: number;
  annualReturn: number;
  swr: number;
  annualSavings: number;
};

type TimelinePoint = { year: number; value: number };

type Results = {
  yearsToTarget: number;
  fireNum: number;
  leanFireNum: number;
  fatFireNum: number;
  progress: number;
  yearsToFire: number;
  fireAge: number;
  onTrack: boolean;
  projAtTarget: number;
  monthlyNeeded: number;
  savingsRate: number;
  surplus: number;
  timeline: TimelinePoint[];
  chartYears: number;
};

type Scenario = {
  id: string;
  name: string;
  inputs: Inputs;
  results: Results;
  createdAt?: string;
  updatedAt?: string;
};

function buildTimeline(currentNetWorth: number, annualSavings: number, annualReturn: number, years: number): TimelinePoint[] {
  const r = annualReturn / 100;
  const pts: TimelinePoint[] = [{ year: 0, value: currentNetWorth }];
  let v = currentNetWorth;
  for (let i = 1; i <= years; i++) {
    v = v * (1 + r) + annualSavings;
    pts.push({ year: i, value: v });
  }
  return pts;
}

function calcFIRE(inp: Inputs): Results {
  const { currentAge, targetFireAge, currentNetWorth, annualExpenses, annualReturn, swr, annualSavings } = inp;

  const yearsToTarget = Math.max(0, targetFireAge - currentAge);
  const r = annualReturn / 100;

  const fireNum = annualExpenses / (swr / 100);
  const leanFireNum = (annualExpenses * 0.6) / (swr / 100);
  const fatFireNum = (annualExpenses * 2.0) / (swr / 100);

  const progress = fireNum > 0 ? Math.min((currentNetWorth / fireNum) * 100, 100) : 0;

  let portfolio = currentNetWorth;
  let yearsToFire = 0;
  while (portfolio < fireNum && yearsToFire < 100) {
    portfolio = portfolio * (1 + r) + annualSavings;
    yearsToFire++;
  }
  const fireAge = currentAge + yearsToFire;
  const onTrack = yearsToTarget > 0 && yearsToFire <= yearsToTarget;

  let projAtTarget = currentNetWorth;
  for (let i = 0; i < yearsToTarget; i++) {
    projAtTarget = projAtTarget * (1 + r) + annualSavings;
  }

  let monthlyNeeded = 0;
  if (yearsToTarget > 0 && r > 0) {
    const fvCurr = currentNetWorth * Math.pow(1 + r, yearsToTarget);
    const deficit = fireNum - fvCurr;
    if (deficit > 0) {
      const annualNeeded = (deficit * r) / (Math.pow(1 + r, yearsToTarget) - 1);
      monthlyNeeded = annualNeeded / 12;
    }
  }

  const savingsRate = annualSavings + annualExpenses > 0
    ? (annualSavings / (annualSavings + annualExpenses)) * 100
    : 0;

  const chartYears = Math.min(Math.max(yearsToFire + 2, yearsToTarget + 5), 50);
  const timeline = buildTimeline(currentNetWorth, annualSavings, annualReturn, chartYears);

  return {
    yearsToTarget, fireNum, leanFireNum, fatFireNum, progress,
    yearsToFire, fireAge, onTrack, projAtTarget,
    monthlyNeeded, savingsRate,
    surplus: projAtTarget - fireNum,
    timeline, chartYears,
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
          type="number" value={value} min={min} max={max} step={step}
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


function ProgressBar({ pct, gradient, height = "8px" }: { pct: number; gradient: string; height?: string }) {
  return (
    <div style={{ height, borderRadius: "4px", background: C.divider, overflow: "hidden" }}>
      <div style={{ height: "100%", width: `${Math.min(Math.max(pct, 0), 100)}%`, background: gradient, borderRadius: "4px", transition: "width 0.5s ease" }} />
    </div>
  );
}

function Btn({
  variant = "ghost", onClick, children, small,
}: {
  variant?: "primary" | "teal" | "fire" | "danger" | "ghost";
  onClick?: () => void; children: React.ReactNode; small?: boolean;
}) {
  const base: CSSProperties = {
    borderRadius: "10px", border: "none", cursor: "pointer", fontWeight: 600,
    transition: "all 0.2s", whiteSpace: "nowrap",
    padding: small ? "7px 14px" : "10px 18px",
    fontSize: small ? "12px" : "13px",
  };
  const map: Record<string, CSSProperties> = {
    primary: { ...base, background: `linear-gradient(135deg,${C.teal},${C.blue})`, color: C.primaryBtnText },
    teal: { ...base, background: "rgba(0,212,170,0.15)", color: C.teal, border: "1px solid rgba(0,212,170,0.3)" },
    fire: { ...base, background: "rgba(249,115,22,0.15)", color: C.fire, border: "1px solid rgba(249,115,22,0.3)" },
    danger: { ...base, background: "rgba(239,68,68,0.12)", color: C.danger, border: "1px solid rgba(239,68,68,0.3)" },
    ghost: { ...base, background: C.inputBg, color: C.textMuted, border: `1px solid ${C.inputBorder}` },
  };
  return <button style={map[variant] || map.ghost} onClick={onClick}>{children}</button>;
}

function TimelineChart({
  timeline, fireNum, leanFireNum, fatFireNum, yearsToFire, yearsToTarget, currentAge,
}: {
  timeline: TimelinePoint[]; fireNum: number; leanFireNum: number; fatFireNum: number;
  yearsToFire: number; yearsToTarget: number; currentAge: number;
}) {
  if (!timeline || timeline.length < 2) return null;

  const W = 520, H = 160;
  const PAD = { top: 16, right: 16, bottom: 28, left: 0 };
  const pw = W - PAD.left - PAD.right;
  const ph = H - PAD.top - PAD.bottom;

  const maxVal = Math.max(...timeline.map((p) => p.value), fatFireNum * 1.05);
  const minVal = 0;
  const range = maxVal - minVal || 1;

  const toX = (yr: number) => PAD.left + (yr / (timeline.length - 1)) * pw;
  const toY = (v: number) => PAD.top + ph - ((v - minVal) / range) * ph;

  const polyPts = timeline.map((p) => `${toX(p.year)},${toY(p.value)}`).join(" ");

  const yFire = toY(fireNum);
  const yLean = toY(leanFireNum);
  const yFat = toY(fatFireNum);
  const xFireYear = yearsToFire < timeline.length ? toX(yearsToFire) : null;
  const xTarget = yearsToTarget < timeline.length ? toX(yearsToTarget) : null;

  const xLabels: { y: number; age: number; x: number }[] = [];
  for (let y = 0; y <= timeline.length - 1; y += 5) {
    xLabels.push({ y, age: currentAge + y, x: toX(y) });
  }

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ display: "block", overflow: "visible" }}>
      <line x1={PAD.left} y1={yFat} x2={W - PAD.right} y2={yFat} stroke={C.purple} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />
      <line x1={PAD.left} y1={yFire} x2={W - PAD.right} y2={yFire} stroke={C.fire} strokeWidth="1.5" strokeDasharray="5,3" opacity="0.8" />
      <line x1={PAD.left} y1={yLean} x2={W - PAD.right} y2={yLean} stroke={C.green} strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />

      {xTarget !== null && (
        <>
          <line x1={xTarget} y1={PAD.top} x2={xTarget} y2={H - PAD.bottom} stroke={C.blue} strokeWidth="1.5" strokeDasharray="4,3" opacity="0.7" />
          <text x={xTarget + 4} y={PAD.top + 10} fill={C.blue} fontSize="10" opacity="0.9">Target</text>
        </>
      )}

      {xFireYear !== null && (
        <>
          <line x1={xFireYear} y1={PAD.top} x2={xFireYear} y2={H - PAD.bottom} stroke={C.fire} strokeWidth="1.5" opacity="0.6" />
          <circle cx={xFireYear} cy={yFire} r="5" fill={C.fire} />
          <text x={xFireYear + 6} y={yFire - 4} fill={C.fire} fontSize="10" fontWeight="600">FIRE</text>
        </>
      )}

      <defs>
        <linearGradient id="fireAreaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={C.teal} stopOpacity="0.25" />
          <stop offset="100%" stopColor={C.teal} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={`${toX(0)},${H - PAD.bottom} ${polyPts} ${toX(timeline.length - 1)},${H - PAD.bottom}`} fill="url(#fireAreaGrad)" />

      <polyline points={polyPts} fill="none" stroke={C.teal} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

      <circle cx={toX(0)} cy={toY(timeline[0].value)} r="4" fill={C.teal} />

      <line x1={PAD.left} y1={H - PAD.bottom} x2={W - PAD.right} y2={H - PAD.bottom} stroke={C.inputBorder} strokeWidth="1" />
      {xLabels.map((l) => (
        <text key={l.y} x={l.x} y={H - PAD.bottom + 14} textAnchor="middle" fill={C.textDim} fontSize="10">
          {l.age}
        </text>
      ))}

      <text x={W - PAD.right - 2} y={yFat - 4} textAnchor="end" fill={C.purple} fontSize="9.5" opacity="0.85">FatFIRE</text>
      <text x={W - PAD.right - 2} y={yFire - 4} textAnchor="end" fill={C.fire} fontSize="9.5" opacity="0.9">FIRE</text>
      <text x={W - PAD.right - 2} y={yLean - 4} textAnchor="end" fill={C.green} fontSize="9.5" opacity="0.85">LeanFIRE</text>
    </svg>
  );
}

function FireVariantCard({
  label, fireNum, currentNW, color, desc,
}: { label: string; fireNum: number; currentNW: number; color: string; desc: string }) {
  const pct = fireNum > 0 ? Math.min((currentNW / fireNum) * 100, 100) : 0;
  return (
    <div style={{ flex: 1, minWidth: "130px", padding: "16px", borderRadius: "14px", background: C.softBg, border: `1px solid ${color}44`, textAlign: "center" }}>
      <div style={{ fontSize: "12px", color: C.textMuted, marginBottom: "6px" }}>{label}</div>
      <div style={{ fontSize: "18px", fontWeight: 700, color }}>{formatINR(fireNum)}</div>
      <div style={{ fontSize: "11px", color: C.textDim, marginTop: "2px", marginBottom: "10px" }}>{desc}</div>
      <div style={{ height: "5px", borderRadius: "3px", background: C.divider, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg,${color},${color}AA)`, borderRadius: "3px", transition: "width 0.5s ease" }} />
      </div>
      <div style={{ fontSize: "11px", color, marginTop: "5px", fontWeight: 600 }}>{pct.toFixed(0)}% achieved</div>
    </div>
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
      border: `1px solid ${isEditing ? "rgba(249,115,22,0.4)" : C.divider}`,
      padding: "16px", marginBottom: "10px",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ fontWeight: 700, color: C.textPrimary, fontSize: "15px", marginBottom: "3px" }}>
            {sc.name}
            {isEditing && (
              <span style={{ marginLeft: "8px", fontSize: "11px", color: C.fire, background: "rgba(249,115,22,0.1)", padding: "2px 8px", borderRadius: "10px", border: "1px solid rgba(249,115,22,0.3)" }}>
                Editing
              </span>
            )}
          </div>
          <div style={{ fontSize: "12px", color: C.textDim }}>
            FIRE at {sc.inputs.targetFireAge} · ₹{Math.round(sc.inputs.annualSavings / 12).toLocaleString("en-IN")}/mo · {sc.inputs.annualReturn}% return · {sc.inputs.swr}% SWR
          </div>
        </div>
        <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{
            padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600,
            background: r?.onTrack ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.12)",
            color: r?.onTrack ? C.success : C.warning,
            border: `1px solid ${r?.onTrack ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
          }}>
            {r?.onTrack ? "🎯 On Track" : "⚡ Behind"}
          </span>
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
          FIRE#: <strong style={{ color: C.fire }}>{formatINR(r?.fireNum)}</strong>
        </span>
        <span style={{ fontSize: "12px", color: C.textMuted }}>
          Progress: <strong style={{ color: C.teal }}>{r?.progress?.toFixed(1)}%</strong>
        </span>
        <span style={{ fontSize: "12px", color: C.textMuted }}>
          FIRE Age: <strong style={{ color: r?.onTrack ? C.success : C.warning }}>{r?.fireAge}</strong>
        </span>
        <span style={{ fontSize: "12px", color: C.textMuted }}>
          Savings Rate: <strong style={{ color: C.textPrimary }}>{r?.savingsRate?.toFixed(1)}%</strong>
        </span>
        <span style={{ fontSize: "12px", color: C.textDim }}>
          {sc.updatedAt ? `Updated ${fmtDate(sc.updatedAt)}` : sc.createdAt ? `Saved ${fmtDate(sc.createdAt)}` : ""}
        </span>
      </div>

      <div style={{ marginTop: "10px" }}>
        <ProgressBar pct={r?.progress} gradient={`linear-gradient(90deg,${C.fire},${C.danger})`} height="5px" />
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
        placeholder={editId ? "Update scenario name…" : 'Name this FIRE plan (e.g. "Lean & Early")'}
        style={{ ...getInputStyle(), flex: 1, minWidth: "200px" }}
        onFocus={(e) => { e.currentTarget.style.borderColor = C.focusBorderFire; }}
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
  currentAge: 28,
  targetFireAge: 45,
  currentNetWorth: 1000000,
  annualExpenses: 600000,
  annualReturn: 12,
  swr: 4,
  annualSavings: 600000,
};

export default function FIREPlanTab() {
  useThemeVersion();
  const [inp, setInp] = useState<Inputs>(DEFAULT_INPUTS);

  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [saving, setSaving] = useState(false);
  const [scenarioName, setScenarioName] = useState("");
  const [editId, setEditId] = useState<string | null>(null);

  const res = useMemo(() => calcFIRE(inp), [inp]);
  const set = useCallback(
    (k: keyof Inputs) => (v: number) => setInp((p) => ({ ...p, [k]: v })),
    []
  );

  const handleSave = () => {
    const name = scenarioName.trim() || `FIRE Plan ${scenarios.length + 1}`;
    if (editId) {
      setScenarios((s) =>
        s.map((sc) =>
          sc.id === editId
            ? { ...sc, name, inputs: { ...inp }, results: { ...res }, updatedAt: nowISO() }
            : sc
        )
      );
    } else {
      setScenarios((s) => [
        ...s,
        { id: uid(), name, inputs: { ...inp }, results: { ...res }, createdAt: nowISO() },
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

  const isOnTrack = res.onTrack;
  const hasDeficit = res.surplus < 0;
  const yearsLate = !isOnTrack && res.yearsToFire > res.yearsToTarget
    ? res.yearsToFire - res.yearsToTarget : 0;

  return (
    <div style={{ fontFamily: "'Inter',-apple-system,sans-serif", color: C.textPrimary, background: C.bgGradientFire, padding: "20px", borderRadius: "16px", border: `1px solid ${C.divider}` }}>
      <div style={card}>
        <div style={sectionTitle}>
          <BrandIcon />
          <span>FIRE Calculator</span>
          <span style={{
            marginLeft: "auto", fontSize: "12px", fontWeight: 500,
            background: isOnTrack ? "rgba(16,185,129,0.1)" : "rgba(249,115,22,0.1)",
            color: isOnTrack ? C.success : C.fire,
            padding: "4px 12px", borderRadius: "20px",
            border: `1px solid ${isOnTrack ? "rgba(16,185,129,0.25)" : "rgba(249,115,22,0.25)"}`,
          }}>
            {isOnTrack
              ? `🎯 On track · FIRE at ${res.fireAge}`
              : yearsLate > 0
                ? `⚠️ FIRE at ${res.fireAge} · ${yearsLate} yr${yearsLate > 1 ? "s" : ""} late`
                : `FIRE at ${res.fireAge}`}
          </span>
          <button onClick={handleReset} style={{ fontSize: "11px", color: C.textDim, background: "none", border: `1px solid ${C.inputBorder}`, borderRadius: "8px", padding: "4px 10px", cursor: "pointer" }}>
            Reset
          </button>
        </div>

        <div style={g2}>
          <NumInput label="Current Age" value={inp.currentAge} onChange={set("currentAge")} min={18} max={60} suffix="yrs" tip={FT.inputs.currentAge} />
          <NumInput label="Target FIRE Age" value={inp.targetFireAge} onChange={set("targetFireAge")} min={inp.currentAge + 1} max={70} suffix="yrs" tip={FT.inputs.targetFireAge} />
        </div>

        <div style={g3}>
          <NumInput label="Current Net Worth" value={inp.currentNetWorth} onChange={set("currentNetWorth")} min={0} step={100000} prefix="₹" tip={FT.inputs.currentNetWorth} />
          <NumInput label="Annual Expenses" value={inp.annualExpenses} onChange={set("annualExpenses")} min={0} step={50000} prefix="₹" tip={FT.inputs.annualExpenses} />
          <NumInput label="Annual Investments" value={inp.annualSavings} onChange={set("annualSavings")} min={0} step={50000} prefix="₹" tip={FT.inputs.annualSavings} />
        </div>

        <div style={g3}>
          <NumInput label="Expected Annual Return" value={inp.annualReturn} onChange={set("annualReturn")} min={1} max={30} step={0.5} suffix="%" tip={FT.inputs.annualReturn} />
          <NumInput label="Safe Withdrawal Rate" value={inp.swr} onChange={set("swr")} min={1} max={10} step={0.25} suffix="%" tip={FT.inputs.swr} />
          <div>
            <label style={{ ...getLabelStyle(), display: "flex", alignItems: "center" }}>
              <span>Savings Rate (derived)</span>
              <InfoTooltip tip={FT.results.savingsRate} ariaLabel="About Savings Rate" />
            </label>
            <div style={{
              padding: "10px 12px", borderRadius: "10px",
              background: res.savingsRate >= 50 ? "rgba(16,185,129,0.1)" : res.savingsRate >= 30 ? "rgba(245,158,11,0.1)" : "rgba(239,68,68,0.1)",
              border: `1px solid ${res.savingsRate >= 50 ? "rgba(16,185,129,0.3)" : res.savingsRate >= 30 ? "rgba(245,158,11,0.3)" : "rgba(239,68,68,0.3)"}`,
              fontSize: "18px", fontWeight: 700,
              color: res.savingsRate >= 50 ? C.success : res.savingsRate >= 30 ? C.warning : C.danger,
            }}>
              {res.savingsRate.toFixed(1)}%
            </div>
          </div>
        </div>

        <div style={{ height: "1px", background: C.inputBg, margin: "0 0 20px" }} />

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(158px,1fr))", gap: "12px" }}>
          <ResultTile label="🔥 FIRE Number" value={formatINR(res.fireNum)} sub={`${inp.swr}% SWR · 25× rule`} color={C.fire} tip={FT.results.fireNumber} />
          <ResultTile label="Current Progress" value={`${res.progress.toFixed(1)}%`} sub={`${formatINR(inp.currentNetWorth)} of ${formatINR(res.fireNum)}`} color={C.teal} tip={FT.results.progress} />
          <ResultTile
            label="Projected FIRE Age"
            value={`${res.fireAge}`}
            sub={`${res.yearsToFire} yr${res.yearsToFire !== 1 ? "s" : ""} away`}
            color={isOnTrack ? C.success : C.warning}
            tip={FT.results.fireAge}
          />
          <ResultTile
            label={`At Target Age (${inp.targetFireAge})`}
            value={formatINR(res.projAtTarget)}
            sub={hasDeficit ? `${formatINR(Math.abs(res.surplus))} short` : `+${formatINR(res.surplus)} surplus`}
            color={hasDeficit ? C.danger : C.success}
            tip={FT.results.projectedAtTarget}
          />
          <ResultTile
            label="Monthly Invested"
            value={`₹${Math.round(inp.annualSavings / 12).toLocaleString("en-IN")}/mo`}
            sub={`₹${inp.annualSavings.toLocaleString("en-IN")}/yr`}
            color={C.blue}
            tip={FT.results.monthlyInvested}
          />
          {res.monthlyNeeded > 0 && (
            <ResultTile
              label="Monthly Inv. Needed"
              value={`₹${Math.round(res.monthlyNeeded).toLocaleString("en-IN")}/mo`}
              sub={`To FIRE by age ${inp.targetFireAge}`}
              color={C.warning}
              tip={FT.results.monthlyNeeded}
            />
          )}
        </div>



        <div style={{ marginTop: "20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
            <span style={{ fontSize: "12px", color: C.textMuted }}>Progress to FIRE</span>
            <span style={{ fontSize: "12px", fontWeight: 600, color: C.fire }}>{res.progress.toFixed(1)}%</span>
          </div>
          <ProgressBar pct={res.progress} gradient={`linear-gradient(90deg,${C.fire},${C.danger})`} />
        </div>

        <div style={{ marginTop: "24px" }}>
          <div style={{ fontSize: "13px", color: C.textMuted, fontWeight: 600, marginBottom: "12px", letterSpacing: "0.4px", textTransform: "uppercase" }}>
            Portfolio Growth Timeline
          </div>
          <TimelineChart
            timeline={res.timeline}
            fireNum={res.fireNum}
            leanFireNum={res.leanFireNum}
            fatFireNum={res.fatFireNum}
            yearsToFire={res.yearsToFire}
            yearsToTarget={res.yearsToTarget}
            currentAge={inp.currentAge}
          />
          <div style={{ display: "flex", gap: "16px", marginTop: "8px", flexWrap: "wrap" }}>
            {[
              { color: C.teal, label: "Your portfolio" },
              { color: C.green, label: "LeanFIRE" },
              { color: C.fire, label: "FIRE" },
              { color: C.purple, label: "FatFIRE" },
              { color: C.blue, label: "Target age" },
            ].map((l) => (
              <span key={l.label} style={{ display: "flex", alignItems: "center", gap: "5px", fontSize: "11px", color: C.textDim }}>
                <span style={{ width: "20px", height: "2px", background: l.color, display: "inline-block", borderRadius: "1px" }} />
                {l.label}
              </span>
            ))}
          </div>
        </div>

        <div style={{ marginTop: "24px" }}>
          <div style={{ fontSize: "13px", color: C.textMuted, fontWeight: 600, marginBottom: "12px", letterSpacing: "0.4px", textTransform: "uppercase" }}>
            FIRE Variants
          </div>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <FireVariantCard label="🥗 LeanFIRE" fireNum={res.leanFireNum} currentNW={inp.currentNetWorth} color={C.green} desc="60% of annual expenses" />
            <FireVariantCard label="🔥 FIRE" fireNum={res.fireNum} currentNW={inp.currentNetWorth} color={C.fire} desc="100% of annual expenses" />
            <FireVariantCard label="💎 FatFIRE" fireNum={res.fatFireNum} currentNW={inp.currentNetWorth} color={C.purple} desc="200% of annual expenses" />
          </div>
        </div>

        <div style={{ marginTop: "20px", padding: "14px 16px", borderRadius: "12px", background: "rgba(0,212,170,0.05)", border: "1px solid rgba(0,212,170,0.15)" }}>
          <div style={{ fontSize: "12px", color: C.textMuted, lineHeight: 1.65 }}>
            💡 <strong style={{ color: C.teal }}>The {inp.swr}% Rule:</strong> Withdrawing {inp.swr}% of your corpus annually has historically been sustainable indefinitely.
            At ₹{(inp.annualExpenses / 1e5).toFixed(1)}L/yr expenses, your FIRE number is{" "}
            <strong style={{ color: C.fire }}>{formatINR(res.fireNum)}</strong>.{" "}
            {res.savingsRate >= 50
              ? `Your ${res.savingsRate.toFixed(0)}% savings rate is excellent — FIRE is very achievable.`
              : `Raising your savings rate above 50% dramatically shortens your runway.`}
          </div>
        </div>
      </div>

      <div style={card}>
        <div style={sectionTitle}>💾 Scenario Manager</div>
        {saving ? (
          <ScenarioPersister
            editId={editId}
            name={scenarioName}
            onChange={setScenarioName}
            onSave={handleSave}
            onCancel={() => { setSaving(false); setEditId(null); setScenarioName(""); }}
          />
        ) : (
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <Btn variant="primary" onClick={() => setSaving(true)}>+ Save This FIRE Plan</Btn>
            <span style={{ fontSize: "12px", color: C.textDim }}>
              {scenarios.length === 0 ? "No scenarios saved yet" : `${scenarios.length} scenario${scenarios.length > 1 ? "s" : ""} saved`}
            </span>
          </div>
        )}
      </div>

      {scenarios.length > 0 && (
        <div style={card}>
          <div style={sectionTitle}>📋 FIRE Plans ({scenarios.length})</div>
          {scenarios.map((sc) => (
            <ScenarioCard key={sc.id} sc={sc} onLoad={handleLoad} onDelete={handleDelete} isEditing={editId === sc.id} />
          ))}
        </div>
      )}

      {scenarios.length === 0 && !saving && (
        <div style={{ textAlign: "center", padding: "24px", color: C.textDim, fontSize: "13px" }}>
          Compare strategies — LeanFIRE, standard FIRE, FatFIRE, aggressive savings — side by side.
        </div>
      )}
    </div>
  );
}
