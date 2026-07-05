ALTER TABLE public.planner_fire_plans ADD COLUMN IF NOT EXISTS inflation_pct numeric NOT NULL DEFAULT 0;

-- Update GRANTs so the new column is accessible to existing roles
GRANT SELECT, INSERT, UPDATE, DELETE ON public.planner_fire_plans TO authenticated;
GRANT ALL ON public.planner_fire_plans TO service_role;

-- Enable the existing RLS policy already covers the table, no new policy needed
