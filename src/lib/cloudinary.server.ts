import { IMAGE_OPTIMIZATION, validateOptimizedImage } from './cloudinary';

export function getCloudinaryDeliveryConfig() {
  const cloud = process.env['CLOUDINARY_CLOUD_NAME'];
  const secret = process.env['CLOUDINARY_API_SECRET'];
  if (!cloud || !secret) throw new Error('שירות התמונות אינו מוגדר כרגע');
  return { cloud, secret };
}

export async function uploadAuthenticatedImage(file: File, userId: string) {
  validateOptimizedImage(file);
  const { cloud, secret } = getCloudinaryDeliveryConfig();
  const key = process.env['CLOUDINARY_API_KEY'];
  if (!key) throw new Error('שירות התמונות אינו מוגדר כרגע');
  const header = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const valid = file.type === 'image/jpeg' ? header[0] === 255 && header[1] === 216 && header[2] === 255
    : file.type === 'image/png' ? [137,80,78,71,13,10,26,10].every((b,i) => header[i] === b)
    : new TextDecoder().decode(header.slice(0,4)) === 'RIFF' && new TextDecoder().decode(header.slice(8,12)) === 'WEBP';
  if (!valid) throw new Error('קובץ התמונה אינו תקין');
  const body = new FormData();
  body.set('file', file);
  body.set('type', 'authenticated');
  const publicId = `nailhub/${userId}/${crypto.randomUUID()}`;
  body.set('public_id', publicId);
  body.set('overwrite', 'false');
  const uploadUrl = `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloud)}/image/upload`;
  let response: Response;
  try {
    response = await fetch(uploadUrl, {
      method: 'POST', headers: { Authorization: `Basic ${btoa(`${key}:${secret}`)}` }, body,
    });
  } catch (error) {
    console.error('Cloudinary upload request failed', { error });
    throw new Error('לא ניתן להתחבר לשירות התמונות. נסי שוב.');
  }
  if (!response.ok) {
    console.error('Cloudinary upload failed', { status: response.status, statusText: response.statusText });
    throw new Error(`העלאת התמונה נכשלה (HTTP ${response.status}). נסי שוב.`);
  }
  const result = await response.json() as { public_id: string; version: number; format: string };
  if (result.public_id !== publicId || !['jpg','png','webp'].includes(result.format) || !Number.isInteger(result.version))
    throw new Error('עיבוד התמונה נכשל');
  return { url: `https://res.cloudinary.com/${cloud}/image/authenticated/${IMAGE_OPTIMIZATION}/v${result.version}/${publicId}.${result.format}` };
}

export async function createOptimizedImageUrl(cloud: string, secret: string, path: string) {
  const signedPath = `${IMAGE_OPTIMIZATION},w_800,c_limit/${path}`;
  const bytes = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${signedPath}${secret}`));
  const signature = btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').slice(0, 8);
  return `https://res.cloudinary.com/${cloud}/image/authenticated/s--${signature}--/${signedPath}`;
}

export async function fetchOptimizedImage(cloud: string, secret: string, path: string) {
  const url = await createOptimizedImageUrl(cloud, secret, path);
  const response = await fetch(url, {
    headers: { Accept: 'image/webp,image/*' }, cache: 'no-store',
  });
  if (!response.ok) {
    const details = await response.text();
    console.error('Cloudinary delivery failed', {
      url: response.url || url,
      status: response.status,
      statusText: response.statusText,
      response: details,
    });
    throw new Error(`טעינת התמונה נכשלה בכתובת ${response.url || url} (HTTP ${response.status}): ${details}`);
  }
  const body = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let i = 0; i < body.length; i += 8192) binary += String.fromCharCode(...body.subarray(i, i + 8192));
  return `data:${response.headers.get('content-type') ?? 'image/webp'};base64,${btoa(binary)}`;
}