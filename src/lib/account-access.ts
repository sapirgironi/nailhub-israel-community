import { createMiddleware } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const requireActiveAccount = createMiddleware({ type: 'function' })
  .middleware([requireSupabaseAuth])
  .server(async ({ context, next }) => {
    const { data, error } = await context.supabase.rpc('is_account_banned', { target_user: context.userId });
    if (error || data !== false) throw new Error('החשבון חסום ולא ניתן להיכנס לאפליקציה');
    return next();
  });