import {describe,it,expect} from 'vitest';
import {isPasswordAllowed,MIN_PASSWORD_LENGTH} from '../lib/password-policy';
describe('simple six-character password policy',()=>{
  it('requires six characters as the minimum',()=>{expect(MIN_PASSWORD_LENGTH).toBe(6);expect(isPasswordAllowed('12345')).toBe(false);expect(isPasswordAllowed('123456')).toBe(true);});
  it('does not require capitals, mixed case or special characters',()=>{expect(isPasswordAllowed('aaaaaa')).toBe(true);expect(isPasswordAllowed('12345678')).toBe(true);});
});