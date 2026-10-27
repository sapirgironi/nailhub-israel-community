import { createOpenAI } from "@ai-sdk/openai";
import { streamText } from "ai";

const INSTRUCTIONS = `את מומחית לעלויות חומרים בתחום הציפורניים בישראל.
על סמך הטיפול, האורך, הקישוטים והחומרים שצוינו, הערכי את עלות החומרים הנצרכים בטיפול אחד בלבד (כמות בגרמים/מ"ל כפול מחיר ממוצע בישראל), בשקלים.
החזירי שורה ראשונה: מספר בלבד (העלות בשקלים). שורה שנייה: הסבר קצר בעברית של עד 25 מילים.`;

export async function estimateMaterials(details: string) {
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
    messages: [{ role: "user", content: details }],
    maxRetries: 0,
    providerOptions: { openai: { store: false, forceReasoning: true, reasoningEffort: "low", reasoningSummary: "auto", include: ["reasoning.encrypted_content"] } },
  });
  const text = (await result.text).trim();
  const [first, ...rest] = text.split("\n");
  const cost = Number((first ?? "").replace(/[^\d.]/g, ""));
  if (!Number.isFinite(cost) || cost <= 0 || cost > 1000) throw new Error("unparseable");
  return { cost: Math.round(cost * 10) / 10, note: rest.join(" ").trim().slice(0, 300) };
}
