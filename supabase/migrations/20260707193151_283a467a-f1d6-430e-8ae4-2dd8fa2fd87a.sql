-- Lock down user_pins: no direct client access. All operations go through server functions using the service role.
DROP POLICY IF EXISTS "Users can manage their own pin" ON public.user_pins;
DROP POLICY IF EXISTS "Users can manage own pin" ON public.user_pins;
DROP POLICY IF EXISTS "Users manage own pin" ON public.user_pins;

DO $$
DECLARE p record;
BEGIN
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='user_pins' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.user_pins', p.policyname);
  END LOOP;
END $$;

REVOKE ALL ON public.user_pins FROM anon, authenticated;
GRANT ALL ON public.user_pins TO service_role;

ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

-- Default-deny: no policies means no rows for authenticated/anon; service_role bypasses RLS.
