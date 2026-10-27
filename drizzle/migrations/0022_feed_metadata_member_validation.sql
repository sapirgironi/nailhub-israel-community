ALTER FUNCTION public.validate_feed_metadata() SECURITY DEFINER;
REVOKE ALL ON FUNCTION public.validate_feed_metadata() FROM PUBLIC;
COMMENT ON FUNCTION public.validate_feed_metadata() IS 'Validates only active member existence without exposing private profile data through RLS-restricted post creation.';