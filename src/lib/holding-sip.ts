import type { Asset, Investment } from "./wealth-api";
import { noteField } from "./holding-meta";

export type SipSettings = {
  enabled: boolean;
  amount: number;
  frequency: string;
  startDate: string;
  active: boolean;
};

export function readAssetSip(notes: string | null | undefined): SipSettings {
  const enabled = noteField(notes, "SIP Tracking") === "On";
  return {
    enabled,
    amount: Number(noteField(notes, "SIP Amount")) || 0,
    frequency: noteField(notes, "SIP Frequency") || "monthly",
    startDate: noteField(notes, "SIP Start Date") || "",
    active: enabled && noteField(notes, "SIP Active") !== "No",
  };
}

export function writeAssetSip(notes: string | null | undefined, settings: SipSettings): string {
  const preserved = (notes ?? "").split(/\r?\n/).filter((line) =>
    !/^\s*SIP (Tracking|Amount|Frequency|Start Date|Active)\s*:/i.test(line),
  ).join("\n").trim();
  return [preserved, `SIP Tracking: ${settings.enabled ? "On" : "Off"}`,
    `SIP Amount: ${settings.amount}`, `SIP Frequency: ${settings.frequency}`,
    `SIP Start Date: ${settings.startDate}`, `SIP Active: ${settings.active ? "Yes" : "No"}`,
  ].filter(Boolean).join("\n");
}

/** Tracker-only projection: the original asset remains the only valued holding. */
export function assetSipHolding(asset: Asset): Investment | null {
  const sip = readAssetSip(asset.notes);
  if (!sip.enabled) return null;
  const quantity = asset.quantity && asset.quantity > 0 ? asset.quantity : 1;
  return {
    ...asset, symbol: null, quantity,
    avg_price: (asset.purchase_value ?? 0) / quantity,
    current_price: asset.current_value / quantity,
    invested_value: asset.purchase_value, maturity_date: null, account_id: null,
    is_sip: true, sip_amount: sip.amount, sip_frequency: sip.frequency,
    sip_start_date: sip.startDate || null, sip_next_date: null, sip_active: sip.active,
    identifier_type: null, identifier: null, exchange: null, price_source: null,
    price_updated_at: null, previous_close: null, currency: "INR",
  };
}