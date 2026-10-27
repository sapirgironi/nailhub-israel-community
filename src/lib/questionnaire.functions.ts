import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';
import { plainText } from './input-security';

export const draftQuestionnaire = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { purpose: string; count: number }) => z.object({ purpose: plainText(2000).refine(v => v.length >= 10), count: z.number().int().min(1).max(20) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: admin, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (error || !admin) return { draft: null, error: 'מחולל השאלונים זמין למנהלת בלבד' };
    try {
      const { generateQuestionnaire } = await import('./questionnaire.server');
      return { draft: await generateQuestionnaire(data.purpose, data.count), error: null };
    } catch {
      return { draft: null, error: 'יצירת השאלון נכשלה. בדקי את זמינות שירות הבינה המלאכותית ונסי שוב מאוחר יותר' };
    }
  });