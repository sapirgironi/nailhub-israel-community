import { describe, expect, it } from 'vitest';
import { plainText, whatsappLink } from '../lib/input-security';

describe('Contact destination trust', () => {
  it('allows only WhatsApp destinations', () => {
    expect(whatsappLink('https://evil.example/login')).toBeNull();
    expect(whatsappLink('https://wa.me.evil.example/972501234567')).toBeNull();
    expect(whatsappLink('https://evil.example@wa.me/972501234567')).toBeNull();
    expect(whatsappLink('javascript:alert(1)')).toBeNull();
    expect(whatsappLink('https://wa.me/972501234567?redirect=evil')).toBeNull();
    expect(whatsappLink('050-1234567')).toBe('https://wa.me/972501234567');
    expect(whatsappLink('https://wa.me/972501234567')).toBe('https://wa.me/972501234567');
  });
});
describe('Free text safety', () => {
  it('rejects script and markup input while preserving Hebrew plain text', () => {
    expect(plainText(2000).safeParse('<script>alert(1)</script>').success).toBe(false);
    expect(plainText(2000).safeParse('<img src=x onerror=alert(1)>').success).toBe(false);
    expect(plainText(2000).safeParse('javascript:alert(1)').success).toBe(false);
    expect(plainText(2000).parse('טיפול מקצועי בציפורניים')).toBe('טיפול מקצועי בציפורניים');
    expect(plainText(10).safeParse('a'.repeat(11)).success).toBe(false);
  });
});