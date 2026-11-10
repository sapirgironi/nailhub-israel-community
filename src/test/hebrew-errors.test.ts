import {describe,it,expect} from 'vitest';
import {classifyError, hebrewAuthError, hebrewError} from '../lib/hebrew-errors';
describe('Auth error classification',()=>{
  it('recognizes weak password responses',()=>expect(classifyError({code:'weak_password'})).toBe('weak_password'));
  it('recognizes already registered accounts',()=>expect(classifyError({message:'User already registered'})).toBe('email_exists'));
  it('recognizes invalid login responses',()=>expect(classifyError({code:'invalid_credentials'})).toBe('credentials'));
  it('does not treat arbitrary server details as a known error',()=>expect(classifyError({message:'internal record new missing status'})).toBe('unknown'));
  it('distinguishes invalid credentials, configuration errors and other 401 responses', () => {
    expect(hebrewAuthError({ code: 'invalid_credentials', status: 401 }, '')).toContain('פרטי ההתחברות אינם נכונים');
    expect(hebrewAuthError({ message: 'Invalid API key', status: 401 }, '')).toContain('אינו מוגדר כראוי');
    expect(hebrewAuthError({ status: 401 }, '')).toContain('שירות ההתחברות');
    expect(hebrewError({ status: 401 })).toContain('החיבור לחשבון הסתיים');
  });
  it('reports unconfirmed email, RLS and missing configuration', () => {
    expect(classifyError({ code: 'email_not_confirmed', status: 400 })).toBe('unconfirmed');
    expect(classifyError({ code: '42501' })).toBe('forbidden');
    expect(classifyError(new Error('Missing Supabase environment variable(s)'))).toBe('configuration');
  });
});