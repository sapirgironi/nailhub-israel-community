create type public.app_role as enum ('admin', 'moderator', 'user');
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.user_roles where user_id = _user_id and role = _role) $$;
create policy "Users see own roles" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(), 'admin'));

create table public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  display_name text not null,
  business_name text default '',
  phone text not null default '',
  city text default 'קריית ביאליק',
  instagram text,
  account_role text not null default 'nail_tech' check (account_role in ('nail_tech','instructor','supplier','client','model','student')),
  specialties text[] default array['מבנה אנטומי','דיפ פאוודר'],
  additional_services text[] default array[]::text[],
  light_logo_url text,
  dark_logo_url text,
  default_watermark text default 'studio_text',
  is_verified boolean default false,
  account_status text default 'active' check (account_status in ('active','pending_approval','suspended')),
  hide_phone boolean default false,
  hide_address boolean default false,
  created_at timestamptz not null default now()
);
grant select on public.profiles to anon;
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Public profiles are viewable" on public.profiles for select to anon, authenticated using (true);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id or public.has_role(auth.uid(), 'admin'));

create or replace function public.prevent_sensitive_profile_updates()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    new.account_role := old.account_role;
    new.is_verified := old.is_verified;
    new.account_status := old.account_status;
  end if;
  return new;
end; $$;
create trigger tr_protect_profile_fields before update on public.profiles
for each row execute function public.prevent_sensitive_profile_updates();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare r text := coalesce(new.raw_user_meta_data->>'account_role', 'nail_tech');
begin
  if r not in ('nail_tech','instructor','client','model','student','supplier') then r := 'nail_tech'; end if;
  insert into public.profiles (id, display_name, business_name, phone, city, instagram, account_role, account_status)
  values (new.id,
    coalesce(nullif(new.raw_user_meta_data->>'display_name',''), split_part(new.email,'@',1)),
    coalesce(new.raw_user_meta_data->>'business_name',''),
    coalesce(new.raw_user_meta_data->>'phone',''),
    coalesce(nullif(new.raw_user_meta_data->>'city',''),'קריית ביאליק'),
    new.raw_user_meta_data->>'instagram',
    r, case when r = 'supplier' then 'pending_approval' else 'active' end);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

create table public.posts (
  id uuid default gen_random_uuid() primary key,
  author_id uuid references public.profiles(id) on delete cascade not null,
  image_url text not null,
  caption text,
  treatment_category text,
  service_tags text[] default array[]::text[],
  price_nis numeric,
  likes_count integer default 0,
  created_at timestamptz not null default now()
);
grant select on public.posts to anon;
grant select, insert, update, delete on public.posts to authenticated;
grant all on public.posts to service_role;
alter table public.posts enable row level security;
create policy "Posts are public" on public.posts for select to anon, authenticated using (true);
create policy "Authors insert posts" on public.posts for insert to authenticated with check (auth.uid() = author_id);
create policy "Authors update posts" on public.posts for update to authenticated using (auth.uid() = author_id);
create policy "Authors delete posts" on public.posts for delete to authenticated using (auth.uid() = author_id or public.has_role(auth.uid(),'admin'));

create table public.saved_posts (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  post_id uuid references public.posts(id) on delete cascade not null,
  collection_name text default 'כללי',
  created_at timestamptz not null default now(),
  unique(user_id, post_id)
);
grant select, insert, update, delete on public.saved_posts to authenticated;
grant all on public.saved_posts to service_role;
alter table public.saved_posts enable row level security;
create policy "Own saved posts" on public.saved_posts for all to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);

create table public.nail_trade_items (
  id uuid default gen_random_uuid() primary key,
  seller_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  category text not null,
  condition text not null,
  price_nis numeric not null,
  is_flexible boolean default false,
  delivery_type text not null,
  city text not null,
  phone text not null,
  photos text[] default array[]::text[],
  description text not null,
  status text default 'available' check (status in ('available','reserved','sold')),
  created_at timestamptz not null default now()
);
grant select on public.nail_trade_items to anon;
grant select, insert, update, delete on public.nail_trade_items to authenticated;
grant all on public.nail_trade_items to service_role;
alter table public.nail_trade_items enable row level security;
create policy "Trade items are public" on public.nail_trade_items for select to anon, authenticated using (true);
create policy "Sellers insert items" on public.nail_trade_items for insert to authenticated with check (auth.uid() = seller_id);
create policy "Sellers update items" on public.nail_trade_items for update to authenticated using (auth.uid() = seller_id);
create policy "Sellers delete items" on public.nail_trade_items for delete to authenticated using (auth.uid() = seller_id or public.has_role(auth.uid(),'admin'));

create table public.insurance_leads (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id),
  full_name text not null,
  id_number text not null,
  phone text not null,
  email text not null,
  city_street text not null,
  entity_type text not null,
  clinic_location text not null,
  treatments text[] not null,
  staff_status text not null,
  employees_count integer default 0,
  equipment_value_nis numeric not null,
  high_value_machines text[],
  requested_coverages text[] not null,
  existing_insurance text not null,
  notes text,
  created_at timestamptz not null default now()
);
grant select, insert on public.insurance_leads to authenticated;
grant all on public.insurance_leads to service_role;
alter table public.insurance_leads enable row level security;
create policy "Users submit own leads" on public.insurance_leads for insert to authenticated with check (auth.uid() = user_id);
create policy "Users and admins read leads" on public.insurance_leads for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));

create table public.role_change_requests (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  "current_role" text not null,
  requested_role text not null,
  reason text not null,
  status text default 'pending' check (status in ('pending','approved','rejected')),
  created_at timestamptz not null default now()
);
grant select, insert, update on public.role_change_requests to authenticated;
grant all on public.role_change_requests to service_role;
alter table public.role_change_requests enable row level security;
create policy "Users submit own requests" on public.role_change_requests for insert to authenticated with check (auth.uid() = user_id and status = 'pending');
create policy "Users and admins read requests" on public.role_change_requests for select to authenticated using (auth.uid() = user_id or public.has_role(auth.uid(),'admin'));
create policy "Admins update requests" on public.role_change_requests for update to authenticated using (public.has_role(auth.uid(),'admin'));

create policy "Admins read health declarations" on public.health_declarations for select to authenticated using (public.has_role(auth.uid(),'admin'));
grant select on public.health_declarations to authenticated;

alter table public.model_calls add column studio_name text, add column cost_amount text;