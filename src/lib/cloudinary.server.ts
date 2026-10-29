import { IMAGE_OPTIMIZATION } from './cloudinary';

export async function fetchOptimizedImage(cloud: string, secret: string, path: string) {
  const signedPath = `${IMAGE_OPTIMIZATION}/${path}`;
  const bytes = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(`${signedPath}${secret}`));
  const signature = btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').slice(0, 8);
  const url = `https://res.cloudinary.com/${cloud}/image/authenticated/s--${signature}--/${signedPath}`;
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