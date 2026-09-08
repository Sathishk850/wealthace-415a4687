import { LIABILITY_TYPES, type LiabilityType } from "@/lib/asset-types";
import { DynIcon, PickerShell } from "@/components/wealth/AssetCategoryPicker";

/** Inline single-level picker for the nine flat liability types. */
export function LiabilityCategoryPicker({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (type: LiabilityType) => void;
}) {
  return (
    <PickerShell title="Add Liability" subtitle="Select a category" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {LIABILITY_TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => onSelect(t)}
            className="flex flex-col items-center gap-2 rounded-xl border border-border bg-surface-2 p-3 text-center transition hover:bg-surface-2/80"
          >
            <span
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: t.iconBg }}
            >
              <DynIcon name={t.icon} className="h-4 w-4" color={t.iconColor} />
            </span>
            <span className="text-[11px] leading-tight text-foreground">{t.label}</span>
          </button>
        ))}
      </div>
    </PickerShell>
  );
}
