DROP POLICY IF EXISTS "Trade items are public" ON public.nail_trade_items;
CREATE POLICY "Approved trade items are public" ON public.nail_trade_items FOR SELECT TO anon, authenticated USING (status = 'approved' OR seller_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
COMMENT ON TABLE public.community_credit_ledger IS 'Supplier advertising credits; written only through adjust_community_credit';
GRANT SELECT ON public.community_credit_ledger TO authenticated;
GRANT EXECUTE ON FUNCTION public.adjust_community_credit(uuid,integer,text,uuid) TO authenticated;