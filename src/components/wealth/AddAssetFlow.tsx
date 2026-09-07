import { useNavigate } from "@tanstack/react-router";
import { AssetTypePicker } from "@/components/wealth/AssetTypePicker";
import type { AssetSubType, LiabilityType } from "@/lib/asset-types";

type Props = {
  open: boolean;
  onClose: () => void;
  defaultTab?: "asset" | "liability";
};

/** Modal overlay wrapping the two-level asset / liability type picker. */
export function AddAssetFlow({ open, onClose, defaultTab = "asset" }: Props) {
  const navigate = useNavigate();
  if (!open) return null;

  const selectAsset = (t: AssetSubType) => {
    onClose();
    if (t.module === "investment") {
      navigate({
        to: "/wealth/add-investment",
        search: { category: t.dbCategory, subCategory: t.dbSubCategory },
      } as never);
    } else {
      navigate({
        to: "/wealth",
        search: { addAsset: true, category: t.dbCategory },
      } as never);
    }
  };

  const selectLiability = (t: LiabilityType) => {
    onClose();
    navigate({
      to: "/wealth",
      search: { addLiability: true, category: t.dbCategory },
    } as never);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 sm:items-center"
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-lg">
        <AssetTypePicker
          defaultTab={defaultTab}
          onSelectAsset={selectAsset}
          onSelectLiability={selectLiability}
          onClose={onClose}
        />
      </div>
    </div>
  );
}
