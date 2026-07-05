CREATE TABLE IF NOT EXISTS public.planner_retirement_plans (
  user_id uuid PRIMARY KEY,
  current_age integer NOT NULL,
  retirement_age integer NOT NULL,
  life_expectancy integer NOT NULL,
  monthly_expense numeric NOT NULL,
  inflation_pct numeric NOT NULL,
  pre_return_pct numeric NOT NULL,
  post_return_pct numeric NOT NULL,
  current_corpus numeric NOT NULL,
  monthly_sip numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_retirement_plans TO authenticated;
GRANT ALL ON public.planner_retirement_plans TO service_role;
ALTER TABLE public.planner_retirement_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own retirement plans" ON public.planner_retirement_plans;
CREATE POLICY "Users can manage own retirement plans"
ON public.planner_retirement_plans
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS touch_planner_retirement_plans_updated_at ON public.planner_retirement_plans;
CREATE TRIGGER touch_planner_retirement_plans_updated_at
BEFORE UPDATE ON public.planner_retirement_plans
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE TABLE IF NOT EXISTS public.planner_fire_plans (
  user_id uuid PRIMARY KEY,
  current_age integer NOT NULL,
  monthly_expense numeric NOT NULL,
  current_corpus numeric NOT NULL,
  monthly_sip numeric NOT NULL,
  pre_return_pct numeric NOT NULL,
  withdrawal_rate_pct numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_fire_plans TO authenticated;
GRANT ALL ON public.planner_fire_plans TO service_role;
ALTER TABLE public.planner_fire_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own FIRE plans" ON public.planner_fire_plans;
CREATE POLICY "Users can manage own FIRE plans"
ON public.planner_fire_plans
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS touch_planner_fire_plans_updated_at ON public.planner_fire_plans;
CREATE TRIGGER touch_planner_fire_plans_updated_at
BEFORE UPDATE ON public.planner_fire_plans
FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

INSERT INTO public.planner_retirement_plans (
  user_id,
  current_age,
  retirement_age,
  life_expectancy,
  monthly_expense,
  inflation_pct,
  pre_return_pct,
  post_return_pct,
  current_corpus,
  monthly_sip,
  created_at,
  updated_at
)
SELECT
  user_id,
  current_age,
  retirement_age,
  life_expectancy,
  monthly_expense,
  inflation_pct,
  pre_return_pct,
  post_return_pct,
  current_corpus,
  monthly_sip,
  created_at,
  updated_at
FROM public.planner_settings
WHERE retirement_plan_saved = true
ON CONFLICT (user_id) DO NOTHING;

INSERT INTO public.planner_fire_plans (
  user_id,
  current_age,
  monthly_expense,
  current_corpus,
  monthly_sip,
  pre_return_pct,
  withdrawal_rate_pct,
  created_at,
  updated_at
)
SELECT
  user_id,
  current_age,
  monthly_expense,
  current_corpus,
  monthly_sip,
  pre_return_pct,
  withdrawal_rate_pct,
  created_at,
  updated_at
FROM public.planner_settings
WHERE fire_plan_saved = true
ON CONFLICT (user_id) DO NOTHING;