CREATE TABLE public.stories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  media_url text not null,
  caption text,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, DELETE ON public.stories TO authenticated;
GRANT ALL ON public.stories TO service_role;
ALTER TABLE public.stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Stories visible for 24 hours" ON public.stories FOR SELECT TO authenticated USING (created_at > now() - interval '24 hours');
CREATE POLICY "Owner insert stories" ON public.stories FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or admin delete stories" ON public.stories FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (post_id, user_id)
);
GRANT SELECT, INSERT, DELETE ON public.post_likes TO authenticated;
GRANT ALL ON public.post_likes TO service_role;
ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Likes are readable" ON public.post_likes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own like insert" ON public.post_likes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Own like delete" ON public.post_likes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT, DELETE ON public.post_comments TO authenticated;
GRANT ALL ON public.post_comments TO service_role;
ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments are readable" ON public.post_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Own comment insert" ON public.post_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Owner or admin delete comments" ON public.post_comments FOR DELETE TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.collab_offers (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now()
);
GRANT SELECT, INSERT ON public.collab_offers TO authenticated;
GRANT ALL ON public.collab_offers TO service_role;
ALTER TABLE public.collab_offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sender or post author read offers" ON public.collab_offers FOR SELECT TO authenticated USING (auth.uid() = sender_id OR EXISTS (SELECT 1 FROM public.posts p WHERE p.id = post_id AND p.author_id = auth.uid()) OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Own offer insert" ON public.collab_offers FOR INSERT TO authenticated WITH CHECK (auth.uid() = sender_id);

CREATE OR REPLACE FUNCTION public.sync_post_likes_count() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.posts SET likes_count = (SELECT count(*) FROM public.post_likes WHERE post_id = COALESCE(NEW.post_id, OLD.post_id)) WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  RETURN COALESCE(NEW, OLD);
END $$;
CREATE TRIGGER post_likes_count AFTER INSERT OR DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.sync_post_likes_count();

CREATE TRIGGER stories_safe_text BEFORE INSERT OR UPDATE ON public.stories FOR EACH ROW EXECUTE FUNCTION public.validate_application_text();
CREATE TRIGGER post_comments_safe_text BEFORE INSERT OR UPDATE ON public.post_comments FOR EACH ROW EXECUTE FUNCTION public.validate_application_text();
CREATE TRIGGER collab_offers_safe_text BEFORE INSERT OR UPDATE ON public.collab_offers FOR EACH ROW EXECUTE FUNCTION public.validate_application_text();