CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r text := coalesce(new.raw_user_meta_data->>'account_role', 'nail_tech');
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
BEGIN
  IF r NOT IN ('nail_tech','instructor','client','model','student','supplier') THEN r := 'nail_tech'; END IF;
  INSERT INTO public.profiles (id, display_name, business_name, phone, city, instagram, account_role, account_status, specialties, additional_services)
  VALUES (new.id,
    coalesce(nullif(m->>'display_name',''), split_part(new.email,'@',1)),
    coalesce(m->>'business_name',''),
    coalesce(m->>'phone',''),
    coalesce(nullif(m->>'city',''),'קריית ביאליק'),
    m->>'instagram',
    r, CASE WHEN r = 'supplier' THEN 'pending_approval' ELSE 'active' END,
    CASE WHEN jsonb_typeof(m->'specialties') = 'array' THEN array(SELECT jsonb_array_elements_text(m->'specialties')) ELSE array[]::text[] END,
    CASE WHEN jsonb_typeof(m->'additional_services') = 'array' THEN array(SELECT jsonb_array_elements_text(m->'additional_services')) ELSE array[]::text[] END);
  INSERT INTO public.user_roles (user_id, role) VALUES (new.id, 'user');
  RETURN new;
END; $$;
