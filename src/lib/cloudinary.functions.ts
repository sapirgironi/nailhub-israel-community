import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { requireActiveAccount } from './account-access';
import { cloudinaryReference, validateOptimizedImage } from './cloudinary';

export const uploadCloudinaryImage = createServerFn({ method: 'POST' })
  .middleware([requireActiveAccount])
  .inputValidator((input: FormData) => {
    if (!(input instanceof FormData)) throw new Error('לא נבחרה תמונה');
    const file = input.get('file');
    if (!(file instanceof File)) throw new Error('לא נבחרה תמונה');
    validateOptimizedImage(file);
    return input;
  })
  .handler(async ({ data, context }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const file = data.get('file');
    if (!(file instanceof File)) throw new Error('לא נבחרה תמונה');
    const { uploadAuthenticatedImage } = await import('./cloudinary.server');
    return uploadAuthenticatedImage(file, context.userId);
  });

export const readCloudinaryImage = createServerFn({ method: 'POST' })
  .middleware([requireActiveAccount])
  .inputValidator((input: { url: string }) => {
    if (typeof input.url !== 'string' || input.url.length > 600) throw new Error('כתובת התמונה אינה תקינה');
    return input;
  })
  .handler(async ({ data, context }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const { getCloudinaryDeliveryConfig, fetchOptimizedImage } = await import('./cloudinary.server');
    const { cloud, secret } = getCloudinaryDeliveryConfig();
    const reference = cloudinaryReference(data.url, cloud);
    if (reference.owner !== context.userId) {
      const db = context.supabase;
      const results = await Promise.all([
        db.from('posts').select('id').eq('image_url',data.url).limit(1),
        db.from('stories').select('id').eq('media_url',data.url).limit(1),
        db.from('profiles').select('id').eq('avatar_url',data.url).limit(1),
        db.from('nail_trade_items').select('id').contains('photos',[data.url]).limit(1),
      ]);
      if (!results.some(r => !r.error && (r.data?.length ?? 0) > 0)) throw new Error('אין גישה לתמונה');
    }
    // Never expose permanent Cloudinary signatures: bytes pass through an authenticated, RLS-checked request.
    return { image: await fetchOptimizedImage(cloud, secret, reference.path) };
  });