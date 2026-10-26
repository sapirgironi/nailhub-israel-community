import { z } from 'zod';

export const plainText = (max: number) => z.string().trim().max(max, 'הטקסט ארוך מדי').refine(
  (value) => !/<\s*[/!?a-z]/i.test(value) && !/(javascript|vbscript)\s*:/i.test(value),
  'יש להזין טקסט רגיל בלבד, ללא קוד או תגיות',
);

export function whatsappLink(contact: string): string | null {
  let phone = contact.trim();
  if (/^https:\/\//i.test(phone)) {
    try {
      const url = new URL(phone);
      if (url.username || url.password || url.port || url.hash) return null;
      if (url.hostname === 'wa.me' && /^\/[0-9]{8,15}$/.test(url.pathname) && !url.search) {
        phone = url.pathname.slice(1);
      } else if (url.hostname === 'api.whatsapp.com' && url.pathname === '/send' && /^\?phone=[0-9]{8,15}$/.test(url.search)) {
        phone = url.searchParams.get('phone') ?? '';
      } else return null;
    } catch { return null; }
  } else if (!/^\+?[0-9 ()-]{7,30}$/.test(phone)) return null;
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('0')) digits = '972' + digits.slice(1);
  return /^[1-9][0-9]{7,14}$/.test(digits) ? `https://wa.me/${digits}` : null;
}

export const phoneText = z.string().trim().regex(/^\+?[0-9 ()-]{7,30}$/, 'מספר הטלפון אינו תקין');
export const contactText = z.string().trim().max(200).refine((v) => whatsappLink(v) !== null, 'יש להזין מספר טלפון או קישור וואטסאפ תקין');