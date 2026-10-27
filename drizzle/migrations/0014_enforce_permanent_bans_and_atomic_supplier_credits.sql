CREATE OR REPLACE FUNCTION public.is_account_banned(target_user uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$ SELECT EXISTS (SELECT 1 FROM public.user_sanctions WHERE user_id=target_user AND kind='ban' AND (until IS NULL OR until>now())) $$;
REVOKE ALL ON FUNCTION public.is_account_banned(uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.is_account_banned(uuid) TO authenticated,service_role;
DO $$ DECLARE t record; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' AND rowsecurity LOOP EXECUTE format('CREATE POLICY "Blocked accounts cannot access application" ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_account_banned(auth.uid())) WITH CHECK (NOT public.is_account_banned(auth.uid()))', t.tablename); END LOOP; END $$;
CREATE POLICY "Blocked accounts cannot access work photos" ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_account_banned(auth.uid())) WITH CHECK (NOT public.is_account_banned(auth.uid()));
CREATE OR REPLACE FUNCTION public.manage_supplier_credits(target_user uuid, quantity integer, credit_mode text, operation_id uuid) RETURNS bigint LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE balance bigint; delta bigint; BEGIN
IF public.is_account_banned(auth.uid()) OR NOT public.has_role(auth.uid(),'admin') THEN RAISE EXCEPTION 'גישה למנהלת בלבד' USING ERRCODE='42501'; END IF;
IF quantity<0 OR quantity>100000 OR credit_mode NOT IN ('set','add') OR operation_id IS NULL THEN RAISE EXCEPTION 'כמות הקרדיטים אינה תקינה'; END IF;
PERFORM pg_advisory_xact_lock(hashtextextended(target_user::text,0));
IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=target_user AND account_role='supplier') THEN RAISE EXCEPTION 'החשבון אינו ספק מאושר'; END IF;
SELECT coalesce(sum(amount),0) INTO balance FROM public.community_credit_ledger WHERE user_id=target_user;
IF EXISTS (SELECT 1 FROM public.community_credit_ledger WHERE request_id=operation_id AND user_id=target_user) THEN RETURN balance; END IF;
delta:=CASE WHEN credit_mode='set' THEN quantity-balance ELSE quantity END;
IF delta<>0 THEN INSERT INTO public.community_credit_ledger(user_id,amount,reason,actor_id,request_id) VALUES(target_user,delta,CASE WHEN credit_mode='set' THEN 'הגדרת יתרת קרדיטים לפרסום' ELSE 'הוספת קרדיטים לפרסום' END,auth.uid(),operation_id); END IF;
RETURN balance+delta; END $$;
REVOKE ALL ON FUNCTION public.manage_supplier_credits(uuid,integer,text,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.manage_supplier_credits(uuid,integer,text,uuid) TO authenticated,service_role;