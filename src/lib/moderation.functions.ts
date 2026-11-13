import { createServerFn } from "@tanstack/react-start";
import { requireActiveAccount } from './account-access';
import { plainText } from "./input-security";
import { z } from 'zod';

export interface ModerationReply {
  ok: boolean;
  flagged: string[];
  suggestion: string;
  error: string | null;
}

export const moderateComment = createServerFn({ method: "POST" })
  .middleware([requireActiveAccount])
  .inputValidator((input: { body: string }) => {
    const parsed = plainText(500).refine((v) => v.length > 0, "התגובה ריקה").safeParse(input.body);
    if (!parsed.success) throw new Error("התגובה חייבת להיות טקסט רגיל עד 500 תווים");
    return { body: parsed.data };
  })
  .handler(async ({ data, context }): Promise<ModerationReply> => {
    return reviewComment(data.body, context);
  });

export const publishComment = createServerFn({ method: 'POST' })
  .middleware([requireActiveAccount])
  .inputValidator((input: { postId: string; body: string }) => z.object({ postId: z.string().uuid(), body: plainText(500).refine(v => v.length > 0) }).parse(input))
  .handler(async ({ data, context }) => {
    const review = await reviewComment(data.body, context);
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

async function reviewComment(body: string, context: { supabase: import("@supabase/supabase-js").SupabaseClient<import("@/integrations/supabase/types").Database>; userId: string }): Promise<ModerationReply> {
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

    const { data: words, error: wordsError } = await supabase.rpc("blocked_comment_words", { comment_body: body });
    if (wordsError) return { ok: false, flagged: [], suggestion: '', error: 'בדיקת כללי הקהילה נכשלה' };
    const localHits = words ?? [];
    if (localHits.length > 0) {
      return { ok: false, flagged: localHits, suggestion: "", error: null };
    }
    return { ok: true, flagged: [], suggestion: "", error: null };
}
