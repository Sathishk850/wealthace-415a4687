DELETE FROM public.planner_retirement_plans
WHERE current_age = 30
  AND retirement_age = 60
  AND life_expectancy = 85
  AND monthly_expense = 50000
  AND inflation_pct = 6.5
  AND pre_return_pct = 12
  AND post_return_pct = 7
  AND current_corpus = 0
  AND monthly_sip = 0;

DELETE FROM public.planner_fire_plans
WHERE current_age = 30
  AND monthly_expense = 50000
  AND pre_return_pct = 12
  AND current_corpus = 0
  AND monthly_sip = 0
  AND withdrawal_rate_pct IN (2, 4);

UPDATE public.planner_settings
SET retirement_plan_saved = false,
    fire_plan_saved = false
WHERE current_age = 30
  AND retirement_age = 60
  AND life_expectancy = 85
  AND monthly_expense = 50000
  AND inflation_pct = 6.5
  AND pre_return_pct = 12
  AND post_return_pct = 7
  AND current_corpus = 0
  AND monthly_sip = 0
  AND withdrawal_rate_pct IN (2, 4);