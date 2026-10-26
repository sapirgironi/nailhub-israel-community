import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const INSTRUCTIONS = `את כותבת תוכן מקצועית לקהילת בונות ציפורניים בישראל.
כתבי טיוטת פוסט בעברית טבעית, חמה ומקצועית לפרסום בפיד הקהילה, על סמך תיאור הטיפול או הטכניקה שהבונה נתנה.
מבנה: שורת פתיחה מושכת, 2-4 פסקאות קצרות שמסבירות את הטיפול/הטכניקה, החומרים והטיפים המקצועיים, וסיום עם הזמנה לשאלות או לתגובות.
הוסיפי בסוף 4-6 האשטגים רלוונטיים בעברית ובאנגלית. מותר אימוג'י עדין במידה.
אל תמציאי מחירים, שמות מותגים או פרטים שלא נמסרו. החזירי רק את טקסט הפוסט.`;

export async function generatePostDraft(description: string, tone: string) {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  const result = streamText({
    model: provider.responses("openai/gpt-6-astra"),
    instructions: INSTRUCTIONS,
    messages: [{ role: "user", content: `סגנון: ${tone}\n\nתיאור הטיפול/הטכניקה:\n${description}` }],
    maxRetries: 0,
    providerOptions: {
      openai: {
        store: false,
        forceReasoning: true,
        reasoningEffort: "low",
        reasoningSummary: "auto",
        include: ["reasoning.encrypted_content"],
      },
    },
  });
  return (await result.text).trim();
}
