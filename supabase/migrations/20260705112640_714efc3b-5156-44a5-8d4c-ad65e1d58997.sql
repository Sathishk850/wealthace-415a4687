ALTER TABLE public.planner_settings
  ALTER COLUMN current_age DROP DEFAULT,
  ALTER COLUMN retirement_age DROP DEFAULT,
  ALTER COLUMN life_expectancy DROP DEFAULT,
  ALTER COLUMN monthly_expense DROP DEFAULT,
  ALTER COLUMN inflation_pct DROP DEFAULT,
  ALTER COLUMN pre_return_pct DROP DEFAULT,
  ALTER COLUMN post_return_pct DROP DEFAULT,
  ALTER COLUMN current_corpus DROP DEFAULT,
  ALTER COLUMN monthly_sip DROP DEFAULT,
  ALTER COLUMN withdrawal_rate_pct DROP DEFAULT;