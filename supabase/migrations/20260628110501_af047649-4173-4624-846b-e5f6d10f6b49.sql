
-- Reminders
CREATE TABLE public.tools_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  kind text NOT NULL DEFAULT 'custom',
  title text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  due_date date NOT NULL,
  recurrence text NOT NULL DEFAULT 'none',
  notify_days_before integer NOT NULL DEFAULT 1,
  notify_enabled boolean NOT NULL DEFAULT true,
  status text NOT NULL DEFAULT 'upcoming',
  notes text,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tools_reminders TO authenticated;
GRANT ALL ON public.tools_reminders TO service_role;
ALTER TABLE public.tools_reminders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reminders" ON public.tools_reminders FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tools_reminders_touch BEFORE UPDATE ON public.tools_reminders
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Saved calculator results
CREATE TABLE public.tools_saved_calculations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  calc_type text NOT NULL,
  label text NOT NULL,
  inputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  outputs jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tools_saved_calculations TO authenticated;
GRANT ALL ON public.tools_saved_calculations TO service_role;
ALTER TABLE public.tools_saved_calculations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own saved calcs" ON public.tools_saved_calculations FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tools_saved_calcs_touch BEFORE UPDATE ON public.tools_saved_calculations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Recently used reports/calculators
CREATE TABLE public.tools_activity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  item_type text NOT NULL,
  item_slug text NOT NULL,
  item_label text NOT NULL,
  last_used_at timestamptz NOT NULL DEFAULT now(),
  use_count integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, item_type, item_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tools_activity TO authenticated;
GRANT ALL ON public.tools_activity TO service_role;
ALTER TABLE public.tools_activity ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own activity" ON public.tools_activity FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER tools_activity_touch BEFORE UPDATE ON public.tools_activity
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE INDEX tools_reminders_user_due ON public.tools_reminders(user_id, due_date);
CREATE INDEX tools_activity_user_used ON public.tools_activity(user_id, last_used_at DESC);
