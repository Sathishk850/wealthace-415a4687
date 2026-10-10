ALTER TABLE public.planner_goals ADD COLUMN IF NOT EXISTS emoji TEXT NOT NULL DEFAULT '🎯';
ALTER TABLE public.planner_goals ADD COLUMN IF NOT EXISTS sort_order TEXT NOT NULL DEFAULT 'progress';