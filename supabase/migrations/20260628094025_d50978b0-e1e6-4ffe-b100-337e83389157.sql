-- Goals table
CREATE TABLE public.planner_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  goal_type text NOT NULL DEFAULT 'custom',
  target_amount numeric NOT NULL DEFAULT 0,
  saved_amount numeric NOT NULL DEFAULT 0,
  target_date date,
  monthly_contribution numeric NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_goals TO authenticated;
GRANT ALL ON public.planner_goals TO service_role;
ALTER TABLE public.planner_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own goals" ON public.planner_goals FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_planner_goals_updated BEFORE UPDATE ON public.planner_goals
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Settings (single row per user covering retirement + FIRE assumptions)
CREATE TABLE public.planner_settings (
  user_id uuid PRIMARY KEY,
  current_age integer NOT NULL DEFAULT 30,
  retirement_age integer NOT NULL DEFAULT 60,
  life_expectancy integer NOT NULL DEFAULT 85,
  monthly_expense numeric NOT NULL DEFAULT 50000,
  inflation_pct numeric NOT NULL DEFAULT 6.5,
  pre_return_pct numeric NOT NULL DEFAULT 12,
  post_return_pct numeric NOT NULL DEFAULT 7,
  current_corpus numeric NOT NULL DEFAULT 0,
  monthly_sip numeric NOT NULL DEFAULT 0,
  withdrawal_rate_pct numeric NOT NULL DEFAULT 4,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_settings TO authenticated;
GRANT ALL ON public.planner_settings TO service_role;
ALTER TABLE public.planner_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own settings" ON public.planner_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_planner_settings_updated BEFORE UPDATE ON public.planner_settings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();