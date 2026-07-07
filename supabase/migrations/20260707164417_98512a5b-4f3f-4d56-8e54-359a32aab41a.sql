
-- 1) payment_accounts table
CREATE TABLE public.payment_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  account_type text NOT NULL CHECK (account_type IN ('bank','credit_card','debit_card','wallet','upi','cash')),
  institution text,
  last4 text,
  color text,
  icon text,
  is_active boolean NOT NULL DEFAULT true,
  is_default boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.payment_accounts TO authenticated;
GRANT ALL ON public.payment_accounts TO service_role;

ALTER TABLE public.payment_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own payment accounts" ON public.payment_accounts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX payment_accounts_user_idx ON public.payment_accounts(user_id, is_active);

CREATE TRIGGER trg_payment_accounts_updated
  BEFORE UPDATE ON public.payment_accounts
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- 2) Add payment_mode + payment_account_id to outflow tables
ALTER TABLE public.money_transactions
  ADD COLUMN payment_mode text,
  ADD COLUMN payment_account_id uuid REFERENCES public.payment_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.wealth_investments
  ADD COLUMN payment_mode text,
  ADD COLUMN payment_account_id uuid REFERENCES public.payment_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.wealth_investment_txns
  ADD COLUMN payment_mode text,
  ADD COLUMN payment_account_id uuid REFERENCES public.payment_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.wealth_liabilities
  ADD COLUMN payment_mode text,
  ADD COLUMN payment_account_id uuid REFERENCES public.payment_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.wealth_insurance
  ADD COLUMN payment_mode text,
  ADD COLUMN payment_account_id uuid REFERENCES public.payment_accounts(id) ON DELETE SET NULL;

ALTER TABLE public.wealth_assets
  ADD COLUMN payment_mode text,
  ADD COLUMN payment_account_id uuid REFERENCES public.payment_accounts(id) ON DELETE SET NULL;

-- 3) At most one default account per user
CREATE UNIQUE INDEX payment_accounts_one_default_per_user
  ON public.payment_accounts(user_id)
  WHERE is_default = true;
