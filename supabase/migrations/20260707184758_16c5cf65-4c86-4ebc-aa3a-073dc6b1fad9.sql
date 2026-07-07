CREATE TABLE public.user_payment_prefs (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_payment_mode TEXT,
  last_channel_by_mode JSONB NOT NULL DEFAULT '{}'::jsonb,
  last_account_by_mode JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_payment_prefs TO authenticated;
GRANT ALL ON public.user_payment_prefs TO service_role;

ALTER TABLE public.user_payment_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own payment prefs"
  ON public.user_payment_prefs
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_payment_prefs_updated_at
  BEFORE UPDATE ON public.user_payment_prefs
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.user_payment_prefs;
ALTER TABLE public.user_payment_prefs REPLICA IDENTITY FULL;