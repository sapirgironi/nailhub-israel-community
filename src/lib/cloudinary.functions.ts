import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { requireActiveAccount } from './account-access';
import { cloudinaryReference, IMAGE_OPTIMIZATION, validateImage } from './cloudinary';
import { fetchOptimizedImage } from './cloudinary.server';

export const uploadCloudinaryImage = createServerFn({ method: 'POST' })
  .middleware([requireActiveAccount])
  .inputValidator((input: FormData) => {
    if (!(input instanceof FormData)) throw new Error('לא נבחרה תמונה');
    const file = input.get('file');
    if (!(file instanceof File)) throw new Error('לא נבחרה תמונה');
    validateImage(file);
    return input;
  })
  .handler(async ({ data, context }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const cloud = process.env['CLOUDINARY_CLOUD_NAME'];
    const key = process.env['CLOUDINARY_API_KEY'];
    const secret = process.env['CLOUDINARY_API_SECRET'];
    if (!cloud || !key || !secret) throw new Error('שירות התמונות אינו מוגדר כרגע');
    const file = data.get('file');
    if (!(file instanceof File)) throw new Error('לא נבחרה תמונה');
    // Check actual file headers too, not just caller-controlled MIME metadata.
    const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    const valid = file.type === 'image/jpeg' ? header[0] === 255 && header[1] === 216 && header[2] === 255
      : file.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((b,i) => header[i] === b)
      : new TextDecoder().decode(header.slice(0,4)) === 'RIFF' && new TextDecoder().decode(header.slice(8,12)) === 'WEBP';
    if (!valid) throw new Error('קובץ התמונה אינו תקין');
    const body = new FormData();
    body.set('file', file);
    body.set('type', 'authenticated');
    const publicId = `nailhub/${context.userId}/${crypto.randomUUID()}`;
    body.set('public_id', publicId);
    body.set('overwrite', 'false');
    const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`, {
      method: 'POST', headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}` }, body,
    });
    if (!response.ok) {
      console.error('Cloudinary upload failed', response.status);
      throw new Error('העלאת התמונה נכשלה. בדקי את חיבור האינטרנט ונסי שוב.');
    }
    const result = await response.json() as { public_id: string; version: number; format: string };
    if (result.public_id !== publicId || !['jpg','png','webp'].includes(result.format) || !Number.isInteger(result.version))
      throw new Error('עיבוד התמונה נכשל');
    const url = `https://res.cloudinary.com/${cloud}/image/authenticated/${IMAGE_OPTIMIZATION}/v${result.version}/${publicId}.${result.format}`;
    const reference = cloudinaryReference(url, cloud);
    // Wait for the optimized rendition before reporting upload success.
    await fetchOptimizedImage(cloud, secret, reference.path);
    return { url };
  });

export const readCloudinaryImage = createServerFn({ method: 'POST' })
  .middleware([requireActiveAccount])
  .inputValidator((input: { url: string }) => {
    if (typeof input.url !== 'string' || input.url.length > 600) throw new Error('כתובת התמונה אינה תקינה');
    return input;
  })
  .handler(async ({ data, context }) => {
    setResponseHeader('Cache-Control', 'private, no-store');
    const cloud = process.env['CLOUDINARY_CLOUD_NAME'];
    const secret = process.env['CLOUDINARY_API_SECRET'];
    if (!cloud || !secret) throw new Error('שירות התמונות אינו מוגדר כרגע');
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