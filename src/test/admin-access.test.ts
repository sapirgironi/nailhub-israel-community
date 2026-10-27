import { describe, expect, it, vi } from 'vitest';
import { matchesAdminSearch } from '../lib/admin-rules';

vi.mock('@tanstack/react-start', () => ({ createMiddleware: () => {
  const builder = { middleware: () => builder, server: (handler: unknown) => handler };
  return builder;
} }));
vi.mock('@/integrations/supabase/auth-middleware', () => ({ requireSupabaseAuth: {} }));
import { requireActiveAccount } from '../lib/account-access';

describe('Administrator requirements', () => {
  it('finds users by their name', () => {
    expect(matchesAdminSearch({ display_name: 'ספיר', email: 'artist@example.com' }, 'ספיר')).toBe(true);
    expect(matchesAdminSearch({ display_name: 'רונית', email: 'other@example.com' }, 'ספיר')).toBe(false);
  });
  it('finds users by email without case sensitivity', () => {
    expect(matchesAdminSearch({ display_name: 'ספיר', email: 'Artist@example.com' }, ' ARTIST@EXAMPLE.COM ')).toBe(true);
    expect(matchesAdminSearch({ display_name: 'ספיר', email: 'other@example.com' }, 'artist@example.com')).toBe(false);
  });
  it('denies application functions to permanently banned accounts', async () => {
    const next = vi.fn();
    const rpc = vi.fn().mockResolvedValue({ data: true, error: null });
    const check = requireActiveAccount as unknown as (input: unknown) => Promise<unknown>;
    await expect(check({ context: { userId: 'blocked', supabase: { rpc } }, next })).rejects.toThrow();
    expect(next).not.toHaveBeenCalled();
    expect(rpc).toHaveBeenCalledWith('is_account_banned', { target_user: 'blocked' });
  });
  it('allows active accounts to continue', async () => {
    const next = vi.fn().mockResolvedValue('allowed');
    const check = requireActiveAccount as unknown as (input: unknown) => Promise<unknown>;
    expect(await check({ context: { userId: 'active', supabase: { rpc: vi.fn().mockResolvedValue({ data: false, error: null }) } }, next })).toBe('allowed');
  });
});