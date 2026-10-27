import { IMAGE_OPTIMIZATION } from './cloudinary';

export async function fetchOptimizedImage(cloud: string, secret: string, path: string) {
  // Cloudinary signs transformations + public ID, excluding the version segment.
  const publicId = path.replace(/^v\d+\//, '');
  const bytes = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${IMAGE_OPTIMIZATION}/${publicId}${secret}`));
  const signature = btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').slice(0, 8);
  const response = await fetch(`https://res.cloudinary.com/${cloud}/image/authenticated/s--${signature}--/${IMAGE_OPTIMIZATION}/${path}`, {
    headers: { Accept: 'image/webp,image/*' }, cache: 'no-store',
  });
  if (!response.ok) {
    console.error('Cloudinary delivery failed', response.status);
    throw new Error('טעינת התמונה נכשלה. נסי שוב.');
  }
  const body = new Uint8Array(await response.arrayBuffer());
  let binary = '';
  for (let i = 0; i < body.length; i += 8192) binary += String.fromCharCode(...body.subarray(i, i + 8192));
  return `data:${response.headers.get('content-type') ?? 'image/webp'};base64,${btoa(binary)}`;
}