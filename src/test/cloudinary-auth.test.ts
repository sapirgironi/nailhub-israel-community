import { describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ middleware: vi.fn(), activeAccount: {} }));
vi.mock('@tanstack/react-start', () => ({
  createServerFn: () => {
    const builder = {
      middleware: (value: unknown) => { mocks.middleware(value); return builder; },
      inputValidator: () => builder,
      handler: () => ({}),
    };
    return builder;
  },
}));
vi.mock('@tanstack/react-start/server', () => ({ setResponseHeader: vi.fn() }));
vi.mock('@/lib/account-access', () => ({ requireActiveAccount: mocks.activeAccount }));

describe('Cloudinary server function access', () => {
  it('requires an authenticated active account for upload and both image reading paths', async () => {
    await import('@/lib/cloudinary.functions');
    expect(mocks.middleware).toHaveBeenCalledTimes(3);
    expect(mocks.middleware).toHaveBeenNthCalledWith(1, [mocks.activeAccount]);
    expect(mocks.middleware).toHaveBeenNthCalledWith(2, [mocks.activeAccount]);
    expect(mocks.middleware).toHaveBeenNthCalledWith(3, [mocks.activeAccount]);
  });
});
