import { describe, it, expect } from "vitest";
import { profileFor, validateProfile, mapToStorage, readFromStorage, isAmountHolding } from "./investment-field-profiles";

const fdInput = { name: "SBI FD", platform: "SBI", purchase_date: "2026-01-01", quantity: 0, avg_price: 0, amount: 100000, current_value: null, interest_rate: 7, maturity_date: "2029-01-01" };

describe("investment field profiles", () => {
  it("FD has no quantity, avg price, search or SIP", () => {
    const p = profileFor("Fixed Deposit");
    expect(p.mode).toBe("amount");
    expect(p.search).toBe(false);
    expect(p.sip).toBe(false);
    expect(p.labels.platform).toBe("Bank / NBFC");
  });
  it("FD validates on deposit amount, not quantity", () => {
    const p = profileFor("Fixed Deposit");
    expect(validateProfile(p, fdInput)).toBeNull();
    expect(validateProfile(p, { ...fdInput, amount: 0 })).toBe("Deposit amount (principal) must be greater than zero");
    expect(validateProfile(p, { ...fdInput, interest_rate: null })).toBe("Interest rate is required");
  });
  it("stocks still require quantity and avg price", () => {
    const p = profileFor("Stocks");
    const v = { ...fdInput, quantity: 0, avg_price: 10 };
    expect(validateProfile(p, v)).toBe("Quantity must be greater than zero");
    expect(validateProfile(p, { ...v, quantity: 5, avg_price: 0 })).toBe("Average Buy Price must be greater than zero");
  });
  it("NPS / PMS / P2P do not require a platform", () => {
    for (const c of ["NPS", "PMS/AIF", "P2P Lending", "Loan Given", "SSY"]) {
      expect(validateProfile(profileFor(c), { ...fdInput, platform: "", interest_rate: null, maturity_date: null })).toBeNull();
    }
  });
  it("amount products store quantity 1 and avg_price = principal", () => {
    expect(mapToStorage(profileFor("Fixed Deposit"), fdInput, null)).toMatchObject({ quantity: 1, avg_price: 100000, current_price: 100000 });
    expect(mapToStorage(profileFor("NPS"), { ...fdInput, current_value: 125000 }, null)).toMatchObject({ quantity: 1, avg_price: 100000, current_price: 125000 });
  });
  it("edit round-trips amount products", () => {
    const p = profileFor("PMS/AIF");
    const stored = mapToStorage(p, { ...fdInput, amount: 500000, current_value: 620000 }, null);
    expect(readFromStorage(p, stored)).toMatchObject({ amount: 500000, current_value: 620000 });
  });
  it("legacy amount rows with qty>1 read back as their total", () => {
    expect(readFromStorage(profileFor("Fixed Deposit"), { quantity: 2, avg_price: 50000, current_price: 51000 }).amount).toBe(100000);
  });
  it("display helper", () => {
    expect(isAmountHolding("Fixed Deposit")).toBe(true);
    expect(isAmountHolding("Stocks")).toBe(false);
    expect(isAmountHolding("Bonds")).toBe(false);
  });
});
