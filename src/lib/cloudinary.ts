export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_OPTIMIZED_IMAGE_BYTES = 750 * 1024;
export const IMAGE_OPTIMIZATION = 'f_auto,q_auto';

export function validateImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type) || file.size === 0 || file.size > MAX_IMAGE_BYTES)
    throw new Error('בחרי תמונת JPEG, PNG או WebP בגודל של עד 5 מגה־בייט');
}

export function validateOptimizedImage(file: File) {
  if (!IMAGE_TYPES.includes(file.type) || file.size === 0 || file.size > MAX_OPTIMIZED_IMAGE_BYTES)
    throw new Error('התמונה חרגה מגודל ההעלאה המותר לאחר הכיווץ');
}

export function cloudinaryReference(value: string, cloud: string) {
  const prefix = `https://res.cloudinary.com/${cloud}/image/authenticated/${IMAGE_OPTIMIZATION}/`;
  if (!value.startsWith(prefix)) throw new Error('כתובת התמונה אינה תקינה');
  const path = value.slice(prefix.length);
  if (!/^v\d+\/nailhub\/[0-9a-f-]{36}\/[0-9a-f-]{36}\.(jpg|png|webp)$/.test(path))
    throw new Error('כתובת התמונה אינה תקינה');
  return { path, owner: path.split('/')[2] };
}