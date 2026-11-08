ALTER TABLE public.posts
  ADD CONSTRAINT posts_text_caption_length_valid
  CHECK (
    image_url IS NOT NULL
    OR caption IS NULL
    OR length(caption) <= 400
  ) NOT VALID;
