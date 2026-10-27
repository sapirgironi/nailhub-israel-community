CREATE TABLE public.blocked_words (
  id uuid primary key default gen_random_uuid(),
  word text not null unique,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.blocked_words TO authenticated;
GRANT ALL ON public.blocked_words TO service_role;
ALTER TABLE public.blocked_words ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read blocked words" ON public.blocked_words FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage blocked words" ON public.blocked_words FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  post_id uuid references public.posts(id),
  comment_id uuid references public.post_comments(id),
  reason text not null default '',
  status text not null default 'open',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own report insert" ON public.reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);
CREATE POLICY "Own or admin read reports" ON public.reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update reports" ON public.reports FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TABLE public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id),
  category text not null,
  subject text not null,
  body text not null,
  phone text not null default '',
  email text not null default '',
  status text not null default 'new',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, UPDATE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner insert ticket" ON public.support_tickets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or admin read tickets" ON public.support_tickets FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update tickets" ON public.support_tickets FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TABLE public.announcements (
  id uuid primary key default gen_random_uuid(),
  body text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
GRANT SELECT ON public.announcements TO authenticated;
GRANT ALL ON public.announcements TO service_role;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Active announcements readable" ON public.announcements FOR SELECT TO authenticated USING (active OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage announcements" ON public.announcements FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_sanctions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  kind text not null,
  until timestamptz,
  reason text not null default '',
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, DELETE ON public.user_sanctions TO authenticated;
GRANT ALL ON public.user_sanctions TO service_role;
ALTER TABLE public.user_sanctions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin read sanctions" ON public.user_sanctions FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert sanctions" ON public.user_sanctions FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete sanctions" ON public.user_sanctions FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TABLE public.user_quotas (
  user_id uuid primary key references public.profiles(id),
  daily_limit integer not null default 2,
  unlimited boolean not null default false
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_quotas TO authenticated;
GRANT ALL ON public.user_quotas TO service_role;
ALTER TABLE public.user_quotas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin read quotas" ON public.user_quotas FOR SELECT TO authenticated USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins manage quotas" ON public.user_quotas FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin')) WITH CHECK (has_role(auth.uid(), 'admin'));

ALTER TABLE public.posts ADD COLUMN is_pinned boolean not null default false;
ALTER TABLE public.posts ADD COLUMN status text not null default 'approved';
CREATE POLICY "Admins update posts" ON public.posts FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.enforce_post_rules()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  r text;
  lim integer;
  unl boolean;
  cnt integer;
begin
  if public.has_role(auth.uid(), 'admin') then
    return new;
  end if;
  if exists (select 1 from public.user_sanctions where user_id = auth.uid() and (until is null or until > now())) then
    raise exception 'החשבון מושהה כרגע ולא ניתן לפרסם' using errcode = '22023';
  end if;
  select account_role into r from public.profiles where id = auth.uid();
  if r = 'supplier' then
    raise exception 'חשבון ספק אינו יכול לפרסם בפיד הקהילה הכללי' using errcode = '22023';
  end if;
  select daily_limit, unlimited into lim, unl from public.user_quotas where user_id = auth.uid();
  lim := coalesce(lim, 2);
  unl := coalesce(unl, false);
  if not unl then
    select count(*) into cnt from public.posts where author_id = auth.uid() and created_at > now() - interval '24 hours';
    if cnt >= lim then
      raise exception 'הגעת למכסה היומית של % פוסטים ב־24 שעות', lim using errcode = '22023';
    end if;
  end if;
  return new;
end $function$;

CREATE TRIGGER enforce_post_rules BEFORE INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION public.enforce_post_rules();

CREATE TRIGGER support_tickets_safe_text BEFORE INSERT OR UPDATE ON public.support_tickets FOR EACH ROW EXECUTE FUNCTION validate_application_text();
CREATE TRIGGER announcements_safe_text BEFORE INSERT OR UPDATE ON public.announcements FOR EACH ROW EXECUTE FUNCTION validate_application_text();
CREATE TRIGGER reports_safe_text BEFORE INSERT OR UPDATE ON public.reports FOR EACH ROW EXECUTE FUNCTION validate_application_text();