import { createServerFn } from "@tanstack/react-start";
import { requireActiveAccount } from './account-access';
import { z } from 'zod';
import { plainText } from './input-security';

const TONES = ["מקצועי", "חם ואישי", "מעורר השראה"];

export const draftPost = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .inputValidator((input: { description: string; tone: string }) => z.object({
    description: plainText(2000).refine(v => v.length >= 10, 'התיאור צריך להכיל לפחות 10 תווים'),
    tone: z.string().refine(v => TONES.includes(v), 'סגנון לא תקין'),
  }).parse(input))
  .handler(async ({ data }) => {
    const { generatePostDraft } = await import("./post-draft.server");
    try {
      return { draft: await generatePostDraft(data.description, data.tone), error: null as string | null };
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("draftPost failed", status);
      const error = status === 429 ? "יש עומס כרגע, נסי שוב בעוד רגע." : status === 402 ? "נגמרו קרדיטים לבינה המלאכותית." : "יצירת הטיוטה נכשלה, נסי שוב.";
      return { draft: "", error };
    }
  });
