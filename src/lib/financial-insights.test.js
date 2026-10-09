import { describe, expect, test } from "bun:test";
import { holdingPerformers, monthlyCashflow } from "./financial-insights";

describe("monthly comparison", () => {
  test("uses six ascending calendar months and totals income and expense separately", () => {
    const result = monthlyCashflow([
      { occurred_on: "2026-10-01", kind: "income", amount: 10000 },
      { occurred_on: "2026-10-02", kind: "expense", amount: 3000 },
      { occurred_on: "2026-04-30", kind: "expense", amount: 900 },
    ], new Date(2026, 9, 1));
    expect(result.map((r) => r.key)).toEqual(["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"]);
    expect(result[5]).toMatchObject({ income: 10000, expense: 3000, net: 7000 });
    expect(result[0].expense).toBe(0);
  });
  test("does not treat transfers between accounts as earnings or spending", () => {
    const result = monthlyCashflow([{ occurred_on: "2026-10-01", kind: "income", amount: 5000, is_transfer: true }], new Date(2026, 9, 1));
    expect(result[5].income).toBe(0);
  });
});

describe("holding performers", () => {
  test("ranks by absolute P&L instead of percentage and requires valid valuations", () => {
    const result = holdingPerformers([
      { id: "large", name: "Large gain", inv: 100000, cur: 110000 },
      { id: "small", name: "High percent", inv: 100, cur: 200 },
      { id: "loss", name: "Loss", inv: 20000, cur: 10000 },
      { id: "zero", name: "No cost", inv: 0, cur: 99999 },
    ]);
    expect(result.gainers.map((h) => h.id)).toEqual(["large", "small"]);
    expect(result.losers[0]).toMatchObject({ id: "loss", pnl: -10000, pnlPct: -50 });
    expect(result.ranked).toHaveLength(3);
  });
  test("never labels positive holdings as losers or negative holdings as gainers", () => {
    expect(holdingPerformers([{ id: "up", name: "Up", inv: 100, cur: 200 }]).losers).toEqual([]);
    expect(holdingPerformers([{ id: "down", name: "Down", inv: 100, cur: 0 }]).gainers).toEqual([]);
  });
});