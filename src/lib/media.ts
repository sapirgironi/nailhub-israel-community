import { supabase } from '@/integrations/supabase/client';
import { readCloudinaryImage, uploadCloudinaryImage } from './cloudinary.functions';
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
export async function photoUrl(value: string) {
  if (value.startsWith('https://res.cloudinary.com/')) return (await readCloudinaryImage({ data: {url:value} })).image;
  if (value.startsWith('community-work/')) {
    const {data,error} = await supabase.storage.from('community-work').createSignedUrl(value.slice(15),3600);
    if (error) throw error;
    return data.signedUrl;
  }
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; }
}