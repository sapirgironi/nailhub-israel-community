import {describe,it,expect} from 'vitest';
import {classifyError} from '../lib/hebrew-errors';
describe('Auth error classification',()=>{
  it('recognizes weak password responses',()=>expect(classifyError({code:'weak_password'})).toBe('weak_password'));
  it('recognizes already registered accounts',()=>expect(classifyError({message:'User already registered'})).toBe('email_exists'));
  it('recognizes invalid login responses',()=>expect(classifyError({code:'invalid_credentials'})).toBe('credentials'));
  it('does not treat arbitrary server details as a known error',()=>expect(classifyError({message:'internal record new missing status'})).toBe('unknown'));
});