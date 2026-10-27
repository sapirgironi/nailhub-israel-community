import { Output, streamText } from "ai";
import { z } from 'zod';
import { ownOpenAI } from './openai.server';
import { plainText } from './input-security';

export class ModerationServiceError extends Error {
  constructor(public readonly userMessage: string) { super(userMessage); }
}

function safeServiceError(error: unknown): ModerationServiceError {
  const e = error as { statusCode?: number; message?: string; cause?: unknown };
  if (/no credits|insufficient_quota|billing|quota exceeded/i.test(e?.message ?? '')) return new ModerationServiceError('שירות סינון התגובות נעצר בגלל יתרת שימוש חסרה. התגובה לא פורסמה; יש לפנות למנהלת');
  if (e?.cause) return safeServiceError(e.cause);
  return new ModerationServiceError('שירות סינון התגובות אינו זמין כרגע. התגובה לא פורסמה; נסי שוב מאוחר יותר');
}

const INSTRUCTIONS = `את מנתחת תגובות בקהילה מקצועית של בונות ציפורניים בישראל.
בדקי את התגובה והחזירי אך ורק JSON תקין במבנה:
{"toxic": boolean, "flagged": string[], "suggestion": string}
- toxic: true אם התגובה כוללת קללות, שפה בוטה, בריונות, השפלה או תוכן פוגעני. ביקורת מקצועית מנומסת אינה toxic.
- flagged: רשימת המילים או הביטויים הבעייתיים מתוך הטקסט המקורי (ריקה אם אין).
- suggestion: אם toxic — נוסח חלופי בעברית ששומר על הכוונה והמסר המקורי אך מנוסח בצורה מכבדת ומקצועית. אם לא toxic — מחרוזת ריקה.
החזירי JSON בלבד, ללא טקסט נוסף.`;

const REPHRASE_INSTRUCTIONS = `את משכתבת תגובות לקהילה מקצועית של בונות ציפורניים בישראל.
התגובה שתקבלי נחסמה כי היא מכילה מילים אסורות. שכתבי אותה בעברית בנוסח מכבד, מקצועי וידידותי, ששומר על הכוונה והמסר המקוריים, ומסיר לחלוטין את המילים האסורות וכל שפה פוגענית.
החזירי אך ורק JSON תקין במבנה: {"suggestion": "הנוסח המשוכתב"}. ללא טקסט נוסף.`;

export interface ModerationResult {
  toxic: boolean;
  flagged: string[];
  suggestion: string;
}

export async function moderateCommentText(body: string): Promise<ModerationResult> {
  let serviceError: unknown;
  const result = streamText({
    model: ownOpenAI(),
    output: Output.object({ schema: z.object({ toxic: z.boolean(), flagged: z.array(z.string()), suggestion: z.string() }) }),
    instructions: INSTRUCTIONS,
    messages: [{ role: "user", content: `התגובה לבדיקה:\n${body}` }],
    maxRetries: 0,
    onError: ({ error }) => { serviceError = error; },
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  let parsed;
  try { parsed = await result.output; } catch (error) { throw safeServiceError(serviceError ?? error); }
  return {
    toxic: parsed.toxic,
    flagged: parsed.flagged.filter(w => body.includes(w)),
    suggestion: plainText(500).parse(parsed.suggestion),
  };
}

export async function rephraseCommentText(body: string, blockedWords: string[]): Promise<string> {
  let serviceError: unknown;
  const result = streamText({
    model: ownOpenAI(),
    output: Output.object({ schema: z.object({ suggestion: z.string() }) }),
    instructions: REPHRASE_INSTRUCTIONS,
    messages: [{ role: "user", content: `המילים האסורות שזוהו: ${blockedWords.join(", ")}\nהתגובה לשכתוב:\n${body}` }],
    maxRetries: 0,
    onError: ({ error }) => { serviceError = error; },
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  let parsed;
  try { parsed = await result.output; } catch (error) { throw safeServiceError(serviceError ?? error); }
  const suggestion = plainText(500).parse(parsed.suggestion);
  if (!suggestion || blockedWords.some(w => suggestion.toLowerCase().includes(w.toLowerCase()))) throw new Error('לא התקבל ניסוח מתאים');
  return suggestion;
}
