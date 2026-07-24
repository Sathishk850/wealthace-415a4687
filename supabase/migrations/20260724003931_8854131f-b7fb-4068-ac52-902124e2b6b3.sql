ALTER TABLE public.wealth_investments
  ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'INR';

ALTER TABLE public.wealth_investments
  DROP CONSTRAINT IF EXISTS wealth_investments_currency_check;

ALTER TABLE public.wealth_investments
  ADD CONSTRAINT wealth_investments_currency_check
  CHECK (currency IN ('INR', 'USD', 'EUR', 'GBP'));

CREATE INDEX IF NOT EXISTS wealth_investments_currency_idx
  ON public.wealth_investments (currency);