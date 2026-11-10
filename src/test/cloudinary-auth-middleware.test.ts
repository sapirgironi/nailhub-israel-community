import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getRequest: vi.fn(), createClient: vi.fn(), getClaims: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({
  createMiddleware: () => ({ server: (handler: unknown) => handler }),
}));
vi.mock('@tanstack/react-start/server', () => ({ getRequest: mocks.getRequest }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));

import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

beforeEach(() => {
  vi.stubEnv('SUPABASE_URL', 'https://example.supabase.co');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'sb_publishable_test');
  mocks.getRequest.mockReset();
  mocks.getClaims.mockReset();
  mocks.createClient.mockReset().mockReturnValue({ auth: { getClaims: mocks.getClaims } });
});
afterEach(() => vi.unstubAllEnvs());

describe('Supabase authentication middleware', () => {
  it('rejects uploads without a session bearer token before calling the handler', async () => {
    mocks.getRequest.mockReturnValue(new Request('https://example.test', { method: 'POST' }));
    const next = vi.fn();
    const check = requireSupabaseAuth as unknown as (input: { next: typeof next }) => Promise<unknown>;
    await expect(check({ next })).rejects.toThrow('No authorization header');
    expect(next).not.toHaveBeenCalled();
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('rejects invalid tokens before calling the handler', async () => {
    mocks.getRequest.mockReturnValue(new Request('https://example.test', {
      method: 'POST', headers: { authorization: 'Bearer invalid.jwt.token' },
    }));
    mocks.getClaims.mockResolvedValue({ data: null, error: new Error('Invalid token') });
    const next = vi.fn();
    const check = requireSupabaseAuth as unknown as (input: { next: typeof next }) => Promise<unknown>;
    await expect(check({ next })).rejects.toThrow('Invalid token');
    expect(next).not.toHaveBeenCalled();
  });
});
