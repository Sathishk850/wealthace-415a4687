import { describe, it, expect } from "vitest";
import { applyRules, applyRulesToTransactions } from "./category-rules";

const rules = [{ keywords: ["airtel"], category_id: "util", kind: "expense" }];

describe("category rules", () => {
  it("matches keyword case-insensitively inside merchant", () => {
    expect(applyRules("AIRTEL Payments Bank", rules, "expense")).toBe("util");
  });
  it("ignores rules of the other kind", () => {
    expect(applyRules("Airtel refund", rules, "income")).toBeNull();
  });
  it("never overrides an already categorised transaction", () => {
    const out = applyRulesToTransactions(
      [
        { merchant: "airtel", kind: "expense", category_id: "food" },
        { merchant: "airtel", kind: "expense", category_id: null },
      ],
      rules,
    );
    expect(out.map((t) => t.category_id)).toEqual(["food", "util"]);
  });
});
