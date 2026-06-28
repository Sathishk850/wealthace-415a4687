
-- CATEGORIES
CREATE TABLE public.money_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  color text NOT NULL DEFAULT '#22C55E',
  icon text NOT NULL DEFAULT 'Wallet',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, kind, name)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_categories TO authenticated;
GRANT ALL ON public.money_categories TO service_role;
ALTER TABLE public.money_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own categories" ON public.money_categories FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- TRANSACTIONS
CREATE TABLE public.money_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('income','expense')),
  amount numeric(14,2) NOT NULL CHECK (amount > 0),
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  category_id uuid REFERENCES public.money_categories(id) ON DELETE SET NULL,
  merchant text NOT NULL,
  account text,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_transactions TO authenticated;
GRANT ALL ON public.money_transactions TO service_role;
ALTER TABLE public.money_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx" ON public.money_transactions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX money_tx_user_date ON public.money_transactions (user_id, occurred_on DESC);
CREATE INDEX money_tx_user_kind ON public.money_transactions (user_id, kind);

-- BUDGETS (one per category per month)
CREATE TABLE public.money_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.money_categories(id) ON DELETE CASCADE,
  period_month date NOT NULL,
  amount_limit numeric(14,2) NOT NULL CHECK (amount_limit > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id, period_month)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.money_budgets TO authenticated;
GRANT ALL ON public.money_budgets TO service_role;
ALTER TABLE public.money_budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own budgets" ON public.money_budgets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER trg_money_categories_updated BEFORE UPDATE ON public.money_categories FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_money_transactions_updated BEFORE UPDATE ON public.money_transactions FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_money_budgets_updated BEFORE UPDATE ON public.money_budgets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
