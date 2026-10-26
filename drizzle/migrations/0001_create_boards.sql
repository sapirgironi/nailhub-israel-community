create table public.model_calls (
  id uuid primary key default gen_random_uuid(),
  treatment_type text not null,
  region text not null,
  city text not null,
  desired_at timestamptz,
  cost_type text not null default 'free',
  requirements text,
  contact text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.model_calls to anon, authenticated;
grant all on public.model_calls to service_role;
alter table public.model_calls enable row level security;
create policy "Public read model calls" on public.model_calls for select to anon, authenticated using (true);
create policy "Public post model calls" on public.model_calls for insert to anon, authenticated with check (length(contact) between 5 and 200 and length(city) <= 100 and length(coalesce(requirements,'')) <= 1000);

create table public.job_posts (
  id uuid primary key default gen_random_uuid(),
  post_type text not null,
  studio_name text not null,
  city text not null,
  description text not null,
  phone text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.job_posts to anon, authenticated;
grant all on public.job_posts to service_role;
alter table public.job_posts enable row level security;
create policy "Public read job posts" on public.job_posts for select to anon, authenticated using (true);
create policy "Public post job posts" on public.job_posts for insert to anon, authenticated with check (length(phone) between 5 and 30 and length(description) <= 2000 and length(studio_name) <= 150);