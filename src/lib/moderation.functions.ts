import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { plainText } from "./input-security";

export interface ModerationReply {
  ok: boolean;
  flagged: string[];
  suggestion: string;
  error: string | null;
}

export const moderateComment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { body: string }) => {
    const parsed = plainText(500).refine((v) => v.length > 0, "התגובה ריקה").safeParse(input.body);
    if (!parsed.success) throw new Error("התגובה חייבת להיות טקסט רגיל עד 500 תווים");
    return { body: parsed.data };
  })
  .handler(async ({ data, context }): Promise<ModerationReply> => {
    const { supabase, userId } = context;

    const { data: sanction } = await supabase
      .from("user_sanctions")
      .select("id")
      .eq("user_id", userId)
      .or(`until.is.null,until.gt.${new Date().toISOString()}`)
      .limit(1);
    if (sanction && sanction.length > 0) {
      return { ok: false, flagged: [], suggestion: "", error: "החשבון מושהה כרגע ולא ניתן להגיב" };
    }

    const { data: words } = await supabase.from("blocked_words").select("word");
    const lower = data.body.toLowerCase();
    const localHits = (words ?? []).map((w) => w.word).filter((w) => w && lower.includes(w.toLowerCase()));
    if (localHits.length > 0) {
      const { moderateCommentText } = await import("./moderation.server");
      let suggestion = "";
      let debugError: string | null = null;
      try {
        const ai = await moderateCommentText(data.body, true);
        suggestion = ai.suggestion;
        debugError = `v4 toxic=${ai.toxic} raw=${ai.raw ?? "none"}`;
      } catch (e) {
        debugError = "v3 threw: " + String((e as Error)?.message ?? e).slice(0, 200);
      }
      return { ok: false, flagged: localHits, suggestion, error: debugError };
    }

    try {
      const { moderateCommentText } = await import("./moderation.server");
      const ai = await moderateCommentText(data.body);
      if (ai.toxic) return { ok: false, flagged: ai.flagged, suggestion: ai.suggestion, error: null };
      return { ok: true, flagged: [], suggestion: "", error: null };
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("moderateComment failed", status);
      // תקלה זמנית בשירות הסינון — מאפשרים פרסום כדי לא לחסום משתמשות
      return { ok: true, flagged: [], suggestion: "", error: null };
    }
  });
