
CREATE TABLE public.generated_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  schedule_id uuid REFERENCES public.scheduled_reports(id) ON DELETE SET NULL,
  name text NOT NULL,
  report_keys text[] NOT NULL DEFAULT '{}',
  formats text[] NOT NULL DEFAULT ARRAY['pdf','xlsx','csv'],
  frequency text,
  period_start date,
  period_end date,
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'ready',
  downloaded_at timestamp with time zone,
  email_status text NOT NULL DEFAULT 'pending',
  generated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX generated_reports_user_idx ON public.generated_reports (user_id, generated_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.generated_reports TO authenticated;
GRANT ALL ON public.generated_reports TO service_role;

ALTER TABLE public.generated_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own generated reports"
  ON public.generated_reports
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_generated_reports_updated
  BEFORE UPDATE ON public.generated_reports
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
