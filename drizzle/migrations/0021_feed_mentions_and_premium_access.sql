ALTER TABLE public.posts ADD COLUMN mentions jsonb NOT NULL DEFAULT '[]'::jsonb;
CREATE INDEX posts_service_tags_search ON public.posts USING gin(service_tags);
CREATE TABLE public.premium_subscriptions (user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE, status text NOT NULL DEFAULT 'inactive' CHECK (status IN ('active','inactive','cancelled')), expires_at timestamptz NOT NULL, updated_at timestamptz NOT NULL DEFAULT now());
GRANT SELECT, INSERT, UPDATE, DELETE ON public.premium_subscriptions TO authenticated;
GRANT ALL ON public.premium_subscriptions TO service_role;
ALTER TABLE public.premium_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own premium access or admin" ON public.premium_subscriptions FOR SELECT TO authenticated USING ((user_id=auth.uid() OR public.has_role(auth.uid(),'admin')) AND NOT public.is_account_banned(auth.uid()));
CREATE POLICY "Admins manage premium access" ON public.premium_subscriptions FOR ALL TO authenticated USING (public.has_role(auth.uid(),'admin') AND NOT public.is_account_banned(auth.uid())) WITH CHECK (public.has_role(auth.uid(),'admin') AND NOT public.is_account_banned(auth.uid()));
CREATE FUNCTION public.validate_feed_metadata() RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
DECLARE m jsonb; tag text;
BEGIN
 IF jsonb_typeof(NEW.mentions) <> 'array' OR jsonb_array_length(NEW.mentions)>30 THEN RAISE EXCEPTION 'התיוגים אינם תקינים'; END IF;
 FOR m IN SELECT value FROM jsonb_array_elements(NEW.mentions) LOOP
  IF jsonb_typeof(m)<>'object' OR coalesce(m->>'userId','') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' OR coalesce(m->>'label','') !~ '^@[^[:space:]@<>]{1,100}$' THEN RAISE EXCEPTION 'התיוגים אינם תקינים'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id=(m->>'userId')::uuid AND account_status='active') THEN RAISE EXCEPTION 'חברת הקהילה אינה זמינה לתיוג'; END IF;
 END LOOP;
 IF cardinality(NEW.service_tags)>30 THEN RAISE EXCEPTION 'יותר מדי תגיות'; END IF;
 FOREACH tag IN ARRAY coalesce(NEW.service_tags,ARRAY[]::text[]) LOOP
  IF tag !~ '^[[:alnum:]_א-ת''׳״-]{1,60}$' THEN RAISE EXCEPTION 'התגית אינה תקינה'; END IF;
 END LOOP;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_feed_metadata BEFORE INSERT OR UPDATE OF mentions,service_tags ON public.posts FOR EACH ROW EXECUTE FUNCTION public.validate_feed_metadata();