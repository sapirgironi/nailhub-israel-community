import { z } from "zod";
import { phoneText, plainText } from "./input-security";

export const CLIENT_REQUEST_TYPES = [
  { value: "urgent_repair", label: "תיקון דחוף 🚨" },
  { value: "reschedule", label: "שינוי/ביטול תור 🔄" },
  { value: "new_appointment", label: "בקשת תור חדש 📅" },
  { value: "other", label: "אחר 💬" },
] as const;

export const clientRequestSchema = z.object({
  fullName: plainText(120).pipe(z.string().min(2, "הזיני שם מלא")),
  phone: phoneText,
  requestType: z.enum(["urgent_repair", "reschedule", "new_appointment", "other"]),
  description: plainText(1000).pipe(z.string().min(2, "כתבי תיאור קצר")),
});

export type ClientRequestInput = z.infer<typeof clientRequestSchema>;

export function newClientRequestClaimToken() {
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}
