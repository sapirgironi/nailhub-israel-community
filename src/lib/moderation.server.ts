import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

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

function gateway() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");
  return createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
}

function parseJson<T>(text: string): T | null {
  try {
    const match = text.match(/\{[\s\S]*\}/);
    return JSON.parse(match?.[0] ?? "") as T;
  } catch {
    return null;
  }
}

export async function moderateCommentText(body: string): Promise<ModerationResult> {
  const result = streamText({
    model: gateway().responses("openai/gpt-6-astra"),
    instructions: INSTRUCTIONS,
    messages: [{ role: "user", content: `התגובה לבדיקה:\n${body}` }],
    maxRetries: 0,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const parsed = parseJson<Partial<ModerationResult>>((await result.text).trim());
  return {
    toxic: parsed?.toxic === true,
    flagged: Array.isArray(parsed?.flagged) ? parsed.flagged.filter((w): w is string => typeof w === "string") : [],
    suggestion: typeof parsed?.suggestion === "string" ? parsed.suggestion : "",
  };
}

export async function rephraseCommentText(body: string, blockedWords: string[]): Promise<string> {
  const result = streamText({
    model: gateway().responses("openai/gpt-6-astra"),
    instructions: REPHRASE_INSTRUCTIONS,
    messages: [{ role: "user", content: `המילים האסורות שזוהו: ${blockedWords.join(", ")}\nהתגובה לשכתוב:\n${body}` }],
    maxRetries: 0,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  const parsed = parseJson<{ suggestion?: string }>((await result.text).trim());
  return typeof parsed?.suggestion === "string" ? parsed.suggestion : "";
}
