DO $$
DECLARE
  matched integer;
BEGIN
  IF current_setting('nailhub.predeploy_security_approved', true) IS DISTINCT FROM 'yes' THEN
    RAISE EXCEPTION 'Pre-deployment security changes require explicit approval';
  END IF;

  SELECT count(*) INTO matched
  FROM pg_policies
  WHERE schemaname = 'storage' AND tablename = 'objects'
    AND permissive = 'PERMISSIVE' AND roles = ARRAY['authenticated']::name[]
    AND (
      (policyname = 'allow all uploads and reads 1rma4z_0'
        AND cmd = 'SELECT' AND qual IN ('true', 'false') AND with_check IS NULL)
      OR (policyname = 'allow all uploads and reads 1rma4z_1'
        AND cmd = 'INSERT' AND qual IS NULL AND with_check IN ('true', 'false'))
      OR (policyname = 'allow all uploads and reads 1rma4z_2'
        AND cmd = 'UPDATE' AND (
          (qual = 'true' AND with_check IS NULL)
          OR (qual = 'false' AND with_check = 'false')
        ))
      OR (policyname = 'allow all uploads and reads 1rma4z_3'
        AND cmd = 'DELETE' AND qual IN ('true', 'false') AND with_check IS NULL)
    );
  IF matched <> 4 THEN
    RAISE EXCEPTION 'Storage policies differ from the reviewed pre-deployment state';
  END IF;
END;
$$;
--> statement-breakpoint
INSERT INTO storage.buckets (id, name, public)
VALUES ('story-stickers', 'story-stickers', false)
ON CONFLICT (id) DO NOTHING;
--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets
    WHERE id = 'story-stickers' AND name = 'story-stickers' AND public IS FALSE
  ) THEN
    RAISE EXCEPTION 'Existing story-stickers bucket is not the expected private bucket';
  END IF;
END;
$$;
--> statement-breakpoint
ALTER POLICY "allow all uploads and reads 1rma4z_0" ON storage.objects USING (false);
--> statement-breakpoint
ALTER POLICY "allow all uploads and reads 1rma4z_1" ON storage.objects WITH CHECK (false);
--> statement-breakpoint
ALTER POLICY "allow all uploads and reads 1rma4z_2" ON storage.objects USING (false) WITH CHECK (false);
--> statement-breakpoint
ALTER POLICY "allow all uploads and reads 1rma4z_3" ON storage.objects USING (false);
--> statement-breakpoint
REVOKE MAINTAIN ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE TRUNCATE, REFERENCES, TRIGGER, MAINTAIN ON TABLES FROM anon, authenticated;
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
      AND (has_table_privilege('anon', c.oid, 'MAINTAIN')
        OR has_table_privilege('authenticated', c.oid, 'MAINTAIN'))
  ) THEN
    RAISE EXCEPTION 'Client MAINTAIN privileges remain on public tables';
  END IF;
END;
$$;
