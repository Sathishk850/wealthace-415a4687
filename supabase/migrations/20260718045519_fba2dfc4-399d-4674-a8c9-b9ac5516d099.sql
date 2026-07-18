-- 1. Extend wealth_investments with market-data linking fields (all nullable, no existing data touched)
ALTER TABLE public.wealth_investments
  ADD COLUMN IF NOT EXISTS identifier_type text,
  ADD COLUMN IF NOT EXISTS identifier text,
  ADD COLUMN IF NOT EXISTS exchange text,
  ADD COLUMN IF NOT EXISTS price_source text,
  ADD COLUMN IF NOT EXISTS price_updated_at timestamptz,
  ADD COLUMN IF NOT EXISTS previous_close numeric;

CREATE INDEX IF NOT EXISTS wealth_investments_identifier_idx
  ON public.wealth_investments (identifier_type, identifier)
  WHERE identifier IS NOT NULL;

-- 2. Shared market price cache
CREATE TABLE IF NOT EXISTS public.market_price_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier_type text NOT NULL,
  identifier text NOT NULL,
  latest_price numeric,
  previous_close numeric,
  currency text,
  source text,
  fetched_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT market_price_cache_ident_unique UNIQUE (identifier_type, identifier)
);

-- 3. Grants — readable by any signed-in user; writes only via service role
GRANT SELECT ON public.market_price_cache TO authenticated;
GRANT ALL ON public.market_price_cache TO service_role;

-- 4. RLS
ALTER TABLE public.market_price_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read market prices"
  ON public.market_price_cache
  FOR SELECT
  TO authenticated
  USING (true);

-- 5. updated_at trigger
CREATE TRIGGER market_price_cache_set_updated_at
  BEFORE UPDATE ON public.market_price_cache
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX IF NOT EXISTS market_price_cache_expires_idx
  ON public.market_price_cache (expires_at);
