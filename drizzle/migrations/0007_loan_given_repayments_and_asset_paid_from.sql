ALTER TABLE public.wealth_assets ADD COLUMN IF NOT EXISTS paid_from_account_id uuid REFERENCES public.wealth_accounts(id) ON DELETE SET NULL;
CREATE TABLE IF NOT EXISTS public.wealth_loan_given_repayments (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 asset_id uuid NOT NULL REFERENCES public.wealth_assets(id) ON DELETE CASCADE,
 amount numeric NOT NULL CHECK (amount > 0), repaid_on date NOT NULL, notes text,
 payment_account_id uuid REFERENCES public.wealth_accounts(id) ON DELETE SET NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wealth_loan_given_repayments TO authenticated;
GRANT ALL ON public.wealth_loan_given_repayments TO service_role;
ALTER TABLE public.wealth_loan_given_repayments ENABLE ROW LEVEL SECURITY;
CREATE POLICY own ON public.wealth_loan_given_repayments FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX IF NOT EXISTS idx_loan_repayments_asset ON public.wealth_loan_given_repayments(asset_id);
CREATE FUNCTION public.validate_loan_repayment() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE a public.wealth_assets; target uuid; owner_id uuid;
BEGIN
 target := CASE WHEN TG_OP = 'DELETE' THEN OLD.asset_id ELSE NEW.asset_id END;
 SELECT * INTO a FROM public.wealth_assets WHERE id = target FOR UPDATE;
 IF TG_OP = 'DELETE' AND NOT FOUND THEN RETURN OLD; END IF;
 owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;
 IF a.id IS NULL OR a.user_id <> owner_id OR a.category <> 'Loan Given' THEN RAISE EXCEPTION 'Repayments require your own Loan Given asset'; END IF;
 IF auth.uid() IS NOT NULL AND owner_id <> auth.uid() THEN RAISE EXCEPTION 'Not authorized'; END IF;
 IF TG_OP = 'UPDATE' AND (NEW.asset_id <> OLD.asset_id OR NEW.user_id <> OLD.user_id) THEN RAISE EXCEPTION 'Repayment ownership cannot change'; END IF;
 IF TG_OP <> 'DELETE' AND NEW.payment_account_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.wealth_accounts WHERE id = NEW.payment_account_id AND user_id = owner_id AND currency = 'INR') THEN RAISE EXCEPTION 'Choose your own INR account'; END IF;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_loan_repayment BEFORE INSERT OR UPDATE OR DELETE ON public.wealth_loan_given_repayments FOR EACH ROW EXECUTE FUNCTION public.validate_loan_repayment();
CREATE FUNCTION public.apply_loan_repayment() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE target uuid; owner_id uuid; total numeric;
BEGIN
 target := CASE WHEN TG_OP = 'DELETE' THEN OLD.asset_id ELSE NEW.asset_id END;
 owner_id := CASE WHEN TG_OP = 'DELETE' THEN OLD.user_id ELSE NEW.user_id END;
 IF TG_OP <> 'INSERT' AND OLD.payment_account_id IS NOT NULL THEN UPDATE public.wealth_accounts SET balance = balance - OLD.amount WHERE id = OLD.payment_account_id AND user_id = owner_id; END IF;
 IF TG_OP <> 'DELETE' AND NEW.payment_account_id IS NOT NULL THEN UPDATE public.wealth_accounts SET balance = balance + NEW.amount WHERE id = NEW.payment_account_id AND user_id = owner_id; END IF;
 SELECT COALESCE(sum(amount),0) INTO total FROM public.wealth_loan_given_repayments WHERE asset_id = target AND user_id = owner_id;
 UPDATE public.wealth_assets SET current_value = greatest(0,coalesce(purchase_value,0)-total), last_updated = current_date WHERE id = target AND user_id = owner_id;
 IF TG_OP = 'DELETE' THEN RETURN OLD; END IF; RETURN NEW;
END $$;
CREATE TRIGGER apply_loan_repayment AFTER INSERT OR UPDATE OR DELETE ON public.wealth_loan_given_repayments FOR EACH ROW EXECUTE FUNCTION public.apply_loan_repayment();
CREATE FUNCTION public.loan_asset_outstanding() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
DECLARE total numeric;
BEGIN
 IF NEW.category = 'Loan Given' THEN
  IF NEW.purchase_value IS NULL OR NEW.purchase_value <= 0 THEN RAISE EXCEPTION 'Lent amount must be positive'; END IF;
  SELECT COALESCE(sum(amount),0) INTO total FROM public.wealth_loan_given_repayments WHERE asset_id = NEW.id AND user_id = NEW.user_id;
  NEW.current_value := greatest(0,NEW.purchase_value-total);
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER loan_asset_outstanding BEFORE INSERT OR UPDATE OF purchase_value, current_value, category ON public.wealth_assets FOR EACH ROW EXECUTE FUNCTION public.loan_asset_outstanding();
CREATE FUNCTION public.deduct_asset_paid_from() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.paid_from_account_id IS NOT NULL AND NEW.current_value > 0 AND upper(NEW.category) !~ '(PPF|NPS|SSY|EPF)' THEN
  UPDATE public.wealth_accounts SET balance = balance - NEW.current_value WHERE id = NEW.paid_from_account_id AND user_id = NEW.user_id AND currency = 'INR' AND (account_type <> 'Credit Card' OR NEW.category = 'Loan Given');
  IF NOT FOUND THEN RAISE EXCEPTION 'Choose your own eligible INR account'; END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER deduct_asset_paid_from AFTER INSERT ON public.wealth_assets FOR EACH ROW EXECUTE FUNCTION public.deduct_asset_paid_from();