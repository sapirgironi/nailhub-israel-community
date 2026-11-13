CREATE OR REPLACE FUNCTION public.protect_post_moderation_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user = 'authenticated' AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.is_pinned IS DISTINCT FROM false
        OR NEW.likes_count IS DISTINCT FROM 0
        OR NEW.status IS DISTINCT FROM 'approved'
        OR NEW.created_at IS DISTINCT FROM now() THEN
        RAISE EXCEPTION 'Only administrators may set protected post fields'
          USING ERRCODE = '42501';
      END IF;
    ELSIF NEW.is_pinned IS DISTINCT FROM OLD.is_pinned
      OR NEW.likes_count IS DISTINCT FROM OLD.likes_count
      OR NEW.status IS DISTINCT FROM OLD.status
      OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'Only administrators may change protected post fields'
        USING ERRCODE = '42501';
    END IF;
  END IF;
  RETURN NEW;
END
$$;

REVOKE ALL ON FUNCTION public.protect_post_moderation_fields() FROM PUBLIC;
CREATE TRIGGER protect_post_moderation_fields
  BEFORE INSERT OR UPDATE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.protect_post_moderation_fields();
