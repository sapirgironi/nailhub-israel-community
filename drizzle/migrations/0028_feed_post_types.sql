ALTER TABLE public.posts
  ADD COLUMN post_type text NOT NULL DEFAULT 'post'
  CONSTRAINT posts_post_type_valid CHECK (post_type IN ('post', 'course', 'deal'));
