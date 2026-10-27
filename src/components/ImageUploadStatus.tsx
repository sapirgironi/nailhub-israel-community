import { LoaderCircle } from 'lucide-react';
export function ImageUploadStatus() {
  return <span role="status" className="inline-flex items-center gap-2 text-sm"><LoaderCircle aria-hidden="true" className="size-5 animate-spin motion-reduce:animate-none"/>מעלה ומעבדת תמונה...</span>;
}