import { describe, expect, it } from 'vitest';
import { cloudinaryReference, IMAGE_OPTIMIZATION, validateImage } from '../lib/cloudinary';
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
});