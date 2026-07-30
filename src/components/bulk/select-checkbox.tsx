import { cn } from "@/lib/utils";

/**
 * Standard high-contrast selection checkbox used by every bulk-enabled table.
 */
export function SelectCheckbox({
  checked,
  indeterminate,
  onChange,
  label,
  className,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  className?: string;
}) {
  return (
    <input
      type="checkbox"
      aria-label={label ?? "Select row"}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = !!indeterminate && !checked;
      }}
      onClick={(e) => e.stopPropagation()}
      onChange={(e) => onChange(e.target.checked)}
      className={cn(
        "h-4 w-4 cursor-pointer rounded border-border accent-[hsl(var(--mint,168_84%_44%))] align-middle",
        className,
      )}
    />
  );
}
