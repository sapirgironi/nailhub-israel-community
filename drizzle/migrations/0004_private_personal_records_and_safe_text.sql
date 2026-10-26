ALTER TABLE public.health_declarations ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.model_calls ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
ALTER TABLE public.job_posts ADD COLUMN IF NOT EXISTS user_id uuid DEFAULT auth.uid();
DO $$ DECLARE t text; p record; owner_col text; BEGIN
FOREACH t IN ARRAY ARRAY['profiles','health_declarations','insurance_leads','model_calls','job_posts','nail_trade_items','role_change_requests'] LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t);
  FOR p IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t AND cmd IN ('SELECT','INSERT','ALL') LOOP
    EXECUTE format('DROP POLICY %I ON public.%I',p.policyname,t);
  END LOOP;
  owner_col := CASE WHEN t='profiles' THEN 'id' WHEN t='nail_trade_items' THEN 'seller_id' ELSE 'user_id' END;
  EXECUTE format('CREATE POLICY "Owner or admin read" ON public.%I FOR SELECT TO authenticated USING (auth.uid() = %I OR public.has_role(auth.uid(), ''admin''::public.app_role))',t,owner_col);
  IF t <> 'profiles' THEN
    EXECUTE format('CREATE POLICY "Owner insert" ON public.%I FOR INSERT TO authenticated WITH CHECK (auth.uid() = %I)',t,owner_col);
  END IF;
  EXECUTE format('REVOKE ALL ON public.%I FROM anon',t);
  EXECUTE format('GRANT SELECT ON public.%I TO authenticated',t);
  IF t <> 'profiles' THEN EXECUTE format('GRANT INSERT ON public.%I TO authenticated',t); END IF;
  EXECUTE format('GRANT ALL ON public.%I TO service_role',t);
END LOOP;
END $$;
REVOKE INSERT ON public.profiles FROM authenticated;
CREATE OR REPLACE FUNCTION public.validate_application_text() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE field record; value_text text; BEGIN
FOR field IN SELECT key, value FROM jsonb_each(to_jsonb(NEW)) LOOP
  IF jsonb_typeof(field.value) = 'string' AND field.key <> 'signature_image' THEN
    value_text := field.value #>> '{}';
    IF length(value_text)>10000 OR value_text ~* '<[[:space:]]*[/!?a-z]' OR value_text ~* '(javascript|vbscript)[[:space:]]*:' THEN
      RAISE EXCEPTION 'Text must be plain text and within length limits' USING ERRCODE='22023';
    END IF;
  END IF;
END LOOP;
IF TG_TABLE_NAME IN ('profiles','job_posts','nail_trade_items','insurance_leads','health_declarations') THEN
 value_text := to_jsonb(NEW)->>'phone';
 IF value_text IS NOT NULL AND value_text <> '' AND value_text !~ '^\+?[0-9 ()-]{7,30}$' THEN RAISE EXCEPTION 'Invalid phone number' USING ERRCODE='22023'; END IF;
END IF;
IF TG_TABLE_NAME='model_calls' THEN
 value_text := NEW.contact;
 IF value_text !~ '^\+?[0-9 ()-]{7,30}$' AND value_text !~ '^https://wa\.me/[0-9]{8,15}$' AND value_text !~ '^https://api\.whatsapp\.com/send\?phone=[0-9]{8,15}$' THEN RAISE EXCEPTION 'Invalid WhatsApp contact' USING ERRCODE='22023'; END IF;
END IF;
IF TG_TABLE_NAME='role_change_requests' AND (NEW.status <> 'pending' AND TG_OP='INSERT') THEN RAISE EXCEPTION 'Requests must start pending' USING ERRCODE='22023'; END IF;
RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.validate_application_text() FROM PUBLIC;
DO $$ DECLARE t text; BEGIN
FOREACH t IN ARRAY ARRAY['profiles','health_declarations','insurance_leads','model_calls','job_posts','nail_trade_items','posts','role_change_requests','saved_posts'] LOOP
 EXECUTE format('CREATE TRIGGER validate_plain_text BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_application_text()',t);
END LOOP;
END $$;