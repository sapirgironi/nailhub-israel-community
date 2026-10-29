CREATE INDEX IF NOT EXISTS posts_created_at_id_idx
  ON public.posts (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS stories_created_at_id_idx
  ON public.stories (created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS post_comments_post_created_at_id_idx
  ON public.post_comments (post_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS notifications_user_created_at_id_idx
  ON public.notifications (user_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS notifications_unread_user_created_at_id_idx
  ON public.notifications (user_id, read, created_at DESC, id DESC);
