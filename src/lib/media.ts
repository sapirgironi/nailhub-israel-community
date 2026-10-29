import { supabase } from '@/integrations/supabase/client';
import { readCloudinaryImage, uploadCloudinaryImage } from './cloudinary.functions';
import { optimizeUploadImage } from './image-optimization';

export async function uploadPhoto(file: File, _userId?: string) {
  const optimized = await optimizeUploadImage(file);
  const body = new FormData(); body.set('file',optimized);
  return (await uploadCloudinaryImage({ data: body })).url;
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