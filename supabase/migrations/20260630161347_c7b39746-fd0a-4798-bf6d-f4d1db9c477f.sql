
-- ================= ASSETS =================
CREATE TABLE public.wealth_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  sub_category text,
  current_value numeric(16,2) NOT NULL DEFAULT 0,
  purchase_value numeric(16,2),
  purchase_date date,
  quantity numeric(16,4),
  unit text,
  location text,
  owner_member_id uuid,
  notes text,
  status text NOT NULL DEFAULT 'active',
  last_updated date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_assets TO authenticated;
GRANT ALL ON public.wealth_assets TO service_role;
ALTER TABLE public.wealth_assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assets" ON public.wealth_assets FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX wealth_assets_user ON public.wealth_assets(user_id);
CREATE INDEX wealth_assets_user_cat ON public.wealth_assets(user_id, category);
CREATE TRIGGER trg_wealth_assets_updated BEFORE UPDATE ON public.wealth_assets FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ================= LIABILITIES =================
CREATE TABLE public.wealth_liabilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text NOT NULL,
  lender text,
  principal numeric(16,2),
  outstanding numeric(16,2) NOT NULL DEFAULT 0,
  emi numeric(16,2),
  interest_rate numeric(6,2),
  tenure_months integer,
  start_date date,
  end_date date,
  due_date date,
  status text NOT NULL DEFAULT 'active',
  owner_member_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_liabilities TO authenticated;
GRANT ALL ON public.wealth_liabilities TO service_role;
ALTER TABLE public.wealth_liabilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own liabilities" ON public.wealth_liabilities FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX wealth_liab_user ON public.wealth_liabilities(user_id);
CREATE INDEX wealth_liab_user_status ON public.wealth_liabilities(user_id, status);
CREATE TRIGGER trg_wealth_liab_updated BEFORE UPDATE ON public.wealth_liabilities FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ================= INVESTMENTS =================
CREATE TABLE public.wealth_investments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  symbol text,
  category text NOT NULL,
  sub_category text,
  quantity numeric(18,6) NOT NULL DEFAULT 0,
  avg_price numeric(16,4) NOT NULL DEFAULT 0,
  current_price numeric(16,4) NOT NULL DEFAULT 0,
  invested_value numeric(16,2) GENERATED ALWAYS AS (quantity * avg_price) STORED,
  current_value numeric(16,2) GENERATED ALWAYS AS (quantity * current_price) STORED,
  purchase_date date,
  account_id uuid,
  owner_member_id uuid,
  is_sip boolean NOT NULL DEFAULT false,
  sip_amount numeric(16,2),
  sip_frequency text,
  sip_start_date date,
  sip_next_date date,
  sip_active boolean DEFAULT false,
  notes text,
  status text NOT NULL DEFAULT 'active',
  last_updated date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_investments TO authenticated;
GRANT ALL ON public.wealth_investments TO service_role;
ALTER TABLE public.wealth_investments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own investments" ON public.wealth_investments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX wealth_inv_user ON public.wealth_investments(user_id);
CREATE INDEX wealth_inv_user_cat ON public.wealth_investments(user_id, category);
CREATE TRIGGER trg_wealth_inv_updated BEFORE UPDATE ON public.wealth_investments FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ================= INVESTMENT TRANSACTIONS (for XIRR) =================
CREATE TABLE public.wealth_investment_txns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  investment_id uuid NOT NULL REFERENCES public.wealth_investments(id) ON DELETE CASCADE,
  txn_type text NOT NULL,
  quantity numeric(18,6) NOT NULL,
  price numeric(16,4) NOT NULL,
  amount numeric(16,2) NOT NULL,
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_investment_txns TO authenticated;
GRANT ALL ON public.wealth_investment_txns TO service_role;
ALTER TABLE public.wealth_investment_txns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inv txns" ON public.wealth_investment_txns FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX wealth_inv_tx_user ON public.wealth_investment_txns(user_id, investment_id, occurred_on DESC);
CREATE TRIGGER trg_wealth_inv_tx_updated BEFORE UPDATE ON public.wealth_investment_txns FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ================= INSURANCE =================
CREATE TABLE public.wealth_insurance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  policy_name text NOT NULL,
  policy_number text,
  policy_type text NOT NULL,
  provider text,
  coverage_amount numeric(16,2) NOT NULL DEFAULT 0,
  premium_amount numeric(16,2),
  premium_frequency text,
  start_date date,
  renewal_date date,
  end_date date,
  nominee_member_id uuid,
  insured_member_id uuid,
  claim_status text,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_insurance TO authenticated;
GRANT ALL ON public.wealth_insurance TO service_role;
ALTER TABLE public.wealth_insurance ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own insurance" ON public.wealth_insurance FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX wealth_ins_user ON public.wealth_insurance(user_id);
CREATE INDEX wealth_ins_renewal ON public.wealth_insurance(user_id, renewal_date);
CREATE TRIGGER trg_wealth_ins_updated BEFORE UPDATE ON public.wealth_insurance FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ================= ACCOUNTS =================
CREATE TABLE public.wealth_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  account_type text NOT NULL,
  provider text,
  account_number_masked text,
  ifsc text,
  balance numeric(16,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'INR',
  owner_member_id uuid,
  status text NOT NULL DEFAULT 'active',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_accounts TO authenticated;
GRANT ALL ON public.wealth_accounts TO service_role;
ALTER TABLE public.wealth_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own accounts" ON public.wealth_accounts FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX wealth_acc_user ON public.wealth_accounts(user_id);
CREATE TRIGGER trg_wealth_acc_updated BEFORE UPDATE ON public.wealth_accounts FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- ================= FAMILY =================
CREATE TABLE public.wealth_family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  relationship text NOT NULL,
  date_of_birth date,
  gender text,
  is_dependent boolean NOT NULL DEFAULT false,
  is_nominee boolean NOT NULL DEFAULT false,
  pan text,
  aadhaar_masked text,
  email text,
  phone text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_family_members TO authenticated;
GRANT ALL ON public.wealth_family_members TO service_role;
ALTER TABLE public.wealth_family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own family" ON public.wealth_family_members FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX wealth_fam_user ON public.wealth_family_members(user_id);
CREATE TRIGGER trg_wealth_fam_updated BEFORE UPDATE ON public.wealth_family_members FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
