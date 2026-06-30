CREATE TABLE public.wealth_snapshots (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  snapshot_date DATE NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  net_worth NUMERIC NOT NULL DEFAULT 0,
  assets_total NUMERIC NOT NULL DEFAULT 0,
  liabilities_total NUMERIC NOT NULL DEFAULT 0,
  investments_total NUMERIC NOT NULL DEFAULT 0,
  savings_total NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX wealth_snapshots_user_date_idx ON public.wealth_snapshots (user_id, snapshot_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_snapshots TO authenticated;
GRANT ALL ON public.wealth_snapshots TO service_role;
ALTER TABLE public.wealth_snapshots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own snapshots" ON public.wealth_snapshots FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER update_wealth_snapshots_updated_at BEFORE UPDATE ON public.wealth_snapshots FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();