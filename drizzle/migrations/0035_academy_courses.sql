CREATE TABLE public.academy_courses (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_data jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT academy_course_data_object CHECK (jsonb_typeof(course_data) = 'object'),
  CONSTRAINT academy_course_data_size CHECK (octet_length(course_data::text) <= 12582912)
);

CREATE FUNCTION public.validate_academy_course_text()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  item jsonb;
  value_text text;
BEGIN
  FOR item IN SELECT jsonb_path_query(NEW.course_data, '$.** ? (@.type() == "string")') LOOP
    value_text := item #>> '{}';
    IF value_text ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$' THEN
      CONTINUE;
    END IF;
    IF length(value_text) > 10000 OR value_text ~* '<[[:space:]]*[/!?a-z]'
      OR value_text ~* '(javascript|vbscript)[[:space:]]*:' THEN
      RAISE EXCEPTION 'Course text must be plain text and within length limits'
        USING ERRCODE = '22023';
    END IF;
  END LOOP;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION public.validate_academy_course_text() FROM PUBLIC;
CREATE TRIGGER validate_academy_course_text
  BEFORE INSERT OR UPDATE OF course_data ON public.academy_courses
  FOR EACH ROW EXECUTE FUNCTION public.validate_academy_course_text();

ALTER TABLE public.academy_courses ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.academy_courses FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.academy_courses TO authenticated;
GRANT ALL ON public.academy_courses TO service_role;

CREATE FUNCTION public.is_active_academy_account()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT auth.uid() IS NOT NULL AND NOT public.is_account_banned(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND coalesce(p.account_status, 'active') = 'active'
    )
$$;
REVOKE ALL ON FUNCTION public.is_active_academy_account() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_active_academy_account() TO authenticated;

CREATE POLICY "Active owners and admins manage academy courses"
  ON public.academy_courses FOR ALL TO authenticated
  USING (
    public.is_active_academy_account()
    AND (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  )
  WITH CHECK (
    public.is_active_academy_account()
    AND (owner_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = owner_id AND coalesce(p.account_status, 'active') = 'active'
        AND (p.account_role = 'instructor' OR public.has_role(p.id, 'admin'))
        AND NOT public.is_account_banned(p.id)
    )
  );

CREATE TABLE public.academy_course_imports (
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id uuid NOT NULL,
  PRIMARY KEY (owner_id, course_id)
);
ALTER TABLE public.academy_course_imports ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.academy_course_imports FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.import_academy_courses(courses jsonb)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  item jsonb;
  v_course_id uuid;
  imported integer := 0;
BEGIN
  IF auth.uid() IS NULL OR public.is_account_banned(auth.uid())
    OR NOT EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND coalesce(p.account_status, 'active') = 'active'
        AND (p.account_role = 'instructor' OR public.has_role(p.id, 'admin'))
    ) THEN
    RAISE EXCEPTION 'Active instructor required' USING ERRCODE = '42501';
  END IF;
  IF jsonb_typeof(courses) IS DISTINCT FROM 'array' OR jsonb_array_length(courses) > 500 THEN
    RAISE EXCEPTION 'Invalid course import' USING ERRCODE = '22023';
  END IF;
  FOR item IN SELECT value FROM jsonb_array_elements(courses) LOOP
    IF jsonb_typeof(item) IS DISTINCT FROM 'object'
      OR item->>'userId' IS DISTINCT FROM auth.uid()::text THEN
      RAISE EXCEPTION 'Invalid course owner' USING ERRCODE = '22023';
    END IF;
    v_course_id := (item->>'id')::uuid;
    IF v_course_id IS NULL THEN
      RAISE EXCEPTION 'Invalid course id' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.academy_course_imports i
                   WHERE i.owner_id = auth.uid() AND i.course_id = v_course_id) THEN
      IF EXISTS (SELECT 1 FROM public.academy_courses c WHERE c.id = v_course_id AND c.owner_id <> auth.uid()) THEN
        RAISE EXCEPTION 'Course id already belongs to another account' USING ERRCODE = '23505';
      END IF;
      INSERT INTO public.academy_courses (id, owner_id, course_data)
      VALUES (v_course_id, auth.uid(), (item - 'isPublished' - 'publicId'))
      ON CONFLICT (id) DO NOTHING;
      IF FOUND THEN imported := imported + 1; END IF;
      IF NOT EXISTS (SELECT 1 FROM public.academy_courses c WHERE c.id = v_course_id AND c.owner_id = auth.uid()) THEN
        RAISE EXCEPTION 'Course id already belongs to another account' USING ERRCODE = '23505';
      END IF;
      INSERT INTO public.academy_course_imports (owner_id, course_id)
      VALUES (auth.uid(), v_course_id) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN imported;
