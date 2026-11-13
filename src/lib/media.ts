import { supabase } from '@/integrations/supabase/client';
import { readCloudinaryImage, readCloudinaryImages, uploadCloudinaryImage } from './cloudinary.functions';
import { optimizeUploadImage } from './image-optimization';

export async function uploadPhoto(file: File, _userId?: string) {
  const optimized = await optimizeUploadImage(file);
  const body = new FormData(); body.set('file',optimized);
  const fetchWithUploadDiagnostics: typeof fetch = async (input, init) => {
    const requestUrl = input instanceof Request ? input.url : input instanceof URL ? input.href : input;
    let response: Response;
    try {
      response = await fetch(input, init);
    } catch (error) {
      console.error('Cloudinary server function request failed', {
        url: requestUrl,
        method: init?.method ?? (input instanceof Request ? input.method : 'GET'),
        error,
      });
      throw error;
    }

    if (!response.ok) {
      console.error('Cloudinary server function returned an error', {
        url: response.url || requestUrl,
        method: init?.method ?? (input instanceof Request ? input.method : 'GET'),
        status: response.status,
        statusText: response.statusText,
        contentType: response.headers.get('content-type'),
        response: await response.clone().text(),
      });
    }
    return response;
  };
  return (await uploadCloudinaryImage({ data: body, fetch: fetchWithUploadDiagnostics })).url;
}
type PendingImage = { resolve: (value: string) => void; reject: (error: unknown) => void };
const pendingImages = new Map<string, PendingImage[]>();
let batchTimer: ReturnType<typeof setTimeout> | null = null;
async function flushImageBatch() {
  batchTimer = null;
  const entries = Array.from(pendingImages.entries());
  pendingImages.clear();
  const batches: (typeof entries)[] = [];
  for (let i = 0; i < entries.length; i += 4) batches.push(entries.slice(i, i + 4));
  await Promise.all(batches.map(async batch => {
    try {
      const results = await readCloudinaryImages({ data: { urls: batch.map(([url]) => url) } });
      await Promise.all(batch.map(async ([url, waiters]) => {
        const result = results.find(item => item.url === url);
        try {
          if (!result) throw new Error('תגובת שירות התמונות אינה תקינה');
          const image = result.retryIndividually ? (await readCloudinaryImage({ data: { url } })).image : result.image;
          if (!image) throw new Error(result.error ?? 'טעינת התמונה נכשלה');
          waiters.forEach(waiter => waiter.resolve(image));
        } catch (error) {
          waiters.forEach(waiter => waiter.reject(error));
        }
      }));
    } catch (error) {
      batch.forEach(([, waiters]) => waiters.forEach(waiter => waiter.reject(error)));
    }
  }));
}
function batchedCloudinaryImage(url: string) {
  if (typeof window === 'undefined') return readCloudinaryImage({ data: { url } }).then(result => result.image);
  return new Promise<string>((resolve, reject) => {
    const waiters = pendingImages.get(url) ?? [];
    waiters.push({ resolve, reject });
    pendingImages.set(url, waiters);
    if (batchTimer === null) batchTimer = setTimeout(() => void flushImageBatch(), 10);
  });
}
export async function photoUrl(value: string) {
  if (value.startsWith('https://res.cloudinary.com/')) return batchedCloudinaryImage(value);
  if (value.startsWith('community-work/')) {
    const {data,error} = await supabase.storage.from('community-work').createSignedUrl(value.slice(15),3600);
    if (error) throw error;
    return data.signedUrl;
  }
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}