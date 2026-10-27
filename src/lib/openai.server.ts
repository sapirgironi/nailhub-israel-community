import { createOpenAI } from '@ai-sdk/openai';

// Only constructed inside an authenticated server handler's request.
export function ownOpenAI() {
  const apiKey = process.env['OPENAI_API_KEY'];
  if (!apiKey) throw new Error('שירות הבינה המלאכותית אינו מוגדר');
  return createOpenAI({ apiKey }).responses('gpt-6-astra');
}