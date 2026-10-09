import { expect, test } from "bun:test";
import { assetSipHolding, readAssetSip, writeAssetSip } from "./holding-sip";

test("enabled existing assets enter SIP Tracker with their original identity and value", () => {
  const notes = writeAssetSip("NPS Equity: 75%\nPlatform: HDFC", { enabled: true, amount: 5000, frequency: "monthly", startDate: "2026-10-09", active: true });
  const row = assetSipHolding({ id: "existing", quantity: 50, current_value: 20000, purchase_value: 15000, notes });
  expect(row).toMatchObject({ id: "existing", is_sip: true, sip_amount: 5000, current_value: 20000, quantity: 50, avg_price: 300 });
  expect(notes).toContain("NPS Equity: 75%\nPlatform: HDFC");
});

test("disabled SIP disappears from tracker and editing settings replaces rather than duplicates metadata", () => {
  const old = writeAssetSip("Personal note", { enabled: true, amount: 1000, frequency: "monthly", startDate: "2026-10-01", active: true });
  const notes = writeAssetSip(old, { enabled: false, amount: 2000, frequency: "weekly", startDate: "2026-10-09", active: false });
  expect(readAssetSip(notes)).toMatchObject({ enabled: false, amount: 2000, frequency: "weekly" });
  expect(notes.match(/SIP Amount:/g)).toHaveLength(1);
  expect(assetSipHolding({ notes })).toBeNull();
});