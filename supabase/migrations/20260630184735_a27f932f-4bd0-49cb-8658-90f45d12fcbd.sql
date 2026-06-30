
CREATE TABLE IF NOT EXISTS public.user_pins (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  pin_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_pins TO authenticated;
GRANT ALL ON public.user_pins TO service_role;

ALTER TABLE public.user_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own PIN"
  ON public.user_pins
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER user_pins_touch
  BEFORE UPDATE ON public.user_pins
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
