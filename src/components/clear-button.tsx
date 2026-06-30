import { Button } from "@/components/ui/button";

/**
 * Standard Clear button for multi-input forms.
 * - Resets local form state only; never writes to the database.
 * - Prompts for confirmation when there are unsaved changes (`dirty` is true).
 * - Place beside the Save / primary action button.
 */
export function ClearButton({
  onClear,
  dirty,
  disabled,
  label = "Clear",
}: {
  onClear: () => void;
  dirty: boolean;
  disabled?: boolean;
  label?: string;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      disabled={disabled}
      onClick={() => {
        if (dirty && !window.confirm("Discard the values you just entered? Saved records won't change.")) return;
        onClear();
      }}
    >
      {label}
    </Button>
  );
}

/** Shallow-equality dirty check for plain form objects. */
export function isDirty<T extends Record<string, unknown>>(current: T, baseline: T): boolean {
  const keys = new Set([...Object.keys(current), ...Object.keys(baseline)]);
  for (const k of keys) {
    const a = current[k];
    const b = baseline[k];
    if (a == null && b == null) continue;
    if (a !== b) return true;
  }
  return false;
}