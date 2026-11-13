DO $$
BEGIN
  IF current_setting('nailhub.lockdown_approved', true) IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION 'Late lockdown requires explicit deployment approval';
  END IF;
END;
$$;
--> statement-breakpoint
ALTER POLICY "Admins delete sticker files" ON storage.objects USING (false);
--> statement-breakpoint
CREATE POLICY "Sticker deletion requires server"
  ON storage.objects AS RESTRICTIVE FOR DELETE TO PUBLIC
  USING (bucket_id IS DISTINCT FROM 'story-stickers');
--> statement-breakpoint
CREATE POLICY "Sticker update requires server"
  ON storage.objects AS RESTRICTIVE FOR UPDATE TO PUBLIC
  USING (bucket_id IS DISTINCT FROM 'story-stickers')
  WITH CHECK (true);
