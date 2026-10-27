ALTER TABLE public.stories ADD COLUMN IF NOT EXISTS background_media_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
COMMENT ON COLUMN public.stories.background_media_url IS 'Optimized Cloudinary authenticated background image URL; final composited image remains in media_url';
COMMENT ON COLUMN public.profiles.avatar_url IS 'Optimized Cloudinary authenticated profile image URL';