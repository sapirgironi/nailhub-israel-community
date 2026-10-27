import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

export const listAdminUsers = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: banned, error: banError } = await context.supabase.rpc('is_account_banned', { target_user: context.userId });
    const { data: allowed, error } = await context.supabase.rpc('has_role', { _user_id: context.userId, _role: 'admin' });
    if (error || banError || banned || allowed !== true) throw new Error('גישה למנהלת בלבד');
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const emails = new Map<string, string>();
    for (let page = 1; ; page++) {
      const { data, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
      if (usersError) throw new Error('טעינת המשתמשות נכשלה');
      data.users.forEach(user => emails.set(user.id, user.email ?? ''));
      if (data.users.length < 1000) break;
    }
    const { data, error: profilesError } = await context.supabase.from('profiles').select('id,display_name,business_name,account_role,account_status').order('display_name');
    if (profilesError) throw new Error('טעינת המשתמשות נכשלה');
    return data.map(profile => ({ ...profile, email: emails.get(profile.id) ?? '' }));
  });