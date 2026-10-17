ALTER TABLE public.wealth_snapshots ADD COLUMN IF NOT EXISTS line_items jsonb;
COMMENT ON COLUMN public.wealth_snapshots.line_items IS 'Compact captured active positions; NULL means historical activity reconstruction is required.';
CREATE OR REPLACE FUNCTION public.capture_snapshot_line_items() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
 IF NEW.line_items IS NULL AND TG_OP = 'INSERT' THEN
  SELECT COALESCE(jsonb_agg(item ORDER BY item->>'kind',item->>'id'), '[]'::jsonb) INTO NEW.line_items FROM (
   SELECT jsonb_build_object('id',id,'name',name,'kind','investment','category',category,'quantity',quantity,'price',current_price,'value',COALESCE(current_value,invested_value,quantity*current_price,0)) item FROM public.wealth_investments WHERE user_id=NEW.user_id AND lower(status) NOT IN ('closed','sold','inactive','matured')
   UNION ALL SELECT jsonb_build_object('id',id,'name',name,'kind','asset','category',category,'quantity',quantity,'value',current_value) FROM public.wealth_assets WHERE user_id=NEW.user_id AND lower(status) NOT IN ('closed','sold','inactive','matured')
   UNION ALL SELECT jsonb_build_object('id',id,'name',name,'kind','account','category',account_type,'value',balance) FROM public.wealth_accounts WHERE user_id=NEW.user_id AND lower(status) NOT IN ('closed','sold','inactive','matured') AND lower(account_type) IN ('savings','current','wallet','cash','bank')
   UNION ALL SELECT jsonb_build_object('id',id,'name',name,'kind','liability','category',category,'value',outstanding) FROM public.wealth_liabilities WHERE user_id=NEW.user_id AND lower(status) NOT IN ('closed','sold','inactive','matured')
  ) positions;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER capture_snapshot_line_items BEFORE INSERT ON public.wealth_snapshots FOR EACH ROW EXECUTE FUNCTION public.capture_snapshot_line_items();