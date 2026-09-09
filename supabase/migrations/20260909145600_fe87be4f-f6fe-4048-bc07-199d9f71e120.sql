ALTER TABLE public.wealth_accounts
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS icon text,
  ADD COLUMN IF NOT EXISTS is_default boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_emergency_fund boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS credit_limit numeric,
  ADD COLUMN IF NOT EXISTS opening_balance numeric,
  ADD COLUMN IF NOT EXISTS balance_as_of date;