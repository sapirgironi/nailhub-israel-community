import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const TONES = ["מקצועי", "חם ואישי", "מעורר השראה"];

export const draftPost = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { description: string; tone: string }) => {
    const description = String(input?.description ?? "").trim();
    if (description.length < 10 || description.length > 2000) throw new Error("התיאור צריך להיות בין 10 ל-2000 תווים");
    const tone = TONES.includes(input?.tone) ? input.tone : TONES[0]!;
    return { description, tone };
  })
  .handler(async ({ data }) => {
    const { generatePostDraft } = await import("./post-draft.server");
    try {
      return { draft: await generatePostDraft(data.description, data.tone), error: null as string | null };
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("draftPost failed", status, e);
      const error = status === 429 ? "יש עומס כרגע, נסי שוב בעוד רגע." : status === 402 ? "נגמרו קרדיטים לבינה המלאכותית." : "יצירת הטיוטה נכשלה, נסי שוב.";
      return { draft: "", error };
    }
  });