END
$$;
REVOKE ALL ON FUNCTION public.import_academy_courses(jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.import_academy_courses(jsonb) TO authenticated;

CREATE FUNCTION public.public_academy_course(course_id uuid)
RETURNS jsonb
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_strip_nulls(jsonb_build_object(
    'id', c.id,
    'isPublished', true,
    'title', c.course_data->'title',
    'category', c.course_data->'category',
    'content', jsonb_build_object(
      'syllabusOverview', c.course_data#>'{content,syllabusOverview}',
      'targetAudience', c.course_data#>'{content,targetAudience}',
      'prerequisites', c.course_data#>'{content,prerequisites}',
      'studentKitIncluded', c.course_data#>'{content,studentKitIncluded}',
      'sessionsForStudent', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'sessionNumber', s->'sessionNumber', 'title', s->'title',
          'summary', s->'summary', 'practicalFocus', s->'practicalFocus'
        )), '[]'::jsonb)
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(c.course_data#>'{content,sessionsForStudent}') = 'array'
            THEN c.course_data#>'{content,sessionsForStudent}' ELSE '[]'::jsonb END
        ) s
      ),
      'certificationTerms', c.course_data#>'{content,certificationTerms}',
      'cancellationPolicy', c.course_data#>'{content,cancellationPolicy}'
    ),
    'branding', jsonb_build_object(
      'primaryColor', c.course_data#>'{branding,primaryColor}',
      'secondaryColor', c.course_data#>'{branding,secondaryColor}',
      'fontStyle', c.course_data#>'{branding,fontStyle}',
      'badgeText', c.course_data#>'{branding,badgeText}',
      'coverImageUrl', c.course_data#>'{branding,coverImageUrl}',
      'galleryImages', c.course_data#>'{branding,galleryImages}',
      'videoUrl', c.course_data#>'{branding,videoUrl}',
      'faqs', (
        SELECT coalesce(jsonb_agg(jsonb_build_object(
          'id', f->'id', 'question', f->'question', 'answer', f->'answer'
        )), '[]'::jsonb)
        FROM jsonb_array_elements(
          CASE WHEN jsonb_typeof(c.course_data#>'{branding,faqs}') = 'array'
            THEN c.course_data#>'{branding,faqs}' ELSE '[]'::jsonb END
        ) f
      )
    ),
    'landingProfile', jsonb_build_object(
      'businessName', c.course_data#>'{landingProfile,businessName}',
      'instructorName', c.course_data#>'{landingProfile,instructorName}',
      'city', c.course_data#>'{landingProfile,city}',
      'phone', '',
      'logoUrl', c.course_data#>'{landingProfile,logoUrl}'
    )
  ))
  FROM public.academy_courses c
  JOIN public.profiles p ON p.id = c.owner_id
  WHERE c.id = course_id
    AND c.course_data->'isPublished' = 'true'::jsonb
    AND coalesce(p.account_status, 'active') = 'active'
    AND NOT public.is_account_banned(p.id)
    AND (auth.uid() IS NULL OR NOT public.is_account_banned(auth.uid()))
$$;
REVOKE ALL ON FUNCTION public.public_academy_course(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_academy_course(uuid) TO anon, authenticated;
