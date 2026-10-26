import {PASSWORD_LENGTH_MESSAGE} from './password-policy';
export type ErrorKind = 'weak_password' | 'email_exists' | 'credentials' | 'unconfirmed' | 'rate_limit' | 'network' | 'forbidden' | 'expired' | 'unknown';
export function classifyError(error: unknown): ErrorKind {
  const value = typeof error === 'object' && error !== null ? error as {code?: unknown; message?: unknown; status?: unknown} : {};
  const code = String(value.code ?? '');
  const message = String(value.message ?? '').toLowerCase();
  if (code === 'weak_password' || /weak password|password.*(least|short|weak|strength|pwned)|password is known/.test(message)) return 'weak_password';
  if (['user_already_exists','email_exists'].includes(code) || /already.*(registered|exists)/.test(message)) return 'email_exists';
  if (code === 'invalid_credentials' || /invalid login credentials/.test(message)) return 'credentials';
  if (code === 'email_not_confirmed' || /email not confirmed/.test(message)) return 'unconfirmed';
  if (code.includes('rate_limit') || value.status === 429 || /too many requests|rate limit/.test(message)) return 'rate_limit';
  if (error instanceof TypeError || /failed to fetch|network|fetch failed/.test(message)) return 'network';
  if (['bad_jwt','session_expired','refresh_token_not_found'].includes(code) || value.status === 401 || /unauthorized|not authenticated/.test(message)) return 'expired';
  if (value.status === 403 || code === '42501' || /row.level security|permission denied/.test(message)) return 'forbidden';
  return 'unknown';
}
const messages: Record<ErrorKind,string> = {
  weak_password:'הסיסמה נדחתה על ידי שירות ההתחברות. נסי סיסמה אחרת או פני למנהלת האפליקציה.',
  email_exists:'כתובת אימייל זו כבר רשומה במערכת. נסי להתחבר',
  credentials:'פרטי ההתחברות אינם נכונים',
  unconfirmed:'יש לאמת את כתובת האימייל לפני ההתחברות. בדקי את הודעת האימות שנשלחה אלייך.',
  rate_limit:'בוצעו יותר מדי ניסיונות. המתיני כמה דקות ונסי שוב.',
  network:'לא ניתן להתחבר כרגע. בדקי את חיבור האינטרנט ונסי שוב.',
  forbidden:'אין לך הרשאה לבצע פעולה זו.',
  expired:'החיבור לחשבון הסתיים. התחברי שוב כדי להמשיך.',
  unknown:'הפעולה לא הושלמה. נסי שוב בעוד כמה רגעים.',
};
export function hebrewError(error: unknown, fallback = messages.unknown): string {
  const kind = classifyError(error);
  return kind === 'unknown' ? fallback : messages[kind];
}
export function hebrewValidation(input: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement): string {
  const v=input.validity;
  if(v.valueMissing) return input instanceof HTMLInputElement && input.type === 'file' ? 'בחרי תמונה כדי להמשיך.' : 'יש למלא את שדות החובה.';
  if(v.typeMismatch) return 'יש להזין כתובת אימייל תקינה.';
  if(v.tooShort) return input instanceof HTMLInputElement && input.hasAttribute('data-password-field') ? PASSWORD_LENGTH_MESSAGE : `יש להזין לפחות ${'minLength' in input ? input.minLength : 1} תווים.`;
  if(v.rangeUnderflow || v.rangeOverflow || v.badInput || v.stepMismatch) return 'יש להזין מספר תקין בטווח המותר.';
  return 'הפרטים שהוזנו אינם תקינים. בדקי אותם ונסי שוב.';
}