import { afterEach, describe, expect, it, vi } from 'vitest';
import { cloudinaryReference, IMAGE_OPTIMIZATION, validateImage } from '../lib/cloudinary';
import { fetchOptimizedImage } from '../lib/cloudinary.server';
afterEach(() => vi.restoreAllMocks());

describe('Cloudinary image rules', () => {
  it('requires automatic format and quality optimization', () => {
    expect(IMAGE_OPTIMIZATION).toBe('f_auto,q_auto');
    expect(() => cloudinaryReference('https://res.cloudinary.com/test/image/upload/f_auto,q_auto/x.jpg','test')).toThrow();
  });
  it('accepts only private images belonging to the configured cloud', () => {
    const owner='12345678-1234-1234-1234-123456789abc';
    const url=`https://res.cloudinary.com/test/image/authenticated/f_auto,q_auto/v1/nailhub/${owner}/${owner}.jpg`;
    expect(cloudinaryReference(url,'test').owner).toBe(owner);
    expect(() => cloudinaryReference(url,'other')).toThrow();
    expect(() => cloudinaryReference(url+'?redirect=evil','test')).toThrow();
  });
  it('rejects executable and oversized image uploads', () => {
    expect(() => validateImage(new File(['<svg/>'],'x.svg',{type:'image/svg+xml'}))).toThrow();
    expect(() => validateImage(new File([new Uint8Array(5*1024*1024+1)],'x.jpg',{type:'image/jpeg'}))).toThrow();
  });
  it('signs the complete authenticated delivery path including version and extension', async () => {
    const digest = vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(
      Uint8Array.from({ length: 20 }, (_, index) => index).buffer,
    );
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(new Uint8Array([1, 2, 3]), { headers: { 'content-type': 'image/jpeg' } }),
    );

    await fetchOptimizedImage(
      'example-cloud',
      'server-secret',
      'v42/nailhub/12345678-1234-1234-1234-123456789abc/12345678-1234-1234-1234-123456789abc.jpg',
    );

    expect(new TextDecoder().decode(digest.mock.calls[0]?.[1])).toBe(
      'f_auto,q_auto/v42/nailhub/12345678-1234-1234-1234-123456789abc/12345678-1234-1234-1234-123456789abc.jpgserver-secret',
    );
    expect(fetch.mock.calls[0]?.[0]).toBe(
      'https://res.cloudinary.com/example-cloud/image/authenticated/s--AAECAwQF--/f_auto,q_auto/v42/nailhub/12345678-1234-1234-1234-123456789abc/12345678-1234-1234-1234-123456789abc.jpg',
    );
  });
  it('logs the exact failed delivery URL and full HTTP response details', async () => {
    vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(
      Uint8Array.from({ length: 20 }, (_, index) => index).buffer,
    );
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('asset not found', { status: 404, statusText: 'Not Found' }),
    );
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      fetchOptimizedImage('example-cloud', 'server-secret', 'v42/nailhub/member/image.jpg'),
    ).rejects.toThrow('HTTP 404');

    expect(error).toHaveBeenCalledWith(
      'Cloudinary delivery failed',
      expect.objectContaining({
        url: 'https://res.cloudinary.com/example-cloud/image/authenticated/s--AAECAwQF--/f_auto,q_auto/v42/nailhub/member/image.jpg',
        status: 404,
        statusText: 'Not Found',
        response: 'asset not found',
      }),
    );
  });
});