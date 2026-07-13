import { useEffect, useRef, useState, type CSSProperties } from "react";
import { C } from "./palette";
import type { TooltipEntry } from "./tooltips";

type Props = {
  tip: TooltipEntry;
  ariaLabel?: string;
};

export default function InfoTooltip({ tip, ariaLabel }: Props) {
  const [open, setOpen] = useState(false);
  const [align, setAlign] = useState<"left" | "right">("left");
  const wrapRef = useRef<HTMLSpanElement | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  useEffect(() => {
    if (!open || !wrapRef.current) return;
    const rect = wrapRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    // if there's less than 340px to the right, anchor tooltip to the right
    setAlign(vw - rect.left < 340 ? "right" : "left");
  }, [open]);

  const show = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setOpen(true);
  };
  const hide = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(false), 120);
  };
  const tapToggle = () => {
    setOpen((v) => !v);
    if (timerRef.current) window.clearTimeout(timerRef.current);
    // auto-close after 5s on mobile tap
    timerRef.current = window.setTimeout(() => setOpen(false), 5000);
  };

  const triggerStyle: CSSProperties = {
    display: "inline-flex", alignItems: "center", justifyContent: "center",
    width: "16px", height: "16px", borderRadius: "50%",
    color: C.teal, cursor: "help",
    fontSize: "12px", lineHeight: 1, fontWeight: 700,
    background: "transparent", border: "none", padding: 0,
    verticalAlign: "middle",
  };

  const panelStyle: CSSProperties = {
    position: "absolute",
    top: "calc(100% + 6px)",
    ...(align === "left" ? { left: 0 } : { right: 0 }),
    zIndex: 100,
    width: "min(320px, 82vw)",
    background: C.navyCard,
    color: C.textPrimary,
    border: `1px solid ${C.cardBorder}`,
    borderRadius: "12px",
    padding: "12px 14px",
    boxShadow: "0 10px 30px rgba(0,0,0,0.25)",
    backdropFilter: "blur(20px)",
    fontSize: "12px",
    lineHeight: 1.55,
    animation: "fv-tt-fade 180ms ease-out",
    pointerEvents: "auto",
  };

  return (
    <span
      ref={wrapRef}
      style={{ position: "relative", display: "inline-flex", alignItems: "center", marginLeft: "6px" }}
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <style>{`@keyframes fv-tt-fade {from{opacity:0;transform:translateY(-2px)}to{opacity:1;transform:none}}`}</style>
      <button
        type="button"
        aria-label={ariaLabel || "More info"}
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); tapToggle(); }}
        onFocus={show}
        onBlur={hide}
        onKeyDown={(e) => {
          if (e.key === "Escape") setOpen(false);
          if (e.key === "Enter" || e.key === " ") { e.preventDefault(); tapToggle(); }
        }}
        style={triggerStyle}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8" />
          <line x1="12" y1="11" x2="12" y2="16.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="8" r="1.15" fill="currentColor" />
        </svg>
      </button>
      {open && (
        <div role="tooltip" style={panelStyle}>
          <div style={{ color: C.textPrimary, marginBottom: 6, fontWeight: 600 }}>
            {tip.definition}
          </div>
          <div style={{ color: C.textMuted, marginBottom: 8 }}>
            <span style={{ color: C.teal, fontWeight: 600 }}>How it works: </span>
            {tip.howItWorks}
          </div>
          <div style={{
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Consolas, monospace",
            fontSize: "11px", color: C.textPrimary,
            background: C.inputBg, border: `1px solid ${C.inputBorder}`,
            padding: "8px 10px", borderRadius: "8px", overflowX: "auto",
          }}>
            {tip.formula}
          </div>
        </div>
      )}
    </span>
  );
}
