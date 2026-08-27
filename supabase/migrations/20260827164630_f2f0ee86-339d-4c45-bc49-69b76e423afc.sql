CREATE TABLE public.import_category_rules (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  merchant_key text NOT NULL,
  kind text NOT NULL,
  category text NOT NULL,
  hits integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, merchant_key, kind)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.import_category_rules TO authenticated;
GRANT ALL ON public.import_category_rules TO service_role;

ALTER TABLE public.import_category_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own import category rules"
ON public.import_category_rules FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER import_category_rules_touch
BEFORE UPDATE ON public.import_category_rules
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();