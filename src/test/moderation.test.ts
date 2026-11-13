import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ insert: vi.fn(), words: [] as { word: string }[], wordsError: false, sanctioned: false, postStatus: 'approved' }));
vi.mock('@tanstack/react-start', () => ({ createServerFn: () => {
  const builder = { middleware: () => builder, inputValidator: () => builder, handler: (handler: unknown) => handler };
  return builder;
} }));
vi.mock('../lib/account-access', () => ({ requireActiveAccount: {} }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: () => ({ insert: mocks.insert }) } }));
import { moderateComment, publishComment } from '../lib/moderation.functions';

function context() {
  return { userId: 'owner', supabase: {
    rpc: async (_name: string, input: { comment_body: string }) => ({
      data: mocks.words.filter(({ word }) => input.comment_body.toLowerCase().includes(word.toLowerCase())).map(({ word }) => word),
      error: mocks.wordsError ? new Error('unavailable') : null,
    }),
    from: (table: string) => {
    const q = {
      select: () => q, eq: () => q, or: () => q,
      limit: async () => ({ data: mocks.sanctioned ? [{ id: 'sanction' }] : [], error: null }),
      single: async () => ({ data: { id: 'post', author_id: 'owner', status: mocks.postStatus }, error: null }),
      then: (resolve: (x: unknown) => void) => resolve({ data: table === 'blocked_words' ? mocks.words : [], error: mocks.wordsError ? new Error('unavailable') : null }),
    };
    return q;
  } } };
}
const review = moderateComment as unknown as (input: unknown) => Promise<{ ok: boolean; flagged: string[]; suggestion: string; error: string | null }>;
const publish = publishComment as unknown as typeof review;
beforeEach(() => {
  vi.clearAllMocks(); mocks.words = []; mocks.wordsError = false; mocks.sanctioned = false; mocks.postStatus = 'approved';
  mocks.insert.mockResolvedValue({ error: null });
});
describe('local comment publication rules', () => {
  it('blocks configured words case-insensitively without publishing', async () => {
    mocks.words = [{ word: 'Blocked' }];
    const result = await publish({ data: { body: 'contains BLOCKED', postId: 'post' }, context: context() });
    expect(result).toMatchObject({ ok: false, flagged: ['Blocked'], suggestion: '' });
    expect(mocks.insert).not.toHaveBeenCalledWith(expect.objectContaining({ post_id: 'post' }));
  });
  it('fails closed when the blocked-word list is unavailable', async () => {
    mocks.wordsError = true;
    const result = await publish({ data: { body: 'תגובה לבדיקה', postId: 'post' }, context: context() });
    expect(result.ok).toBe(false); expect(result.error).not.toBeNull();
    expect(mocks.insert).not.toHaveBeenCalledWith(expect.objectContaining({ post_id: 'post' }));
  });
  it('blocks suspended accounts and unapproved posts', async () => {
    mocks.sanctioned = true;
    expect((await review({ data: { body: 'תגובה', postId: 'post' }, context: context() })).ok).toBe(false);
    mocks.sanctioned = false; mocks.postStatus = 'pending';
    expect((await publish({ data: { body: 'תגובה', postId: 'post' }, context: context() })).ok).toBe(false);
    expect(mocks.insert).not.toHaveBeenCalledWith(expect.objectContaining({ post_id: 'post' }));
  });
  it('publishes an allowed comment only under the authenticated author', async () => {
    const result = await publish({ data: { body: 'תודה על השיתוף', postId: 'post' }, context: context() });
    expect(result.ok).toBe(true);
    expect(mocks.insert).toHaveBeenCalledWith({ user_id: 'owner', post_id: 'post', body: 'תודה על השיתוף' });
  });
});
