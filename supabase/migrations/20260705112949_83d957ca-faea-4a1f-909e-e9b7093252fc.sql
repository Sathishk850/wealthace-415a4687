ALTER TABLE public.planner_settings
  ADD COLUMN IF NOT EXISTS retirement_plan_saved boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS fire_plan_saved boolean NOT NULL DEFAULT false;

UPDATE public.planner_settings
SET retirement_plan_saved = true,
    fire_plan_saved = true
WHERE retirement_plan_saved = false
  AND fire_plan_saved = false;