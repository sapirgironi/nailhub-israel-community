DO $$
BEGIN
  IF current_setting('nailhub.lockdown_approved', true) IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION 'Late lockdown requires explicit deployment approval';
  END IF;
END;
$$;
--> statement-breakpoint
REVOKE INSERT ON public.client_requests FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE INSERT (id, tech_id, full_name, phone, request_type, description, claim_token)
  ON public.client_requests FROM PUBLIC, anon, authenticated;
--> statement-breakpoint
REVOKE DELETE ON public.posts, public.stories, public.post_comments, public.story_stickers FROM PUBLIC, anon, authenticated;
