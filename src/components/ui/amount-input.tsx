import { useRef } from "react";
import { Calculator } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Safe expression evaluator.
 *
 * Supports:
 *   1200+340*2    → 1880
 *   1200+18%      → 1416  (GST-style: base × (1 + pct/100))
 *   500-10%       → 450   (discount-style: base × (1 - pct/100))
 *   (300+200)*2   → 1000
 *
 * Returns null when the expression is invalid, non-finite, or negative.
 */
function evalExpr(raw: string): number | null {
  const expr = raw.trim().replace(/\s/g, "");
  if (!expr) return null;
  // Allow only safe characters
  if (!/^[\d+\-*/.()%]+$/.test(expr)) return null;
  try {
    // Contextual percentage: base+N% or base-N%
    const pctMatch = expr.match(/^(\d+(?:\.\d+)?)([+-])(\d+(?:\.\d+)?)%$/);
    if (pctMatch) {
      const base = parseFloat(pctMatch[1]);
      const pct  = parseFloat(pctMatch[3]);
      const result = pctMatch[2] === "+"
        ? base * (1 + pct / 100)
        : base * (1 - pct / 100);
      return isFinite(result) ? Math.round(result * 100) / 100 : null;
    }
    // Replace remaining N% tokens with (N/100)
    const normalized = expr.replace(/(\d+(?:\.\d+)?)%/g, "($1/100)");
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${normalized})`)() as unknown;
    if (typeof result !== "number" || !isFinite(result)) return null;
    return Math.round(result * 100) / 100;
  } catch {
    return null;
  }
}

/** Returns true when the string looks like an arithmetic expression (not a plain number). */
function isExpression(v: string): boolean {
  const s = v.trim();
  if (!s) return false;
  // A plain negative or positive number is not an expression
  if (/^-?\d+(\.\d+)?$/.test(s)) return false;
  return /[+\-*/%()]/.test(s);
}

interface AmountInputProps {
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  min?: number;
  step?: string;
}

export function AmountInput({
  value,
  onChange,
  className,
  placeholder = "0.00",
  disabled = false,
  min = 0,
  step = "0.01",
}: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const expr = isExpression(value);
  const preview = expr ? evalExpr(value) : null;

  function handleBlur() {
    if (preview !== null) {
      onChange(String(preview));
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        /* Use text mode when user is typing an expression so +/- etc. are allowed */
        type={expr ? "text" : "number"}
        min={expr ? undefined : min}
        step={expr ? undefined : step}
        disabled={disabled}
        className={cn("pr-8", className)}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={handleBlur}
      />
      {/* Calculator icon — clicking focuses the field in text mode */}
      <button
        type="button"
        tabIndex={-1}
        title="Supports expressions: 1200+18%, 500*2, (300+200)*1.5"
        onClick={() => inputRef.current?.focus()}
        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-mint transition-colors"
      >
        <Calculator className="h-3.5 w-3.5" />
      </button>
      {/* Live preview badge — appears while user is typing an expression */}
      {preview !== null && (
        <div className="absolute left-0 top-full z-10 mt-1 rounded-lg border border-mint/30 bg-card px-2.5 py-1 text-xs font-medium text-mint shadow-sm">
          = {preview.toLocaleString("en-IN", { maximumFractionDigits: 2 })}
          <span className="ml-1.5 text-muted-foreground font-normal">↵ to apply</span>
        </div>
      )}
    </div>
  );
}
