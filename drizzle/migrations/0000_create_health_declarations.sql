create table public.health_declarations (
  id uuid default gen_random_uuid() primary key,
  full_name text not null,
  id_number text not null,
  phone text not null,
  birth_date date,
  has_allergies boolean default false,
  allergies_details text,
  has_diabetes boolean default false,
  takes_blood_thinners boolean default false,
  has_skin_or_nail_infections boolean default false,
  is_pregnant boolean default false,
  additional_notes text,
  signature_image text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

grant insert on public.health_declarations to anon, authenticated;
grant all on public.health_declarations to service_role;

alter table public.health_declarations enable row level security;

create policy "Anyone can submit a health declaration"
on public.health_declarations for insert
to anon, authenticated
with check (true);