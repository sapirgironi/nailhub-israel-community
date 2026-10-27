import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

function model() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new Error("AI is not configured");
  const provider = createOpenAI({
    baseURL: "https://ai.gateway.lovable.dev/v1",
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
  return provider.responses("openai/gpt-6-astra");
}

const MODES = {
  improve: "שפרי את הניסוח שיהיה מקצועי, חם וקולח.",
  shorten: "קצרי את הטקסט לשורה קצרה וקליטה.",
  nikud: "הוסיפי ניקוד מלא ונכון לטקסט בלי לשנות מילים.",
  emoji: "הוסיפי 1-3 אימוג'ים מקצועיים ומתאימים לעולם הציפורניים.",
} as const;
export type StoryTextMode = keyof typeof MODES;
export const STORY_TEXT_MODES = Object.keys(MODES) as StoryTextMode[];

export async function rewriteStoryText(text: string, mode: StoryTextMode) {
  const { text: out } = await generateText({
    model: model(),
    instructions: `את עורכת טקסט לסטורי בקהילת בונות ציפורניים בישראל. ${MODES[mode]} החזירי רק את הטקסט הסופי בעברית, עד 60 תווים, בלי מירכאות.`,
    messages: [{ role: "user", content: text }],
    maxRetries: 0,
    providerOptions: { openai: { store: false, reasoningEffort: "low" } },
  });
  return out.trim().replace(/[<>]/g, "").slice(0, 60);
}

export async function describeStoryImage(dataUrl: string) {
  const { text } = await generateText({
    model: model(),
    instructions: "כתבי תיאור תמונה (טקסט חלופי) בעברית לקוראות מסך, משפט אחד או שניים, עד 300 תווים. תארי את הציפורניים, הצבעים, הטכניקה והטקסט שמופיע בתמונה. החזירי רק את התיאור.",
    messages: [{ role: "user", content: [{ type: "text", text: "תארי את תמונת הסטורי" }, { type: "image", image: dataUrl }] }],
    maxRetries: 0,
    providerOptions: { openai: { store: false, reasoningEffort: "low" } },
  });
  return text.trim().replace(/[<>]/g, "").slice(0, 400);
}
