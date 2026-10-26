export const MIN_PASSWORD_LENGTH = 6;
export function isPasswordAllowed(password: string): boolean {
  return password.length >= MIN_PASSWORD_LENGTH;
}
export const PASSWORD_LENGTH_MESSAGE = 'הסיסמה חייבת להכיל לפחות 6 תווים.';