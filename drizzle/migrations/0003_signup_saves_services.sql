create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_user_meta_data->>'account_role', 'nail_tech');
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  if r not in ('nail_tech','instructor','client','model','student','supplier') then r := 'nail_tech'; end if;
  insert into public.profiles (id, display_name, business_name, phone, city, instagram, account_role, account_status, specialties, additional_services)
  values (new.id,
    coalesce(nullif(m->>'display_name',''), split_part(new.email,'@',1)),
    coalesce(m->>'business_name',''),
    coalesce(m->>'phone',''),
    coalesce(nullif(m->>'city',''),'קריית ביאליק'),
    m->>'instagram',
    r, case when r = 'supplier' then 'pending_approval' else 'active' end,
    case when jsonb_typeof(m->'specialties') = 'array' then array(select jsonb_array_elements_text(m->'specialties')) else array[]::text[] end,
    case when jsonb_typeof(m->'additional_services') = 'array' then array(select jsonb_array_elements_text(m->'additional_services')) else array[]::text[] end);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;