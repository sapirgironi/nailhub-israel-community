import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const INSTRUCTIONS = `את מנתחת תגובות בקהילה מקצועית של בונות ציפורניים בישראל.
בדקי את התגובה והחזירי אך ורק JSON תקין במבנה:
{"toxic": boolean, "flagged": string[], "suggestion": string}
- toxic: true אם התגובה כוללת קללות, שפה בוטה, בריונות, השפלה או תוכן פוגעני. ביקורת מקצועית מנומסת אינה toxic.
- flagged: רשימת המילים או הביטויים הבעייתיים מתוך הטקסט המקורי (ריקה אם אין).
- suggestion: אם toxic — נוסח חלופי בעברית ששומר על הכוונה והמסר המקורי אך מנוסח בצורה מכבדת ומקצועית. אם לא toxic — מחרוזת ריקה.
החזירי JSON בלבד, ללא טקסט נוסף.`;

export interface ModerationResult {
  toxic: boolean;
  flagged: string[];
  suggestion: string;
}

export async function moderateCommentText(body: string, forceRephrase = false): Promise<ModerationResult> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { toxic: false, flagged: [], suggestion: "" };
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const prompt = forceRephrase
    ? `התגובה הבאה נחסמה בגלל מילים אסורות. סמני toxic=true, וכתבי ב-suggestion נוסח חלופי מכבד ששומר על הכוונה.\nהתגובה:\n${body}`
    : `התגובה לבדיקה:\n${body}`;
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: INSTRUCTIONS,
    messages: [{ role: "user", content: prompt }],
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
  const text = (await result.text).trim();
  try {
    const match = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(match?.[0] ?? "") as Partial<ModerationResult>;
    return {
      toxic: parsed.toxic === true,
      flagged: Array.isArray(parsed.flagged) ? parsed.flagged.filter((w): w is string => typeof w === "string") : [],
      suggestion: typeof parsed.suggestion === "string" ? parsed.suggestion : "",
    };
  } catch {
    return { toxic: false, flagged: [], suggestion: "" };
  }
}
