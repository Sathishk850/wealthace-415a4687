// Client-safe FX types (no server-only imports).
export type FxRate = {
  from: string;
  to: string;
  rate: number;
  bid: number;
  ask: number;
  refreshed_at: string;
  source: "alpha_vantage";
};
