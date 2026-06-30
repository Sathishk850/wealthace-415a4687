
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS theme text NOT NULL DEFAULT 'system',
  ADD COLUMN IF NOT EXISTS compact_mode boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS default_chart_range text NOT NULL DEFAULT '3M',
  ADD COLUMN IF NOT EXISTS chart_animations boolean NOT NULL DEFAULT true;
