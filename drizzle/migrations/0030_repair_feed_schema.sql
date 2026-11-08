ALTER TABLE public.posts
  ALTER COLUMN image_url DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS text_background text,
  ADD COLUMN IF NOT EXISTS caption_style jsonb,
  ADD COLUMN IF NOT EXISTS mentions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS post_type text NOT NULL DEFAULT 'post';

ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_text_background_valid,
  DROP CONSTRAINT IF EXISTS posts_caption_style_valid,
  DROP CONSTRAINT IF EXISTS posts_content_mode_valid,
  DROP CONSTRAINT IF EXISTS posts_caption_length_valid,
  DROP CONSTRAINT IF EXISTS posts_post_type_valid;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_text_background_valid CHECK (
    text_background IS NULL OR text_background IN (
      'baby-pink',
      'elegant-nude',
      'minimal-white',
      'pink-polka',
      'polish-icons',
      'nail-line-art',
      'pastel-gradient',
      'powder-pink',
      'classic-nude',
      'pearl-white',
      'luxury-charcoal',
      'soft-sunset',
      'rose-gold',
      'lavender-cream'
    ) OR text_background ~ '^custom:#[0-9A-Fa-f]{6}$'
  ),
  ADD CONSTRAINT posts_content_mode_valid CHECK (
    (image_url IS NOT NULL AND text_background IS NULL)
    OR (
      image_url IS NULL
      AND text_background IS NOT NULL
      AND caption_style IS NOT NULL
      AND length(btrim(coalesce(caption, ''))) > 0
    )
  ),
  ADD CONSTRAINT posts_caption_length_valid CHECK (
    caption IS NULL OR length(caption) <= 2000
  ),
  ADD CONSTRAINT posts_caption_style_valid CHECK (
    caption_style IS NULL OR (
      jsonb_typeof(caption_style) = 'object'
      AND caption_style ?& ARRAY['font', 'textAlign', 'highlight', 'color', 'fontSize']
      AND (caption_style - ARRAY[
        'font', 'textAlign', 'highlight', 'color', 'fontSize', 'highlightColor'
      ]) = '{}'::jsonb
      AND jsonb_typeof(caption_style->'fontSize') = 'number'
      AND coalesce(caption_style->>'font', '') IN ('modern', 'bold', 'handwriting', 'elegant')
      AND coalesce(caption_style->>'textAlign', '') IN ('center', 'right', 'left')
      AND coalesce(caption_style->>'highlight', '') IN ('none', 'solid', 'soft')
      AND coalesce(caption_style->>'color', '') ~ '^#[0-9A-Fa-f]{6}$'
      AND (
        caption_style->>'highlightColor' IS NULL
        OR caption_style->>'highlightColor' ~ '^#[0-9A-Fa-f]{6}$'
      )
      AND (caption_style->>'fontSize')::numeric % 1 = 0
      AND (caption_style->>'fontSize')::numeric BETWEEN 16 AND 56
    )
  ),
  ADD CONSTRAINT posts_post_type_valid CHECK (post_type IN ('post', 'course', 'deal'));

CREATE TABLE IF NOT EXISTS public.user_follows (
  follower_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  followed_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, followed_id),
  CONSTRAINT user_follows_no_self CHECK (follower_id <> followed_id)
);

CREATE INDEX IF NOT EXISTS user_follows_followed_id_idx
  ON public.user_follows (followed_id, follower_id);

REVOKE ALL ON public.user_follows FROM PUBLIC, anon;
GRANT SELECT, INSERT, DELETE ON public.user_follows TO authenticated;
GRANT ALL ON public.user_follows TO service_role;
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members read their follow relationships" ON public.user_follows;
CREATE POLICY "Members read their follow relationships"
  ON public.user_follows FOR SELECT TO authenticated
  USING (
    (follower_id = auth.uid() OR followed_id = auth.uid())
    AND NOT public.is_account_banned(auth.uid())
  );

DROP POLICY IF EXISTS "Members follow active community members" ON public.user_follows;
CREATE POLICY "Members follow active community members"
  ON public.user_follows FOR INSERT TO authenticated
  WITH CHECK (
    follower_id = auth.uid()
    AND followed_id <> auth.uid()
    AND NOT public.is_account_banned(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = followed_id
        AND coalesce(p.account_status, 'active') = 'active'
        AND NOT public.is_account_banned(p.id)
    )
  );

DROP POLICY IF EXISTS "Members unfollow themselves" ON public.user_follows;
CREATE POLICY "Members unfollow themselves"
  ON public.user_follows FOR DELETE TO authenticated
  USING (follower_id = auth.uid() AND NOT public.is_account_banned(auth.uid()));

CREATE OR REPLACE FUNCTION public.member_follow_counts(member_id uuid)
RETURNS TABLE(followers bigint, following bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (
      SELECT count(*)
      FROM public.user_follows f
      JOIN public.profiles follower ON follower.id = f.follower_id
      JOIN public.profiles followed ON followed.id = f.followed_id
      WHERE f.followed_id = member_id
        AND coalesce(follower.account_status, 'active') = 'active'
        AND coalesce(followed.account_status, 'active') = 'active'
        AND NOT public.is_account_banned(follower.id)
        AND NOT public.is_account_banned(followed.id)
    ),
    (
      SELECT count(*)
      FROM public.user_follows f
      JOIN public.profiles follower ON follower.id = f.follower_id
      JOIN public.profiles followed ON followed.id = f.followed_id
      WHERE f.follower_id = member_id
        AND coalesce(follower.account_status, 'active') = 'active'
        AND coalesce(followed.account_status, 'active') = 'active'
        AND NOT public.is_account_banned(follower.id)
        AND NOT public.is_account_banned(followed.id)
    )
  WHERE auth.uid() IS NOT NULL
    AND NOT public.is_account_banned(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = member_id
        AND coalesce(p.account_status, 'active') = 'active'
        AND NOT public.is_account_banned(p.id)
    )
$$;

REVOKE ALL ON FUNCTION public.member_follow_counts(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.member_follow_counts(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.feed_post_authors(post_ids uuid[])
RETURNS TABLE(id uuid, display_name text, business_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.display_name, coalesce(p.business_name, '')
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND NOT public.is_account_banned(auth.uid())
    AND coalesce(cardinality(post_ids), 0) BETWEEN 1 AND 24
    AND p.id IN (
      SELECT posts.author_id
      FROM public.posts posts
      WHERE posts.id = ANY(post_ids)
    )
    AND coalesce(p.account_status, 'active') = 'active'
    AND NOT public.is_account_banned(p.id)
  ORDER BY p.display_name, p.id
  LIMIT 24
$$;

REVOKE ALL ON FUNCTION public.feed_post_authors(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feed_post_authors(uuid[]) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
