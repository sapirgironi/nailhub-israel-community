ALTER TABLE public.posts
  DROP CONSTRAINT IF EXISTS posts_caption_style_valid;

ALTER TABLE public.posts
  ADD CONSTRAINT posts_caption_style_valid CHECK (
    caption_style IS NULL OR (
      jsonb_typeof(caption_style) = 'object'
      AND caption_style ?& ARRAY['font', 'textAlign', 'highlight', 'color', 'fontSize']
      AND (caption_style - ARRAY[
        'font', 'textAlign', 'highlight', 'color', 'fontSize', 'highlightColor'
      ]) = '{}'::jsonb
      AND jsonb_typeof(caption_style->'fontSize') = 'number'
      AND coalesce(caption_style->>'font', '') IN (
        'assistant',
        'heebo',
        'italic',
        'hand',
        'round',
        'playful',
        'serif',
        'modern',
        'bold',
        'handwriting',
        'elegant'
      )
      AND coalesce(caption_style->>'textAlign', '') IN ('center', 'right', 'left')
      AND coalesce(caption_style->>'highlight', '') IN ('none', 'solid', 'soft')
      AND coalesce(caption_style->>'color', '') ~ '^#[0-9A-Fa-f]{6}$'
      AND (
        caption_style->>'highlightColor' IS NULL
        OR caption_style->>'highlightColor' ~ '^#[0-9A-Fa-f]{6}$'
      )
      AND (caption_style->>'fontSize')::numeric % 1 = 0
      AND (caption_style->>'fontSize')::numeric BETWEEN 16 AND 56
    )
  );

NOTIFY pgrst, 'reload schema';
