import { afterEach, describe, expect, it, vi } from 'vitest';
import { cloudinaryReference, IMAGE_OPTIMIZATION, validateImage } from '../lib/cloudinary';
import { createOptimizedImageUrl, fetchOptimizedImage, uploadAuthenticatedImage } from '../lib/cloudinary.server';
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); });

describe('Cloudinary image rules', () => {
  it('uploads privately from the server with the owner id and never returns credentials', async () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'example-cloud');
    vi.stubEnv('CLOUDINARY_API_KEY', 'example-key');
    vi.stubEnv('CLOUDINARY_API_SECRET', 'example-secret');
    const id = '12345678-1234-1234-1234-123456789abc';
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(id);
    const file = new File([new Uint8Array([255, 216, 255, 0])], 'test.jpg', { type: 'image/jpeg' });
    const slice = file.slice.bind(file);
    vi.spyOn(file, 'slice').mockImplementation((...args) => {
      const blob = slice(...args);
      Object.defineProperty(blob, 'arrayBuffer', { value: async () => new Uint8Array([255, 216, 255, 0]).buffer });
      return blob;
    });
    const request = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ public_id: `nailhub/${id}/${id}`, version: 1, format: 'jpg' })),
    );
    const result = await uploadAuthenticatedImage(file, id);
    expect(result).toEqual({ url: `https://res.cloudinary.com/example-cloud/image/authenticated/f_auto,q_auto/v1/nailhub/${id}/${id}.jpg` });
    const [url, options] = request.mock.calls[0]!;
    expect(url).toBe('https://api.cloudinary.com/v1_1/example-cloud/image/upload');
    const form = options?.body as FormData;
    expect(form.get('type')).toBe('authenticated');
    expect(form.get('public_id')).toBe(`nailhub/${id}/${id}`);
    expect(new Headers(options?.headers).get('authorization')).toBe(`Basic ${btoa('example-key:example-secret')}`);
    expect(JSON.stringify(result)).not.toContain('example-secret');
  });
  it('rejects invalid image content before sending it to Cloudinary', async () => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'example-cloud');
    vi.stubEnv('CLOUDINARY_API_KEY', 'example-key');
    vi.stubEnv('CLOUDINARY_API_SECRET', 'example-secret');
    const file = new File(['bad'], 'test.jpg', { type: 'image/jpeg' });
    const blob = file.slice();
    Object.defineProperty(blob, 'arrayBuffer', { value: async () => new Uint8Array([0, 0, 0]).buffer });
    vi.spyOn(file, 'slice').mockReturnValue(blob);
    const request = vi.spyOn(globalThis, 'fetch');
    await expect(uploadAuthenticatedImage(file, 'owner')).rejects.toThrow('קובץ התמונה אינו תקין');
    expect(request).not.toHaveBeenCalled();
  });
  it.each([
    [401, 'שירות התמונות דחה את פרטי הגישה'],
    [403, 'לשירות התמונות אין הרשאה להעלות תמונות'],
  ])('reports Cloudinary HTTP %i without exposing its response', async (status, message) => {
    vi.stubEnv('CLOUDINARY_CLOUD_NAME', 'example-cloud');
    vi.stubEnv('CLOUDINARY_API_KEY', 'example-key');
    vi.stubEnv('CLOUDINARY_API_SECRET', 'example-secret');
    const file = new File([new Uint8Array([255, 216, 255, 0])], 'test.jpg', { type: 'image/jpeg' });
    const blob = file.slice();
    Object.defineProperty(blob, 'arrayBuffer', { value: async () => new Uint8Array([255, 216, 255, 0]).buffer });
    vi.spyOn(file, 'slice').mockReturnValue(blob);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('sensitive technical details', { status }));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    await expect(uploadAuthenticatedImage(file, 'owner')).rejects.toThrow(message);
  });
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
      'f_auto,q_auto,w_800,c_limit/v42/nailhub/12345678-1234-1234-1234-123456789abc/12345678-1234-1234-1234-123456789abc.jpgserver-secret',
    );
    expect(fetch.mock.calls[0]?.[0]).toBe(
      'https://res.cloudinary.com/example-cloud/image/authenticated/s--AAECAwQF--/f_auto,q_auto,w_800,c_limit/v42/nailhub/12345678-1234-1234-1234-123456789abc/12345678-1234-1234-1234-123456789abc.jpg',
    );
  });
  it('creates an authenticated optimized URL with an 800-pixel width limit', async () => {
    vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(
      Uint8Array.from({ length: 20 }, (_, index) => index).buffer,
    );

    await expect(
      createOptimizedImageUrl('example-cloud', 'server-secret', 'v42/nailhub/member/image.jpg'),
    ).resolves.toBe(
      'https://res.cloudinary.com/example-cloud/image/authenticated/s--AAECAwQF--/f_auto,q_auto,w_800,c_limit/v42/nailhub/member/image.jpg',
    );
  });
  it('does not expose signed delivery URLs or response details on HTTP failures', async () => {
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

    expect(error).toHaveBeenCalledWith('Cloudinary delivery failed', { status: 404 });
    expect(JSON.stringify(error.mock.calls)).not.toContain('s--AAECAwQF--');
    expect(JSON.stringify(error.mock.calls)).not.toContain('asset not found');
  });
  it('does not expose signed URLs from delivery network errors', async () => {
    vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(
      Uint8Array.from({ length: 20 }, (_, index) => index).buffer,
    );
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('s--AAECAwQF-- sensitive'));
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      fetchOptimizedImage('example-cloud', 'server-secret', 'v42/nailhub/member/image.jpg'),
    ).rejects.toThrow('לא ניתן להתחבר לשירות התמונות');
    expect(JSON.stringify(error.mock.calls)).not.toContain('s--AAECAwQF--');
  });
  it('does not expose sensitive errors when reading the delivered image', async () => {
    vi.spyOn(crypto.subtle, 'digest').mockResolvedValue(
      Uint8Array.from({ length: 20 }, (_, index) => index).buffer,
    );
    const response = new Response('image');
    vi.spyOn(response, 'arrayBuffer').mockRejectedValue(new Error('s--AAECAwQF-- sensitive'));
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(response);
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    await expect(
      fetchOptimizedImage('example-cloud', 'server-secret', 'v42/nailhub/member/image.jpg'),
    ).rejects.toThrow('קריאת התמונה נכשלה');
    expect(JSON.stringify(error.mock.calls)).not.toContain('s--AAECAwQF--');
  });
});