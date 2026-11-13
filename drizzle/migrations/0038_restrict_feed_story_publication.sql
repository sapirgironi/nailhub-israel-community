CREATE POLICY "Only professionals publish feed posts"
  ON public.posts AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND account_role IN ('nail_tech', 'instructor')
    )
  );
--> statement-breakpoint
CREATE POLICY "Only professionals publish stories"
  ON public.stories AS RESTRICTIVE FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND account_role IN ('nail_tech', 'instructor')
    )
  );
