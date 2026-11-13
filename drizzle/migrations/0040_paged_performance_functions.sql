CREATE FUNCTION public.following_feed_page(
  before_created_at timestamptz DEFAULT NULL,
  before_id uuid DEFAULT NULL,
  page_size integer DEFAULT 25
)
RETURNS SETOF public.posts
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT p.*
  FROM public.posts p
  WHERE EXISTS (
    SELECT 1 FROM public.user_follows f
    WHERE f.follower_id = auth.uid() AND f.followed_id = p.author_id
  )
  AND (before_created_at IS NULL OR (p.created_at, p.id) < (before_created_at, before_id))
  ORDER BY p.created_at DESC, p.id DESC
  LIMIT least(greatest(coalesce(page_size, 25), 1), 50)
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.following_feed_page(timestamptz, uuid, integer) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.following_feed_page(timestamptz, uuid, integer) TO authenticated;
--> statement-breakpoint
CREATE FUNCTION public.blocked_comment_words(comment_body text)
RETURNS text[]
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT coalesce(array_agg(w.word ORDER BY w.word), ARRAY[]::text[])
  FROM public.blocked_words w
  WHERE w.word <> '' AND strpos(lower(comment_body), lower(w.word)) > 0
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.blocked_comment_words(text) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.blocked_comment_words(text) TO authenticated;
--> statement-breakpoint
CREATE FUNCTION public.visible_media_urls(candidate_urls text[])
RETURNS TABLE (url text)
LANGUAGE sql STABLE SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT candidate.url
  FROM unnest(candidate_urls) AS candidate(url)
  WHERE cardinality(candidate_urls) <= 25 AND (
    EXISTS (SELECT 1 FROM public.posts p WHERE p.image_url = candidate.url)
    OR EXISTS (SELECT 1 FROM public.stories s WHERE s.media_url = candidate.url)
    OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.avatar_url = candidate.url)
    OR EXISTS (SELECT 1 FROM public.nail_trade_items t WHERE t.photos @> ARRAY[candidate.url])
  )
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.visible_media_urls(text[]) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.visible_media_urls(text[]) TO authenticated;
--> statement-breakpoint
CREATE FUNCTION public.admin_supplier_page(search_text text DEFAULT '', page_offset integer DEFAULT 0, page_size integer DEFAULT 25)
RETURNS TABLE (id uuid, display_name text, business_name text, account_role text, account_status text, email text, balance bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_account_banned(auth.uid()) OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'גישה למנהלת בלבד' USING ERRCODE = '42501';
  END IF;
  IF length(coalesce(search_text, '')) > 150 OR page_offset IS NULL OR page_size IS NULL OR page_offset < 0 OR page_size < 1 OR page_size > 50 THEN
    RAISE EXCEPTION 'פרטי החיפוש אינם תקינים';
  END IF;
  RETURN QUERY
  SELECT p.id, p.display_name, p.business_name, p.account_role, p.account_status,
    coalesce(u.email::text, ''),
    coalesce((SELECT sum(l.amount) FROM public.community_credit_ledger l WHERE l.user_id = p.id), 0)
  FROM public.profiles p
  LEFT JOIN auth.users u ON u.id = p.id
  WHERE strpos(lower(p.display_name), lower(trim(coalesce(search_text, '')))) > 0
     OR strpos(lower(coalesce(u.email::text, '')), lower(trim(coalesce(search_text, '')))) > 0
  ORDER BY p.display_name, p.id
  OFFSET page_offset LIMIT page_size;
END
$$;
--> statement-breakpoint
REVOKE ALL ON FUNCTION public.admin_supplier_page(text, integer, integer) FROM PUBLIC, anon;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.admin_supplier_page(text, integer, integer) TO authenticated;
