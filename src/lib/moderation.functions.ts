import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { plainText } from "./input-security";
import { z } from 'zod';

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

    const { data: sanction, error: sanctionError } = await supabase
      .from("user_sanctions")
      .select("id")
      .eq("user_id", userId)
      .or(`until.is.null,until.gt.${new Date().toISOString()}`)
      .limit(1);
    if (sanctionError) return { ok: false, flagged: [], suggestion: '', error: 'בדיקת הרשאות התגובה נכשלה' };
    if (sanction && sanction.length > 0) {
      return { ok: false, flagged: [], suggestion: "", error: "החשבון מושהה כרגע ולא ניתן להגיב" };
    }

    const { data: words, error: wordsError } = await supabase.from("blocked_words").select("word");
    if (wordsError) return { ok: false, flagged: [], suggestion: '', error: 'בדיקת כללי הקהילה נכשלה' };
    const lower = data.body.toLowerCase();
    const localHits = (words ?? []).map((w) => w.word).filter((w) => w && lower.includes(w.toLowerCase()));
    if (localHits.length > 0) {
      const { rephraseCommentText } = await import("./moderation.server");
      let suggestion = "";
      try {
        suggestion = await rephraseCommentText(data.body, localHits);
      } catch (e) {
        console.error("rephrase failed", (e as { statusCode?: number })?.statusCode);
      }
      return { ok: false, flagged: localHits, suggestion, error: null };
    }

    try {
      const { moderateCommentText } = await import("./moderation.server");
      const ai = await moderateCommentText(data.body);
      if (ai.toxic) return { ok: false, flagged: ai.flagged, suggestion: ai.suggestion, error: null };
      return { ok: true, flagged: [], suggestion: "", error: null };
    } catch (e) {
      const status = (e as { statusCode?: number })?.statusCode;
      console.error("moderateComment failed", status);
      return { ok: false, flagged: [], suggestion: "", error: 'שירות סינון התגובות אינו זמין כרגע. התגובה לא פורסמה; נסי שוב מאוחר יותר' };
    }
  });

export const publishComment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { postId: string; body: string }) => z.object({ postId: z.string().uuid(), body: plainText(500).refine(v => v.length > 0) }).parse(input))
  .handler(async ({ data, context }) => {
    const review = await moderateComment({ data: { body: data.body } });
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    await supabaseAdmin.from('comment_moderation_events').insert({ user_id: context.userId, outcome: review.error ? 'unavailable' : review.ok ? 'allowed' : 'blocked' });
    if (!review.ok || review.error) return review;
    // Verify post visibility as the caller before privileged publication.
    const { data: post, error } = await context.supabase.from('posts').select('id,author_id,status').eq('id', data.postId).single();
    if (error || !post || post.status !== 'approved') return { ok: false, flagged: [], suggestion: '', error: 'לא ניתן להגיב לפוסט הזה' };
    const { error: insertError } = await supabaseAdmin.from('post_comments').insert({ user_id: context.userId, post_id: post.id, body: data.body });
    if (insertError) return { ok: false, flagged: [], suggestion: '', error: 'פרסום התגובה נכשל' };
    if (post.author_id !== context.userId) {
      const { data: profile } = await context.supabase.from('profiles').select('display_name').eq('id', context.userId).single();
      await supabaseAdmin.from('notifications').insert({ user_id: post.author_id, actor_id: context.userId, actor_name: profile?.display_name ?? 'חברת קהילה', type: 'comment', post_id: post.id, body: data.body.slice(0,120) });
    }
    return review;
  });
