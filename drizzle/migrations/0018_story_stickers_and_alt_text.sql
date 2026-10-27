CREATE TABLE public.story_stickers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label text NOT NULL DEFAULT '' CHECK (char_length(label) <= 40 AND label !~ '[<>]'),
  image_path text NOT NULL CHECK (image_path ~ '^[0-9a-f-]{36}\.png$'),
  created_by uuid NOT NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.story_stickers TO authenticated;
GRANT ALL ON public.story_stickers TO service_role;
ALTER TABLE public.story_stickers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Signed in read stickers" ON public.story_stickers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins add stickers" ON public.story_stickers FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin') AND created_by = auth.uid());
CREATE POLICY "Admins delete stickers" ON public.story_stickers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'admin'));
CREATE POLICY "Blocked accounts cannot access application" ON public.story_stickers AS RESTRICTIVE FOR ALL TO authenticated USING (NOT public.is_account_banned(auth.uid())) WITH CHECK (NOT public.is_account_banned(auth.uid()));
CREATE POLICY "Signed in read sticker files" ON storage.objects FOR SELECT TO authenticated USING (bucket_id='story-stickers');
CREATE POLICY "Admins upload sticker files" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id='story-stickers' AND public.has_role(auth.uid(),'admin') AND lower(storage.extension(name))='png');
CREATE POLICY "Admins delete sticker files" ON storage.objects FOR DELETE TO authenticated USING (bucket_id='story-stickers' AND public.has_role(auth.uid(),'admin'));
ALTER TABLE public.stories ADD COLUMN alt_text text CHECK (alt_text IS NULL OR (char_length(alt_text) <= 400 AND alt_text !~ '[<>]'));