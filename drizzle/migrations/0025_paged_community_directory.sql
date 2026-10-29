DROP FUNCTION IF EXISTS public.community_members(text, uuid);

CREATE FUNCTION public.community_members(
  search_text text DEFAULT '',
  member_id uuid DEFAULT NULL,
  role_filter text DEFAULT '',
  after_name text DEFAULT NULL,
  after_id uuid DEFAULT NULL,
  page_size integer DEFAULT 10
)
RETURNS TABLE(
  id uuid,
  display_name text,
  business_name text,
  avatar_url text,
  city text,
  account_role text,
  is_verified boolean,
  specialties text[],
  additional_services text[]
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.id,
    p.display_name,
    coalesce(p.business_name, p.display_name),
    p.avatar_url,
    coalesce(p.city, ''),
    p.account_role,
    coalesce(p.is_verified, false),
    coalesce(p.specialties, ARRAY[]::text[]),
    coalesce(p.additional_services, ARRAY[]::text[])
  FROM public.profiles p
  WHERE auth.uid() IS NOT NULL
    AND NOT public.is_account_banned(auth.uid())
    AND NOT public.is_account_banned(p.id)
    AND coalesce(p.account_status, 'active') = 'active'
    AND (member_id IS NULL OR p.id = member_id)
    AND (role_filter = '' OR p.account_role = role_filter)
    AND (
      (after_name IS NULL AND after_id IS NULL)
      OR (after_name IS NOT NULL AND after_id IS NOT NULL AND (p.display_name, p.id) > (after_name, after_id))
    )
    AND (
      left(search_text, 80) = ''
      OR p.display_name ILIKE '%' || left(search_text, 80) || '%'
      OR coalesce(p.business_name, '') ILIKE '%' || left(search_text, 80) || '%'
      OR coalesce(p.city, '') ILIKE '%' || left(search_text, 80) || '%'
      OR array_to_string(coalesce(p.specialties, ARRAY[]::text[]), ' ') ILIKE '%' || left(search_text, 80) || '%'
    )
  ORDER BY p.display_name, p.id
  LIMIT CASE WHEN member_id IS NOT NULL THEN 1 ELSE least(greatest(page_size, 1), 24) END
$$;

REVOKE ALL ON FUNCTION public.community_members(text, uuid, text, text, uuid, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.community_members(text, uuid, text, text, uuid, integer) TO authenticated, service_role;

CREATE INDEX IF NOT EXISTS profiles_directory_name_id_idx
  ON public.profiles (display_name, id);

CREATE INDEX IF NOT EXISTS profiles_directory_role_name_id_idx
  ON public.profiles (account_role, display_name, id);

CREATE OR REPLACE FUNCTION public.post_comment_counts(post_ids uuid[])
RETURNS TABLE(post_id uuid, comment_count bigint)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF coalesce(cardinality(post_ids), 0) > 24 THEN
    RAISE EXCEPTION 'אפשר לבקש ספירות לעד 24 פוסטים בכל פעם';
  END IF;

  RETURN QUERY
    SELECT comments.post_id, count(*)
    FROM public.post_comments comments
    WHERE comments.post_id = ANY(post_ids)
    GROUP BY comments.post_id;
END;
$$;

REVOKE ALL ON FUNCTION public.post_comment_counts(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.post_comment_counts(uuid[]) TO authenticated;
