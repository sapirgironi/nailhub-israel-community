-- Run as a privileged, read-only schema regression check after migrations.
DO $$
DECLARE
  follow_select text;
  follow_insert text;
  follow_delete text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class
    WHERE oid = 'public.user_follows'::regclass AND relrowsecurity
  ) OR has_table_privilege('anon', 'public.user_follows', 'SELECT') THEN
    RAISE EXCEPTION 'Follow relationships must be RLS protected from anonymous access';
  END IF;

  SELECT qual INTO follow_select
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_follows' AND cmd = 'SELECT';
  SELECT with_check INTO follow_insert
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_follows' AND cmd = 'INSERT';
  SELECT qual INTO follow_delete
  FROM pg_policies
  WHERE schemaname = 'public' AND tablename = 'user_follows' AND cmd = 'DELETE';

  IF follow_select IS NULL OR follow_select NOT LIKE '%auth.uid()%' OR follow_select = 'true'
    OR follow_insert IS NULL OR follow_insert NOT LIKE '%follower_id = auth.uid()%'
    OR follow_insert NOT LIKE '%followed_id <> auth.uid()%'
    OR follow_delete IS NULL OR follow_delete NOT LIKE '%follower_id = auth.uid()%' THEN
    RAISE EXCEPTION 'Follow policies must restrict reads and mutations to the authenticated member';
  END IF;

  IF has_function_privilege('anon', 'public.member_follow_counts(uuid)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.member_follow_counts(uuid)', 'EXECUTE')
    OR NOT has_function_privilege('authenticated', 'public.feed_post_authors(uuid[])', 'EXECUTE') THEN
    RAISE EXCEPTION 'Follow counts and feed author projections must be authenticated-only';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.posts'::regclass AND conname = 'posts_content_mode_valid'
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.posts'::regclass AND conname = 'posts_caption_style_valid'
  ) THEN
    RAISE EXCEPTION 'Text post mode and style must be validated by the database';
  END IF;
END $$;
